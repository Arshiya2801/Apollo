# Phase 7: React Frontend Architecture (Pages, Routing & State)

> **What this phase covers:** The complete architectural breakdown of Apollo frontend. You will learn client-side SPA routing with React Router, frontend authentication guard patterns, local vs global state management tradeoffs, dynamic DOM event-driven panel resizing without external libraries, and the test case evaluation state machine.

---

## 1. Client-Side SPA Routing & Route Guards (App.jsx)

Apollo uses React Router with client-side SPA routing, meaning navigating between workspaces, interview simulators, and feature pages happens with zero full-page browser reloads.

### The ProtectedRoute Architecture
```xlogic
// client/src/App.jsx
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? children : <Navigate to="/auth" replace />;
};
```

### Key Route Guard Behaviors:
1. **Unauthenticated Redirection:** Visiting protected endpoints like /workspace, /interview, /profile without a valid user session immediately redirects to /auth.
2. **Already-Authenticated Guard:** If a logged-in user navigates back to /auth, the route automatically redirects them forward to /workspace.
3. **Legacy Redirection:** Routes like /dashboard redirect seamlessly to /workspace.

### Page Directory & Route Mapping:
| Route | Page Component | Protected? | Core Responsibility |
|:---|:----|:---:|:---|
| logged_out_root | LandingV2 | No | Marketing landing page with hero animations |
| /auth | Auth | No (guards login) | OTP generation, validation, and login forms |
| /features | Features | No | Showcase cards demonstrating platform capabilities |
|
 /workspace | Workspace | Yes | Primary coding workspace (Monaco Editor + AI modes) |
| /workspace/chat | WorkspaceChat | Yes | Dedicated full-page AI mentor chat session |
| /roast | Roast | Yes | Full-screen savage AI code critique mode |
|
 /code-review | Review | Yes | Structured bug, anti-pattern, and SOLID code reviewer |
| /interview | Interview | Yes | 4-phase mock technical interview simulator |
| /focus | Focus | Yes | Pomodoro productivity timer + distraction-free editor |
| /profile | Profile | Yes | Client settings, saved snippets, and theme customization |

---

## 2. State Management Strategy: Local vs Global State

In senior frontend interviews, interviewers frequently ask: *"Why did you not use Redux or Zustand for Apollo?"*

### The Architectural Decision:
- **No Heavy Redux/Zustand Boilerplate:** Most state in Apollo is ephemeral and strictly scoped to individual pages. A user writing code in /workspace doesZnot need their editor buffer shared with /focus or /roast.
- **Targeted AuthContext for Global Auth:** Apollo uses a lightweight React Context (AuthContext) solely for global session concerns: `{
  user, token, login, logout, loading }`.
- **Storage Persistence Strategy:**
  - `token` and `user` persist in `localStorage` to maintain authentication across page reloads.
  - `apollo-theme` tracks dark vs light mode directly on `document.documentElement`.
  - `apollo_settings` in `Profile.jsx` stores customized themes, font sizes, and AI persona preferences.

---

## 3. High-Complexity Component: The Resizable Workspace (Workspace.jsx)

The core workspace is the most sophisticated UI component in Apollo. It manages 3 concurrent panels: the left navigation/modes sidebar, the center Monaco code editor, and the right AI chat/analysis stream panel.

### Zero-Dependency Drag-to-Resize Implementation:
Instead of importing heavy third-party layout libraries, Apollo uses native DOM event listeners bound via React refs:
1. `onMouseDown` on the divider initiates resize tracking and sets an active drag flag.
2. Window-level `mousemove` calculates client delta X and directly updates `sidebarWidth`+ or `chatWidth` clamped between safe min/max pixel bounds (e.g. 250px - 600px).
3. Window-level `mouseup` unbinds the listeners to prevent memory leaks.

### Mode Switching & State Reset:
When a user clicks between 18 different AI modes in the workspace:
- The `activeMode` state updates.
- The active stream and chat input are flushed to prevent cross-contamination between different persona contexts.

### Test Case Generation & Evaluation State Machine:
Apollo features an automated test case runner:
1. **Generation:** When a user clicks "Generate Tests", the backend generates JSON-formatted inputs and expected outputs.
2. **Execution State Machine:** Each test item transitions across statuses: pending -> running -> passed or failed.
3. **Dynamic Output Tabs:** `activeTab` toggles seamlessly between the test case runner and the raw terminal execution stdout/stderr output.

---

## 4. Phase 7 Summary Cheatsheet

| Concept | Apollo Implementation | Senior Interview Talking Point |
|:---|:---|:---|
| Routing | React Router v6 SPA | Instant client navigation without document reload overhead |
| Route Protection | ProtectedRoute wrapper | Dual-layer protection (frontend UX guard + backend token check) |
| State Architecture | Local useState + AuthContext | Avoided premature optimization with heavy global state libraries |
| Layout Flexibility | Custom DOM ref resize handlers | Zero external bundle bloat for dynamic 3-panel split layout |
