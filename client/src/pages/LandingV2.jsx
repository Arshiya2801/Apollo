import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingV2.css';

/* ═══════════════════════════════════════════
   SCROLL ANIMATION HOOK
   ═══════════════════════════════════════════ */
function useScrollReveal() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('in-view');
                    }
                });
            },
            { threshold: 0.15 }
        );

        document.querySelectorAll('.lv2-animate').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
}


/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const TICKER_ITEMS = [
    { symbol: '{ }', name: 'React.js' },
    { symbol: '>', name: 'Node.js' },
    { symbol: 'M', name: 'MongoDB' },
    { symbol: '*', name: 'Gemini AI' },
    { symbol: '#', name: 'Monaco Editor' },
    { symbol: '!', name: 'Judge0 API' },
    { symbol: '@', name: 'Express.js' },
    { symbol: '~', name: 'Vite' },
];

const PROCESS_STEPS = [
    {
        icon: (
            <svg viewBox="0 0 56 56"><rect x="8" y="8" width="40" height="40" rx="4" /><line x1="18" y1="20" x2="38" y2="20" /><line x1="18" y1="28" x2="32" y2="28" /><line x1="18" y1="36" x2="28" y2="36" /></svg>
        ),
        title: 'Write Code',
        desc: 'Open the Monaco editor, pick your language, and start coding. Full IntelliSense and syntax highlighting included.',
    },
    {
        icon: (
            <svg viewBox="0 0 56 56"><path d="M28 6l6 12 14 2-10 10 2 14-12-6-12 6 2-14L8 20l14-2z" /></svg>
        ),
        title: 'Get AI Feedback',
        desc: 'Choose from 20 AI modes. Streaming tokens arrive instantly — your coach responds in real time, zero latency.',
    },
    {
        icon: (
            <svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="18" /><polyline points="20 28 26 34 38 22" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ),
        title: 'Master Concepts',
        desc: 'Track weak spots, earn XP, and watch your skills climb. Apollo adapts to you over time.',
    },
];

const WORK_CARDS = [
    { title: 'socratic-mode.js', code: `function solve(arr) {\n  // What pattern do you see?\n  // Think about the edges.\n  let map = new Map();\n  for (let num of arr) {\n    map.set(num, (map.get(num)||0)+1);\n  }\n  return [...map.entries()];\n}` },
    { title: 'roast-mode.py', code: `def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr\n# AI: O(n^2)? In 2026? Bold.` },
    { title: 'refactor-mode.cpp', code: `#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int t) {\n  unordered_map<int,int> m;\n  for(int i=0; i<nums.size(); i++) {\n    if(m.count(t-nums[i]))\n      return {m[t-nums[i]], i};\n    m[nums[i]] = i;\n  }\n  return {};\n}` },
    { title: 'dsa-mode.js', code: `function mergeSort(arr) {\n  if (arr.length <= 1) return arr;\n  const mid = Math.floor(arr.length / 2);\n  const left = mergeSort(arr.slice(0, mid));\n  const right = mergeSort(arr.slice(mid));\n  return merge(left, right);\n}\n// Time: O(n log n) | Space: O(n)` },
    { title: 'debug-mode.py', code: `def find_max(lst):\n    if not lst:\n        raise ValueError("Empty list")\n    max_val = lst[0]\n    for item in lst[1:]:\n        if item > max_val:\n            max_val = item\n    return max_val\n# Bug found on line 3: fixed!` },
    { title: 'security-mode.js', code: `app.get('/user', (req, res) => {\n  const id = req.query.id;\n  // VULNERABILITY: SQL Injection\n  // Use parameterized queries!\n  const query = \`SELECT * FROM users\n    WHERE id = $1\`;\n  db.query(query, [id]);\n});` },
];

const BENEFITS = [
    { title: 'Zero-Latency Streaming', desc: 'Tokens arrive the instant the AI generates them via SSE. No spinners, no waiting. Perceived latency under 0.5 seconds.' },
    { title: '20 Specialized AI Modes', desc: 'From Socratic coaching to code roasting, each mode uses a precisely engineered system prompt for targeted feedback.' },
    { title: 'Secure Cloud Sandbox', desc: 'Code compiles in Judge0 containers. Your source never touches our server directly — total isolation and security.' },
    { title: 'Adaptive Learning Tracker', desc: 'MongoDB clusters every bug and question into weak-spot patterns. Apollo learns what YOU struggle with and adapts.' },
];

