# Building a Multithreaded JavaScript Backend with Bun Workers

## Motivation

JavaScript has long been synonymous with single-threaded execution. The single threaded restriction works for IO bound scenarios where the database is a using a single SSD disk, but falls short whenever we have a CPU-bound workload. In these cases, the event loop can become blocked, leading to increased latency and reduced throughput.

Consider a typical backend scenario: your server handles both lightweight API calls and a few CPU-intensive tasks, such as image processing or complex calculations. Under high load, these CPU-bound tasks can monopolize the event loop, causing delays for all incoming requests.

Traditional solutions involve offloading work to separate processes or microservices, but this adds operational complexity which aften has cascading consequences on the SDLC and developer productivity. Can't we simply leverage multiple CPU cores directly within a modern JavaScript runtime?

## Workers in the backend

All modern JavaScript runtimes support some form of workers. We can leverage workers to build a multithreaded backend that can handle high workloads without blocking the main event loop. Bun, a modern JavaScript runtime built from scratch with performance in mind, provides excellent support for Workers—a standard API for spawning background threads.

**Bun Workers**

Web Workers allow you to run JavaScript in parallel threads, each with its own isolated execution context. They communicate via message passing, which means:
- No shared memory concerns (avoiding race conditions)
- Clean separation of concerns
- True parallelism for CPU-bound tasks

The Worker API is straightforward:
```typescript
const worker = new Worker(new URL("./worker.ts", import.meta.url).href);
worker.postMessage({ data: "hello" });
worker.onmessage = (event) => {
  console.log(event.data);
};
```

With this foundation, I can build a sophisticated request distribution system.

## The Proof of Concept

I implemented a small framework comprised of:
- the main application containing the business logic that defines how to handle requests (similar to Express.js)
- the worker code that runs in each thread and uses the business logic to process requests
- a worker pool that manages multiple workers and distributes incoming requests among them
- the actual server that listens for incoming HTTP requests and delegates them to the worker pool

### 1. Main Application Script

Let's start from a simple application that defines our routes and handlers. Here's an example route that calculates Fibonacci numbers:

```typescript
app.get("/fibonacci/:n", (params: { n: string }) => {
  const num = parseInt(params.n, 10);
  function fib(n: number): number {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  return `Fibonacci of ${num} is ${fib(num)}`;
});
```
I have a custom App class that mimics Express.js routing, which I will not detail here for brevity. 

### 2. Worker Implementation

Each worker is a self-contained execution environment that dynamically loads the main application script:

```typescript
self.onmessage = async (event: MessageEvent) => {
  const req = event.data;
  
  if (req.type === 'init') {
    const module = await import(req.appScript);
    app = module.app;
    isInitialized = true;
    return;
  }
  
  const response = app.handle(req);
  postMessage(response);
};
```

Workers first receive an initialization message with the application script path, then dynamically import it. This design allows the same worker code to serve different applications, a nice separation of framework and business logic.


### 3. Worker Pool

The `WorkerPool` class manages a pool of worker threads, treating them as reusable resources. It has two arrays: one for idle workers and another for busy workers.

When workers are created, they are initialized with the application script and added to the idle pool.

```typescript
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url).href);
      worker.postMessage({ type: 'init', appScript });
      this.idleWorkers.push(worker);
    }
```

When a request comes in, an idle worker is popped from the pool, assigned the request, and marked as busy. Once the worker completes processing, it returns to the idle pool.

```typescript
  async dispatch(req: any): Promise<any> {
    const worker = this.idleWorkers.pop();
    if (!worker) {
      throw new Error("No idle workers available");
    }
    this.busyWorkers.add(worker);

    worker.postMessage(req);

    return new Promise((resolve) => {
      worker.onmessage = (event: MessageEvent) => {
        this.busyWorkers.delete(worker);
        this.idleWorkers.push(worker);
        resolve(event.data);
      };
    });
  }
```

### 4. Server Integration

The server listens for incoming HTTP requests and delegates them to the worker pool. Each request is packaged and sent to an available worker, which processes it using the application logic.

```typescript
    this.server = Bun.serve({
      port,
      fetch: async (request) => {
        const url = new URL(request.url);
        const path = url.pathname;
        
        let response = await self.workerPool.dispatch({ path });
        return new Response(response);
      },
    });
```


## Benchmarks

To validate the multithreading approach, I used k6 to simulate 20 concurrent users making requests to the CPU-intensive Fibonacci endpoint. I repeated the test for the multithreaded implementation and also a single-threaded baseline.

**Results:**

| Configuration | Throughput | Improvement |
|--------------|------------|-------------|
| Single-threaded | 0.39 req/s | baseline |
| Multithreaded (30 workers) | 2.5 req/s | **6.4x faster** |

On my desktop computer the multithreaded implementation achieves **6.4x better throughput** for CPU-intensive workloads. This isn't just a marginal improvement—it's the difference between using one core and fully utilizing the entire CPU.

**Real-world implications:**

While the Fibonacci example is synthetic, the pattern applies to real scenarios:
- Image processing and compression
- Large data parsing and transformation
- Cryptographic operations

Any CPU-bound operation benefits from parallelization, and the 6x improvement demonstrates that JavaScript backends can compete with traditionally multithreaded platforms when architected correctly.

## Conclusion

This proof of concept demonstrates that JavaScript backends don't have to be single-threaded bottlenecks. 

The framework is simple—under 200 lines of code—yet effective. It provides a foundation for building production-ready multithreaded JavaScript applications without the complexity of multiple processes or microservices.

The code is available on GitHub for experimentation and extension. Try running the benchmarks yourself, and consider how multithreading could improve your own CPU-intensive backend operations.
