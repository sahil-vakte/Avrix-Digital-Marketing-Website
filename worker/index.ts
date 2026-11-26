// Avrix sending worker — run with `npm run worker` (PM2 keeps it alive).
import "../scripts/load-env";
import { env } from "../src/lib/env";
import { pool } from "../src/db";
import { sendNext } from "./sender";
import { tick, releaseStuck } from "./scheduler";
import { pollMailbox } from "./imap";
import { deliverWebhooks } from "./webhooks";
import { log } from "./log";

let stopping = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const gap = () => 1000 * (env.send.minGap + Math.random() * Math.max(0, env.send.maxGap - env.send.minGap));

async function sendLoop() {
  while (!stopping) {
    try {
      const r = await sendNext();
      if (r === "sent") await sleep(gap());
      else if (r === "skipped" || r === "failed") await sleep(250);
      else await sleep(r === "idle" ? 5_000 : 60_000); // idle / capped / paused
    } catch (e) {
      log.error("send loop", e);
      await sleep(10_000);
    }
  }
}

async function schedulerLoop() {
  while (!stopping) {
    try { await tick(); } catch (e) { log.error("scheduler", e); }
    try { await deliverWebhooks(); } catch (e) { log.error("webhooks", e); }
    await sleep(15_000);
  }
}

async function imapLoop() {
  if (!env.imap.enabled) { log.info("IMAP monitoring disabled (IMAP_ENABLED=false)"); return; }
  while (!stopping) {
    try { await pollMailbox(); } catch (e) { log.error("imap poll", (e as Error).message); }
    await sleep(env.imap.pollMinutes * 60_000);
  }
}

async function main() {
  log.info(`worker starting — SMTP ${env.smtp.host}:${env.smtp.port} as ${env.smtp.user}, cap ${env.send.dailyCap}/day, ${env.send.hourlyCap}/hour`);
  await releaseStuck();
  await Promise.all([sendLoop(), schedulerLoop(), imapLoop()]);
}

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, async () => {
    log.info(`${sig} received, stopping after current send…`);
    stopping = true;
    setTimeout(async () => { await pool.end().catch(() => {}); process.exit(0); }, 3000);
  });

main().catch((e) => { log.error(e); process.exit(1); });
