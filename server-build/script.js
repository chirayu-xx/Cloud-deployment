const {exec} = require('child_process');
const fs = require('fs')
const path = require('path');
const mime = require('mime-types');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const {Kafka} = require('kafkajs')


const accessKey = process.env.AWS_ACCESS_KEY
const accessSecret = process.env.AWS_ACCESS_SECRET
const PROJECT_ID = process.env.PROJECT_ID
const FRAMEWORK = process.env.FRAMEWORK;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;


const kafka = new Kafka({
    brokers: ['kafka-24d14334-cloud-deployment.a.aivencloud.com:19982'],
    clientId: `docker-build-server-${DEPLOYMENT_ID}`,
    sasl: {
        username: 'avnadmin',
        password: 'AVNS_Cv-oVxUrhYzDKqieBlS',
        mechanism: 'plain'
    },
    ssl : {
        ca : [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')]
    }
})

const producer = kafka.producer()


async function publishLog(log){
   await producer.send({topic : `container-logs`, messages: [{key : 'log', value : JSON.stringify({PROJECT_ID, DEPLOYMENT_ID, log})}]})
}

const s3Client = new S3Client({
    region:'ap-south-1',
    credentials:{
        accessKeyId: accessKey,
        secretAccessKey: accessSecret
    }
})

const folderToUse = FRAMEWORK == 'vite'? 'dist' :'build';

async function buildRepo() {

    await producer.connect()
    console.log('Executing script.js')
    await publishLog('Build Started...')
    console.log(FRAMEWORK)
    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)
    p.stdout.on('data', async function (data) {
        console.log(data.toString())
        await publishLog(data.toString())
    })

    p.stdout.on('error', async function (data) {
        console.log('Error', data.toString())
        await publishLog(`Error : ${data.toString()}`)
    })

    p.on('close', async function () {
        console.log('Build Complete')
        await publishLog("Build Complete")
        const distFolderPath = path.join(__dirname, 'output', `${folderToUse}`)
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        await publishLog("Starting to upload....")
        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)
            await publishLog(`Uploading ${filePath}`)

            const command = new PutObjectCommand({
                Bucket:'cloud-deployment-outputs',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            console.log('uploaded', filePath)
            await publishLog(`Uploaded ${filePath}`)
        }
        console.log('Done...') 
        await publishLog('Done'); 
        process.exit(0)
    })
}

buildRepo()