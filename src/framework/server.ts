import { WorkerPool } from "./worker-pool";
import { app } from "../app/my-app";

export class Server {
  private workerPool?: WorkerPool;
  private multithreaded: boolean;
  private server?: any;

  constructor(workerPath: string, poolSize: number, multithreaded: boolean = true) {
    this.multithreaded = multithreaded;
    if (multithreaded) {
      this.workerPool = new WorkerPool(workerPath, poolSize);
    }
  }

  start(port: number = 3000) {
    const self = this;
    this.server = Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        const path = url.pathname;

        let response: string;
        if (self.multithreaded && self.workerPool) {
          // Dispatch the request to a worker
          response = await self.workerPool.dispatch({ path });
        } else {
          // Handle the request directly without multithreading
          response = app.handle({ path });
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
