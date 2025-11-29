import { App } from "../framework/app";

const app = new App();

app.get("/greet/:name", (params: { name: string }) => {
  return `Greetings, ${params.name}!`;
});

app.get("/square/:n", (params: { n: string }) => {
  const num = parseInt(params.n, 10);
  return `Square of ${num} is ${num * num}`;
});

export { app };
