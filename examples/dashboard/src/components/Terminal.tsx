import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../App";

interface LogEntry {
  type: "input" | "stdout" | "stderr" | "error" | "info";
  text: string;
  timestamp: string;
}

interface Props {
  workspace: string;
}

export default function Terminal({ workspace }: Props) {
  const [command, setCommand] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [executing, setExecuting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (type: LogEntry["type"], text: string) => {
    setLogs((prev) => [...prev, { type, text, timestamp: new Date().toLocaleTimeString() }]);
  };

  const executeCommand = async () => {
    const cmd = command.trim();
    if (!cmd) return;

    addLog("input", `$ ${cmd}`);
    setCommand("");
    setExecuting(true);

    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/exec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, encoding: "utf8" }),
      });

      const data = await res.json();

      if (!res.ok) {
        addLog("error", data.error || `HTTP ${res.status}`);
      } else {
        if (data.stdout) addLog("stdout", data.stdout);
        if (data.stderr) addLog("stderr", data.stderr);
        if (data.exitCode !== 0) addLog("error", `Exit code: ${data.exitCode}`);
        else addLog("info", `Exit code: 0`);
      }
    } catch (err) {
      addLog("error", err instanceof Error ? err.message : "Network error");
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  const clearLogs = () => setLogs([]);

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "input": return "text-[var(--color-primary)]";
      case "stdout": return "text-[var(--color-text)]";
      case "stderr": return "text-[var(--color-warning)]";
      case "error": return "text-[var(--color-error)]";
      case "info": return "text-[var(--color-text-muted)]";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Terminal &amp; Execution Log</h2>
        <button
          onClick={clearLogs}
          className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Terminal Output */}
      <div className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-4 h-80 overflow-auto font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-[var(--color-text-muted)]">
            Type a command and press Enter to execute...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`${getLogColor(log.type)} whitespace-pre-wrap`}>
              <span className="text-[var(--color-text-muted)] text-xs mr-2">[{log.timestamp}]</span>
              {log.text}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Command Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-primary)] font-mono text-sm">
            $
          </span>
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={executing}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-8 pr-4 py-2.5 text-sm font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
            placeholder="Enter shell command..."
          />
        </div>
        <button
          onClick={executeCommand}
          disabled={executing || !command.trim()}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer"
        >
          {executing ? "Running..." : "Execute"}
        </button>
      </div>
    </div>
  );
}
