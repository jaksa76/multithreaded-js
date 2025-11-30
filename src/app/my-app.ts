import { App } from "../framework/app";

const app = new App();

app.get("/hello/:name", (params: { name: string }) => {
  return `Hello, ${params.name}!`;
});

app.get("/fibonacci/:n", (params: { n: string }) => {
  const num = parseInt(params.n, 10);
  function fib(n: number): number {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }
  return `Fibonacci of ${num} is ${fib(num)}`;
});

app.get("/search", (params: any) => {
  const query = params?.query?.q || "";
  return `Search results for: ${query}`;
});

app.get("/filter", (params: any) => {
  const sort = params?.query?.sort || "none";
  const limit = params?.query?.limit || "none";
  return `Sort: ${sort}, Limit: ${limit}`;
});

app.get("/user/:id", (params: any) => {
  const format = params?.query?.format || "html";
  return `User ${params.id} in ${format} format`;
});

// POST examples
app.post("/users", (params: any) => {
  return `Created user: ${params.body.name} (${params.body.email})`;
});

app.post("/api/calculate", (params: any) => {
  const { a, b, operation } = params.body;
  let result;
  switch (operation) {
    case 'add': result = a + b; break;
    case 'multiply': result = a * b; break;
    case 'subtract': result = a - b; break;
    case 'divide': result = a / b; break;
    default: result = 0;
  }
  return `Result: ${result}`;
});

// PUT example
app.put("/users/:id", (params: any) => {
  return `Updated user ${params.id} with data: ${JSON.stringify(params.body)}`;
});

// PATCH example
app.patch("/users/:id", (params: any) => {
  return `Patched user ${params.id} with: ${JSON.stringify(params.body)}`;
});

// DELETE example
app.delete("/users/:id", (params: any) => {
  return `Deleted user ${params.id}`;
});

// Example with headers
app.get("/protected", (params: any) => {
  const auth = params?.headers?.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return "Unauthorized";
  }
  return `Access granted with token: ${auth.substring(7)}`;
});

export { app };