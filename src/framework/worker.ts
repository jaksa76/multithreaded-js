import type { App } from "./app";

declare var self: Worker;

let app: App;
let isInitialized = false;

self.onmessage = async (event: MessageEvent) => {
  try {
    const message = event.data;
    
    // Handle initialization message
    if (message.type === 'init') {
      const module = await import(message.appScript);
      app = module.app;
      isInitialized = true;
      return;
    }
    
    // Wait for initialization if needed
    while (!isInitialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Handle regular requests
    const req = message;
    const response = app.handle(req);
    postMessage(response);
  } catch (error) {
    console.error('Worker error:', error);
    postMessage({ error: String(error) });
  }
};