import { useState, useEffect, useCallback, useRef } from "react";
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
  const [uploading, setUploading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const path = `${currentPath}/${file.name}`;
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(`${API_BASE}/c/${workspace}/file${path}`, {
        method: "PUT",
        body: arrayBuffer,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      await fetchDir(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    setUploading(true);
    try {
      const path = `${currentPath}/${newFileName.trim()}`;
      const res = await fetch(`${API_BASE}/c/${workspace}/file${path}`, {
        method: "PUT",
        body: newFileContent,
      });
      if (!res.ok) throw new Error(`Create failed: ${res.statusText}`);
      setNewFileName("");
      setNewFileContent("");
      setShowCreate(false);
      await fetchDir(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setUploading(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
          >
            + New File
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fetchDir(currentPath)}
            className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-hover)] cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Create File Form */}
      {showCreate && (
        <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 space-y-3">
          <h3 className="text-sm font-semibold">Create New File</h3>
          <input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="filename.txt"
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
          />
          <textarea
            value={newFileContent}
            onChange={(e) => setNewFileContent(e.target.value)}
            placeholder="File content..."
            rows={3}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={createFile}
              disabled={uploading || !newFileName.trim()}
              className="px-4 py-1.5 bg-[var(--color-primary)] text-white rounded text-sm hover:bg-[var(--color-primary-hover)] cursor-pointer disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewFileName(""); setNewFileContent(""); }}
              className="px-4 py-1.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-sm text-[var(--color-text-muted)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
            <div className="text-3xl mb-2">📂</div>
            <div>Empty workspace</div>
            <div className="text-xs mt-1">Upload files or create a new file to get started</div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-sm text-[var(--color-text-muted)]">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Kind</th>
              </tr>
            </thead>
            <tbody>
              {currentPath !== "/workspace" && (
                <tr
                  onClick={navigateUp}
                  className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] cursor-pointer"
                >
                  <td className="px-4 py-2 text-sm" colSpan={2}>📁 ..</td>
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
          <pre className="bg-[var(--color-bg)] rounded-lg border border-[var(--color-border)] p-4 text-sm overflow-auto max-h-96 font-mono whitespace-pre-wrap break-all">
            {fileContent}
          </pre>
        </div>
      )}
    </div>
  );
}
