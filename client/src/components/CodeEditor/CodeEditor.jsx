import Editor from '@monaco-editor/react';

function CodeEditor({ language, value, onChange, theme = 'vs-dark' }) {
  const handleChange = (newValue) => {
    onChange(newValue || '');
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={handleChange}
      theme={theme}
      options={{
        fontSize: 14,
        fontFamily: "'Fira Code', monospace",
        minimap: { enabled: false },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        padding: { top: 16 },
        suggestOnTriggerCharacters: true,
        tabSize: 2,
        renderLineHighlight: 'all',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
      }}
    />
  );
}

export default CodeEditor;
