import { describe, test, expect, beforeEach } from "bun:test";
import { App, Request } from "../src/framework/app";

describe("App", () => {
  let app: App;

  beforeEach(() => {
    app = new App();
  });

  describe("Request class", () => {
    test("should create Request with all parameters", () => {
      const req = new Request("/test", { key: "value" }, { id: "123" }, "data");
      
      expect(req.path).toBe("/test");
      expect(req.query).toEqual({ key: "value" });
      expect(req.params).toEqual({ id: "123" });
      expect(req.arg).toBe("data");
    });

    test("should create Request with defaults", () => {
      const req = new Request("/test");
      
      expect(req.path).toBe("/test");
      expect(req.query).toEqual({});
      expect(req.params).toEqual({});
      expect(req.arg).toBeUndefined();
    });

    test("should create Request with partial parameters", () => {
      const req = new Request("/test", { sort: "asc" });
      
      expect(req.path).toBe("/test");
      expect(req.query).toEqual({ sort: "asc" });
      expect(req.params).toEqual({});
    });
  });

  describe("get()", () => {
    test("should register a route", () => {
      const handler = (arg: any) => "response";
      app.get("/test", handler);
      
      const response = app.handle({ path: "/test" });
      expect(response).toBe("response");
    });

    test("should register multiple routes", () => {
      app.get("/route1", () => "response1");
      app.get("/route2", () => "response2");
      
      expect(app.handle({ path: "/route1" })).toBe("response1");
      expect(app.handle({ path: "/route2" })).toBe("response2");
    });
  });

  describe("handle()", () => {
    describe("static routes", () => {
      test("should handle basic static route", () => {
        app.get("/hello", () => "Hello, World!");
        
        const response = app.handle({ path: "/hello" });
        expect(response).toBe("Hello, World!");
      });

      test("should handle multi-segment static route", () => {
        app.get("/api/users/list", () => "users list");
        
        const response = app.handle({ path: "/api/users/list" });
        expect(response).toBe("users list");
      });

      test("should pass arg to handler when no URL params present", () => {
        app.get("/process", (arg: any) => `Processed: ${arg}`);
        
        const response = app.handle({ path: "/process", arg: "test data" });
        expect(response).toBe("Processed: test data");
      });

      test("should handle empty path segments", () => {
        app.get("//double//slash", () => "handled");
        
        const response = app.handle({ path: "//double//slash" });
        expect(response).toBe("handled");
      });
    });

    describe("parameterized routes", () => {
      test("should extract single URL parameter", () => {
        app.get("/user/:id", (params: any) => `User ID: ${params.id}`);
        
        const response = app.handle({ path: "/user/123" });
        expect(response).toBe("User ID: 123");
      });

      test("should extract multiple URL parameters", () => {
        app.get("/user/:userId/post/:postId", (params: any) => 
          `User: ${params.userId}, Post: ${params.postId}`
        );
        
        const response = app.handle({ path: "/user/42/post/99" });
        expect(response).toBe("User: 42, Post: 99");
      });

      test("should handle parameter at start of path", () => {
        app.get("/:resource/list", (params: any) => `Listing ${params.resource}`);
        
        const response = app.handle({ path: "/users/list" });
        expect(response).toBe("Listing users");
      });

      test("should handle parameter at end of path", () => {
        app.get("/api/get/:id", (params: any) => `ID: ${params.id}`);
        
        const response = app.handle({ path: "/api/get/xyz" });
        expect(response).toBe("ID: xyz");
      });

      test("should handle mixed static and parameter segments", () => {
        app.get("/api/:version/users/:id/profile", (params: any) => 
          `Version: ${params.version}, User: ${params.id}`
        );
        
        const response = app.handle({ path: "/api/v2/users/alice/profile" });
        expect(response).toBe("Version: v2, User: alice");
      });

      test("should pass params object when URL params exist, ignoring request.arg", () => {
        app.get("/item/:id", (params: any) => params);
        
        const response = app.handle({ path: "/item/123", arg: "ignored" });
        expect(response).toEqual({ id: "123" });
      });
    });

    describe("query parameters", () => {
      test("should handle single query parameter", () => {
        app.get("/search", (params: any) => `Query: ${params.query.q}`);
        
        const response = app.handle({ path: "/search", query: { q: "test" } });
        expect(response).toBe("Query: test");
      });

      test("should handle multiple query parameters", () => {
        app.get("/search", (params: any) => 
          `Sort: ${params.query.sort}, Limit: ${params.query.limit}`
        );
        
        const response = app.handle({ 
          path: "/search", 
          query: { sort: "asc", limit: "10" } 
        });
        expect(response).toBe("Sort: asc, Limit: 10");
      });

      test("should handle query parameters with path parameters", () => {
        app.get("/user/:id", (params: any) => 
          `User: ${params.id}, Format: ${params.query.format}`
        );
        
        const response = app.handle({ 
          path: "/user/123", 
          query: { format: "json" } 
        });
        expect(response).toBe("User: 123, Format: json");
      });

      test("should handle multiple path and query parameters", () => {
        app.get("/api/:version/search/:category", (params: any) => ({
          version: params.version,
          category: params.category,
          sort: params.query.sort,
          limit: params.query.limit,
        }));
        
        const response = app.handle({ 
          path: "/api/v1/search/books",
          query: { sort: "desc", limit: "20" }
        });
        expect(response).toEqual({
          version: "v1",
          category: "books",
          sort: "desc",
          limit: "20",
        });
      });

      test("should handle empty query parameters object", () => {
        app.get("/test", (params: any) => params);
        
        const response = app.handle({ path: "/test", query: {} });
        expect(response).toBeUndefined();
      });

      test("should handle route with path params and empty query", () => {
        app.get("/user/:id", (params: any) => params);
        
        const response = app.handle({ path: "/user/123", query: {} });
        expect(response).toEqual({ id: "123" });
      });

      test("should handle route without path params but with query", () => {
        app.get("/search", (params: any) => params);
        
        const response = app.handle({ 
          path: "/search", 
          query: { q: "test", page: "1" } 
        });
        expect(response).toEqual({ query: { q: "test", page: "1" } });
      });

      test("should handle query parameters with special characters", () => {
        app.get("/search", (params: any) => params.query.q);
        
        const response = app.handle({ 
          path: "/search", 
          query: { q: "hello world" } 
        });
        expect(response).toBe("hello world");
      });

      test("should handle numeric query parameters", () => {
        app.get("/items", (params: any) => ({
          page: parseInt(params.query.page),
          limit: parseInt(params.query.limit),
        }));
        
        const response = app.handle({ 
          path: "/items", 
          query: { page: "2", limit: "50" } 
        });
        expect(response).toEqual({ page: 2, limit: 50 });
      });

      test("should handle Request object with query parameters", () => {
        app.get("/test/:id", (params: any) => ({
          id: params.id,
          query: params.query,
        }));
        
        const req = new Request("/test/123", { key: "value" });
        const response = app.handle(req);
        expect(response).toEqual({ id: "123", query: { key: "value" } });
      });

      test("should handle Request object with both path and query parameters", () => {
        app.get("/user/:userId/posts/:postId", (params: any) => ({
          userId: params.userId,
          postId: params.postId,
          format: params.query.format,
          include: params.query.include,
        }));
        
        const req = new Request("/user/42/posts/99", { format: "json", include: "comments" });
        const response = app.handle(req);
        expect(response).toEqual({
          userId: "42",
          postId: "99",
          format: "json",
          include: "comments",
        });
      });
    });

    describe("route matching", () => {
      test("should return error message for unmatched route", () => {
        app.get("/existing", () => "found");
        
        const response = app.handle({ path: "/nonexistent" });
        expect(response).toBe("No handler for path: /nonexistent");
      });

      test("should not match route with different segment count", () => {
        app.get("/api/users", () => "users");
        
        const response = app.handle({ path: "/api/users/123" });
        expect(response).toBe("No handler for path: /api/users/123");
      });

      test("should not match route with different static segments", () => {
        app.get("/api/users", () => "users");
        
        const response = app.handle({ path: "/api/posts" });
        expect(response).toBe("No handler for path: /api/posts");
      });

      test("should match first matching route when multiple routes could match", () => {
        app.get("/test", () => "first");
        app.get("/test", () => "second");
        
        const response = app.handle({ path: "/test" });
        expect(response).toBe("first");
      });

      test("should match correctly when some routes don't match", () => {
        app.get("/wrong", () => "wrong");
        app.get("/also/wrong", () => "also wrong");
        app.get("/correct", () => "correct");
        
        const response = app.handle({ path: "/correct" });
        expect(response).toBe("correct");
      });
    });

    describe("handler return values", () => {
      test("should return string from handler", () => {
        app.get("/string", () => "text response");
        
        const response = app.handle({ path: "/string" });
        expect(response).toBe("text response");
      });

      test("should return number from handler", () => {
        app.get("/number", () => 42);
        
        const response = app.handle({ path: "/number" });
        expect(response).toBe(42);
      });

      test("should return object from handler", () => {
        app.get("/object", () => ({ status: "ok", data: [1, 2, 3] }));
        
        const response = app.handle({ path: "/object" });
        expect(response).toEqual({ status: "ok", data: [1, 2, 3] });
      });

      test("should return array from handler", () => {
        app.get("/array", () => [1, 2, 3, 4]);
        
        const response = app.handle({ path: "/array" });
        expect(response).toEqual([1, 2, 3, 4]);
      });

      test("should return null from handler", () => {
        app.get("/null", () => null);
        
        const response = app.handle({ path: "/null" });
        expect(response).toBe(null);
      });

      test("should return undefined from handler", () => {
        app.get("/undefined", () => undefined);
        
        const response = app.handle({ path: "/undefined" });
        expect(response).toBe(undefined);
      });
    });

    describe("edge cases", () => {
      test("should handle root path", () => {
        app.get("/", () => "root");
        
        const response = app.handle({ path: "/" });
        expect(response).toBe("root");
      });

      test("should handle empty string path", () => {
        app.get("", () => "empty");
        
        const response = app.handle({ path: "" });
        expect(response).toBe("empty");
      });

      test("should handle parameter with special characters in value", () => {
        app.get("/search/:query", (params: any) => `Search: ${params.query}`);
        
        const response = app.handle({ path: "/search/hello-world_123" });
        expect(response).toBe("Search: hello-world_123");
      });

      test("should handle request without arg property", () => {
        app.get("/test", (arg: any) => arg === undefined ? "no arg" : "has arg");
        
        const response = app.handle({ path: "/test" });
        expect(response).toBe("no arg");
      });

      test("should handle request with null arg", () => {
        app.get("/test", (arg: any) => arg === null ? "null arg" : "not null");
        
        const response = app.handle({ path: "/test", arg: null });
        expect(response).toBe("null arg");
      });

      test("should handle complex arg object", () => {
        app.get("/compute", (arg: any) => {
          return { result: arg.a + arg.b };
        });
        
        const response = app.handle({ path: "/compute", arg: { a: 5, b: 7 } });
        expect(response).toEqual({ result: 12 });
      });
    });

    describe("integration scenarios", () => {
      test("should handle REST-like API patterns", () => {
        app.get("/api/users", () => ["user1", "user2"]);
        app.get("/api/users/:id", (params: any) => `User ${params.id}`);
        app.get("/api/users/:id/posts/:postId", (params: any) => 
          `User ${params.id}, Post ${params.postId}`
        );
        
        expect(app.handle({ path: "/api/users" })).toEqual(["user1", "user2"]);
        expect(app.handle({ path: "/api/users/123" })).toBe("User 123");
        expect(app.handle({ path: "/api/users/123/posts/456" }))
          .toBe("User 123, Post 456");
      });

      test("should handle calculator-like operations", () => {
        app.get("/add", (arg: any) => arg.a + arg.b);
        app.get("/multiply", (arg: any) => arg.a * arg.b);
        app.get("/factorial", (arg: any) => {
          let result = 1;
          for (let i = 2; i <= arg.n; i++) result *= i;
          return result;
        });
        
        expect(app.handle({ path: "/add", arg: { a: 3, b: 4 } })).toBe(7);
        expect(app.handle({ path: "/multiply", arg: { a: 6, b: 7 } })).toBe(42);
        expect(app.handle({ path: "/factorial", arg: { n: 5 } })).toBe(120);
      });
    });
  });
});
