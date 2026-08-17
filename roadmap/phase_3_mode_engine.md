# Phase 3: The AI Mode Engine & Prompt Architecture

> **What this phase covers:** The most architecturally elegant part of Apollo. The Mode Engine is how 16 different AI personalities share a single codebase, a single endpoint, and a single service — without a single `if/else` chain. After this phase, you should be able to explain every design decision in `modeEngine.js` and `aiService.js` from memory.

---

## 1. The Problem the Mode Engine Solves

Without the Mode Engine, what would Apollo look like?

**The naive approach (16 endpoints):**
```
POST /api/ai/explain
POST /api/ai/complexity
POST /api/ai/review
POST /api/ai/refactor
POST /api/ai/debug
POST /api/ai/security
POST /api/ai/roast
POST /api/ai/visualizer
POST /api/ai/hint
POST /api/ai/socratic
POST /api/ai/dsa
POST /api/ai/multilingual
POST /api/ai/friendly
POST /api/ai/interview-question
POST /api/ai/interview-evaluate
... and 1 more
```
Each endpoint would need its own route registration, its own controller function, its own service function, and its own system prompt string embedded inside that service function. Adding a new AI mode would require touching 4 different files.

**The Mode Engine approach (1 endpoint):**
```
POST /api/ai/chat  →  { mode: 'socratic' }  →  Mode Engine picks prompt
POST /api/ai/chat  →  { mode: 'roast' }     →  Mode Engine picks prompt
POST /api/ai/chat  →  { mode: 'dsa' }       →  Mode Engine picks prompt
```
Adding a new AI mode requires touching **1 file** (`modeEngine.js`) to add one key to one dictionary. Zero controller changes. Zero route changes. Zero service changes.

This is the **Factory Pattern** applied to prompt engineering.

---

## 2. The Factory Pattern — How MODE_PROMPTS Works

```javascript
const MODE_PROMPTS = {
  explain:    `You are Apollo Code Explainer...`,
  complexity: `You are Apollo Complexity Analyzer...`,
  review:     `You are Apollo Code Reviewer...`,
  refactor:   `You are Apollo Refactor Studio...`,
  debug:      `You are Apollo Debug Companion...`,
  editor_hint:`You are Apollo Hint Engine...`,
  security:   `You are Apollo Security Guardian...`,
  roast:      `You are Apollo, the savage code roaster...`,
  visualizer: `You are Apollo Code Visualizer...`,
  socratic:   `You are Apollo Socratic Coach...`,
  hint:       `You are Apollo Hint-First Guide...`,
  dsa:        `You are Apollo DSA Coach...`,
  multilingual:`You are Apollo Multilingual Tutor...`,
  persona_yoda:`You are Apollo as Master Yoda...`,
  persona_strict:`You are Apollo as The Strict Professor...`,
  persona_friendly:`You are Apollo as The Friendly Buddy...`,
  interview_interviewer:`You are a Senior Technical Interviewer...`,
  interview_evaluator:`You are a Principal Engineer evaluating...`,
};
```

`getSystemPrompt(modeKey)` is the factory function:
```javascript
export function getSystemPrompt(modeKey) {
  return MODE_PROMPTS[modeKey] || MODE_PROMPTS.explain;
  //                              ^^^^^^^^^^^^^^^^^^^^^^^^
  //                              Safe fallback — invalid keys default to 'explain'
}
```
A JavaScript object lookup is O(1). No switch, no if/else chain, no linear search. The "factory" is just a dictionary lookup.

---

## 3. Type 1 vs Type 2 — The Fundamental Split

Every mode in Apollo is one of two types. Understanding this distinction is critical because it determines which function in `aiService.js` is called.

### Type 1 — Editor / Single-Run Modes
```
User submits code
    ──► ONE request to OpenAI
    ──► ONE streaming response back
    ──► User reads the response
    ──► No conversation continues
```

**Used by:** `explain`, `complexity`, `review`, `refactor`, `debug`, `editor_hint`, `security`, `roast`, `visualizer`

