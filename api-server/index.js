const express = require('express')
const {ECSClient, RunTaskCommand} = require('@aws-sdk/client-ecs')
const {generateSlug} = require('random-word-slugs')

const app = express();
const PORT = 9000

const ecsClient = new ECSClient({
    region :'us-east-1',
    credentials:{
        accessKeyId:'AKIAW3MEBVRFCBHXXQFS',
        secretAccessKey:'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'
    }
})

const config = {
    CLUSTER : 'arn:aws:ecs:us-east-1:471112723530:cluster/builder-cluster',
    TASK : 'arn:aws:ecs:us-east-1:471112723530:task-definition/builder-task:1'
}


app.use(express.json())

app.post('/project', async (req, res) => {
    const { gitURL, slug, frameWork } = req.body
    const projectSlug = slug ? slug : generateSlug()
    console.log("GitURL: ", gitURL, "Framework: ", frameWork);
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
                        {name: 'GIT_REPOSITORY_URL', value : gitURL},
                        {name: 'PROJECT_ID', value: projectSlug},
                        {name: 'FRAMEWORK', value: frameWork}
                    ]
                }
            ]
        }
    })

    await ecsClient.send(command);

    return res.json({ status: 'queued', data: {gitURL, frameWork, url: `http://${projectSlug}.localhost:8000` }})

})


app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})