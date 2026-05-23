import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  User, Palette, Bot, FolderOpen, TrendingUp, Trophy, Shield,
  Bell, Globe, ChevronLeft, LogOut, Camera, Save, Trash2,
  Code, MessageSquare, Clock, Bookmark, Lock, Smartphone,
  Brain, AlertTriangle, X, Eye, EyeOff, Check
} from 'lucide-react';
import './Profile.css';


/* ═══════════════════════════════════════════
   LOCALSTORAGE SETTINGS HOOK
   ═══════════════════════════════════════════ */

const DEFAULT_SETTINGS = {
  // Appearance
  darkMode: true,
  accentColor: '#7B2FBE',
  editorTheme: 'One Dark Pro',
  fontSize: 14,
  // AI Preferences
  defaultMode: 'socratic',
  personality: 'friendly',
  responseStyle: 'detailed',
  // Notifications
  emailAlerts: true,
  aiSuggestions: true,
  weeklyReports: false,
  sessionReminders: true,
  // Language
  appLang: 'en',
  aiLang: 'en',
  // Security
  twoFactor: false,
  // Profile
  bio: 'Full-stack developer passionate about clean code and AI-powered tools.',
};

function useSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('apollo_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persist to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('apollo_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateMultiple = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSetting, updateMultiple };
}


/* ═══════════════════════════════════════════
   SAVED DATA HOOK (localStorage)
   ═══════════════════════════════════════════ */

const DEFAULT_SAVED_ITEMS = [
  { id: 1, type: 'code', title: 'twoSum.js', meta: 'Saved 2 days ago', bg: 'rgba(34,197,94,0.12)', color: '#4ade80' },
  { id: 2, type: 'code', title: 'mergeSort.py', meta: 'Saved 5 days ago', bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  { id: 3, type: 'chat', title: 'DSA Coaching Session', meta: '12 messages · 3 days ago', bg: 'rgba(123,47,190,0.12)', color: '#c9a5f0' },
  { id: 4, type: 'session', title: 'Interview Practice #3', meta: '45 min · 1 week ago', bg: 'rgba(249,115,22,0.12)', color: '#fb923c' },
  { id: 5, type: 'bookmark', title: 'Binary Tree Tips', meta: 'Bookmarked', bg: 'rgba(234,179,8,0.12)', color: '#facc15' },
];

function useSavedData() {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('apollo_saved_data');
      return stored ? JSON.parse(stored) : DEFAULT_SAVED_ITEMS;
    } catch {
      return DEFAULT_SAVED_ITEMS;
    }
  });

  useEffect(() => {
    localStorage.setItem('apollo_saved_data', JSON.stringify(items));
  }, [items]);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  return { items, removeItem, clearAll };
}


/* ═══════════════════════════════════════════
   APPLY THEME GLOBALLY
   ═══════════════════════════════════════════ */

function useApplyTheme(darkMode, accentColor) {
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      document.body.classList.remove('light-mode');
      root.style.setProperty('color-scheme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      root.style.setProperty('color-scheme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--pf-purple', accentColor);
    document.documentElement.style.setProperty('--ws-purple', accentColor);
  }, [accentColor]);
}


/* ═══════════════════════════════════════════
   CONFIRMATION MODAL
   ═══════════════════════════════════════════ */

