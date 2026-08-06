import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../App";

interface BackendInfo {
  name: string;
  type: string;
  description: string;
}

interface Props {
  workspace: string;
}

const AVAILABLE_BACKENDS: BackendInfo[] = [
  {
    name: "container",
    type: "CloudflareContainerBackend",
    description: "Full container runtime with computerd daemon. Supports arbitrary Linux commands, persistent processes, and file sync via FUSE.",
  },
  {
    name: "worker-shell",
    type: "WorkerShellBackend",
    description: "Lightweight shell running inside a Dynamic Worker. Fast startup, limited to shell commands that don't require a full OS.",
  },
  {
    name: "worker-javascript",
    type: "WorkerJavaScriptBackend",
    description: "JavaScript/ECMAScript module execution inside a Dynamic Worker. No shell access — ideal for pure JS computation tasks.",
  },
];

export default function BackendPanel({ workspace }: Props) {
  const [currentBackend, setCurrentBackend] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/status`);
      if (res.ok) {
        const data = await res.json();
        setCurrentBackend(data.backend || null);
      }
    } catch {
      // Status endpoint may not be available yet
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const switchBackend = async (backendName: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/switch-backend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backend: backendName }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentBackend(backendName);
        setMessage(`Switched to ${backendName} backend`);
      } else {
        setMessage(`Error: ${data.error || "Failed to switch backend"}`);
      }
    } catch (err) {
      setMessage(`Network error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Backend Status</h2>
        <button
          onClick={fetchStatus}
          className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
        >
          Refresh Status
        </button>
      </div>

      {currentBackend && (
        <div className="bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-3 text-sm text-green-300">
          Active backend: <span className="font-semibold">{currentBackend}</span>
        </div>
      )}

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          message.startsWith("Error")
            ? "bg-red-900/30 border border-red-800 text-red-300"
            : "bg-blue-900/20 border border-blue-800/50 text-blue-300"
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-4">
        {AVAILABLE_BACKENDS.map((backend) => {
          const isActive = currentBackend === backend.name;
          return (
            <div
              key={backend.name}
              className={`bg-[var(--color-surface)] rounded-lg border p-4 transition-colors ${
                isActive
                  ? "border-[var(--color-primary)]"
                  : "border-[var(--color-border)] hover:border-[var(--color-surface-hover)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{backend.name}</h3>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-[var(--color-primary)] text-white text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">{backend.type}</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{backend.description}</p>
                </div>
                <button
                  onClick={() => switchBackend(backend.name)}
                  disabled={loading || isActive}
                  className={`px-4 py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[var(--color-bg)] text-[var(--color-text-muted)] cursor-default"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  {isActive ? "Current" : "Switch"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
