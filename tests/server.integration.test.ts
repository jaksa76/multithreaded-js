import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Server } from "../src/framework/server";

describe("Server Integration Tests", () => {
  describe("Multi-threaded Server", () => {
    let server: Server;
    const port = 3001;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(() => {
      server = new Server("../app/my-app.ts", 4, true);
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

    test("should handle query parameters", async () => {
      const response = await fetch(`${baseUrl}/search?q=test`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Search results for: test");
    });

    test("should handle multiple query parameters", async () => {
      const response = await fetch(`${baseUrl}/filter?sort=asc&limit=10`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Sort: asc, Limit: 10");
    });

    test("should handle path and query parameters together", async () => {
      const response = await fetch(`${baseUrl}/user/42?format=json`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("User 42 in json format");
    });

    test("should handle POST request with JSON body", async () => {
      const response = await fetch(`${baseUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Alice", email: "alice@test.com" }),
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Created user: Alice (alice@test.com)");
    });

    test("should handle PUT request", async () => {
      const response = await fetch(`${baseUrl}/users/123`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bob", status: "active" }),
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toContain("Updated user 123");
    });

    test("should handle PATCH request", async () => {
      const response = await fetch(`${baseUrl}/users/456`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "new@example.com" }),
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toContain("Patched user 456");
    });

    test("should handle DELETE request", async () => {
      const response = await fetch(`${baseUrl}/users/789`, {
        method: "DELETE",
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Deleted user 789");
    });

    test("should handle request with authorization header", async () => {
      const response = await fetch(`${baseUrl}/protected`, {
        headers: { "Authorization": "Bearer test-token-123" },
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Access granted with token: test-token-123");
    });

    test("should reject request without authorization", async () => {
      const response = await fetch(`${baseUrl}/protected`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Unauthorized");
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
      server = new Server("../app/my-app.ts", 4, false);
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

    test("should handle query parameters", async () => {
      const response = await fetch(`${baseUrl}/search?q=single`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Search results for: single");
    });

    test("should handle path and query parameters together", async () => {
      const response = await fetch(`${baseUrl}/user/123?format=xml`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("User 123 in xml format");
    });

    test("should handle POST request with JSON body", async () => {
      const response = await fetch(`${baseUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Charlie", email: "charlie@test.com" }),
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Created user: Charlie (charlie@test.com)");
    });

    test("should handle DELETE request", async () => {
      const response = await fetch(`${baseUrl}/users/999`, {
        method: "DELETE",
      });
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Deleted user 999");
    });

    afterAll(() => {
      server.stop();
    });
  });

  describe("Alternate App Server", () => {
    let server: Server;
    const port = 3003;
    const baseUrl = `http://localhost:${port}`;

    beforeAll(() => {
      server = new Server("../app/alternate-app.ts", 2, true);
      server.start(port);
      // Give server a moment to start
      return new Promise((resolve) => setTimeout(resolve, 100));
    });

    test("should respond to /greet/:name endpoint", async () => {
      const response = await fetch(`${baseUrl}/greet/Alice`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Greetings, Alice!");
    });

    test("should respond to /square/:n endpoint", async () => {
      const response = await fetch(`${baseUrl}/square/7`);
      const text = await response.text();
      
      expect(response.status).toBe(200);
      expect(text).toBe("Square of 7 is 49");
    });

    afterAll(() => {
      server.stop();
    });
  });

});