function ConfirmModal({ isOpen, title, message, confirmText, danger, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="pf-modal-overlay" onClick={onCancel}>
      <div className="pf-modal" onClick={e => e.stopPropagation()}>
        <div className="pf-modal-header">
          <h3>{title}</h3>
          <button className="pf-modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        <p className="pf-modal-message">{message}</p>
        <div className="pf-modal-actions">
          <button className="pf-edit-profile-btn" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'pf-danger-btn' : 'pf-save-btn'} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   PASSWORD CHANGE MODAL
   ═══════════════════════════════════════════ */

function PasswordModal({ isOpen, onClose }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!currentPw || !newPw || !confirmPw) {
      toast.error('Please fill in all fields');
      return;
    }
    if (newPw.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPw !== confirmPw) {
      toast.error('Passwords do not match');
      return;
    }
    // In a real app, this would call the backend
    toast.success('Password changed successfully!');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    onClose();
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={e => e.stopPropagation()}>
        <div className="pf-modal-header">
          <h3>Change Password</h3>
          <button className="pf-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="pf-modal-body">
          <div className="pf-form-group">
            <label className="pf-label">Current Password</label>
            <div className="pf-input-wrapper">
              <input
                className="pf-input"
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
              />
              <button className="pf-input-toggle" onClick={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="pf-form-group">
            <label className="pf-label">New Password</label>
            <div className="pf-input-wrapper">
              <input
                className="pf-input"
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
              />
              <button className="pf-input-toggle" onClick={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="pf-form-group">
            <label className="pf-label">Confirm New Password</label>
            <input
              className="pf-input"
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder="Re-enter new password"
            />
          </div>
        </div>
        <div className="pf-modal-actions">
          <button className="pf-edit-profile-btn" onClick={onClose}>Cancel</button>
          <button className="pf-save-btn" onClick={handleSubmit}>
            <Lock size={14} /> Update Password
          </button>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   NAVIGATION CONFIG
   ═══════════════════════════════════════════ */

const NAV_SECTIONS = [
  {
    label: 'Account',
    items: [
      { key: 'profile', label: 'User Profile', icon: User },
      { key: 'appearance', label: 'Appearance', icon: Palette },
      { key: 'ai', label: 'AI Preferences', icon: Bot },
    ],
  },
  {
    label: 'Data',
    items: [
      { key: 'saved', label: 'Saved Data', icon: FolderOpen },
      { key: 'insights', label: 'Learning Insights', icon: TrendingUp },
      { key: 'achievements', label: 'Achievements', icon: Trophy },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'security', label: 'Security', icon: Shield },
      { key: 'notifications', label: 'Notifications', icon: Bell },
      { key: 'language', label: 'Language', icon: Globe },
    ],
  },
];

const ACCENT_COLORS = [
  { name: 'Purple', value: '#7B2FBE' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
];

const EDITOR_THEMES = ['One Dark Pro', 'Dracula', 'GitHub Dark', 'Monokai', 'Nord', 'Catppuccin'];

const TYPE_ICONS = {
  code: Code,
  chat: MessageSquare,
  session: Clock,
  bookmark: Bookmark,
};


/* ═══════════════════════════════════════════
   SECTION: User Profile
   ═══════════════════════════════════════════ */
function UserProfileSection({ user, settings, updateSetting, onSaveProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.username || '');
  const [username, setUsername] = useState(user?.username?.toLowerCase() || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(settings.bio);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : 'AP';

  const handleSave = () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty');
      return;
    }
    updateSetting('bio', bio);
    onSaveProfile({ displayName, username, email });
    setIsEditing(false);
    toast.success('Profile updated successfully!');
  };

  const handleCancel = () => {
    setDisplayName(user?.username || '');
    setUsername(user?.username?.toLowerCase() || '');
    setEmail(user?.email || '');
    setBio(settings.bio);
    setIsEditing(false);
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(123,47,190,0.12)', borderColor: 'rgba(123,47,190,0.3)', color: '#c9a5f0' }}>
              <User size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">User Profile</h3>
              <p className="pf-card-desc">Manage your personal information</p>
            </div>
          </div>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="pf-edit-profile-btn" onClick={handleCancel}>
                <X size={14} /> Cancel
              </button>
              <button className="pf-save-btn" style={{ padding: '0.45rem 1rem', fontSize: '0.78rem' }} onClick={handleSave}>
                <Save size={14} /> Save
              </button>
            </div>
          ) : (
            <button className="pf-edit-profile-btn" onClick={() => setIsEditing(true)}>
              <Camera size={14} /> Edit Profile
            </button>
          )}
        </div>
        <div className="pf-card-body">
          <div className="pf-user-info">
            <div className="pf-avatar-wrapper">
              <div className="pf-avatar">{initials}</div>
              {isEditing && (
                <button className="pf-avatar-edit" onClick={() => toast('Avatar upload coming soon!', { icon: '📸' })}>
                  <Camera size={12} />
                </button>
              )}
            </div>
            <div className="pf-user-details">
              <h2 className="pf-user-name">{user?.username || 'Apollo User'}</h2>
              <p className="pf-user-email">{user?.email || 'user@apollo.dev'}</p>
              <p className="pf-user-username">@{user?.username?.toLowerCase() || 'apollouser'}</p>
              {isEditing ? (
                <textarea
                  className="pf-input pf-textarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio..."
                  maxLength={200}
                />
              ) : (
                <p className="pf-user-bio">{settings.bio}</p>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="pf-form-grid" style={{ marginTop: '1.25rem' }}>
              <div className="pf-form-group">
                <label className="pf-label">Display Name</label>
                <input className="pf-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              </div>
              <div className="pf-form-group">
                <label className="pf-label">Username</label>
                <input className="pf-input" type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="username" />
              </div>
              <div className="pf-form-group full-width">
                <label className="pf-label">Email</label>
                <input className="pf-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Appearance (Functional)
   ═══════════════════════════════════════════ */
function AppearanceSection({ settings, updateSetting }) {
  const handleThemeToggle = () => {
    const newVal = !settings.darkMode;
    updateSetting('darkMode', newVal);
    toast.success(newVal ? 'Dark mode enabled' : 'Light mode enabled', { icon: newVal ? '🌙' : '☀️' });
  };

  const handleAccentChange = (color) => {
    updateSetting('accentColor', color);
    toast.success(`Accent color changed`, { icon: '🎨' });
  };

  const handleEditorTheme = (theme) => {
    updateSetting('editorTheme', theme);
    toast.success(`Editor theme set to ${theme}`, { icon: '🖥️' });
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.3)', color: '#f472b6' }}>
              <Palette size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Appearance</h3>
              <p className="pf-card-desc">Customize look and feel</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          {/* Dark/Light Toggle */}
          <div className="pf-toggle-row">
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">{settings.darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
              <span className="pf-toggle-desc">Switch between dark and light theme</span>
            </div>
            <label className="pf-toggle">
              <input type="checkbox" checked={settings.darkMode} onChange={handleThemeToggle} />
              <span className="pf-toggle-slider"></span>
            </label>
          </div>

          {/* Accent Color */}
          <div className="pf-toggle-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem' }}>
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Accent Color</span>
              <span className="pf-toggle-desc">Choose your primary UI color — currently <span style={{ color: settings.accentColor, fontWeight: 600 }}>{ACCENT_COLORS.find(c => c.value === settings.accentColor)?.name || 'Custom'}</span></span>
            </div>
            <div className="pf-color-options">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={`pf-color-swatch ${settings.accentColor === c.value ? 'active' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => handleAccentChange(c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Editor Theme */}
          <div className="pf-toggle-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem' }}>
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Editor Theme</span>
              <span className="pf-toggle-desc">Monaco editor color scheme</span>
            </div>
            <div className="pf-pills">
              {EDITOR_THEMES.map((t) => (
                <button
                  key={t}
                  className={`pf-pill ${settings.editorTheme === t ? 'active' : ''}`}
                  onClick={() => handleEditorTheme(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="pf-toggle-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem' }}>
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Editor Font Size</span>
              <span className="pf-toggle-desc">Adjust code editor text size</span>
            </div>
            <div className="pf-range-row" style={{ width: '100%' }}>
              <span className="pf-range-value">10</span>
              <input
                type="range"
                className="pf-range"
                min="10"
                max="24"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
              />
              <span className="pf-range-value">{settings.fontSize}px</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: AI Preferences (Functional)
   ═══════════════════════════════════════════ */
function AIPreferencesSection({ settings, updateSetting }) {
  const modes = [
    { key: 'socratic', label: 'Socratic' },
    { key: 'hint', label: 'Hint-First' },
    { key: 'explainer', label: 'Explainer' },
    { key: 'roast', label: 'Roast' },
    { key: 'dsa', label: 'DSA Coach' },
    { key: 'debug', label: 'Debugger' },
  ];

  const personalities = [
    { key: 'friendly', label: '😊 Friendly' },
    { key: 'strict', label: '📏 Strict' },
    { key: 'funny', label: '😂 Funny' },
    { key: 'professional', label: '💼 Professional' },
  ];

  const styles = [
    { key: 'short', label: 'Short & Quick' },
    { key: 'detailed', label: 'Detailed' },
    { key: 'stepbystep', label: 'Step-by-Step' },
  ];

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa' }}>
              <Bot size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">AI Preferences</h3>
              <p className="pf-card-desc">Configure your AI coaching experience</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div className="pf-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="pf-label">Default AI Mode</label>
            <div className="pf-pills" style={{ marginTop: '0.4rem' }}>
              {modes.map((m) => (
                <button
                  key={m.key}
                  className={`pf-pill ${settings.defaultMode === m.key ? 'active' : ''}`}
                  onClick={() => { updateSetting('defaultMode', m.key); toast.success(`Default mode: ${m.label}`, { icon: '🤖' }); }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-form-group" style={{ marginBottom: '1.25rem' }}>
            <label className="pf-label">AI Personality</label>
            <div className="pf-pills" style={{ marginTop: '0.4rem' }}>
              {personalities.map((p) => (
                <button
                  key={p.key}
                  className={`pf-pill ${settings.personality === p.key ? 'active' : ''}`}
                  onClick={() => { updateSetting('personality', p.key); toast.success(`Personality: ${p.label}`); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pf-form-group">
            <label className="pf-label">Response Style</label>
            <div className="pf-pills" style={{ marginTop: '0.4rem' }}>
              {styles.map((s) => (
                <button
                  key={s.key}
                  className={`pf-pill ${settings.responseStyle === s.key ? 'active' : ''}`}
                  onClick={() => { updateSetting('responseStyle', s.key); toast.success(`Response style: ${s.label}`, { icon: '💬' }); }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Saved Data (Functional)
   ═══════════════════════════════════════════ */
function SavedDataSection({ savedData }) {
  const { items, removeItem, clearAll } = savedData;
  const [confirmClear, setConfirmClear] = useState(false);

  const handleDelete = (id, title) => {
    removeItem(id);
    toast.success(`"${title}" removed`, { icon: '🗑️' });
  };

  const handleClearAll = () => {
    clearAll();
    setConfirmClear(false);
    toast.success('All saved data cleared');
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <FolderOpen size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Saved Data</h3>
              <p className="pf-card-desc">{items.length} items saved</p>
            </div>
          </div>
          {items.length > 0 && (
            <button className="pf-danger-btn" style={{ fontSize: '0.72rem', padding: '0.35rem 0.7rem' }} onClick={() => setConfirmClear(true)}>
              <Trash2 size={12} /> Clear All
            </button>
          )}
        </div>
        <div className="pf-card-body">
          {items.length === 0 ? (
            <div className="pf-empty">
              <div className="pf-empty-icon">📂</div>
              <p className="pf-empty-text">No saved items yet. Your code snippets, chats, and bookmarks will appear here.</p>
            </div>
          ) : (
            <div className="pf-list">
              {items.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Code;
                return (
                  <div className="pf-list-item" key={item.id}>
                    <div className="pf-list-item-left">
                      <div className="pf-list-item-icon" style={{ background: item.bg, color: item.color }}>
                        <Icon size={16} />
                      </div>
                      <div className="pf-list-item-text">
                        <div className="pf-list-item-title">{item.title}</div>
                        <div className="pf-list-item-meta">{item.meta}</div>
                      </div>
                    </div>
                    <button
                      className="pf-list-item-action"
                      onClick={() => handleDelete(item.id, item.title)}
                      style={{ background: 'none', border: 'none', color: 'var(--pf-text-muted)', cursor: 'pointer', padding: '4px' }}
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmClear}
        title="Clear All Saved Data?"
        message="This will permanently remove all your saved code snippets, chat history, sessions, and bookmarks. This action cannot be undone."
        confirmText="Clear All"
        danger
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Learning Insights
   ═══════════════════════════════════════════ */
function LearningInsightsSection() {
  const insights = [
    { name: 'Arrays & Hashing', level: 'Strong', progress: 85, color: '#22c55e', levelBg: 'rgba(34,197,94,0.12)' },
    { name: 'Dynamic Programming', level: 'Weak', progress: 30, color: '#ef4444', levelBg: 'rgba(239,68,68,0.12)' },
    { name: 'Trees & Graphs', level: 'Moderate', progress: 55, color: '#eab308', levelBg: 'rgba(234,179,8,0.12)' },
    { name: 'Recursion', level: 'Weak', progress: 25, color: '#ef4444', levelBg: 'rgba(239,68,68,0.12)' },
    { name: 'Sorting Algorithms', level: 'Strong', progress: 90, color: '#22c55e', levelBg: 'rgba(34,197,94,0.12)' },
    { name: 'Two Pointers', level: 'Moderate', progress: 60, color: '#eab308', levelBg: 'rgba(234,179,8,0.12)' },
  ];

  const suggestions = [
    '📌 Practice more DP problems — focus on tabulation vs memoization',
    '📌 Revisit recursive tree traversals (in-order, pre-order, post-order)',
    '📌 Try converting recursive solutions to iterative with stacks',
  ];

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(249,115,22,0.12)', borderColor: 'rgba(249,115,22,0.3)', color: '#fb923c' }}>
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Learning Insights</h3>
              <p className="pf-card-desc">Your strengths, weaknesses, and improvement areas</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div className="pf-insight-list">
            {insights.map((item, i) => (
              <div className="pf-insight-item" key={i}>
                <div className="pf-insight-header">
                  <span className="pf-insight-name">{item.name}</span>
                  <span className="pf-insight-level" style={{ background: item.levelBg, color: item.color }}>
                    {item.level}
                  </span>
                </div>
                <div className="pf-progress-bar">
                  <div className="pf-progress-fill" style={{ width: `${item.progress}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--pf-surface)', borderRadius: '10px', border: '1px solid var(--pf-border)' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Brain size={14} /> AI Suggestions
            </h4>
            {suggestions.map((s, i) => (
              <p key={i} style={{ fontSize: '0.8rem', color: 'var(--pf-text-secondary)', marginBottom: '0.35rem', lineHeight: 1.5 }}>{s}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Achievements
   ═══════════════════════════════════════════ */
function AchievementsSection() {
  const badges = [
    { icon: '🔥', name: 'First Streak', unlocked: true },
    { icon: '🧠', name: '100 AI Chats', unlocked: true },
    { icon: '⚡', name: 'Speed Coder', unlocked: true },
    { icon: '🏆', name: 'Top 10%', unlocked: false },
    { icon: '🎯', name: 'DSA Master', unlocked: false },
    { icon: '💎', name: 'Clean Code', unlocked: true },
    { icon: '🌟', name: 'Week Warrior', unlocked: false },
    { icon: '🚀', name: 'Full Stack', unlocked: false },
  ];

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(234,179,8,0.12)', borderColor: 'rgba(234,179,8,0.3)', color: '#facc15' }}>
              <Trophy size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Achievements</h3>
              <p className="pf-card-desc">Your badges, XP, and rank</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div className="pf-stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="pf-stat-card">
              <p className="pf-stat-value" style={{ color: '#c9a5f0' }}>2,450</p>
              <p className="pf-stat-label">Total XP</p>
            </div>
            <div className="pf-stat-card">
              <p className="pf-stat-value" style={{ color: '#4ade80' }}>{badges.filter(b => b.unlocked).length} / {badges.length}</p>
              <p className="pf-stat-label">Badges</p>
            </div>
            <div className="pf-stat-card">
              <p className="pf-stat-value" style={{ color: '#60a5fa' }}>#127</p>
              <p className="pf-stat-label">Global Rank</p>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--pf-text-secondary)' }}>Level 12</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--pf-text-muted)' }}>2,450 / 3,000 XP</span>
            </div>
            <div className="pf-progress-bar" style={{ height: '8px' }}>
              <div className="pf-progress-fill" style={{ width: '82%', background: 'linear-gradient(90deg, #7B2FBE, #9B40E0)' }} />
            </div>
          </div>

          <div className="pf-badges-grid">
            {badges.map((b, i) => (
              <div
                className={`pf-badge-item ${!b.unlocked ? 'locked' : ''}`}
                key={i}
                onClick={() => b.unlocked ? toast(`${b.icon} ${b.name} — Unlocked!`, { icon: '🏅' }) : toast(`${b.name} — Keep coding to unlock!`, { icon: '🔒' })}
                style={{ cursor: 'pointer' }}
              >
                <span className="pf-badge-icon">{b.icon}</span>
                <span className="pf-badge-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Security (Functional)
   ═══════════════════════════════════════════ */
function SecuritySection({ settings, updateSetting, onLogout }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTwoFactor = () => {
    const newVal = !settings.twoFactor;
    updateSetting('twoFactor', newVal);
    toast.success(newVal ? '2FA enabled — your account is more secure!' : '2FA disabled', { icon: newVal ? '🔐' : '🔓' });
  };

  const handleLogoutAll = () => {
    setShowLogoutConfirm(false);
    onLogout();
    toast.success('Logged out from all devices');
  };

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(false);
    // Clear all data
    localStorage.removeItem('apollo_settings');
    localStorage.removeItem('apollo_saved_data');
    onLogout();
    toast.success('Account deleted successfully');
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Security</h3>
              <p className="pf-card-desc">Manage your account security</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div className="pf-toggle-row">
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Two-Factor Authentication</span>
              <span className="pf-toggle-desc">{settings.twoFactor ? '✅ Enabled — extra protection active' : 'Add an extra layer of protection'}</span>
            </div>
            <label className="pf-toggle">
              <input type="checkbox" checked={settings.twoFactor} onChange={handleTwoFactor} />
              <span className="pf-toggle-slider"></span>
            </label>
          </div>

          <div className="pf-toggle-row">
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Change Password</span>
              <span className="pf-toggle-desc">Update your account password</span>
            </div>
            <button className="pf-edit-profile-btn" onClick={() => setShowPasswordModal(true)}>
              <Lock size={14} /> Change
            </button>
          </div>

          <div className="pf-toggle-row">
            <div className="pf-toggle-info">
              <span className="pf-toggle-label">Active Sessions</span>
              <span className="pf-toggle-desc">Sign out from all devices</span>
            </div>
            <button className="pf-edit-profile-btn" onClick={() => setShowLogoutConfirm(true)}>
              <Smartphone size={14} /> Logout All
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="pf-card pf-danger-zone" style={{ marginTop: '1rem' }}>
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="pf-card-title" style={{ color: '#f87171' }}>Danger Zone</h3>
              <p className="pf-card-desc">Irreversible and destructive actions</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 500, marginBottom: '0.15rem' }}>Delete Account</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--pf-text-muted)' }}>Permanently delete your account and all data</p>
            </div>
            <button className="pf-danger-btn" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      </div>

      <PasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />

      <ConfirmModal
        isOpen={showLogoutConfirm}
        title="Logout from All Devices?"
        message="You will be signed out from all active sessions including this one. You'll need to log in again."
        confirmText="Logout All"
        danger
        onConfirm={handleLogoutAll}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Your Account?"
        message="This will permanently delete your account, all saved data, chat history, achievements, and settings. This action cannot be undone."
        confirmText="Delete Forever"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Notifications (Functional)
   ═══════════════════════════════════════════ */
function NotificationsSection({ settings, updateSetting }) {
  const toggles = [
    { key: 'emailAlerts', label: 'Email Alerts', desc: 'Get notified about account activity', icon: '📧' },
    { key: 'aiSuggestions', label: 'AI Suggestions', desc: 'Receive personalized learning tips', icon: '🤖' },
    { key: 'weeklyReports', label: 'Weekly Progress Reports', desc: 'Summary of your weekly coding activity', icon: '📊' },
    { key: 'sessionReminders', label: 'Session Reminders', desc: 'Remind me to practice daily', icon: '⏰' },
  ];

  const handleToggle = (key, label, icon) => {
    const newVal = !settings[key];
    updateSetting(key, newVal);
    toast.success(`${label}: ${newVal ? 'ON' : 'OFF'}`, { icon });
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc' }}>
              <Bell size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Notifications</h3>
              <p className="pf-card-desc">Control what updates you receive</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          {toggles.map(t => (
            <div className="pf-toggle-row" key={t.key}>
              <div className="pf-toggle-info">
                <span className="pf-toggle-label">{t.label}</span>
                <span className="pf-toggle-desc">{t.desc}</span>
              </div>
              <label className="pf-toggle">
                <input type="checkbox" checked={settings[t.key]} onChange={() => handleToggle(t.key, t.label, t.icon)} />
                <span className="pf-toggle-slider"></span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   SECTION: Language (Functional)
   ═══════════════════════════════════════════ */
function LanguageSection({ settings, updateSetting }) {
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ko', label: 'Korean' },
  ];

  const handleChange = (key, value) => {
    updateSetting(key, value);
    const lang = languages.find(l => l.value === value)?.label;
    toast.success(`${key === 'appLang' ? 'App' : 'AI'} language set to ${lang}`, { icon: '🌐' });
  };

  return (
    <div className="pf-section">
      <div className="pf-card">
        <div className="pf-card-header">
          <div className="pf-card-header-left">
            <div className="pf-card-header-icon" style={{ background: 'rgba(6,182,212,0.12)', borderColor: 'rgba(6,182,212,0.3)', color: '#22d3ee' }}>
              <Globe size={18} />
            </div>
            <div>
              <h3 className="pf-card-title">Language</h3>
              <p className="pf-card-desc">App language and AI response language</p>
            </div>
          </div>
        </div>
        <div className="pf-card-body">
          <div className="pf-form-grid">
            <div className="pf-form-group">
              <label className="pf-label">App Language</label>
              <select className="pf-select" value={settings.appLang} onChange={(e) => handleChange('appLang', e.target.value)}>
                {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="pf-form-group">
              <label className="pf-label">AI Response Language</label>
              <select className="pf-select" value={settings.aiLang} onChange={(e) => handleChange('aiLang', e.target.value)}>
                {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════
   MAIN PROFILE PAGE
   ═══════════════════════════════════════════ */

const SECTION_TITLES = {
  profile: { title: 'User Profile', subtitle: 'Manage your personal information and bio' },
  appearance: { title: 'Appearance', subtitle: 'Customize theme, colors, and editor settings' },
  ai: { title: 'AI Preferences', subtitle: 'Configure how Apollo AI interacts with you' },
  saved: { title: 'Saved Data', subtitle: 'Access your snippets, chats, and bookmarks' },
  insights: { title: 'Learning Insights', subtitle: 'Track your strengths, weaknesses, and growth' },
  achievements: { title: 'Achievements', subtitle: 'View your badges, XP, and global rank' },
  security: { title: 'Security', subtitle: 'Manage passwords, 2FA, and account access' },
  notifications: { title: 'Notifications', subtitle: 'Control what alerts and updates you receive' },
  language: { title: 'Language', subtitle: 'Set app and AI response language preferences' },
};

export default function Profile() {
  const { user, login, logout, token } = useAuth();
  const { settings, updateSetting } = useSettings();
  const savedData = useSavedData();
  const [activeSection, setActiveSection] = useState('profile');

  // Apply theme globally
  useApplyTheme(settings.darkMode, settings.accentColor);

  const sectionInfo = SECTION_TITLES[activeSection] || SECTION_TITLES.profile;

  // Save profile updates to AuthContext
  const handleSaveProfile = ({ displayName, email }) => {
    const updatedUser = { ...user, username: displayName, email };
    login(updatedUser, token);
  };

  const handleGlobalSave = () => {
    toast.success('All settings saved!', { icon: '✅', duration: 2000 });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <UserProfileSection user={user} settings={settings} updateSetting={updateSetting} onSaveProfile={handleSaveProfile} />;
      case 'appearance': return <AppearanceSection settings={settings} updateSetting={updateSetting} />;
      case 'ai': return <AIPreferencesSection settings={settings} updateSetting={updateSetting} />;
      case 'saved': return <SavedDataSection savedData={savedData} />;
      case 'insights': return <LearningInsightsSection />;
      case 'achievements': return <AchievementsSection />;
      case 'security': return <SecuritySection settings={settings} updateSetting={updateSetting} onLogout={logout} />;
      case 'notifications': return <NotificationsSection settings={settings} updateSetting={updateSetting} />;
      case 'language': return <LanguageSection settings={settings} updateSetting={updateSetting} />;
      default: return <UserProfileSection user={user} settings={settings} updateSetting={updateSetting} onSaveProfile={handleSaveProfile} />;
    }
  };

  return (
    <div className="pf-page">
      {/* ── Sidebar ── */}
      <aside className="pf-sidebar">
        <div className="pf-sidebar-header">
          <Link to="/" className="pf-sidebar-logo">
            <em>Apollo</em>
            <span className="pf-logo-badge">Settings</span>
          </Link>
          <Link to="/" className="pf-sidebar-back">
            <ChevronLeft size={14} /> Back to home
          </Link>
        </div>

        <nav className="pf-sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="pf-sidebar-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    className={`pf-nav-item ${activeSection === item.key ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.key)}
                  >
                    <Icon size={18} className="pf-nav-icon" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="pf-sidebar-footer">
          <button className="pf-logout-btn" onClick={logout}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="pf-main">
        <div className="pf-main-header">
          <h1 className="pf-main-title">{sectionInfo.title}</h1>
          <p className="pf-main-subtitle">{sectionInfo.subtitle}</p>
        </div>

        {renderSection()}

        {/* Global Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="pf-save-btn" onClick={handleGlobalSave}>
            <Check size={16} /> All Changes Saved
          </button>
        </div>
      </main>
    </div>
  );
}
