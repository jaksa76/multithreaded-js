import { app } from "../app/my-app";

declare var self: Worker;

self.onmessage = (event: MessageEvent) => {
  const req = event.data;
  const response = app.handle(req);
  postMessage(response);
};