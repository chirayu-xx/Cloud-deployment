 # Project Name

## Overview

This project is a deployment platform inspired by Vercel but tailored to specific needs. It leverages various technologies including AWS, Kafka, Postgres, Node.js, and Next.js to create a seamless deployment pipeline aimed at optimizing efficiency and resource usage.

### Key Features

- **Dockerized Build Process**: Utilizes Docker to containerize the build process of Git repositories, resulting in faster builds, reduced overhead, and optimized resource allocation.
  
- **Kafka Integration**: Implements a Producer/Consumer architecture using Kafka for rapid communication and scalability, ideal for handling asynchronous processes and real-time updates.
  
- **Simplified Deployment**: Simplifies deployment complexities by autonomously deploying projects with just a Git URL. Employs a reverse proxy concept to map to the designated AWS S3 bucket without manual configurations.
  
- **Developer-Friendly**: Designed with solo developers in mind, the platform streamlines deployment from start to finish, freeing up time to focus on coding rather than deployment tasks.

## Folder Structure

1. **s3-reverse-proxy**: Contains the implementation of the reverse proxy concept for mapping to the designated AWS S3 bucket.

2. **api-server**: Includes the backend server implementation, utilizing technologies such as Node.js and Postgres.

3. **docker-build-server**: Houses the Dockerized build server responsible for containerizing the build process of Git repositories.

4. **frontend**: Contains the frontend implementation built with Next.js.

## Demonstration Video

Check out the [demonstration video](https://drive.google.com/file/d/1pKtuNAm4ZbYI-yzmaOBt4R6fO7TuFsLY/view?usp=sharing) for a visual walkthrough of the deployment platform in action.

## Getting Started

To get started with the deployment platform, follow these steps:

1. Clone the repository.
2. Navigate to each folder (`s3-reverse-proxy`, `api-server`, `docker-build-server`, `frontend`) and follow the setup instructions provided in their respective README files.
3. Once set up, deploy your projects by providing the Git URL, and the platform will handle the rest autonomously.

## Contributors

- [Chirayu Shah](https://github.com/chirayu-xx) - Project Lead
