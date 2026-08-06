import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../App";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface Props {
  workspace: string;
}

export default function AIConsole({ workspace }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        role: res.ok ? "assistant" : "system",
        content: res.ok
          ? data.response || data.stdout || "No response"
          : data.error || `HTTP ${res.status}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: "system",
        content: `Error: ${err instanceof Error ? err.message : "Network error"}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageStyle = (role: Message["role"]) => {
    switch (role) {
      case "user":
        return "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 ml-8";
      case "assistant":
        return "bg-[var(--color-surface)] border border-[var(--color-border)] mr-8";
      case "system":
        return "bg-red-900/20 border border-red-800/50 ml-8 mr-8";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">AI Interaction Console</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        Send natural language instructions to the AI agent. Commands are executed through the workspace runtime.
      </p>

      {/* Chat Messages */}
      <div className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-4 h-96 overflow-auto">
        {messages.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-12">
            <div className="text-4xl mb-3">🤖</div>
            <div>Send a natural language instruction to get started</div>
            <div className="text-xs mt-2">e.g. &quot;List all files in the workspace&quot; or &quot;Create a hello.py script&quot;</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`rounded-lg px-4 py-3 mb-2 text-sm whitespace-pre-wrap ${getMessageStyle(msg.role)}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">
                  {msg.role}
                </span>
                <span className="text-xs text-[var(--color-text-muted)]">{msg.timestamp}</span>
              </div>
              {msg.content}
            </div>
          ))
        )}
        {loading && (
          <div className="text-center text-[var(--color-text-muted)] py-4">
            <div className="animate-pulse">AI is thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          rows={2}
          className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-4 py-3 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none disabled:opacity-50"
          placeholder="Type your instruction... (Enter to send, Shift+Enter for newline)"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer self-end"
        >
          Send
        </button>
      </div>
    </div>
  );
}
