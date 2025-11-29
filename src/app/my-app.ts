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

export { app };