**How the prompt is built — `buildPrompt()`:**
```javascript
export function buildPrompt(modeKey, code, language) {
  const systemPrompt = getSystemPrompt(modeKey);
  return `${systemPrompt.trim()}

---
Code (${language || 'unknown'}):
\`\`\`${language || ''}
${code}
\`\`\``;
}
```
The entire instruction (system prompt + code) is concatenated into **one long user message**. The OpenAI `messages` array looks like this:
```javascript
[{
  role: 'user',
  content: `You are Apollo Code Reviewer — a meticulous principal engineer.
  
HOW YOU WORK:
- Scan for: bugs, anti-patterns...

---
Code (javascript):
\`\`\`javascript
function add(a, b) { return a + b }
\`\`\``
}]
```
There is no `system` role message here — the persona and the code are merged into one user message. This is a specific design choice in `aiService.js`'s `streamByMode()` function.

### Type 2 — Chat / Conversational Modes
```
User sends message 1
    ──► OpenAI responds
User sends message 2
    ──► OpenAI responds (aware of message 1 and response 1)
User sends message 3
    ──► OpenAI responds (aware of full history)
    ... (continues indefinitely)
```

**Used by:** `socratic`, `hint`, `dsa`, `multilingual`, `persona_friendly`, `persona_yoda`, `persona_strict`, `interview_interviewer`, `interview_evaluator`

**How the prompt is built — `buildChatContents()`:**
```javascript
export function buildChatContents(modeKey, code, language, history) {
  const systemPrompt = getSystemPrompt(modeKey);
  const contents = [];

  // Layer 1: System persona
  contents.push({ role: 'system', content: systemPrompt.trim() });

  // Layer 2: Code context (if code exists and is not placeholder)
  if (code && code.trim() && code.trim() !== '// No code provided') {
    contents.push({
      role: 'system',
      content: `User's code context (${language}):\n\`\`\`${language}\n${code}\n\`\`\``
    });
  }

  // Layer 3: Conversation history
  for (const msg of history) {
    contents.push({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.content,
    });
  }

  return contents;
}
```

The resulting `messages` array for a 2-turn Socratic conversation looks like:
```javascript
[
  { role: 'system',    content: 'You are Apollo Socratic Coach — you teach by asking...' },
  { role: 'system',    content: 'User\'s code context (python):\n```python\ndef solve(): pass\n```' },
  { role: 'user',      content: 'How do I find the maximum in a list?' },
  { role: 'assistant', content: 'What would happen if you went through each element one by one?' },
  { role: 'user',      content: 'I would compare each one to the current max?' }
]
```
OpenAI sees the full conversation and generates a response that is aware of everything the user and model have said. This is how multi-turn memory works — the client sends the **entire conversation history** on every request. There is no server-side session storage for chat history.

**The `role: 'model'` → `role: 'assistant'` translation:**
Your frontend stores messages as `{ role: 'user' }` and `{ role: 'model' }` (Gemini's format from the original integration). OpenAI requires `{ role: 'assistant' }` for AI responses. The `buildChatContents()` function translates:
```javascript
role: msg.role === 'model' ? 'assistant' : 'user'
```
This is where the Gemini→OpenAI migration leftover is visible. A production cleanup would standardize the frontend to use `'assistant'` everywhere.

---

### 🧠 Plain-English Explanation — Why the Client Sends History Every Time

> *(Read this if the Type 1 / Type 2 split is not fully clear yet)*

**First, the most important thing to know about LLMs:**

OpenAI (and all LLMs) are **completely stateless**. Every time you call the API, it remembers **absolutely nothing** from any previous call. It is like talking to someone who gets amnesia after every single sentence.

So if you want a conversation to *feel* continuous, **you** (the client/server) must send the entire past conversation on every request. OpenAI does not store anything on its end.

**Why doesn't Apollo's server store history instead?**

Storing history on the server requires:
- A session ID per user per conversation
- A database read on every message to fetch past history
- A database write after every AI reply to save the new message

Sending it from the frontend is simpler and cheaper for an MVP:
```
❌ Server-storage approach:
User types → Frontend sends only the new message
            → Server fetches full history from DB
            → Server appends new message
            → Server calls OpenAI
            → Server saves reply back to DB
            → Returns reply

