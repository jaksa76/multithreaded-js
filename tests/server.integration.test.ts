import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Server } from "../src/framework/server";

describe("Server Integration Tests", () => {
  describe("Multi-threaded Server", () => {
    let server: Server;
    const port = 3001;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(() => {
      server = new Server("./src/framework/worker.ts", 4, true);
      server.start(port);
      // Give server a moment to start
      return new Promise((resolve) => setTimeout(resolve, 100));
    });

    test("should respond to /hello/:name endpoint", async () => {
      const response = await fetch(`${baseUrl}/hello/World`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Hello, World!");
    });

    afterAll(() => {
      server.stop();
    });
  });

  describe("Single-threaded Server", () => {
    let server: Server;
    const port = 3002;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(() => {
      server = new Server("./src/framework/worker.ts", 4, false);
      server.start(port);
      // Give server a moment to start
      return new Promise((resolve) => setTimeout(resolve, 100));
    });

    test("should respond to /hello/:name endpoint", async () => {
      const response = await fetch(`${baseUrl}/hello/World`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Hello, World!");
    });

    afterAll(() => {
      server.stop();
    });
  });
});
