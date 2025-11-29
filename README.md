# Multithreaded JS/TS Backend

A proof of concept demonstrating multithreading capabilities in JavaScript/TypeScript backends using Bun's Web Workers. This project showcases how to build a scalable HTTP server that distributes request handling across multiple worker threads.

## Overview

This project implements a lightweight framework for multithreaded request handling in Node.js/Bun applications. It includes:

- **Worker Pool**: Manages a pool of worker threads for concurrent request processing
- **Routing Framework**: Simple Express-like routing with path parameters
- **Performance Testing**: k6 load testing scripts to compare multithreaded vs single-threaded performance


## Installation

```bash
bun install
```

## Usage

### Run with Multithreading

Start the multithreaded server:

```bash
bun start
```

### Run without Multithreading (Comparison)

Start the single-threaded server for performance comparison:

```bash
bun start:single-threaded
```

### Run Tests

```bash
bun test
```

Watch mode:

```bash
bun test:watch
```

## Performance Testing

This project includes k6 load testing to demonstrate the benefits of multithreading:

```bash
bun test:k6
```

The test simulates 20 concurrent users making requests to the CPU-intensive Fibonacci endpoint. Compare performance by running the test against both the multithreaded and single-threaded versions.

### Benchmark Results

**Multithreaded** (30 workers): **2.5 req/s**  
**Single-threaded**: **0.39 req/s**

The multithreaded implementation achieves **~6.4x better throughput** for CPU-intensive workloads, demonstrating the significant performance gains from parallelizing request processing across multiple worker threads.

## Project Status

This is a proof of concept demonstrating multithreading patterns in JavaScript/TypeScript backends. It's intended for educational purposes and performance benchmarking.