✅ Apollo's approach:
User types → Frontend sends new message + ALL previous messages
            → Server immediately calls OpenAI
            → Returns reply
            → Frontend stores reply in React useState
```
No DB reads/writes per message. The **browser's RAM (React `useState`)** is the memory.
**The trade-off:** Refreshing the page wipes the chat history — it only lives in React state. Fine for a learning tool MVP, not acceptable for a production product.

**What is `content` in each message?**
Each message in the `messages` array has two fields:
- `role` — Who said this? (`"user"` = human, `"assistant"` = AI, `"system"` = hidden instructions)
- `content` — What did they actually say? (the raw text of the message)

OpenAI reads the entire array top-to-bottom and *pretends it was always in that conversation*, then generates the next reply.

**Summary Map:**
```
Type 1 (Single-shot)              Type 2 (Conversational)
────────────────────              ──────────────────────────────
One request → one reply           Many requests, each with full history
buildPrompt()                     buildChatContents()
No history sent                   Entire history sent every time
Persona + code = one user msg     system + system + user/assistant pairs
Used in: Workspace sidebar        Used in: Chat tab, Interview, WorkspaceChat
Example: click "Explain Code"     Example: Socratic back-and-forth chat
```

---

## 4. How the Controller Decides Which Type to Use

In `chatController.js`, the `streamChat()` function decides which service function to call based entirely on whether `history` is present:

```javascript
const stream = (history && history.length > 0)
  ? streamChatByMode(code, language, mode || 'explain', history)  // Type 2
  : streamByMode(code, language, mode || 'explain');              // Type 1
```

**Type 1 triggered when:** `history = []` or `history` is not sent. This happens when the user clicks "Ask AI" for the first time on a mode (the `handleAskAI()` function in Workspace.jsx explicitly passes `history: []`).

**Type 2 triggered when:** `history` has at least one message. This happens on follow-up messages in the chat (`handleSendMessage()` builds the history from the existing `messages` state).

**The elegant implication:** The frontend can use a Type 1 mode (like `explain`) as a Type 2 conversational mode simply by sending history with the request. The backend automatically handles both cases through the same endpoint.

---

## 5. Deep Dive — Every Mode's System Prompt

### `explain` — Code Explainer
```
Walk through section-by-section (not line-by-line).
WHAT it does, WHY it works, non-obvious tricks.
Use analogies for complex logic.
150-250 words. Markdown with ## headers.
```
**Interview note:** "Section-by-section not line-by-line" is a deliberate UX decision. Line-by-line explanations for a 200-line function produce walls of text. Section grouping produces scannable, digestible content.

### `complexity` — Big-O Analyzer
```
FIRST LINE: **Time: O(___) | Space: O(___)**  (always, no exceptions)
Then 3-5 bullets explaining the dominant operations.
Flag hidden complexities (string concat in loop = O(n²) surprise).
Max 120 words. "Be surgical."
```
**Interview note:** The "First line always" rule prevents the model from burying the Big-O result at the end of a long explanation. The engineer cares about the number first, reasoning second.

### `review` — Code Reviewer
```
Scan for: bugs, anti-patterns, edge-case misses, naming, SOLID violations.
Only report REAL issues. Never invent problems.
For each: Issue → Why it matters → Fix (code snippet).
Max 5-7 issues. Prioritize by severity.
End with: 🟢 Clean | 🟡 Needs Work | 🔴 Critical
```
**Interview note:** "Only report REAL issues. Never invent problems to seem thorough." This is anti-hallucination prompt engineering. LLMs have a tendency to invent minor issues to appear thorough. The explicit constraint reduces this.

### `refactor` — Refactor Studio
```
Show the FULL refactored code first in a single block.
Then 4-6 bullets: what changed and why.
Apply: meaningful names, DRY, early returns, guard clauses, modern syntax.
Preserve original logic — change structure only, not behavior.
```
**Interview note:** "Show full refactored code first" is a UX decision. Developers want to immediately see the improved code, then understand why. Explanation-first buries the main value.

### `debug` — Debug Companion
```
Identify the EXACT line(s) causing the issue.
Format: "**Bug: [type] on line [N]**"
Show broken → fixed lines side by side.
Root cause in one sentence. Prevention in one sentence.
If no bug found: say so, then list 2-3 edge cases to watch.
Max 150 words. "Developers want speed."
```
**Interview note:** The "if no bug found, list edge cases" instruction is important. Without it, a bug-free code submission would produce an empty or confusing response. The edge case fallback gives value regardless.

### `editor_hint` — Hint Engine
```
Exactly ONE high-level hint.
NEVER write the full solution.
NEVER give exact code.
Point at a pattern, data structure, or logical flaw.
Start with: 💡 **Hint:**
Max 2-3 sentences.
```
**Contrast with `hint` (Type 2):** `editor_hint` is Type 1 — one hint per button click. `hint` is Type 2 — progressive hints across a conversation, each more specific than the last.

### `security` — Security Guardian
```
Check for: SQLi, XSS, CSRF, hardcoded secrets, path traversal, insecure randomness, 
           buffer overflows, OWASP Top 10.
