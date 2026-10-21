# Phase 5: Code Execution Sandbox (Judge0 + Local Runner)

> **What this phase covers:** The complete design, implementation, and security architecture of Apollo code execution engine. You will learn the engineering rationale behind the **Dual-Engine design**, how local child process spawning works, the asynchronous polling mechanics of the **Judge0 cloud sandbox**, and how to defend the system against Remote Code Execution (RCE) in senior technical interviews.

---

## 1. The Core Architecture and Tradeoff

A coding interview platform is useless if candidates cannot run and test their code in real time. But running arbitrary, untrusted user code is one of the most hazardous operations in backend engineering.

### The Naive Approaches:
1. **Send everything to a 3rd-party sandbox (like Judge0 public API):**
   - **The Failure:** Judge0 public tier allows ~50-100 submissions per day. A single developer running 15 tests blows through the daily quota in 20 minutes. It also introduces 2-5 seconds of network roundtrip and polling delay.
2. **Execute everything locally on the host Node.js server:**
   - **The Failure:** Running interpreted code like JS/Python is straightforward, but running compiled languages like C++ or Java requires installing and managing full native toolchains, compilers, and JVM runtimes on your deployment containers.

### Apollo Solution: The Hybrid Dual-Engine Architecture

`
                    POST /api/code/run { code, language }
                                    |
                       +------------+------------+
                       |                         |
            [Interpreted Languages]     [Compiled Languages]
             JavaScript and Python          C++ and Java
                       |                         |
                       v                         v
             Engine A: Local Runner    Engine B: Cloud Sandbox
             (child_process.exec)           (Judge0 REST API)
                       |                         |
               Zero external API            Zero compiler
               quota consumption          installation overhead
                       |                         |
              Sub-500ms execution        Containerized isolation
                       +------------+------------+
                                    |
                                    v
                     Unified Normalized Response:
                 { stdout, stderr, exitCode }
`

---

## 2. Engine A: Local Process Execution (codeRunner.js)

For JavaScript and Python, Apollo bypasses external APIs and runs code directly on the host using Node child_process.

### 5 Critical Implementation Details in codeRunner.js:
1. **Promisified Execution:** Wrapped child_process.exec with util.promisify for clean async/await.
2. **Ephemeral File Generation:** Creates temporary files in os.tmpdir() with timestamp and random salt to prevent collisions.
3. **Guaranteed Cleanup in finally:** fs.unlink() always executes in finally block, preventing disk inode exhaustion.
4. **Process Timeouts:** Uses 5000ms timeout option so accidental while(true) loops are killed automatically by OS.
5. **Cross-Platform Binary Detection:** Checks os.platform() === win32 to choose python vs python3.

---

## 3. Engine B: Cloud Sandbox via Judge0

For C++ and Java, installing compilers on lightweight cloud instances is impractical. Apollo delegates them to Judge0.

### The Language ID Mapping:
- Java: 62 (OpenJDK 13/14)
- C++: 54 (GCC 9.2.0)

### Asynchronous Polling Lifecycle:
1. **POST /submissions:** Submits code and runtime ID. Returns a token.
2. **Poll GET /submissions/:token:** Backend polls every 1000ms (max 15 iterations).
3. **Status Check:** When status.id >= 3, execution is finished (Accepted, Compilation Error, Runtime Error, or Time Limit Exceeded).

---

## 4. Interview Pressure Mechanism: Limited Code Runs

In a real technical interview, candidates cannot spam Run 50 times. In Interview.jsx:
- Candidates are granted a maximum of 3 code runs (maxRuns = 3).
- When runs are exhausted, the candidate must dry-run their code mentally and communicate their logic verbally.

---

## 5. Security Defense: The Remote Code Execution (RCE) Challenge

### Interview Defense Strategy:
1. **Acknowledge the MVP Reality:** Local child_process is an intentional tradeoff for unlimited sub-second execution in development without exhausting Judge0 quotas.
2. **Current Guardrails:** 5-second process timeouts, non-root execution in production containers, and immediate file unlinking in finally blocks.
3. **Production-Grade Solution:** In enterprise production, isolate execution using Docker containers (--network none, --read-only root filesystem, --memory 256m) or Firecracker microVMs with sub-5ms boot times.

---

## 6. Phase 5 Summary Cheatsheet

| Component | JavaScript and Python | C++ and Java |
|:---|:---|:---|
| Execution Host | Local host server | Cloud Judge0 Sandbox |
| API Mechanism | child_process.exec | Asynchronous REST Polling |
| Average Latency | ~150ms - 400ms | ~2500ms - 4000ms |
| Daily Limit | Infinite | Tier-limited |
| Cleanup | fs.unlink() in finally | Handled by Judge0 container lifecycle |
| Timeout Guard | 5000ms via Node exec option | 5000ms CPU time via Judge0 config |