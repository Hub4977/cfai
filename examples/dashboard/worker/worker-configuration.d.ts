interface Env {
  DashboardDO: DurableObjectNamespace<DashboardDO>;
  AI: Ai;
  ASSETS: Fetcher;
}

interface DashboardDO {
  getFile(path: string): Promise<{ content: ArrayBuffer | null }>;
  putFile(path: string, content: ArrayBuffer): Promise<void>;
  readDir(path: string): Promise<Array<{ name: string; kind: string }>>;
  getBackendName(): Promise<string>;
}

// Extend DurableObjectStub to declare our custom RPC methods
declare module "cloudflare:workers" {
  interface DurableObjectStub<T> {
    getFile(path: string): Promise<{ content: ArrayBuffer | null; exists: boolean }>;
    putFile(path: string, content: ArrayBuffer): Promise<void>;
    readDir(path: string): Promise<Array<{ name: string; kind: string }>>;
    getBackendName(): Promise<string>;
  }
}