const FEATURES = [
    { icon: (<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="3" /><line x1="14" y1="14" x2="34" y2="14" /><line x1="14" y1="22" x2="28" y2="22" /><line x1="14" y1="30" x2="22" y2="30" /><circle cx="34" cy="30" r="6" /></svg>), title: 'Monaco Editor', desc: 'Full VS Code editor with IntelliSense, multi-language support, and dark theme.' },
    { icon: (<svg viewBox="0 0 48 48"><path d="M24 4l4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1z" /><line x1="8" y1="38" x2="40" y2="38" /><line x1="12" y1="44" x2="36" y2="44" /></svg>), title: 'Lightning Streaming', desc: 'AI responses stream token-by-token via Server-Sent Events. Feels instant.' },
    { icon: (<svg viewBox="0 0 48 48"><circle cx="24" cy="18" r="10" /><line x1="16" y1="24" x2="12" y2="38" /><line x1="24" y1="28" x2="24" y2="44" /><line x1="32" y1="24" x2="36" y2="38" /></svg>), title: 'Personalized Coach', desc: 'Choose your persona — Friendly, Strict, Yoda, or Drill Sergeant. Your AI adapts tone.' },
    { icon: (<svg viewBox="0 0 48 48"><rect x="6" y="6" width="36" height="36" rx="3" /><path d="M6 18h36" /><path d="M18 18v24" /><circle cx="30" cy="32" r="4" /></svg>), title: 'Interview Simulator', desc: 'Timed coding challenges with dynamic constraints. Practice for real technical screens.' },
    { icon: (<svg viewBox="0 0 48 48"><path d="M14 44V24l-8 8" /><path d="M24 44V14l-8 8" /><path d="M34 44V4l-8 8" /></svg>), title: 'Gamification + XP', desc: 'Earn experience points, unlock badges, climb leaderboards. Learning made competitive.' },
    { icon: (<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18" /><path d="M24 12v12l8 8" /></svg>), title: 'Voice Tutor Mode', desc: 'Speak to Apollo, hear it respond. Web Speech API powers hands-free coding help.' },
];

const PRICING_FEATURES = [
    'Unlimited AI conversations',
    'All 20 coaching modes',
    'Monaco editor + code execution',
    'Multi-language support (JS, Python, Java, C++)',
    'Complexity analysis & debugging',
    'Learning tracker & weak-spot analytics',
    'Code review & refactoring assistant',
    'Interview simulation mode',
    'Priority streaming (fastest tokens)',
];

const FAQ_DATA = [
    { q: 'What AI model does Apollo use?', a: 'Apollo is powered by Google Gemini 2.5 Flash via the @google/genai SDK. It is optimized for speed and streaming, delivering tokens with near-zero perceived latency via Server-Sent Events.' },
    { q: 'Is my code executed securely?', a: 'Yes. Code is never run on our servers. We use the Judge0 API which compiles and executes your code in fully isolated sandbox containers. Supported languages include JavaScript, Python, Java, and C++.' },
    { q: 'How do the 20 modes work?', a: 'Each mode injects a unique system prompt that changes the AI personality, depth, and behavior. Modes range from Socratic questioning to brutal code roasts, DSA analysis, security scanning, and more.' },
    { q: 'Do I need to install anything?', a: 'No. Everything runs in your browser — the Monaco editor, AI chat, and cloud execution sandbox. Just sign up and start coding immediately.' },
    { q: 'Is Apollo free to use?', a: 'Apollo is free during the open development phase. Advanced features like Voice Tutor, Interview Simulator, and priority streaming may have premium tiers in the future.' },
    { q: 'Can Apollo help with interview prep?', a: 'Absolutely. The Interview Simulator mode provides timed challenges with dynamic constraints, and the DSA Learning Mode guides you from brute-force to optimal solutions step by step.' },
];


/* ═══════════════════════════════════════════
   COMPONENT: Floating Pill Navbar
   ═══════════════════════════════════════════ */
function NavbarV2() {
    const { user } = useAuth();

    return (
        <nav className="lv2-nav">
            <Link to="/" className="lv2-nav-logo">
                <em>Apollo</em>
            </Link>

            <ul className="lv2-nav-links">
                <li><a href="#lv2-features">Features</a></li>
                <li><a href="#lv2-process">Process</a></li>
                <li><a href="#lv2-work">Work</a></li>
                <li><a href="#lv2-pricing">Pricing</a></li>
                <li><a href="#lv2-faq">FAQ</a></li>
            </ul>

            <div className="lv2-nav-right">
                <Link to={user ? '/dashboard' : '/auth'} className="lv2-nav-pill">Dashboard</Link>
                <Link to={user ? '/profile' : '/auth'} className="lv2-btn-primary">
                    {user ? 'Profile' : 'Get Started'}
                </Link>
            </div>

            <button className="lv2-nav-mobile" aria-label="Menu">&#9776;</button>
        </nav>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Hero with Aurora
   ═══════════════════════════════════════════ */
function HeroV2() {
    const { user } = useAuth();

    return (
        <section className="lv2-hero">
            <div className="lv2-hero-aurora">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="orb orb-4"></div>
            </div>

            <div className="lv2-hero-content">
                <div className="lv2-hero-badge">
                    <span className="badge-dot-green"></span>
                    20 AI modes available now
                </div>

                <h1 className="lv2-hero-title">
                    The truly<br />
                    <span className="serif-italic">limitless</span> coding coach.
                </h1>

                <p className="lv2-hero-subtitle">
                    Say goodbye to stale tutorials and hello to Apollo — instant
                    AI feedback, 20 coaching personas, and a secure cloud sandbox,
                    all streaming at zero latency.
                </p>

                <div className="lv2-hero-buttons">
                    <Link to="/features" className="lv2-btn-primary lv2-btn-lg">
                        Explore All Features &#8594;
                    </Link>
                    <Link to={user ? '/workspace' : '/auth'} className="lv2-btn-secondary lv2-btn-lg">
                        Workspace
                    </Link>
                </div>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Logo Ticker
   ═══════════════════════════════════════════ */
function LogoTicker() {
    const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

    return (
        <div className="lv2-ticker">
            <p className="lv2-ticker-label">BUILT WITH THE MODERN STACK</p>
            <div className="lv2-ticker-track">
                {items.map((item, i) => (
                    <div className="lv2-ticker-item" key={i}>
                        <span className="ticker-symbol">{item.symbol}</span>
                        {item.name}
                    </div>
                ))}
            </div>
        </div>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Testimonial
   ═══════════════════════════════════════════ */
function Testimonial() {
    return (
        <section className="lv2-section-full">
            <div className="lv2-testimonial-card lv2-animate">
                <div className="lv2-testimonial-text">
                    <div className="lv2-testi-stars"></div>
                    <p className="lv2-testi-quote">
                        "Apollo completely changed how I prepare for interviews. The Socratic
                        mode forces me to think through problems instead of copy-pasting solutions.
                        The streaming feedback feels like having a senior engineer pair-programming with me."
                    </p>
                    <p className="lv2-testi-name">Arpit Singh</p>
                    <p className="lv2-testi-role">Full-Stack Developer</p>
                </div>
                <div className="lv2-testimonial-image">
                    <div className="mock-visual">
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2rem', lineHeight: '1.8', textAlign: 'left' }}>
                            <span style={{ color: '#c678dd' }}>function</span>{' '}
                            <span style={{ color: '#61afef' }}>fibonacci</span>(n) {'{'}<br />
                            &nbsp;&nbsp;<span style={{ color: '#c678dd' }}>if</span> (n {'<='} 1) <span style={{ color: '#c678dd' }}>return</span> n;<br />
                            &nbsp;&nbsp;<span style={{ color: '#c678dd' }}>return</span>{' '}
                            <span style={{ color: '#61afef' }}>fibonacci</span>(n-1) +<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                            <span style={{ color: '#61afef' }}>fibonacci</span>(n-2);<br />
                            {'}'}<br /><br />
                            <span style={{ color: '#5c6370' }}>// Apollo: O(2^n) time complexity.</span><br />
                            <span style={{ color: '#5c6370' }}>// Can you optimize with memoization?</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Process Section
   ═══════════════════════════════════════════ */
function ProcessSection() {
    return (
        <section className="lv2-section lv2-section-center" id="lv2-process">
            <span className="lv2-section-label lv2-animate">Process</span>
            <h2 className="lv2-section-title lv2-animate">
                Your path to mastery, <span className="serif-italic">effortlessly.</span>
            </h2>
            <p className="lv2-section-subtitle lv2-animate" style={{ margin: '0 auto' }}>
                Begin your coding journey in three effortless steps.
            </p>

            <div className="lv2-process-grid">
                {PROCESS_STEPS.map((step, i) => (
                    <div className={`lv2-process-card lv2-animate lv2-animate-delay-${i + 1}`} key={i}>
                        <div className="lv2-process-icon">{step.icon}</div>
                        <h3 className="lv2-process-title">{step.title}</h3>
                        <p className="lv2-process-desc">{step.desc}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '3rem' }} className="lv2-animate lv2-animate-delay-4">
                <Link to="/auth" className="lv2-btn-primary lv2-btn-lg">
                    Start a free session &#8594;
                </Link>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Work / Portfolio Scroll
   ═══════════════════════════════════════════ */
function WorkSection() {
    const cards = [...WORK_CARDS, ...WORK_CARDS];

    return (
        <section className="lv2-work-section" id="lv2-work">
            <div className="lv2-work-header">
                <span className="lv2-section-label lv2-animate">Modes in Action</span>
                <h2 className="lv2-section-title lv2-animate">
                    See Apollo <span className="serif-italic">think.</span>
                </h2>
            </div>

            <div className="lv2-work-scroll">
                {cards.map((card, i) => (
                    <div className="lv2-work-card" key={i}>
                        <div className="lv2-work-card-header">
                            <span className="lv2-work-card-dot r"></span>
                            <span className="lv2-work-card-dot y"></span>
                            <span className="lv2-work-card-dot g"></span>
                            <span className="lv2-work-card-title-bar">{card.title}</span>
                        </div>
                        <div className="lv2-work-card-body">
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{card.code}</pre>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Benefits (Split Layout)
   ═══════════════════════════════════════════ */
function BenefitsSection() {
    return (
        <section className="lv2-section" id="lv2-benefits">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <span className="lv2-section-label lv2-animate">Benefits</span>
                <h2 className="lv2-section-title lv2-animate">
                    Fast, quality <span className="serif-italic">& limitless.</span>
                </h2>
                <p className="lv2-section-subtitle lv2-animate" style={{ margin: '0 auto' }}>
                    Apollo replaces static tutorials and slow feedback loops with AI-powered,
                    streaming intelligence delivered at the speed of thought.
                </p>
            </div>

            <div className="lv2-benefits lv2-animate">
                {/* Left: Testimonial card */}
                <div className="lv2-testimonial-card" style={{ gridTemplateColumns: '1fr', maxWidth: 'none' }}>
                    <div className="lv2-testimonial-text">
                        <div className="lv2-testi-stars"></div>
                        <p className="lv2-testi-quote">
                            "The Roast My Code mode is hilarious but genuinely useful. It caught three
                            performance issues that I missed in my PR review. The streaming makes it feel
                            like talking to a real person."
                        </p>
                        <p className="lv2-testi-name">Dev Community</p>
                        <p className="lv2-testi-role">Open Source Contributors</p>
                    </div>
                </div>

                {/* Right: Benefit items */}
                <div className="lv2-benefits-list">
                    {BENEFITS.map((b, i) => (
                        <div className={`lv2-benefit-item lv2-animate lv2-animate-delay-${i + 1}`} key={i}>
                            <h3 className="lv2-benefit-title">{b.title}</h3>
                            <p className="lv2-benefit-desc">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Features Grid
   ═══════════════════════════════════════════ */
function FeaturesGridV2() {
    return (
        <section className="lv2-section lv2-section-center" id="lv2-features">
            <span className="lv2-section-label lv2-animate">Features</span>
            <h2 className="lv2-section-title lv2-animate">
                Reasons you will <span className="serif-italic">love</span> us.
            </h2>

            <div className="lv2-features-grid">
                {FEATURES.map((f, i) => (
                    <div className={`lv2-feature-item lv2-animate lv2-animate-delay-${(i % 3) + 1}`} key={i}>
                        <div className="lv2-feature-icon">{f.icon}</div>
                        <h3 className="lv2-feature-title">{f.title}</h3>
                        <p className="lv2-feature-desc">{f.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Pricing
   ═══════════════════════════════════════════ */
function PricingSection() {
    return (
        <section className="lv2-section lv2-section-center" id="lv2-pricing">
            <span className="lv2-section-label lv2-animate">Pricing</span>
            <h2 className="lv2-section-title lv2-animate">
                Simple, <span className="serif-italic">transparent.</span>
            </h2>

            <div className="lv2-pricing-wrapper lv2-animate">
                <div className="lv2-pricing-card">
                    <div className="lv2-pricing-badge">
                        <span className="dot-green"></span>
                        Currently free during open beta
                    </div>

                    <div className="lv2-pricing-price">
                        $0 <span className="price-period">/ month</span>
                    </div>
                    <p className="lv2-pricing-desc">Full access to all features during the beta phase.</p>

                    <div className="lv2-pricing-buttons">
                        <Link to="/auth" className="lv2-btn-primary">Get Started Free</Link>
                        <a href="#lv2-faq" className="lv2-btn-secondary">Learn more</a>
                    </div>

                    <ul className="lv2-pricing-features">
                        {PRICING_FEATURES.map((f, i) => (
                            <li key={i}>
                                <span className="check-icon">&#10022;</span>
                                {f}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: FAQ
   ═══════════════════════════════════════════ */
function FAQSectionV2() {
    const [openIndex, setOpenIndex] = useState(null);

    const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

    return (
        <section className="lv2-section lv2-section-center" id="lv2-faq">
            <span className="lv2-section-label lv2-animate">FAQ</span>
            <h2 className="lv2-section-title lv2-animate">
                Questions <span className="serif-italic">& answers.</span>
            </h2>

            <div className="lv2-faq-list">
                {FAQ_DATA.map((item, i) => (
                    <div
                        className={`lv2-faq-item ${openIndex === i ? 'open' : ''}`}
                        key={i}
                        onClick={() => toggle(i)}
                    >
                        <div className="lv2-faq-question">
                            <span className="lv2-faq-q-text">{item.q}</span>
                            <span className="lv2-faq-icon">+</span>
                        </div>
                        <div className="lv2-faq-answer">
                            <p className="lv2-faq-a-text">{item.a}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Final CTA
   ═══════════════════════════════════════════ */
function FinalCTA() {
    const { user } = useAuth();

    return (
        <section className="lv2-final-cta">
            <div className="lv2-hero-aurora">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
                <div className="orb orb-4"></div>
            </div>

            <div className="lv2-final-cta-content">
                <h2 className="lv2-final-title">
                    Are you <span className="serif-italic">ready</span>?
                </h2>
                <p className="lv2-final-subtitle">
                    This could be the start of something big. Join Apollo and transform
                    the way you learn, debug, and master code.
                </p>
                <div className="lv2-final-buttons">
                    <Link to={user ? '/workspace' : '/auth'} className="lv2-btn-primary lv2-btn-lg">
                        Start Coding Free &#8594;
                    </Link>
                    <a href="#lv2-pricing" className="lv2-btn-secondary lv2-btn-lg">
                        See Plans
                    </a>
                </div>
            </div>
        </section>
    );
}


/* ═══════════════════════════════════════════
   COMPONENT: Footer
   ═══════════════════════════════════════════ */
function FooterV2() {
    return (
        <footer className="lv2-footer">
            <ul className="lv2-footer-links">
                <li><a href="#lv2-features">Features</a></li>
                <li><a href="#lv2-process">Process</a></li>
                <li><a href="#lv2-pricing">Pricing</a></li>
                <li><a href="#lv2-faq">FAQ</a></li>
                <li><Link to="/auth">Login</Link></li>
            </ul>
            <span className="lv2-footer-credit">
                Built with React + Express + Gemini AI
            </span>
        </footer>
    );
}


/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
function LandingV2() {
    useScrollReveal();

    return (
        <div className="lv2-page">
            <NavbarV2 />
            <HeroV2 />
            <LogoTicker />
            <Testimonial />
            <ProcessSection />
            <WorkSection />
            <BenefitsSection />
            <FeaturesGridV2 />
            <PricingSection />
            <FAQSectionV2 />
            <FinalCTA />
            <FooterV2 />
        </div>
    );
}

export default LandingV2;
