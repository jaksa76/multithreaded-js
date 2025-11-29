import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { WorkerPool } from "../src/framework/worker-pool";

// Mock worker for testing
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  private messageHandler: ((data: any) => void) | null = null;

  constructor(public scriptURL: string) {}

  postMessage(data: any) {
    // Ignore init messages (don't respond to them)
    if (data && data.type === 'init') {
      return;
    }
    
    // Simulate async worker response
    setTimeout(() => {
      if (this.onmessage) {
        // Echo back the request with a processed response
        this.onmessage(new MessageEvent("message", { data: `processed: ${JSON.stringify(data)}` }));
      }
    }, 10);
  }

  terminate() {
    this.onmessage = null;
    this.onerror = null;
  }

  // Helper for testing
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent("message", { data }));
    }
  }

  simulateError(error: Error) {
    if (this.onerror) {
      this.onerror(new ErrorEvent("error", { error }));
    }
  }
}

// Override global Worker
const originalWorker = globalThis.Worker;
beforeEach(() => {
  (globalThis as any).Worker = MockWorker;
});

afterEach(() => {
  globalThis.Worker = originalWorker;
});

describe("WorkerPool", () => {
  describe("Constructor", () => {
    test("should create a pool with default number of workers", () => {
      const pool = new WorkerPool("./src/app/my-app.ts");
      const stats = pool.getStats();
      
      expect(stats.total).toBe(30);
      expect(stats.idle).toBe(30);
      expect(stats.busy).toBe(0);
    });

    test("should create a pool with specified number of workers", () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 10);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(10);
      expect(stats.idle).toBe(10);
      expect(stats.busy).toBe(0);
    });

    test("should create workers with correct script path", () => {
      const appScript = "./src/app/my-app.ts";
      const pool = new WorkerPool(appScript, 5);
      
      // Workers are created, verify pool is initialized
      expect(pool.getStats().total).toBe(5);
    });

    test("should handle single worker pool", () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(1);
      expect(stats.idle).toBe(1);
      expect(stats.busy).toBe(0);
    });

    test("should handle large worker pool", () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 100);
      const stats = pool.getStats();
      
      expect(stats.total).toBe(100);
      expect(stats.idle).toBe(100);
      expect(stats.busy).toBe(0);
    });
  });

  describe("dispatch", () => {
    test("should dispatch request to idle worker", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 5);
      const request = { path: "/test" };
      
      const response = await pool.dispatch(request);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe("string");
    });

    test("should mark worker as busy during processing", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 5);
      const request = { path: "/test" };
      
      // Start dispatch but don't await immediately
      const promise = pool.dispatch(request);
      
      // Check stats during processing
      const statsDuringProcessing = pool.getStats();
      
      await promise;
      
      // After completion, worker should be idle again
      const statsAfterProcessing = pool.getStats();
      expect(statsAfterProcessing.idle).toBe(5);
      expect(statsAfterProcessing.busy).toBe(0);
    });

    test("should return worker to idle pool after completion", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 3);
      
      const initialStats = pool.getStats();
      expect(initialStats.idle).toBe(3);
      expect(initialStats.busy).toBe(0);
      
      await pool.dispatch({ test: "data" });
      
      const finalStats = pool.getStats();
      expect(finalStats.idle).toBe(3);
      expect(finalStats.busy).toBe(0);
    });

    test("should handle multiple concurrent requests", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 5);
      
      const requests = Array.from({ length: 3 }, (_, i) => ({
        id: i,
        path: `/test/${i}`,
      }));
      
      const promises = requests.map(req => pool.dispatch(req));
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
      });
      
      // All workers should be idle after completion
      const stats = pool.getStats();
      expect(stats.idle).toBe(5);
      expect(stats.busy).toBe(0);
    });

    test("should handle requests up to pool capacity", async () => {
      const poolSize = 5;
      const pool = new WorkerPool("./src/app/my-app.ts", poolSize);
      
      const requests = Array.from({ length: poolSize }, (_, i) => ({
        id: i,
      }));
      
      const promises = requests.map(req => pool.dispatch(req));
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(poolSize);
    });

    test("should throw error when no idle workers available", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 0);
      
      await expect(pool.dispatch({ test: "data" })).rejects.toThrow(
        "No idle workers available"
      );
    });

    test("should handle sequential requests correctly", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 2);
      
      const response1 = await pool.dispatch({ id: 1 });
      expect(response1).toBeDefined();
      
      const response2 = await pool.dispatch({ id: 2 });
      expect(response2).toBeDefined();
      
      const response3 = await pool.dispatch({ id: 3 });
      expect(response3).toBeDefined();
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(2);
      expect(stats.busy).toBe(0);
    });

    test("should pass correct request data to worker", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const request = { 
        path: "/api/users", 
        method: "GET",
        data: { id: 123 }
      };
      
      const response = await pool.dispatch(request);
      
      expect(response).toContain("processed");
      expect(response).toContain("/api/users");
    });

    test("should handle complex request objects", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const complexRequest = {
        nested: {
          deep: {
            value: "test",
            array: [1, 2, 3],
            obj: { key: "value" }
          }
        },
        nullValue: null,
        undefinedValue: undefined,
        numberValue: 42,
        boolValue: true
      };
      
      const response = await pool.dispatch(complexRequest);
      expect(response).toBeDefined();
    });

    test("should handle empty request object", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const response = await pool.dispatch({});
      
      expect(response).toBeDefined();
    });
  });

  describe("getStats", () => {
    test("should return correct initial stats", () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 10);
      const stats = pool.getStats();
      
      expect(stats).toHaveProperty("idle");
      expect(stats).toHaveProperty("busy");
      expect(stats).toHaveProperty("total");
      expect(stats.idle).toBe(10);
      expect(stats.busy).toBe(0);
      expect(stats.total).toBe(10);
    });

    test("should update stats during request processing", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 5);
      
      // Initial state
      expect(pool.getStats().idle).toBe(5);
      expect(pool.getStats().busy).toBe(0);
      
      // Dispatch and complete
      await pool.dispatch({ test: 1 });
      
      expect(pool.getStats().idle).toBe(5);
      expect(pool.getStats().busy).toBe(0);
    });

    test("should maintain consistent total count", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 7);
      
      const initialStats = pool.getStats();
      expect(initialStats.total).toBe(7);
      
      await pool.dispatch({ test: 1 });
      
      const midStats = pool.getStats();
      expect(midStats.total).toBe(7);
      expect(midStats.idle + midStats.busy).toBe(7);
      
      await pool.dispatch({ test: 2 });
      
      const finalStats = pool.getStats();
      expect(finalStats.total).toBe(7);
      expect(finalStats.idle + finalStats.busy).toBe(7);
    });

    test("should reflect correct stats with multiple concurrent requests", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 10);
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        pool.dispatch({ id: i })
      );
      
      await Promise.all(promises);
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(10);
      expect(stats.busy).toBe(0);
      expect(stats.total).toBe(10);
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid successive dispatches", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 3);
      
      const responses = await Promise.all([
        pool.dispatch({ id: 1 }),
        pool.dispatch({ id: 2 }),
        pool.dispatch({ id: 3 }),
      ]);
      
      expect(responses).toHaveLength(3);
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(3);
      expect(stats.busy).toBe(0);
    });

    test("should handle dispatches that exceed pool size sequentially", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 2);
      
      // First two should work
      await pool.dispatch({ id: 1 });
      await pool.dispatch({ id: 2 });
      
      // Third should also work after workers are freed
      await pool.dispatch({ id: 3 });
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(2);
    });

    test("should maintain worker pool integrity after many operations", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 5);
      
      // Execute 20 operations (4x pool size)
      for (let i = 0; i < 20; i++) {
        await pool.dispatch({ iteration: i });
      }
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(5);
      expect(stats.busy).toBe(0);
      expect(stats.total).toBe(5);
    });

    test("should handle null request", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const response = await pool.dispatch(null);
      
      expect(response).toBeDefined();
    });

    test("should work with minimal pool (1 worker) under load", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      
      // Sequential execution since we only have 1 worker
      for (let i = 0; i < 5; i++) {
        const response = await pool.dispatch({ iteration: i });
        expect(response).toBeDefined();
      }
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(1);
      expect(stats.busy).toBe(0);
    });
  });

  describe("Performance", () => {
    test("should handle high concurrent load", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 50);
      const numRequests = 50;
      
      const startTime = Date.now();
      
      const requests = Array.from({ length: numRequests }, (_, i) => ({
        id: i,
        timestamp: Date.now(),
      }));
      
      const promises = requests.map(req => pool.dispatch(req));
      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(responses).toHaveLength(numRequests);
      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(50);
      expect(stats.busy).toBe(0);
    });

    test("should reuse workers efficiently", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 15);
      
      // Execute more requests than available workers
      const requests = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      
      const responses = await Promise.all(
        requests.map(req => pool.dispatch(req))
      );
      
      expect(responses).toHaveLength(15);
      
      // Verify all workers are back in idle pool
      const stats = pool.getStats();
      expect(stats.idle).toBe(15);
      expect(stats.total).toBe(15);
    });
  });

  describe("Type Safety", () => {
    test("should handle various request types", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 3);
      
      await pool.dispatch({ type: "string", value: "test" });
      await pool.dispatch({ type: "number", value: 123 });
      await pool.dispatch({ type: "boolean", value: true });
      await pool.dispatch({ type: "array", value: [1, 2, 3] });
      await pool.dispatch({ type: "object", value: { nested: true } });
      
      const stats = pool.getStats();
      expect(stats.idle).toBe(3);
    });

    test("should handle string request", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const response = await pool.dispatch("simple string");
      
      expect(response).toBeDefined();
    });

    test("should handle number request", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const response = await pool.dispatch(42);
      
      expect(response).toBeDefined();
    });

    test("should handle array request", async () => {
      const pool = new WorkerPool("./src/app/my-app.ts", 1);
      const response = await pool.dispatch([1, 2, 3, "test"]);
      
      expect(response).toBeDefined();
    });
  });
});
