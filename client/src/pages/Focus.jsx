import React, { useState, useEffect, useCallback } from 'react';
import * as LucideIcons from 'lucide-react';
import CodeEditor from '../components/CodeEditor/CodeEditor';
import ImmersiveNav from '../components/ImmersiveNav';
import './Focus.css';

const PRESETS = [
  { label: 'Focus', minutes: 25, icon: 'Brain' },
  { label: 'Short Break', minutes: 5, icon: 'Coffee' },
  { label: 'Long Break', minutes: 15, icon: 'Sun' },
  { label: 'Sprint', minutes: 10, icon: 'Zap' },
];

/* ═══════════════════════════════════════════
   FOCUS MODE COMPONENT
   ═══════════════════════════════════════════ */

function Focus() {
  const [code, setCode] = useState('// Deep work starts now.\n// No distractions. Just you and the code.\n');
  const [language, setLanguage] = useState('javascript');
  const [time, setTime] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [activePreset, setActivePreset] = useState(0);
  const [sessions, setSessions] = useState(0);

  // ── Timer ──
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsActive(false);
            setSessions(s => s + 1);
            // Auto-switch to break
            if (PRESETS[activePreset].label === 'Focus' || PRESETS[activePreset].label === 'Sprint') {
              setActivePreset(1); // Short Break
              setTime(5 * 60);
            } else {
              setActivePreset(0); // Focus
              setTime(25 * 60);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, activePreset]);

  const toggleTimer = () => setIsActive(!isActive);
  const selectPreset = (idx) => {
    setActivePreset(idx);
    setTime(PRESETS[idx].minutes * 60);
    setIsActive(false);
  };

  const formatTime = useCallback((seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Progress ring calculation
  const totalTime = PRESETS[activePreset].minutes * 60;
  const progress = ((totalTime - time) / totalTime) * 100;

  return (
    <div className="fz-root">
      <ImmersiveNav
        title="Focus Mode"
        subtitle={`${PRESETS[activePreset].label} · Session ${sessions + 1}`}
        timer={formatTime(time)}
        actions={
          <div className="fz-nav-actions">
            <button className={`fz-timer-btn ${isActive ? 'running' : ''}`} onClick={toggleTimer}>
              {isActive ? <LucideIcons.Pause size={14} /> : <LucideIcons.Play size={14} />}
              {isActive ? 'Pause' : 'Start'}
            </button>
            <button className="fz-reset-btn" onClick={() => selectPreset(activePreset)} title="Reset Timer">
              <LucideIcons.RotateCcw size={14} />
            </button>
          </div>
        }
      />

      <main className="fz-content">
        {/* Progress bar at very top of content */}
        <div className="fz-progress-bar">
          <div className="fz-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="fz-editor-container">
          <CodeEditor value={code} onChange={setCode} language={language} theme="vs-dark" />
        </div>

        {/* Floating control pill */}
        <div className="fz-floating-pill">
          {/* Presets */}
          <div className="fz-pill-group">
            {PRESETS.map((p, i) => {
              const PresetIcon = LucideIcons[p.icon];
              return (
                <button
                  key={p.label}
                  className={`fz-preset-btn ${activePreset === i ? 'active' : ''}`}
                  onClick={() => selectPreset(i)}
                  title={`${p.label} (${p.minutes}m)`}
                >
                  {PresetIcon && <PresetIcon size={13} />}
                  <span>{p.minutes}m</span>
                </button>
              );
            })}
          </div>

          <div className="fz-pill-divider" />

          {/* Language */}
          <select className="fz-lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="javascript">JS</option>
            <option value="python">PY</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          {/* Session counter */}
          {sessions > 0 && (
            <>
              <div className="fz-pill-divider" />
              <span className="fz-session-count" title="Completed sessions">
                <LucideIcons.Flame size={12} /> {sessions}
              </span>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Focus;
