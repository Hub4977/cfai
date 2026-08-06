/// <reference types="vite/client" />

interface Env {
  DashboardDO: DurableObjectNamespace;
  LOADER: WorkerLoaderNamespace;
}

interface FileEntry {
  name: string;
  kind: "file" | "directory";
  size?: number;
  modified?: string;
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface BackendStatus {
  name: string;
  active: boolean;
  type: string;
}
