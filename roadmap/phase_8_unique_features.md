# Phase 8: Unique Differentiating Features Deep Dive

> **What this phase covers:** Detailed architectural breakdowns of Apollo'(s five signature features: the 4-Phase Mock Interview Simulator, the Pomodoro Focus Mode, Browser-Native Speech Recognition, React Flow Code Visualizer, and the Profile Settings & Bookmarking engine.

---

## 1. 8A - Interview Simulator: 4-Phase State Machine (Interview.jsx)

The Interview Simulator transforms passive coding into an authentic high-pressure interview round through an explicit 4-phase finite state machine:

```
SETUP └└└└└► CODING └└└└└► FOLLOWUP └└└└└► RESULT
  ✂             ✂               ✂               ✂
 Pick        45min Timer    3-Turn Chat     AI Evaluation
 Difficulty  Max 3 Runs     Architecture     Scored Report
& Language  Auto-submit     Decisions      HIRED / NO HIRE
```

### Phase Breakdown & State Transitions:
1. **SETUP Phase:** Candidate selects difficulty (Easy, Medium, Hard) and programming language. No LMM tokens are consumed yet.
2. **CODING Phase:** The `interview_interviewer` IT generates a Blind 75-style algorithmic problem. A 45-minute countdown timer runs via `setInterval` in `useEffect`. The candidate is restricted to **3 code executions maximum** (`maxRuns = 3`) to simulate real whiteboard/live interview pressure.
3. **FOLLOWUP Phase:** Once code is submitted (or the timer reaches 00:00), the simulator transitions to follow-up. The AI interviewer asks 3 consecutive behavioral and algorithmic architecture questions (e.g., edge cases, memory optimization, alternative data structures).
4. **RESULT Phase:** After 3 responses, the performance evaluator (`interview_evaluator`) compiles problem requirements, candidate code, run stats, and QfA transcripts to issue a definitive **HIRED or NO HIRE**scorecard with rubric ratings.

---

## 2. 8B - Focus Mode: Pomodoro Productivity Studio (Focus.jsx)

Focus Mode combines the Pomodoro Technique with a distraction-free Monaco editor to encourage structured learning sprints.

### Engineering Highlights:
- **4 Preset Configurations:** Focus (25m), Short Break (5m), Long Break (15m), and Sprint (10m).
- **Automated State Cycles:** Completing a Focus or Sprint session automatically transitions the state to Short Break and increments the session counter.
- **State Preservation:** The editor text buffer is preserved independently of timer intervals so code is never lost when moving between break cycles.

---

## 3. 8C - Voice Input: Web Speech API Integration

Inside Workspace.jsx, candidates can speak their thought process aloud to the AI using the browser-native Web Speech Recognition interface.

### Technical Details:
- **Engine:** `window.SpeechRecognition || window.webkitSpeechRecognition`
- **Continuous & Interim Results:** `recognition.continuous = true` keeps the audio stream active, while `recognition.interimResults = true` streams real-time preview text into the input field before committing final tokens.
- **Why recognitionRef (useRef) instead of useState?** Speech recognition instances are mutable browser objects with active event listeners. Storing them in a React ref prevents unwanted component re-renders while allowing methods like `.stop()` to be invoked cleanly across render cycles.

---

## 4. 8D - Code Visualizer: React Flow Graph Rendering

The visualizer animates complex pointer movements and tree/graph mutations as code runs.

### How It Works:
1. **Structured AI Schema:** The `visualizer` prompt instructs the LLM to output a strict JSON payload containing an array of algorithm execution steps.
2. **React Flow Graphing:** Each step contains nodes with labels, pointer tags (e.g. `Value: 5 [curr, head]`), and directed animated edges.
3. **Step Playback:** The UI renders an interactive slider allowing the user to step forward and backward through algorithmic mutations.

---

## 5. 8E - Profile & Local Client Storage Engine (Profile.jsx)

- **useSettings Hook:** Manages local persistence for appearance themes, default editor font sizes, and AI persona styles.
- **useSavedItems Hook:** Provides client-side bookmarking for starred snippets and interview scorecards with instant notification feedback via react-hot-toast.
