require('dotenv').config();
const express = require('express')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs')
const {generateSlug} = require('random-word-slugs')
const {z} = require('zod')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')
const {createClient} = require('@clickhouse/client')
const {Kafka} = require('kafkajs')
const {v4: uuidv4} = require('uuid')
const cors = require('cors')
const { Server } = require('socket.io')





const app = express();
const PORT = 9000
const accessKey = process.env.AWS_ACCESS_KEY
const accessSecret = process.env.AWS_ACCESS_SECRET

const kafka = new Kafka({
    brokers: ['kafka-24d14334-cloud-deployment.a.aivencloud.com:19982'],
    clientId: `api-server`,
    sasl: {
        username: 'avnadmin',
        password: 'AVNS_Cv-oVxUrhYzDKqieBlS',
        mechanism: 'plain'
    },
    ssl : {
        ca : [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
    }
})

const consumer = kafka.consumer({
    groupId: 'api-server-logs-consumer'
})

const prisma = new PrismaClient({});
const client = createClient({
    host:'https://clickhouse-1f67f717-cloud-deployment.a.aivencloud.com:19970',
    database:'default',
    username:'avnadmin',
    password:'AVNS__UZqkedx7-YKtYgPGLd',
})



const ecsClient = new ECSClient({
    region :'us-east-1',
    credentials:{
        accessKeyId: accessKey,
        secretAccessKey: accessSecret,
    }
})

const config = {
    CLUSTER : 'arn:aws:ecs:us-east-1:471112723530:cluster/builder-cluster',
    TASK : 'arn:aws:ecs:us-east-1:471112723530:task-definition/builder-task:1'
}


app.use(express.json())
app.use(cors())


app.post('/project', async(req,res) => {
    const {name, gitURL, frameWork} = req.body
    const schema = z.object({
        name : z.string(),
        gitURL : z.string(),
        frameWork: z.string()
    })
    const safeParseResult = schema.safeParse(req.body);
    if(safeParseResult.error) return res.status(400).json({error: safeParseResult.error})

    const project = await prisma.project.create({
        data: {
            name, 
            gitURL, 
            frameWork,
            subDomain: generateSlug()
        }
    })
    return res.json({status: 'success', data : project})
})

app.get('/projects', async(req,res) =>{
    const projects = await prisma.project.findMany()
    return res.json({projects})
})

app.delete('/projects/:projectId', async (req, res) => {
    const projectId = req.params.projectId; // Get project ID from URL params
    try {
      // Delete the project
      await prisma.project.delete({
        where: { id: projectId }
      });
      return res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.delete('/deployments', async (req, res) => {
    try {
      // Delete all deployments
      await prisma.deployment.deleteMany();
      return res.json({ message: 'All deployments deleted successfully' });
    } catch (error) {
      console.error('Error deleting deployments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

app.get('/logs/:id', async(req,res) => {
    const id = req.params.id

    const logs = await client.query({
        query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
        query_params:{
            deployment_id: id
        },
        format: 'JSONEachRow'
    })

    const rawLogs = await logs.json()

    return res.json({logs: rawLogs})
})

app.post('/deploy', async (req, res) => {
    const {projectId} = req.body
    const project = await prisma.project.findUnique({where : {id: projectId}})

    if(!project) return res.status(404).json({error: 'Project not found'})

    const deployment = await prisma.deployment.create({
        data:{
            project : {connect : {id: projectId}},
            status: 'QUEUED',

        }
    })

    console.log("GitURL: ", project.gitURL, "Framework: ", project.frameWork);
    // Spin the container
    const command = new RunTaskCommand({
        cluster : config.CLUSTER,
        taskDefinition : config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration : {
            awsvpcConfiguration : {
                assignPublicIp : 'ENABLED',
                subnets : ['subnet-02dcd1f22237aa0c9', 'subnet-03fe53f45edc443d2', 'subnet-0f28349ff64b76163'],
                securityGroups : ['sg-09f5781b3edc6626c']
            } 
        },
        overrides : {
            containerOverrides : [
                {
                    name: 'builder-image',
                    environment : [
                        {name: 'GIT_REPOSITORY_URL', value : project.gitURL},
                        {name: 'PROJECT_ID', value: project.subDomain},
                        {name: 'FRAMEWORK', value: project.frameWork},
                        {name: 'DEPLOYMENT_ID', value: deployment.id},
                        {name: 'AWS_ACCESS_KEY', value: accessKey},
                        {name: 'AWS_ACCESS_SECRET', value: accessSecret}
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data :{
        deployment_id : deployment.id
    }})

})

async function initkafkaConsumer() {
    await consumer.connect();
    await consumer.subscribe({ topics: ['container-logs'], fromBeginning: true })

    await consumer.run({

        eachBatch: async function ({ batch, heartbeat, commitOffsetsIfNecessary, resolveOffset }) {

            const messages = batch.messages;
            console.log(`Recv. ${messages.length} messages..`)
            for (const message of messages) {
                if (!message.value) continue;
                const stringMessage = message.value.toString()
                const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage)
                console.log({ log, DEPLOYMENT_ID })
                try {
                    const { query_id } = await client.insert({
                        table: 'log_events',
                        values: [{ event_id: uuidv4(), deployment_id: DEPLOYMENT_ID, log }],
                        format: 'JSONEachRow'
                    })
                    resolveOffset(message.offset)
                    await commitOffsetsIfNecessary(message.offset)
                    await heartbeat()
                } catch (err) {
                    console.log(err)
                }

            }
        }
    })
}

initkafkaConsumer()

app.listen(PORT, () => console.log(`API Server Running..${PORT}`))