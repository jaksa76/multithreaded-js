import { WorkerPool } from "./worker-pool";
import { app } from "../app/my-app";
import { Request, HttpMethod } from "./app";

export class Server {
  private workerPool?: WorkerPool;
  private multithreaded: boolean;
  private server?: any;

  constructor(appScript: string, poolSize: number, multithreaded: boolean = true) {
    this.multithreaded = multithreaded;
    if (multithreaded) {
      this.workerPool = new WorkerPool(appScript, poolSize);
    }
  }

  start(port: number = 3000) {
    const self = this;
    this.server = Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method.toUpperCase() as HttpMethod;
        
        // Parse query parameters
        const query: Record<string, string> = {};
        url.searchParams.forEach((value, key) => {
          query[key] = value;
        });

        // Parse headers
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });

        // Parse body for POST, PUT, PATCH requests
        let body: any = undefined;
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          const contentType = request.headers.get('content-type') || '';
          
          if (contentType.includes('application/json')) {
            try {
              body = await request.json();
            } catch (e) {
              body = await request.text();
            }
          } else if (contentType.includes('text/')) {
            body = await request.text();
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            body = await request.text();
          } else {
            // Default to text
            try {
              body = await request.text();
            } catch (e) {
              body = undefined;
            }
          }
        }

        let response: string;
        if (self.multithreaded && self.workerPool) {
          // Dispatch the request to a worker
          response = await self.workerPool.dispatch({ path, method, query, headers, body });
        } else {
          // Handle the request directly without multithreading
          response = app.handle({ path, method, query, headers, body });
        }

        return new Response(response);
      },
    });

    console.log(`Server running on http://localhost:${port} (${this.multithreaded ? 'multithreaded' : 'single-threaded'})`);
  }

  stop() {
    if (this.server) {
      this.server.stop();
    }
  }
}
