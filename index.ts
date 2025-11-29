import { Server } from "./src/framework/server";

// Control multithreading via MULTITHREADED environment variable
// Defaults to true (multithreaded) if not specified
const isMultithreaded = process.env.MULTITHREADED !== "false";

console.log(`Starting server in ${isMultithreaded ? 'multi-threaded' : 'single-threaded'} mode`);

const server = new Server("../app/my-app.ts", 30, isMultithreaded);
server.start(3000);