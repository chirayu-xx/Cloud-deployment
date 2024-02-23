'use client'
import Project from '@/components/Project';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
interface ProjectType {
    id: string;
    name: string;
    frameWork: string;
    gitURL: string;
    subDomain: string;
    customDomain: string | null;
    // Add more properties as needed
  }
  

function Projects() {
    const [projects, setProjects] = useState<ProjectType[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const {data} = await axios.get('http://localhost:9000/projects');
            setProjects(data.projects)
        }
        fetchData()
    },[])
    const handleDeleteProject = (projectId: string) => {
        setProjects(prevProjects => prevProjects.filter(project => project.id !== projectId));
    };

  return (
    <div className='flex flex-col p-2 gap-5'>
      {
        projects.map((project, i) => (
            <Project onDelete={handleDeleteProject} key = {i} project = {project}/>
        ))
      }
    </div>
  )
}

export default Projects
