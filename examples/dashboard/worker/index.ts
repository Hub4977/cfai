// Dashboard Worker — serves React SPA + REST API backed by DO SQLite VFS
// Free-tier compatible (no Worker Loader needed).

import { DurableObject } from "cloudflare:workers";

// ---------------------------------------------------------------------------
// Durable Object — lightweight VFS using DO SQLite storage
// ---------------------------------------------------------------------------

export class DashboardDO extends DurableObject<Env> {
  private ready = false;

  private ensureTable() {
    if (this.ready) return;
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS vfs (path TEXT PRIMARY KEY, content BLOB, kind TEXT DEFAULT 'file', modified TEXT DEFAULT (datetime('now')))"
    );
    this.ready = true;
  }

  async getFile(path: string): Promise<{ content: ArrayBuffer | null }> {
    this.ensureTable();
    const cursor = this.ctx.storage.sql.exec("SELECT content FROM vfs WHERE path = ?", path);
    const rows = [...cursor];
    if (rows.length === 0) return { content: null };
    return { content: rows[0].content as ArrayBuffer };
  }

  async putFile(path: string, content: ArrayBuffer): Promise<void> {
    this.ensureTable();
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO vfs (path, content, kind, modified) VALUES (?, ?, 'file', datetime('now'))",
      path, content
    );
  }

  async readDir(path: string): Promise<Array<{ name: string; kind: string }>> {
    this.ensureTable();
    const prefix = path === "/" ? "/" : path.endsWith("/") ? path : path + "/";
    const cursor = this.ctx.storage.sql.exec(
      "SELECT path, kind FROM vfs WHERE path LIKE ? AND path != ?",
      `${prefix}%`, prefix
    );
    const entries = new Map<string, string>();
    for (const row of cursor) {
      const p = row.path as string;
      const rest = p.slice(prefix.length);
      if (!rest) continue;
      const parts = rest.split("/");
      if (parts[0] && !entries.has(parts[0])) {
        entries.set(parts[0], parts.length > 1 ? "directory" : (row.kind as string));
      }
    }
    return [...entries.entries()].map(([name, kind]) => ({ name, kind }));
  }

  async getBackendName(): Promise<string> {
    return "durable-object-sqlite";
  }
}

// ---------------------------------------------------------------------------
// Worker HTTP handler
// ---------------------------------------------------------------------------

const MOUNT_ROOT = "/workspace";

function resolvePath(rest: string): string | null {
  const candidate = `/${rest}`;
  if (candidate !== MOUNT_ROOT && !candidate.startsWith(`${MOUNT_ROOT}/`)) return null;
  if (candidate.split("/").includes("..")) return null;
  return candidate;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const apiMatch = url.pathname.match(/^\/api\/c\/([^/]+)\/(.+)$/);
    if (apiMatch) return handleAPI(request, env, apiMatch[1], apiMatch[2]);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleAPI(request: Request, env: Env, wsName: string, rest: string): Promise<Response> {
  if (rest === "exec" && request.method === "POST") return handleExec(request);
  if (rest === "readdir" && request.method === "POST") return handleReaddir(request, env, wsName);
  if (rest === "status" && request.method === "GET") return handleStatus(env, wsName);
  if (rest === "switch-backend" && request.method === "POST") return handleSwitchBackend();
  if (rest === "ai" && request.method === "POST") return handleAI(request, env, wsName);

  const fileMatch = rest.match(/^file\/(.+)$/);
  if (fileMatch) {
    const resolved = resolvePath(fileMatch[1]);
    if (!resolved) return errorJSON(new Error(`path must sit under ${MOUNT_ROOT}`), 400);
    return handleFile(request, env, wsName, resolved);
  }

  return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: { "content-type": "application/json" } });
}

function getStub(env: Env, name: string): any {
  return env.DashboardDO.get(env.DashboardDO.idFromName(name));
}

async function handleFile(request: Request, env: Env, name: string, path: string): Promise<Response> {
  const stub = getStub(env, name);

  if (request.method === "GET") {
    const { content } = await stub.getFile(path);
    if (!content) return errorJSON(new Error("ENOENT: file not found"), 404);
    return new Response(content, { status: 200, headers: { "content-type": "application/octet-stream" } });
  }

  if (request.method === "PUT") {
    const body = await request.arrayBuffer();
    await stub.putFile(path, body);
    return new Response(null, { status: 204 });
  }

  return new Response("method not allowed", { status: 405 });
}

async function handleReaddir(request: Request, env: Env, name: string): Promise<Response> {
  let body: { path?: string };
  try { body = await request.json() as typeof body; } catch { body = {}; }
  const path = body.path || "/workspace";
  const stub = getStub(env, name);
  const entries = await stub.readDir(path);
  return new Response(JSON.stringify(entries), { status: 200, headers: { "content-type": "application/json" } });
}

async function handleStatus(env: Env, name: string): Promise<Response> {
  const stub = getStub(env, name);
  const backend = await stub.getBackendName();
  return new Response(JSON.stringify({ backend }), { status: 200, headers: { "content-type": "application/json" } });
}

function handleSwitchBackend(): Response {
  return new Response(JSON.stringify({
    message: "Active backend: durable-object-sqlite (free plan). Switching to container/worker-shell requires a paid Cloudflare plan with Dynamic Workers.",
    backend: "durable-object-sqlite",
  }), { status: 200, headers: { "content-type": "application/json" } });
}

async function handleExec(request: Request): Promise<Response> {
  let body: { command?: string };
  try { body = await request.json() as typeof body; } catch { return errorJSON(new Error("invalid JSON"), 400); }
  return new Response(JSON.stringify({
    exitCode: 0,
    stdout: `[Free Plan] Shell execution requires paid Cloudflare plan.\nCommand: ${body.command || "(none)"}`,
    stderr: "",
  }), { status: 200, headers: { "content-type": "application/json" } });
}

async function handleAI(request: Request, env: Env, name: string): Promise<Response> {
  let body: { prompt?: string };
  try { body = await request.json() as typeof body; } catch { return errorJSON(new Error("invalid JSON"), 400); }
  if (!body.prompt) return errorJSON(new Error("must provide prompt"), 400);

  try {
    const aiResp: any = await env.AI.run("@cf/meta/llama-4-scout-17b-16e-instruct", {
      messages: [{ role: "user", content: body.prompt }],
    });
    return new Response(JSON.stringify({ response: aiResp.response || JSON.stringify(aiResp) }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({
      response: `AI error: ${msg}\nYour prompt: "${body.prompt}"`,
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
}

function errorJSON(error: unknown, status: number): Response {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });
}