For each finding: Vulnerability → Line → Attack vector (1 sentence) → Fix (code).
End with: 🟢 Safe | 🟡 Warning | 🔴 Critical
If clean: "🟢 No vulnerabilities detected."
```
**Interview note:** The OWASP Top 10 reference is signal that you understand security taxonomy, not just individual bugs.

### `roast` — Code Roaster
```
3-5 brutal FUNNY roasts targeting REAL problems.
Each roast: savage joke → one-line actual fix.
Creative metaphors, pop culture references, dev humor.
End with: "🔥 Damage Score: X/10"
Every fix must be technically accurate despite the comedy.
TONE: "Code review by a comedian who's also a 10x engineer."
```
**Interview note:** "Every fix must be technically accurate despite the comedy" is the key constraint. Without it, the model produces funny roasts with nonsensical advice. The humor is the wrapper; the technical accuracy is the product.

### `visualizer` — Code Visualizer (Most Complex Prompt)
```
Perform a dry-run of the code.
Output STRICT JSON: { "steps": [ { explanation, nodes, edges } ] }
Limit to 8 steps (prevents token truncation).
Nodes: React Flow format — { id, data: { label }, className }
Edges: { id, source, target, animated, label }
CRITICAL: Mutate edge source/target when pointers change (e.g., linked list reversal).
CRITICAL: Include ALL nodes in EVERY step (not just changing ones).
NO position/x/y coordinates — frontend uses auto-layout.
Wrap in \`\`\`json ... \`\`\` fences.
```
**Why this is the hardest prompt:** The model must:
1. Correctly execute the algorithm mentally (dry-run).
2. Represent the exact state of all data structures at each step.
3. Output valid JSON (not natural language).
4. Follow React Flow's node/edge schema exactly.
5. Append pointer variables to node labels.
6. Mutate edge connections when algorithms modify pointers.
7. Never omit nodes even when they aren't changing (a common LLM optimization mistake).
8. Respect the 8-step limit to prevent response truncation.

This prompt is the result of multiple iterations of prompt engineering to get reliable, parseable output.

### `socratic` — Socratic Coach
```
Respond ONLY with 2-3 guiding questions.
NEVER write code. NEVER give direct solutions. NEVER explain the answer.
If they beg for the answer: "What have you tried so far?"
Every response MUST end with a question.
Max 3-4 sentences.
ZERO code in responses.
```
**Why this mode is valuable:** Most AI tools will immediately give the answer if you ask. Socratic mode is behaviorally impossible to shortcut. Even if the user writes "Just tell me the answer", the model responds: "What approaches have you already ruled out, and why?" This enforces active recall — the most effective learning technique.

