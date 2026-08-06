import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../App";

interface FileEntry {
  name: string;
  kind: "file" | "directory";
  size?: number;
  modified?: string;
}

interface Props {
  workspace: string;
}

export default function FileBrowser({ workspace }: Props) {
  const [currentPath, setCurrentPath] = useState("/workspace");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const fetchDir = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    setFileContent(null);
    setViewingFile(null);
    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/readdir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) throw new Error(`Failed to read directory: ${res.statusText}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
      setCurrentPath(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [workspace]);

  useEffect(() => {
    fetchDir(currentPath);
  }, [currentPath, fetchDir]);

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.kind === "directory") {
      const newPath = currentPath === "/" ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      fetchDir(newPath);
    } else {
      viewFile(`${currentPath}/${entry.name}`);
    }
  };

  const viewFile = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/c/${workspace}/file${path}`);
      if (!res.ok) throw new Error(`Failed to read file: ${res.statusText}`);
      const text = await res.text();
      setFileContent(text);
      setViewingFile(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    } finally {
      setLoading(false);
    }
  };

  const navigateUp = () => {
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length > 0) {
      parts.pop();
      fetchDir("/" + parts.join("/") || "/workspace");
    }
  };

  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Virtual File System</h2>
        <button
          onClick={() => fetchDir(currentPath)}
          className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-hover)] cursor-pointer"
        >
          Refresh
        </button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm bg-[var(--color-surface)] rounded-lg px-4 py-2 border border-[var(--color-border)]">
        <button
          onClick={() => fetchDir("/workspace")}
          className="text-[var(--color-primary)] hover:underline cursor-pointer"
        >
          root
        </button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="text-[var(--color-text-muted)]">/</span>
            <button
              onClick={() => fetchDir("/" + pathParts.slice(0, i + 1).join("/"))}
              className="text-[var(--color-primary)] hover:underline cursor-pointer"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* File List */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] overflow-hidden">
        {loading ? (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">Loading...</div>
        ) : entries.length === 0 && !error ? (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)]">
            Empty directory
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Kind</th>
                <th className="px-4 py-2 font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== "/workspace" && (
                <tr
                  onClick={navigateUp}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                >
                  <td className="px-4 py-2 text-sm" colSpan={3}>📁 ..</td>
                </tr>
              )}
              {entries.map((entry, i) => (
                <tr
                  key={i}
                  onClick={() => handleEntryClick(entry)}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                >
                  <td className="px-4 py-2 text-sm">
                    {entry.kind === "directory" ? "📁" : "📄"} {entry.name}
                  </td>
                  <td className="px-4 py-2 text-sm text-[var(--color-text-muted)]">{entry.kind}</td>
                  <td className="px-4 py-2 text-sm text-[var(--color-text-muted)]">
                    {entry.size !== undefined ? `${entry.size} B` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* File Content Viewer */}
      {viewingFile && fileContent !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[var(--color-text-muted)]">{viewingFile}</h3>
            <button
              onClick={() => { setViewingFile(null); setFileContent(null); }}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              Close
            </button>
          </div>
          <pre className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-4 text-sm overflow-auto max-h-96 font-mono">
            {fileContent}
          </pre>
        </div>
      )}
    </div>
  );
}
