import { useState } from "react";
import FileBrowser from "./components/FileBrowser";
import Terminal from "./components/Terminal";
import BackendPanel from "./components/BackendPanel";
import AIConsole from "./components/AIConsole";

const API_BASE = "/api";

export { API_BASE };

type Tab = "files" | "terminal" | "backends" | "ai";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("files");
  const [workspaceName, setWorkspaceName] = useState("default");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "files", label: "File Browser", icon: "📁" },
    { id: "terminal", label: "Terminal", icon: "💻" },
    { id: "backends", label: "Backends", icon: "⚙️" },
    { id: "ai", label: "AI Console", icon: "🤖" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
            CF
          </div>
          <h1 className="text-lg font-semibold">Computer Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--color-text-muted)]">Workspace:</label>
          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
            placeholder="workspace name"
          />
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 p-6 overflow-auto">
        {activeTab === "files" && <FileBrowser workspace={workspaceName} />}
        {activeTab === "terminal" && <Terminal workspace={workspaceName} />}
        {activeTab === "backends" && <BackendPanel workspace={workspaceName} />}
        {activeTab === "ai" && <AIConsole workspace={workspaceName} />}
      </main>
    </div>
  );
}