### `hint` — Hint-First Guide (Type 2)
```
ONE hint per message. Never more.
Start abstract/vague, each follow-up more specific.
Progression across 4 messages:
  1. High-level approach / data structure.
  2. Specific technique or pattern.
  3. Near-complete logic outline (no code).
  4. Pseudocode only (if still struggling).
If user says "just tell me": "Almost there! One more hint..." → give next hint.
```

### `dsa` — DSA Coach
```
IF user asks to LEARN: Explain concept ≤200 words + small code example. 
                       Cover: what, when, time complexity.
IF user shares CODE: Analyze complexity. Guide O(n²) → O(n) if suboptimal.
IF user names a PROBLEM: Walk through approach. Name the pattern 
                         (sliding window, DP, two pointers).
IF user wants to PRACTICE: Suggest a problem, ask them to try it.
Always mention patterns by name. Use proper terminology.
```

### `multilingual` — Multilingual Tutor
```
Detect user's language from their message.
Respond ENTIRELY in that language.
Keep technical terms in English (variable names, keywords).
If ambiguous, ask which language they prefer.
```
**Technical note:** Language detection is entirely prompt-driven — no external NLP library. The LLM's own language understanding capabilities handle detection and response generation simultaneously.

### `interview_interviewer` — The Interviewer
```
ROLE: Senior Technical Interviewer from Top Tier Tech Company.
Setup phase: Give a Blind 75-style DSA problem.
Coding phase: ZERO code. Only answer clarifying questions.
Post-submit: Ask 2-3 deep behavioral/technical follow-up questions.
"I cannot give you any hints on the logic."
TONE: Professional, cold, objective.
```

### `interview_evaluator` — The Evaluator
```
Score on 3 categories (1-10):
  1. Technical Correctness
  2. Efficiency (Big-O)
  3. Communication
Final decision: HIRED or NO HIRE.
List 3 strengths + 3 areas for growth.
FORMAT: Structured table for scores. Be brutally honest.
```
**Interview note about the two interview modes:** The Interviewer and Evaluator are separate modes because they have completely different personalities and roles. Using one mode for both would produce inconsistent, confused behavior. The frontend `Interview.jsx` explicitly switches between `'interview_interviewer'` and `'interview_evaluator'` mode keys at the right point in the 4-phase state machine.

---

### 🎯 Deep Explanation — The Two Interview Modes & How They Work Together

The Interview feature uses **exactly 2 AI modes**, not one. This is a deliberate design decision. Here is why they are separate and how they connect:

**The problem with one mode:**
Imagine if you tried to use a single AI mode to both *ask* the interview question AND *grade* the candidate. The model would be confused — is it the interviewer right now, or the judge? Should it be formal and cold, or analytical and structured? Mixing these roles in one system prompt produces inconsistent, confusing output.

**The solution — Split responsibilities:**

| Mode Key | Role | Personality | When Used |
|---|---|---|---|
| `interview_interviewer` | Asks the DSA problem, conducts the session | Cold, professional, gives zero hints | During SETUP and CODING phases |
| `interview_evaluator` | Grades the candidate, gives the verdict | Analytical, structured, brutally honest | Only at the RESULT phase |

**How the 4-Phase State Machine switches between them:**

