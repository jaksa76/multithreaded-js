import { App } from "./app.ts";

const app = new App();

app.get("/hello/:name", (params: { name: string }) => {
  return `Hello, ${params.name}!`;
});

export { app };