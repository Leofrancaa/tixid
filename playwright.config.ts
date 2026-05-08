import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  workers: 1, // jogos têm estado compartilhado — roda um por vez
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Cada contexto tem seus próprios cookies → cada contexto = um jogador
    ignoreHTTPSErrors: true,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
