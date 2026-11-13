#!/usr/bin/env node
/**
 * Runs the interview question set against a deployment and writes a Markdown report
 * (answer, word count, latency) for review.
 *
 *   node evals/run.mjs https://adil-voice-bot.vercel.app            # public URL
 *   node evals/run.mjs <protected-deployment-url> --vercel-curl      # staged deploy (uses `vercel curl`)
 *   node evals/run.mjs <url> --only=failure,weakness                 # subset
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [base, ...flags] = process.argv.slice(2);
if (!base) throw new Error("Usage: node evals/run.mjs <base-url> [--vercel-curl] [--only=a,b] [--out=file]");
const useVercelCurl = flags.includes("--vercel-curl");
const only = flags.find((f) => f.startsWith("--only="))?.slice(7).split(",");
const out = flags.find((f) => f.startsWith("--out="))?.slice(6) ?? "evals/report.md";
const delayMs = Number(flags.find((f) => f.startsWith("--delay="))?.slice(8) ?? 4000); // stay under free-tier TPM

const cases = JSON.parse(readFileSync(new URL("./questions.json", import.meta.url), "utf8")).filter(
  (c) => !only || only.includes(c.id),
);

async function ask(messages) {
  const body = JSON.stringify({ messages });
  const t0 = Date.now();
  let text;
  if (useVercelCurl) {
    text = execFileSync(
      "vercel",
      ["curl", "/api/chat", "--deployment", base, "--", "-s", "-X", "POST", "-H", "content-type: application/json", "-d", body],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } else {
    const res = await fetch(`${base}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body });
    text = await res.text();
  }
  return { text: text.trim(), ms: Date.now() - t0 };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = [`# Eval report\n\nTarget: ${base}\nRun: ${new Date().toISOString()}\n`];
let totalWords = 0;

for (const c of cases) {
  const turns = c.turns ?? [c.q];
  const messages = [];
  lines.push(`## ${c.id}`);
  for (const q of turns) {
    messages.push({ role: "user", content: q });
    const { text, ms } = await ask(messages);
    messages.push({ role: "assistant", content: text });
    const words = text.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    lines.push(`**Q:** ${q}\n\n**A:** ${text}\n\n_${words} words, ${(ms / 1000).toFixed(1)}s_\n`);
    console.log(`${c.id.padEnd(14)} ${String(words).padStart(3)}w ${(ms / 1000).toFixed(1)}s  ${text.slice(0, 70).replace(/\n/g, " ")}…`);
    await sleep(delayMs);
  }
}

lines.push(`---\nAverage words per answer: ${Math.round(totalWords / cases.reduce((n, c) => n + (c.turns?.length ?? 1), 0))}`);
writeFileSync(out, lines.join("\n"));
console.log(`\nReport written to ${out}`);
