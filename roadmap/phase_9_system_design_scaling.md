# Phase 9: System Design, Scaling & Production Engineering

> **What this phase covers:** The high-level systems design and horizontal scalability roadmap for Apollo. You will master how to scale real-time SSE streaming, implement Redis Semantic Caching to slash IT costs by 60%,�containerize code execution with Docker and Firecracker microVMs, and handle 1M+ active concurrent users.

---

## 1. Scale Bottleneck Roadmap (From 1k to 1M Users)

| Scale Tier | Primary Bottlenecks | Architectural Solutions |
|:---|:---|:---|
| **1,000 Users* | Minimal bottleneck | Single Node.js instance + MongoDB Atlas M0 cluster |
| **10,000 Users* | Single-threaded CPU limits on bcrypt and concurrent SSE connections | Cluster mode via PM2 / Docker containers behind Nginx load balancer |
| **50,000 Users* | Redundant LMM API calls and compounding inference latency | **Redis Semantic Cache** to serve identical query embeddings from cache |
| **100,000 Users* | Local child_process execution exhausts host CPU, memory, and disk | Isolated ephemeral **Docker execution containers** with CPU/memory limits |
| **1,000,000 Users* | Synchronous Judge0 polling blocks worker connections | **BullMQ + Redis Job Queue** with distributed worker nodes |

---

## 2. Scaling Real-Time Streaming (SSE) Horizontally

Unlike standard stateless REST endpoints that return in 50ms, Server-Sent Events maintain an open HTTP connection for 10 to 30 seconds per request.

### Key Scaling Strategies:
1. **Sticky Sessions vs Stateless Routing:** Since SSE connections are standard HTTP requests, they can be distributed across multiple backend containers using a Least-Connections load balancer algorithm.
2. **Proxy Buffering Disabled:** In reverse proxies like Nginx or Cloudflare, buffer options must be explicitly disabled (`proxy_buffering off` and `X-Accel-Buffering: no`) to prevent the gateway from buffering chunks before delivering them to the client.
3. **Socket File Descriptor Limits:** Upgrading the Linux OS open file limit (`ulimit -n 65536`) ensures worker processes can hold tens of thousands of simultaneous open SSE sockets.

---

## 3. Cost Optimization: Redis Semantic Caching

A massive percentage of coding queries repeat across learners (e.g., "Explain binary search", "What is the time complexity of quicksort?").

### How Semantic Caching Works:
1. Incoming prompt text is converted into a vector embedding.
2. A vector similarity query runs in Redis Vector Search.
3. If cosine similarity > 0.94 with an existing cached query, the cached response is streamed immediately at ~5ms latency with **$0 LLM inference cost**.
4. Cuts upstream API spending by an estimated 40% to 60% during peak usage.

---

## 4. Production Code Sandboxing: Docker & MicroVMs

To transition from the current development runner to enterprise-grade code execution:
- **Docker Container Pool:** Pre-warmed container pools initialized with `--network none`, `--read-only` root filesystem, `--memory 256m`, and `--cpus 0.5`.
- **MicroVMs (Firecracker / gVisor):** Sub-5ms startup times with complete hardware virtualization at the hypervisor level, isolating untrusted code entirely from the host Linux kernel.

---

## 5. Phase 9 Summary Cheatsheet

| Component | Current MVP Implementation | 1M User Scaled Architecture |
|:---|:---|:---|
| App Tier | Single Node.js instance | Containerized Node.js services orchestrated via Kubernetes (EKS/GKE) |
| AI Caching | Direct upstream API calls | Redis SemanticVector Cache with similarity matching |
| Execution Engine | Local child_process + Judge0 API | Asynchronous BullMQ worker cluster executing in Firecracker microVMs |
| Database | MongoDB Atlas cluster | MongoDB Atlas with Read Replicas and Redis connection caching |
| Video & Audio | Peer-to-Peer WebRTC signaling | Selective Forwarding Units (SFUs like LiveKit or Janus) for multi-party |
