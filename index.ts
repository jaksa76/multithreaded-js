import { WorkerPool } from "./src/framework/worker-pool";

// Create a worker pool
const workerPool = new WorkerPool("./src/framework/worker.ts", 30);

function deepPrint(obj: any, indent: string = "") {
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === "object" && value !== null) {
      console.log(`${indent}${key}:`);
      deepPrint(value, indent + "  ");
    } else {
      console.log(`${indent}${key}: ${value}`);
    }
  }
}

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Dispatch the request to a worker
    const response = await workerPool.dispatch({ path });
    // wait for the response from the worker

    return new Response(response);
  },
});