```
PHASE 1 — SETUP
  Mode: interview_interviewer
  Action: User picks difficulty + language → clicks "Start Interview"
  API call: streamAIChat({ mode: 'interview_interviewer', history: [
    { role: 'user', content: 'Give me a Medium difficulty DSA problem...' }
  ]})
  Result: AI acts as interviewer, generates a real Blind 75-style problem

         ↓

PHASE 2 — CODING
  Mode: interview_interviewer
  Action: 45-minute countdown. User writes code. 3 code runs allowed.
  API call (if user asks clarifying question): same mode
  AI behaviour: "I cannot give you any hints on the logic. Think about constraints."

         ↓  (timer hits 0 OR user clicks "Submit")

PHASE 3 — FOLLOW-UP
  Mode: interview_interviewer
  Action: AI asks 2-3 behavioral follow-up questions about the user's choices
  Example: "Walk me through your approach. Why did you choose a hash map?"
  After 3 user replies → auto-transition to Phase 4

         ↓  (after 3 exchanges, setTimeout 1.5s)

PHASE 4 — RESULT
  Mode: interview_evaluator  ← MODE SWITCHES HERE
  Action: evaluatePerformance() is called automatically
  Sends: the problem + the candidate's code + the full follow-up conversation
  AI behaviour: Scores 1-10 on Technical Correctness, Efficiency, Communication
               Returns structured table + HIRED / NO HIRE verdict
               Lists 3 strengths + 3 areas for growth
```

**Why is `evaluatePerformance()` called automatically?**
In `Interview.jsx`, inside the `onDone` callback of the follow-up chat:
```javascript
if (newMessages.filter(m => m.role === 'user').length >= 3) {
  setTimeout(() => {
    setPhase(PHASES.RESULT);
    evaluatePerformance(newMessages);
  }, 1500);   // 1.5 second delay — lets the user read the last reply first
}
```
After the user has sent 3 messages in the follow-up phase, the system automatically transitions to evaluation. The 1.5-second delay is a UX decision — it lets the user read the final interviewer message before the screen switches to the evaluation result.

**What does the evaluator receive?**
The full context — problem statement + candidate's code + the entire follow-up conversation — is assembled into one giant prompt:
```javascript
history: [{
  role: 'user',
  content: `Here is the problem:\n${problem}\n\n` +
           `Here is the candidate's code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n` +
           `Here is the follow-up discussion:\n${conversation}\n\n` +
           `Please evaluate this candidate.`
}]
```
The evaluator mode then scores everything and returns the HIRED / NO HIRE verdict.

---

## 6. `aiService.js` — How Modes Are Consumed

`aiService.js` contains 7 exported functions. Understanding which function handles which scenario is essential:

```
Mode Engine Consumer Map:
─────────────────────────────────────────────────────────────
streamByMode(code, language, mode, history?)
  → Used for Type 1 modes (no history or first message)
  → Calls buildPrompt() → concatenates system prompt + code
  → Creates messages as [{role:'user', content: prompt}]
  → BUT: if history exists, prepends history messages before it

streamChatByMode(code, language, mode, history)
  → Used for Type 2 modes (multi-turn)
  → Calls buildChatContents() → structured messages array
  → Returns [{role:'system',...},{role:'system',...},{role:'user',...},...]

streamRoastCode(code, language)
  → Standalone function — does NOT use modeEngine
  → Has its own hardcoded prompt inside aiService.js
  → Called by the /api/ai/roast route (a legacy separate endpoint)

streamCodeReview(code, language)
  → Standalone function — does NOT use modeEngine
  → Has its own hardcoded prompt inside aiService.js
  → Called by the /api/ai/review route (a legacy separate endpoint)

streamExplanation(code, language)
  → Standalone — hardcoded prompt for the /api/ai/explain endpoint

streamComplexity(code, language)
  → Standalone — hardcoded prompt for the /api/ai/complexity endpoint

generateTestsAsJson(code, language)
  → NOT a streaming function — returns a Promise<Array>
  → Uses response_format: { type: "json_object" }
  → No mode engine involvement — hardcoded prompt
