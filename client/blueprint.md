# 🚀 Apollo: AI Coding Coach & Workspace Blueprint
*(The Definitive Team Reference Document)*

This document is the absolute source of truth for the Apollo project. It outlines the vision, technical stack, system architecture, feature breakdown, project structure, and the exact order of development phases.

---

## 🛠️ 1. Technical Stack & Difficulty Levels

To build Apollo, the team will use a heavily customized MERN stack with external AI and compilation APIs.

*   **Frontend: React.js (Vite) + TailwindCSS + Framer Motion**
    *   *Difficulty: Medium.* Focus is on a hyper-responsive Single Page Application (SPA) with smooth panel transitions and a dark-mode default similar to VS Code.
*   **Backend: Node.js + Express.js**
    *   *Difficulty: Medium.* Will act as a secure proxy between the user, the database, the AI, and the code-compiler sandboxes.
*   **Database: MongoDB (Mongoose)**
    *   *Difficulty: Low.* Chosen specifically because AI chat histories and dynamically saved code snippets do not map well to strict SQL tables. NoSQL provides the flexibility we need.
*   **AI Engine: Google Gemini API (Streaming via `@google/genai`)**
    *   *Difficulty: High.* Prompt engineering 20 different "Contexts/Personas" requires careful formatting and parsing.
*   **Code Platform Systems: Monaco Editor & Judge0/Piston API**
    *   *Difficulty: High.* Monaco is powerful but complex to wire up. The Judge0 API handles secure execution of user code (we will **never** run user code natively on our server to prevent security breaches).

---

## 🧠 2. The Core Magic: "Zero Latency" Streaming Text Tokens

**The Problem:** LLMs are slow. Asking an AI to review 100 lines of code and write a 4-paragraph response usually takes 5–8 seconds. If a user stares at a spinning loading wheel for that long, the app feels broken.

**The Solution (Server-Sent Events):**
We circumvent waiting entirely by using **Streaming Text Tokens**.
*   The AI calculates a "token" (a small 3-4 letter chunk of a word).
*   The instant the Gemini API generates a token, our Express backend streams it directly to the React frontend using a steady HTTP connection constraint (`Content-Type: text/event-stream`).
*   The React frontend immediately appends the chunk to the Chat UI.
*   **The Psychological Effect:** The user perceives the latency as **<0.5 seconds**. The AI visually "types" out the answer live, exactly like ChatGPT does. This makes Apollo feel incredibly fast and conversational.

---

## 📂 3. Exact Project Structure (Monorepo)

For the team to stay organized, the codebase is split into a frontend `client` and backend `server`.

```text
arpit/Practium6/
├── client/                    # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/        # Sidebar, Header, etc.
│   │   │   ├── CodeEditor/    # Monaco editor wrapper
│   │   │   ├── ChatPanel/     # AI response display
│   │   │   ├── ModeSelector/  # Mode switching UI
│   │   │   └── Visualizer/    # Code visualization
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Workspace.jsx  # Main coding playground
│   │   │   ├── Profile.jsx      # Theme & Persona settings
│   │   │   ├── ReviewHub.jsx    # PR diffs & team rules
│   │   │   └── Gamification.jsx # Leaderboards & Badges
│   │   ├── modes/             # Mode configurations
│   │   │   ├── modeConfig.js  # All 20 mode definitions
│   │   │   └── prompts/       # System prompts per mode
│   │   ├── services/          # API calls (Judge0, Backend)
│   │   ├── context/           # React context (auth, mode)
│   │   └── App.jsx
│   └── package.json
│
├── server/                    # Express Backend
│   ├── config/                # DB, AI provider config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── codeController.js
│   │   └── trackingController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── Progress.js
│   │   └── CodeSnippet.js
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   │   ├── aiService.js       # AI stream handling
│   │   ├── codeRunner.js      # Judge0/Piston proxy
│   │   └── modeEngine.js      # System prompt injection
│   ├── prompts/               # System prompts validation
│   └── server.js
│
└── package.json               # Root config
```

---

## 🎨 4. Project Pages & The Workspace Layout

Apollo is designed to not overwhelm the user. All 20 features are carefully placed contextually.

**The 6 Main Pages:**
1.  **Landing Page (`/`)**: Auth, Hero Section, Product Pitch.
2.  **Dashboard (`/dashboard`)**: The learning hub showing XP, Badges, Weak spots, and saved sessions.
3.  **The Workspace (`/workspace`)**: The core AI editor screen (detailed below).
4.  **Review Hub (`/review`)**: A split-screen diff-viewer for reviewing full Github PRs against team standards.
5.  **Gamification & Leaderboard (`/gamification`)**: A dedicated page for viewing global rankings, unlocking aesthetic badges, and comparing AI interaction scores with friends.
6.  **Profile & Settings (`/profile`)**: Manage dark/light themes, default AI persona selection, and stored Snippet History.

