import { app } from "./src/app/my-app";

Bun.serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle the request directly without multithreading
    const response = app.handle({ path });

    return new Response(response);
  },
});