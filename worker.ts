import { app } from "./my-app.ts";

declare var self: Worker;

self.onmessage = (event: MessageEvent) => {
  const req = event.data;
  const response = app.handle(req);
  console.log(`Worker sending response: ${response}`);
  postMessage(response);
};