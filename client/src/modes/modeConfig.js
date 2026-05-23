/**
 * Apollo — AI Mode Configuration
 * Split into EDITOR_MODES (Type 1) and CHAT_MODES (Type 2).
 */

// Type 1: Editor / Single-Run Modes — run on code, show result in right panel
export const EDITOR_MODES = [
  {
    key: 'explain',
    label: 'Code Explainer',
    lucideIcon: 'BookOpen',
    color: '#58a6ff',
    description: 'Breaks down your code line-by-line for any level.',
  },
  {
    key: 'complexity',
    label: 'Complexity',
    lucideIcon: 'Timer',
    color: '#d29922',
    description: 'Parses Big-O time and space complexity of your code.',
  },
  {
    key: 'review',
    label: 'Code Review',
    lucideIcon: 'Search',
    color: '#4bccff',
    description: 'Finds bugs, anti-patterns, and SOLID violations.',
  },
  {
    key: 'refactor',
    label: 'Refactor Studio',
    lucideIcon: 'RefreshCw',
    color: '#39d353',
    description: 'Converts messy code into clean, modern implementations.',
  },
  {
    key: 'debug',
    label: 'Debug Companion',
    lucideIcon: 'Bug',
    color: '#f778ba',
    description: 'Reads errors, finds the flawed line, and fixes it.',
  },
  {
    key: 'security',
    label: 'Security Guardian',
    lucideIcon: 'Shield',
    color: '#ff7b72',
    description: 'Scans for vulnerabilities: SQLi, XSS, and patches them.',
  },
  {
    key: 'roast',
    label: 'Roast My Code',
    lucideIcon: 'Flame',
    color: '#f85149',
    description: 'Brutal but constructive code critique with humor.',
  },
  {
    key: 'visualizer',
    label: 'Code Visualizer',
    lucideIcon: 'Network',
    color: '#a371f7',
    description: 'Draws and animates runtime structures like Linked Lists and Trees.',
  },
];

// Type 2: Chat / Conversational Personas — back-and-forth AI coaching
export const CHAT_MODES = [
  {
    key: 'socratic',
    label: 'Socratic Coach',
    lucideIcon: 'Brain',
    color: '#a371f7',
    description: 'Responds only with guiding questions to trigger self-discovery.',
  },
  {
    key: 'hint',
    label: 'Hint-First Assistant',
    lucideIcon: 'Lightbulb',
    color: '#f0883e',
    description: 'Refuses direct answers — gives logic hints instead.',
  },
  {
    key: 'dsa',
    label: 'DSA Learning',
    lucideIcon: 'BarChart3',
    color: '#3fb950',
    description: 'Guides from brute-force to optimal O(N). Algorithm coach.',
  },
  {
    key: 'explain',
    label: 'Code Explainer',
    lucideIcon: 'BookOpen',
    color: '#58a6ff',
    description: 'Breaks down your code line-by-line for any level.',
  },
  {
    key: 'multilingual',
    label: 'Multilingual',
    lucideIcon: 'Globe',
    color: '#79c0ff',
    description: 'Explains programming concepts in any spoken language.',
  },
  // {
  //   key: 'persona_yoda',
  //   label: 'Yoda Persona',
  //   lucideIcon: 'Wand2',
  //   color: '#7ee787',
  //   description: 'Teaches you the code, Yoda will. Backwards speech included.',
  // },
  // {
  //   key: 'persona_strict',
  //   label: 'Strict Teacher',
  //   lucideIcon: 'GraduationCap',
  //   color: '#8b949e',
  //   description: 'No hand-holding. Expects excellence and precision.',
  // },
  {
    key: 'persona_friendly',
    label: 'Friendly Buddy',
    lucideIcon: 'Heart',
    color: '#f0883e',
    description: 'Warm, encouraging, patient. Great for beginners.',
  },
];

const MODES = [...EDITOR_MODES, ...CHAT_MODES.filter(m => !EDITOR_MODES.find(e => e.key === m.key))];
export default MODES;
