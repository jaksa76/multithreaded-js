export class WorkerPool {
  private idleWorkers: Worker[] = [];
  private busyWorkers = new Set<Worker>();
  private numWorkers: number;

  constructor(appScript: string, numWorkers: number = 30) {
    this.numWorkers = numWorkers;
    
    // Initialize worker pool
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url).href);
      
      // Send initialization message with app file name
      worker.postMessage({ type: 'init', appScript });
      
      this.idleWorkers.push(worker);
    }
  }

  async dispatch(req: any): Promise<any> {
    // TODO: wait for an idle worker if none are available

    // Get an idle worker
    const worker = this.idleWorkers.pop();
    if (!worker) {
      throw new Error("No idle workers available");
    }
    this.busyWorkers.add(worker);

    worker.postMessage(req);

    return new Promise((resolve) => {
      worker.onmessage = (event: MessageEvent) => {
        const response = event.data;

        // Mark worker as idle again
        this.busyWorkers.delete(worker);
        this.idleWorkers.push(worker);
        resolve(response);
      };
    });
  }

  getStats() {
    return {
      idle: this.idleWorkers.length,
      busy: this.busyWorkers.size,
      total: this.numWorkers,
    };
  }
}