─────────────────────────────────────────────────────────────
```

**Why do standalone functions exist alongside the Mode Engine?**
The standalone functions (`streamRoastCode`, `streamCodeReview`, `streamExplanation`, `streamComplexity`) are legacy code from the first version of Apollo before the Mode Engine was built. They power the legacy dedicated routes (`/api/ai/roast`, `/api/ai/review`, etc.) which are still active. The Mode Engine powers the unified `/api/ai/chat` endpoint. Both approaches co-exist because the dedicated routes are still used by some pages (the `/roast` and `/code-review` dedicated pages).

---

## 7. Prompt Engineering Patterns to Know

These are the specific engineering techniques used in the Apollo prompts that you should be able to name and explain:

### 1. Persona Anchoring
Every prompt starts with "You are Apollo [Role]." This establishes a clear identity that constrains all subsequent behavior. Without persona anchoring, the model's behavior is undefined and inconsistent.

### 2. Output Format Constraints
```
"Max 150 words."
"First line must be: **Time: O(___) | Space: O(___)**"
"Start with 💡 **Hint:**"
"End with 🟢 Clean | 🟡 Needs Work | 🔴 Critical"
```
Explicit format constraints reduce hallucination and improve parsability. Without these, the model produces varied, inconsistent output.

### 3. Anti-Hallucination Guards
```
"Only report REAL issues. Never invent problems to seem thorough."
"Only flag REAL vulnerabilities. Don't cry wolf."
```
LLMs have a tendency to produce content even when there is nothing to produce (inventing bugs to appear thorough). Explicit negative constraints reduce this behavior.

### 4. Behavioral Prohibition for Socratic Mode
```
"NEVER write code. NEVER give direct solutions. NEVER explain the answer."
"ZERO code in your responses. Questions only."
"Every response MUST end with a question."
```
Triple prohibition makes it nearly impossible for the model to accidentally violate the Socratic constraint, even under prompt injection attempts ("just tell me the answer").

### 5. Fallback Behavior Specification
```
"If NO bug is found: say '✅ No bugs detected' then list 2-3 edge cases to watch."
"If clean: say '🟢 No vulnerabilities detected.'"
"If user says 'just tell me': 'Almost there! One more hint...' → give a more specific hint."
```
Specifying what to do in the null/edge case prevents empty or confused responses.

### 6. Progressive Hint Protocol
The `hint` mode specifies a 4-stage escalation:
```
Stage 1: High-level approach/data structure
Stage 2: Specific technique or pattern
Stage 3: Near-complete logic outline (no code)
Stage 4: Pseudocode only
```
This creates a *stateful-feeling* experience even though the model has no actual state — the progression is instructed in the system prompt and the model infers which stage to apply based on conversation history.

### 7. JSON Schema Forcing (Visualizer)
The visualizer prompt specifies the exact React Flow schema for nodes and edges, including field names, types, and semantics. This is structural prompt engineering — using the prompt to enforce an API contract.

---

## 8. The Frontend Mode Registry — modeConfig.js

`modeConfig.js` is the frontend's parallel to `modeEngine.js`. It registers every mode the UI should display:

```javascript
export const EDITOR_MODES = [
  { key: 'explain',     label: 'Code Explainer',    lucideIcon: 'BookOpen',   color: '#58a6ff' },
  { key: 'complexity',  label: 'Complexity',         lucideIcon: 'Timer',      color: '#d29922' },
  { key: 'review',      label: 'Code Review',        lucideIcon: 'Search',     color: '#4bccff' },
  { key: 'refactor',    label: 'Refactor Studio',    lucideIcon: 'RefreshCw',  color: '#39d353' },
  { key: 'debug',       label: 'Debug Companion',    lucideIcon: 'Bug',        color: '#f778ba' },
  { key: 'security',    label: 'Security Guardian',  lucideIcon: 'Shield',     color: '#ff7b72' },
  { key: 'roast',       label: 'Roast My Code',      lucideIcon: 'Flame',      color: '#f85149' },
  { key: 'visualizer',  label: 'Code Visualizer',    lucideIcon: 'Network',    color: '#a371f7' },
  { key: 'editor_hint', label: 'Get a Hint',         lucideIcon: 'Lightbulb',  color: '#f0883e' },
];