**Inside The Workspace (`/workspace`):**
To fit 20 features cleanly, the Workspace is heavily segmented:
*   **The Top Bar:** Contains the "Current AI Mode" dropdown (switch from Socratic to Roast).
*   **Left Panel (The AI Chat):** The conversational UI where Streaming Tokens arrive. Features like **Voice Tutor** live here as a small microphone icon.
*   **Center Panel (Monaco Editor):** The text editor.
    *   *The Highlight Menu:* When a user highlights lines 5-10, a contextual floating pop-up appears allowing them to click "Explain", "Complexity", "Refactor", or "Debug".
*   **Bottom Panel (Dynamic Sliding Drawer):** Hidden by default. Slides up when a user clicks "Run Code" to show the Terminal/Compiler output. Also used for the **Test Generator** to show Jest tests.

---

## 🎯 5. The 20 Features (Categorized by Origin)

### Category A: The Learning Modes (Chat Panel UI)
*Changes the System Prompt behavior of the Chat.*
1.  **Hint-First Problem Assistant:** Refuses direct answers; gives logic hints.
2.  **Socratic Coach Mode:** Responds strictly with guiding questions to trigger self-discovery.
3.  **DSA Learning Mode:** Analyzes time complexity and guides the user from brute-force to optimal `O(N)`.
4.  **Personalized Coach Personas:** Adjusts tone strictly (Friendly, Strict, Yoda, etc.).
5.  **Code Explainer Mode:** Breaks down blocks line-by-line tailored to beginner/expert depth.
6.  **Roast My Code Mode:** Gives humorous, brutal, but constructive code critiques.
7.  **Multilingual Learning Mode:** Explains programming nuances perfectly in any spoken language.

### Category B: The Actionable Context Modes (Editor Highlight UI)
*Triggered by the floating menu when code is highlighted.*
8.  **Code Review Mode:** Analyzes the chunk for bugs, maintainability, and clean-code practices.
9.  **Refactor Studio Mode:** Converts messy code to modern logic and shows a before/after split-diff.
10. **Complexity Analyzer Mode:** Parses loops and nested Big-O Time/Space complexity.
11. **Debug Companion Mode:** Automatically reads terminal errors, finds the flawed line, and fixes it.

### Category C: Heavy Integration Systems
*Requires intensive Backend/Database wiring.*
12. **Code Runner Sandbox Mode:** Compiles code via Judge0 API securely and renders `stdout`.
13. **Multi-Language Coding Mode:** Changes Monaco syntax instantly (Python, JS, C++) and updates Judge0 IDs.
14. **Test Generator Mode:** Auto-writes Jest/PyTest unit tests, edge cases, and stress tests.
15. **Security Guardian Mode:** Scans code for active vulnerabilities (SQLi, XSS) and patches them.
16. **PR/Team Review Mode:** In the Review Hub, analyzes massive Git diffs against strict linter rules.

### Category D: The "Next-Gen" Master Features
*The crown jewels of the Apollo platform.*
17. **Interview Simulator Mode:** Engages a loud timer, gives constraints dynamically, and simulates a technical screener.
18. **Learning Tracker Mode:** MongoDB logs every bug the user asks about, clustering data to track their "weak spots" (e.g., Recursion gaps).
19. **Voice Tutor Mode:** Web Speech API transcribes voice to text → sends to Gemini → Synthesizes the AI voice back instantly.
20. **Code Visualizer Mode:** Uses Web Canvas/React Flow to draw and animate runtime structures like Linked Lists and Trees.

---

## 🚀 6. The Execution Roadmap (Phases of Development)

To achieve this without causing architectural chaos, features **must** be built in this exact order:

*   **Phase 1: Basic UI & Setup (Current State)**
    *   Create the Monorepo (Express + React Vite).
    *   Setup the basic HTML text-areas.
*   **Phase 2: Core AI Connection & Latency Mitigation (Current State)**
    *   Integrate Gemini `@google/genai`. Use Streaming Tokens and SSE to prove the chat is instant.
    *   *Features Achieved: Code Explainer MVP.*
*   **Phase 3: The Developer Experience (The Editor)**
    *   Remove basic text-areas and install `@monaco-editor/react`. Build the workspace layout (Panels, Editor, Chat). Set up the Context Menu.
*   **Phase 4: Expanding The "AI Mind" (All 15 Prompt Features)**
    *   Since Phase 3 built the architecture, we rapidly inject the prompts for Socratic, Hint-First, Roast, Code Review, Complexity, etc., into the router.
*   **Phase 5: Auth & MongoDB Architecture**
    *   Set up User Login (JWT). Give the AI "Memory" by attaching chat sessions to User IDs. Save Snippets.
*   **Phase 6: Gamification & Tracker**
    *   Build out the Dashboard. Calculate XP from MongoDB logs. Build the Learning Tracker system by saving metadata on bugs.
*   **Phase 7: The "Heavy Hitters" & Final Polish**
    *   Integrate Judge0 Execution API for compiling code.
    *   Build the advanced Voice Tutor Mode. 
    *   Attempt Canvas/Code Visualization animations.
