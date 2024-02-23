
import axios from 'axios';
import {  Github, Link2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react'
interface ProjectType {
    id: string;
    name: string;
    frameWork: string;
    gitURL: string;
    subDomain: string;
    customDomain: string | null;
    // Add more properties as needed
  }
  
  interface Props {
    project: ProjectType;
    onDelete: (projectId: string) => void
  }

  
  
  function Project({project, onDelete} : Props) {
    const handleDeleteProject = async () => {
        try {
            await axios.delete(`http://localhost:9000/projects/${project.id}`);
            onDelete(project.id); // Call onDelete callback to remove the project from the parent component state
        } catch (error) {
            console.error("Error while deleting:", error);
        }
    }
  return (
    <div className='bg-cyan-950 text-white p-2'>
        <div className='flex w-full justify-between'>
            <h1>{project.name}</h1>
            <Trash2 className='cursor-pointer' onClick={handleDeleteProject}/>
        </div>
        <p>{project.frameWork}</p>
        <Link href={project.gitURL} target='_blank'>
            <Github/>
        </Link>
        <div className='flex'>
            <Link2/>
            <Link target='_blank' href={`http://${project.subDomain}.localhost:8000`}>{`${project.subDomain}`}
                {project.customDomain}
            </Link>
        </div>
    </div>
  )
}

export default Project
