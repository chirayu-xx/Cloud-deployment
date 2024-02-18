const {exec} = require('child_process');
const fs = require('fs')
const path = require('path');
const mime = require('mime-types');
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')

const accessKey = process.env.AWS_ACCESS_KEY
const accessSecret = process.env.AWS_ACCESS_SECRET
const PROJECT_ID = process.env.PROJECT_ID
const FRAMEWORK = process.env.FRAMEWORK;

const s3Client = new S3Client({
    region:'ap-south-1',
    credentials:{
        accessKeyId: accessKey,
        secretAccessKey: accessSecret
    }
})

const folderToUse = FRAMEWORK == 'vite'? 'dist' :'build';

async function buildRepo() {
    console.log('Executing script.js')
    console.log(FRAMEWORK)
    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)
    p.stdout.on('data', function (data) {
        console.log(data.toString())
        
    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
       
    })

    p.on('close', async function () {
        console.log('Build Complete')
        const distFolderPath = path.join(__dirname, 'output', `${folderToUse}`)
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)


            const command = new PutObjectCommand({
                Bucket:'cloud-deployment-outputs',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            console.log('uploaded', filePath)
        }
        console.log('Done...')  
    })
}

buildRepo()