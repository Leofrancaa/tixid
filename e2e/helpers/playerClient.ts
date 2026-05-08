/**
 * Cliente HTTP por jogador com cookie jar próprio.
 * Usa Node.js fetch nativo (Node 18+) — sem browser, sem dependência de binários.
 * Implementa a mesma interface que APIRequestContext do Playwright usa em api.ts.
 */

export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export interface PlayerResponse {
  ok(): boolean;
  status(): number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

class WrappedResponse implements PlayerResponse {
  constructor(private r: Response) {}
  ok() { return this.r.ok; }
  status() { return this.r.status; }
  text() { return this.r.text(); }
  json() { return this.r.json(); }
}

export class PlayerClient {
  private readonly cookieJar = new Map<string, string>();
  readonly nickname: string;

  constructor(nickname: string) {
    this.nickname = nickname;
  }

  private cookieHeader(): Record<string, string> {
    if (!this.cookieJar.size) return {};
    return { Cookie: [...this.cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ") };
  }

  private storeCookies(res: Response) {
    // Node 20+ tem getSetCookie(); Node 18 tem apenas get() que retorna o primeiro
    const all: string[] =
      typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
        ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : [res.headers.get("set-cookie") ?? ""].filter(Boolean);

    for (const raw of all) {
      const [nameVal] = raw.split(";");
      const eq = nameVal.indexOf("=");
      if (eq > 0) {
        this.cookieJar.set(nameVal.slice(0, eq).trim(), nameVal.slice(eq + 1).trim());
      }
    }
  }

  async get(path: string): Promise<PlayerResponse> {
    const r = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: { ...this.cookieHeader() },
    });
    this.storeCookies(r);
    return new WrappedResponse(r);
  }

  async post(path: string, opts?: { data?: unknown }): Promise<PlayerResponse> {
    const r = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.cookieHeader() },
      body: opts?.data !== undefined ? JSON.stringify(opts.data) : undefined,
    });
    this.storeCookies(r);
    return new WrappedResponse(r);
  }

  async patch(path: string, opts?: { data?: unknown }): Promise<PlayerResponse> {
    const r = await fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...this.cookieHeader() },
      body: opts?.data !== undefined ? JSON.stringify(opts.data) : undefined,
    });
    this.storeCookies(r);
    return new WrappedResponse(r);
  }
}

// Verifica que o servidor tixid está rodando antes dos testes
export async function assertServerIsRunning() {
  try {
    const r = await fetch(`${BASE_URL}/`);
    if (!r.ok) throw new Error(`Status ${r.status}`);
    const html = await r.text();
    if (!html.includes("Vonix") && !html.includes("tixid")) {
      throw new Error(
        `O servidor em ${BASE_URL} não parece ser o tixid.\n` +
        `Verifique se "npm run dev" está rodando no diretório correto.\n` +
        `Se subiu em outra porta, use: $env:E2E_BASE_URL="http://localhost:3001"; npm run test:e2e`
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Servidor tixid não encontrado em ${BASE_URL}.\n` +
      `Inicie "npm run dev" em outro terminal e tente novamente.\n` +
      `Detalhe: ${msg}`
    );
  }
}
