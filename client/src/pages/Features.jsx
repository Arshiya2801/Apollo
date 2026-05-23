import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as LucideIcons from 'lucide-react';
import './Features.css';

function Features() {
  const { user } = useAuth();

  return (
    <div className="ft-page">
      {/* Background aurora */}
      <div className="ft-aurora">
        <div className="ft-orb ft-orb-1" />
        <div className="ft-orb ft-orb-2" />
        <div className="ft-orb ft-orb-3" />
      </div>

      {/* Navigation */}
      <nav className="ft-nav">
        <Link to="/" className="ft-nav-logo"><em>Apollo</em></Link>
        <div className="ft-nav-right">
          <Link to="/" className="ft-nav-link">Home</Link>
          <Link to={user ? '/workspace' : '/auth'} className="ft-nav-cta">
            {user ? 'Open Workspace' : 'Get Started'} →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="ft-hero">
        <span className="ft-badge">
          <span className="ft-badge-dot" />
          The Final Frontier of AI Coding
        </span>
        <h1 className="ft-title">
          Not just an editor.<br />
          <span className="ft-serif">An entirely new brain.</span>
        </h1>
        <p className="ft-subtitle">
          Apollo doesn’t just complete your code—it teaches you how to write it perfectly. 
          Explore all 15 specialized immersive modes designed to 10x your engineering skills.
        </p>
      </header>

      {/* Bento Box Layout */}
      <section className="ft-bento-section">
        <div className="ft-bento-grid">
          
          {/* ROW 1 & 2 (8 blocks) */}
          
          <div className="ft-bn-card ft-bn-large">
            <div className="ft-bn-bg-glow" style={{ background: '#58a6ff' }} />
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#58a6ff', background: 'rgba(88, 166, 255, 0.1)' }}>
                <LucideIcons.Code2 size={24} />
              </div>
              <h3>Editor Superpowers</h3>
            </div>
            <p>Your right-hand engineering team. Instantly detect bugs, refactor spaghetti code, and analyze Big-O complexity in real-time as you type.</p>
            
            <div className="ft-bn-feature-list">
              <div className="ft-bn-feature-item">
                <div className="fi-icon"><LucideIcons.BookOpen size={16} color="#58a6ff" /></div>
                <div className="fi-text"><strong>Code Explainer:</strong> Breaks down complex blocks line-by-line.</div>
              </div>
              <div className="ft-bn-feature-item">
                <div className="fi-icon"><LucideIcons.RefreshCw size={16} color="#39d353" /></div>
                <div className="fi-text"><strong>Refactor Studio:</strong> Converts messy code to clean implementations.</div>
              </div>
              <div className="ft-bn-feature-item">
                <div className="fi-icon"><LucideIcons.Search size={16} color="#4bccff" /></div>
                <div className="fi-text"><strong>Code Review:</strong> Finds bugs and SOLID violations instantly.</div>
              </div>
              <div className="ft-bn-feature-item">
                <div className="fi-icon"><LucideIcons.Bug size={16} color="#f778ba" /></div>
                <div className="fi-text"><strong>Debug Companion:</strong> Finds the flawed line and provides a fix.</div>
              </div>
            </div>
          </div>

          <div className="ft-bn-card ft-bn-tall">
            <div className="ft-bn-bg-glow" style={{ background: '#a371f7' }} />
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#a371f7', background: 'rgba(163, 113, 247, 0.1)' }}>
                <LucideIcons.MessageSquare size={24} />
              </div>
              <h3>AI Personas</h3>
            </div>
            <p>Why get answers when you can get understanding? Chat directly with personas tailored perfectly to your learning style.</p>
            <div className="ft-bn-tags">
              <span className="tag-purple"><LucideIcons.Brain size={12}/> Socratic Coach</span>
              <span className="tag-orange"><LucideIcons.Lightbulb size={12}/> Hint-First</span>
              <span className="tag-green"><LucideIcons.Wand2 size={12}/> Yoda Persona</span>
              <span className="tag-blue"><LucideIcons.Globe size={12}/> Multilingual</span>
              <span className="tag-gray"><LucideIcons.GraduationCap size={12}/> Strict Teacher</span>
            </div>
            <div className="ft-bn-visual ft-visual-chat">
              <div className="ft-chat-bubble model">Why did you use an array here?</div>
              <div className="ft-chat-bubble user">To store results.</div>
              <div className="ft-chat-bubble model">Is there a better structure?</div>
            </div>
          </div>

          <div className="ft-bn-card ft-bn-standard">
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#ff7b72', background: 'rgba(255, 123, 114, 0.1)' }}>
                <LucideIcons.ShieldAlert size={20} />
              </div>
              <h3>Security Guardian</h3>
            </div>
            <p style={{fontSize: '0.85rem'}}>Scans for vulnerabilities like SQLi, XSS, and CSRF, patching them instantly.</p>
          </div>

          <div className="ft-bn-card ft-bn-standard">
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#d29922', background: 'rgba(210, 153, 34, 0.1)' }}>
                <LucideIcons.Timer size={20} />
              </div>
              <h3>Complexity Analysis</h3>
            </div>
            <p style={{fontSize: '0.85rem'}}>Parses Big-O time and space complexity with beautiful line-by-line explanations.</p>
          </div>

          {/* ROW 3 (4 blocks) */}
          <div className="ft-bn-card ft-bn-wide">
             <div className="ft-bn-bg-glow" style={{ background: '#22c55e' }} />
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)' }}>
                <LucideIcons.ShieldCheck size={24} />
              </div>
              <h3>Interview Simulator</h3>
            </div>
            <p>Simulate FAANG interviews with a strict 45-minute timer and an AI Hiring Committee that grills you on algorithmic choices.</p>
            <div className="ft-iv-mockup">
               <div className="iv-mock-timer">45:00</div>
               <div className="iv-mock-line"><span style={{width:'30%'}}></span></div>
            </div>
          </div>

          <div className="ft-bn-card ft-bn-wide">
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#3fb950', background: 'rgba(63, 185, 80, 0.1)' }}>
                <LucideIcons.BarChart3 size={24} />
              </div>
              <h3>DSA Learning Mode</h3>
            </div>
            <p>Never memorize algorithms again. This mode guides you through Data Structures from brute-force approaches to optimal O(N) solutions.</p>
            <div className="ft-dsa-mockup">
              <div className="dsa-bar" style={{height:'30%'}}></div>
              <div className="dsa-bar" style={{height:'80%'}}></div>
              <div className="dsa-bar" style={{height:'50%'}}></div>
              <div className="dsa-bar" style={{height:'100%', background:'#3fb950'}}></div>
            </div>
          </div>

          {/* ROW 4 & 5 (8 blocks) */}
          
          <div className="ft-bn-card ft-bn-large">
            <div className="ft-bn-bg-glow" style={{ background: '#f0883e' }} />
            <div className="ft-bn-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.3)' }}>Now Live!</div>
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#f0883e', background: 'rgba(240, 136, 62, 0.1)' }}>
                <LucideIcons.Mic size={24} />
              </div>
              <h3>Voice Dictation & Visualizer</h3>
            </div>
            <p>Keyboard not required. Talk to Apollo naturally with built-in native Web Speech API integration. It transcribes your logic in real-time and instantly visualizes your data structures step-by-step.</p>
            
            <div className="ft-audio-wave large">
              <span className="wave w1"/><span className="wave w2"/><span className="wave w3"/><span className="wave w4"/><span className="wave w5"/><span className="wave w1"/><span className="wave w3"/>
            </div>
          </div>

          <div className="ft-bn-card ft-bn-tall">
            <div className="ft-bn-bg-glow" style={{ background: '#f85149' }} />
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#f85149', background: 'rgba(248, 81, 73, 0.1)' }}>
                <LucideIcons.Flame size={24} />
              </div>
              <h3>Roast My Code</h3>
            </div>
            <p>For when you need a little humility. Brutally honest, strictly humorous code critiques that rip your architecture to shreds while secretly making you a much better developer.</p>
            <div className="ft-roast-flame">
              <LucideIcons.Flame size={80} color="rgba(248, 81, 73, 0.15)" strokeWidth={1} />
            </div>
          </div>

          <div className="ft-bn-card ft-bn-standard">
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#79c0ff', background: 'rgba(121, 192, 255, 0.1)' }}>
                <LucideIcons.Target size={20} />
              </div>
              <h3>Zen Focus</h3>
            </div>
            <p style={{fontSize: '0.85rem'}}>Distraction-free environment with programmatic ambient Pink Noise.</p>
          </div>

          <div className="ft-bn-card ft-bn-standard">
            <div className="ft-bn-header">
              <div className="ft-bn-icon" style={{ color: '#f0883e', background: 'rgba(240, 136, 62, 0.1)' }}>
                <LucideIcons.Lightbulb size={20} />
              </div>
              <h3>Hint Assistant</h3>
            </div>
            <p style={{fontSize: '0.85rem'}}>Refuses to give direct answers — provides progressive logic hints.</p>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="ft-cta">
        <h2 className="ft-cta-title">
          Ready to <span className="ft-serif">start?</span>
        </h2>
        <p className="ft-cta-desc">
          Open the workspace and experience every mode, streaming at zero latency.
        </p>
        <Link to={user ? '/workspace' : '/auth'} className="ft-cta-btn">
          {user ? 'Open Workspace' : 'Get Started Free'} →
        </Link>
      </section>

      {/* Footer */}
      <footer className="ft-footer">
        <span>Apollo · Advanced Agentic Learning</span>
        <Link to="/">Back to Home</Link>
      </footer>
    </div>
  );
}

export default Features;