export const CHAT_MODES = [
  { key: 'socratic',         label: 'Socratic Coach',    lucideIcon: 'Brain',      color: '#a371f7' },
  { key: 'hint',             label: 'Hint-First',         lucideIcon: 'Lightbulb',  color: '#f0883e' },
  { key: 'dsa',              label: 'DSA Learning',       lucideIcon: 'BarChart3',  color: '#3fb950' },
  { key: 'explain',          label: 'Code Explainer',     lucideIcon: 'BookOpen',   color: '#58a6ff' },
  { key: 'multilingual',     label: 'Multilingual',       lucideIcon: 'Globe',      color: '#79c0ff' },
  { key: 'persona_friendly', label: 'Friendly Buddy',     lucideIcon: 'Heart',      color: '#f0883e' },
];
```

**The `key` field is what gets sent to the backend as `mode`.** The `label`, `lucideIcon`, and `color` are purely for the UI sidebar display. When the user clicks "Socratic Coach", the frontend sends `{ mode: 'socratic' }` in the request body. The backend's `modeEngine.js` receives `'socratic'` and returns `MODE_PROMPTS['socratic']`.

The `modeConfig.js` also defines the default export:
```javascript
const MODES = [...EDITOR_MODES, ...CHAT_MODES.filter(m => !EDITOR_MODES.find(e => e.key === m.key))];
export default MODES;
```
This deduplicates `explain` (which exists in both `EDITOR_MODES` and `CHAT_MODES`), keeping only the Editor version in the merged list, while still exporting the separate arrays for use by different UI sections.

---

## 9. Key Files to Read in Full

1. **[server/services/modeEngine.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/modeEngine.js)** ⭐ — Read every single system prompt. Know what each one instructs the model to do and why.
2. **[server/services/aiService.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/services/aiService.js)** ⭐ — Understand `streamByMode` vs `streamChatByMode`. Trace how `buildPrompt` vs `buildChatContents` constructs the messages array differently.
3. **[client/src/modes/modeConfig.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/client/src/modes/modeConfig.js)** — Understand the frontend registry and how `key` connects to the backend.
4. **[server/controllers/chatController.js](file:///c:/Users/singh/OneDrive/Desktop/PROJECTS/Apollo/server/controllers/chatController.js)** — Focus on the `history.length > 0` branch logic that determines Type 1 vs Type 2.

---

## 10. Interview Questions Specific to This Phase

1. **"You have 16 AI modes but only one endpoint. How?"**
   → Factory Pattern. `modeEngine.js` is a dictionary mapping mode keys to system prompts. `getSystemPrompt(key)` is an O(1) lookup. One endpoint receives `mode` in the request body, looks it up, injects the correct system prompt, and calls OpenAI.

2. **"What is the difference between Type 1 and Type 2 modes?"**
   → Type 1 modes are single-shot: user submits code, gets one response, conversation ends. Type 2 modes are conversational: the full message history is sent on every request so the model can maintain context across turns. The controller routes to different service functions based on whether `history.length > 0`.

3. **"How did you prevent the Socratic coach from giving away the answer?"**
   → Prompt engineering. The system prompt contains three explicit prohibitions: "NEVER write code. NEVER give direct solutions. NEVER explain the answer." It also mandates "Every response MUST end with a question." And provides a specific fallback for begging: "What have you tried so far?" No code in the application enforces this — it is entirely a prompt engineering constraint.

4. **"What happens if the AI returns invalid JSON from the Visualizer mode?"**
   → Currently, the frontend's `CodeVisualizer.jsx` tries to parse the JSON from the response. If parsing fails, the component would likely crash or display an error. In production, you would add `try/catch` around the JSON parse and display a user-friendly "Visualization failed — try with simpler code" message. This is a known limitation of the visualizer mode.

5. **"Why does the `role: 'model'` get translated to `role: 'assistant'`?"**
   → Gemini's API format uses `'model'` for AI responses. OpenAI's API requires `'assistant'`. When the project was migrated from Gemini to OpenAI, the frontend's chat history format (stored in React state) was not updated — it still stores AI messages as `{ role: 'model', content: '...' }`. The `buildChatContents()` function translates this on every request: `msg.role === 'model' ? 'assistant' : 'user'`. A production cleanup would standardize to `'assistant'` throughout.
