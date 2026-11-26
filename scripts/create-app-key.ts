// Create intake credentials for one application from the server shell.
//
//   node node_modules/tsx/dist/cli.mjs scripts/create-app-key.ts --app medicolex [--label "Server A"]
//        [--webhook-url https://example.com/api/crm-webhook/]
//
// Prints shell-safe KEY=value lines on stdout and nothing else, so a setup script
// can capture them straight into an env file. Progress goes to stderr.
// The API key is stored only as a sha256 hash; the signing secret is encrypted.
import "./load-env";
import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db, pool, t } from "../src/db";
import { encrypt } from "../src/lib/crypto";
import { newApiCredentials } from "../src/lib/signing";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const key = arg("app");
  if (!key) throw new Error("Usage: create-app-key.ts --app <application key> [--label <label>] [--webhook-url <url>]");
  const app = await db.query.applications.findFirst({ where: eq(t.applications.key, key) });
  if (!app) {
    const all = await db.select({ key: t.applications.key }).from(t.applications);
    throw new Error(`No application "${key}". Known: ${all.map((a) => a.key).join(", ")}`);
  }

  const label = arg("label") ?? `Server setup ${new Date().toISOString().slice(0, 10)}`;
  const c = newApiCredentials();
  await db.insert(t.applicationKeys).values({
    applicationId: app.id, label, prefix: c.prefix, keyHash: c.keyHash, secretEnc: encrypt(c.secret),
  });
  await db.insert(t.auditLogs).values({ userId: null, action: "create_key_cli", entity: "application", entityId: app.id, diff: { prefix: c.prefix, label } });
  const active = await db.select({ id: t.applicationKeys.id }).from(t.applicationKeys)
    .where(and(eq(t.applicationKeys.applicationId, app.id), isNull(t.applicationKeys.revokedAt)));
  console.error(`✓ Key ${c.prefix}… created for ${app.name} (${active.length} active key(s); revoke old ones in Settings → Applications)`);

  const out = [`AVRIX_CRM_KEY=${c.key}`, `AVRIX_CRM_SECRET=${c.secret}`];

  const webhookUrl = arg("webhook-url");
  if (webhookUrl) {
    if (!/^https:\/\//.test(webhookUrl)) throw new Error("--webhook-url must start with https://");
    const secret = `whsec_${randomBytes(32).toString("base64url")}`;
    await db.update(t.applications).set({ webhookUrl, webhookSecretEnc: encrypt(secret) }).where(eq(t.applications.id, app.id));
    await db.insert(t.auditLogs).values({ userId: null, action: "set_webhook_cli", entity: "application", entityId: app.id, diff: { webhookUrl } });
    console.error(`✓ Stage-change webhook set to ${webhookUrl} with a new secret`);
    out.push(`AVRIX_CRM_WEBHOOK_SECRET=${secret}`);
  }

  process.stdout.write(out.join("\n") + "\n");
}

main()
  .then(() => pool.end())
  .catch(async (e) => {
    console.error(`✗ ${e instanceof Error ? e.message : e}`);
    await pool.end().catch(() => {});
    process.exit(1);
  });
