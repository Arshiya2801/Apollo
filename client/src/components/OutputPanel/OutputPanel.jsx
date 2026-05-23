import './OutputPanel.css';

function OutputPanel({ output, running, onClose, stdin, onStdinChange }) {
  return (
    <div className="output-panel">
      <div className="output-header">
        <span>⬤ Output</span>
        <button className="output-close" onClick={onClose}>✕</button>
      </div>
      <div className="output-body">
        {/* Stdin Input */}
        <div className="stdin-section">
          <label className="stdin-label">
            <span className="stdin-icon">⌨</span> Input (stdin)
          </label>
          <textarea
            className="stdin-input"
            value={stdin}
            onChange={(e) => onStdinChange(e.target.value)}
            placeholder={"Enter inputs here, one per line...\ne.g.\n5\n1 2 3 4 5\n10"}
            rows={4}
            spellCheck={false}
          />
        </div>

        {/* Output Display */}
        <div className="output-content">
          {running ? (
            <p className="output-running">Executing your code...</p>
          ) : output ? (
            <>
              {output.stdout && <pre className="output-stdout">{output.stdout}</pre>}
              {output.stderr && <pre className="output-stderr">{output.stderr}</pre>}
              {!output.stdout && !output.stderr && (
                <p className="output-empty">
                  Program finished with no output (exit code: {output.exitCode})
                </p>
              )}
            </>
          ) : (
            <p className="output-empty">Click ▶ Run Code to execute</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default OutputPanel;
