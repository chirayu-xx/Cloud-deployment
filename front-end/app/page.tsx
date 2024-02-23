'use client'
import axios from "axios";
import { Github, GithubIcon } from "lucide-react";
import { Fira_Code } from "next/font/google";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Log {
  log: string;
}

const firaCode = Fira_Code({ subsets: ["latin"] });

export default function Home() {
  const [repoURL, setURL] = useState<string>("");
  const [deploymentId, setDeploymentId] = useState<string>("");
  const [frameWork, setFrameWork] = useState<string>("");
  const [name, setName] = useState<string>("");

  const [logs, setLogs] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);

  const [projectId, setProjectId] = useState<string | undefined>();
  const [deployPreviewURL, setDeployPreviewURL] = useState<
    string | undefined
  >();

  const logContainerRef = useRef<HTMLElement>(null);
  const isValidURL: [boolean, string | null] = useMemo(() => {
    if (!repoURL || repoURL.trim() === "") return [false, null];
    const regex = new RegExp(
      /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)(?:\/)?$/
    );
    return [regex.test(repoURL), "Enter valid Github Repository URL"];
  }, [repoURL]);

  const handleClickDeploy = async() => {
    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:9000/project', {
        name: name,
        gitURL : repoURL,
        frameWork : frameWork
      });
      if (data) {
        const { id: projectId, subDomain } = data.data; // Destructure id and subdomain directly from data
        setDeployPreviewURL(`http://${subDomain}.localhost:8000/`);
        console.log(data.data)
        
        try {
          const deployResponse = await axios.post('http://localhost:9000/deploy', {
            projectId: projectId
          });
          const { deployment_id } = deployResponse.data.data;
          // console.log(deployment_id)
          setDeploymentId(deployment_id);
        } catch (error) {
          console.error("Error while deploying:", error);
        }
      }
    } catch (error) {
      console.error("Error while posting data:", error);
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get<{ logs: Log[] }>(
          `http://localhost:9000/logs/${deploymentId}`
        );
        const newLogs = data.logs.map((log) => log.log);
        setLogs((prevLogs) => {
          // Filter out duplicate logs
          const uniqueLogs = newLogs.filter((log) => !prevLogs.includes(log));
          return [...prevLogs, ...uniqueLogs];
        });
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
        // Check if the "done" message is received
        if (newLogs.includes("done")) {
          setLoading(false)
          clearInterval(interval); // Stop the interval if "done" message is received
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
      finally{
        setLoading(false);
      }
    };

    if (deploymentId) {
      fetchData(); // Fetch data immediately when deploymentId is available
      interval = setInterval(fetchData, 5000); // Fetch data every 5 seconds
    }

    return () => clearInterval(interval); // Cleanup function to clear interval
  }, [deploymentId]);
  
  useEffect(() => {
    logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs])
  

  console.log(logs)
  // console.log(deploymentId)
  // const handleSocketIncommingMessage = useCallback((message: string) => {
  //   console.log(`[Incomming Socket Message]:`, typeof message, message);
  //   const { log } = JSON.parse(message);
  //   setLogs((prev) => [...prev, log]);
  //   logContainerRef.current?.scrollIntoView({ behavior: "smooth" });
  // }, []);
  // useEffect(() => {
  //   socket.on("message", handleSocketIncommingMessage);

  //   return () => {
  //     socket.off("message", handleSocketIncommingMessage);
  //   };
  // }, [handleSocketIncommingMessage]);

  return (
    <main className="flex relative justify-center items-center h-[100vh]">
      <Link className="border-2 p-2 text-white absolute top-10 right-10" href={'/projects'}>
        Projects
      </Link>
      <div className="flex flex-col gap-2 items-center  justify-center">
      <div className="flex gap-2 items-center">
        <GithubIcon className="text-5xl text-white"/>
        <input value={name} onChange={(e) => setName(e.target.value)} className="outline-none p-2 focus:border-gray-100 rounded-lg " placeholder="Project Name"/>
        <input value={repoURL} onChange={(e) => setURL(e.target.value)} className="outline-none p-2 focus:border-gray-100 rounded-lg " placeholder="Github URL"/>
        <input value={frameWork} onChange={(e) => setFrameWork(e.target.value)} className="outline-none p-2 focus:border-gray-100 rounded-lg" placeholder="Framework"/>
      </div>
      <button disabled= {!isValidURL[0] || loading} onClick={handleClickDeploy} className="border-2 text-white cursor-pointer p-2 rounded-lg text-center w-44">
        {loading ? "In Progress" : "Deploy"}
      </button>
      {deployPreviewURL && (
          <div className="mt-2 text-white bg-slate-900 py-4 px-2 rounded-lg">
            <p>
              Preview URL{" "}
              <a
                target="_blank"
                className="text-sky-400 bg-sky-950 px-3 py-2 rounded-lg"
                href={deployPreviewURL}
              >
                {deployPreviewURL}
              </a>
            </p>
          </div>
        )}
        {logs.length > 0 && (
          <div
            className={`${firaCode.className} text-sm text-green-500 logs-container mt-5 border-green-500 border-2 rounded-lg p-4 h-[300px] overflow-y-auto`}
          >
            <pre className="flex flex-col gap-1">
              {logs.map((log, i) => (
                <code
                  ref={logContainerRef}
                  className="overflow-y-scroll no-scrollbar"
                  key={i}
                >{`> ${log}`}</code>
              ))}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
