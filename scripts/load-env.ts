// Minimal .env loader for scripts and the worker (Next.js loads .env itself).
import fs from "node:fs";
import path from "node:path";
for (const file of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if (!/^["']/.test(v)) v = v.replace(/\s+#.*$/, "");
    v = v.replace(/^"(.*)"$/s, "$1").replace(/^'(.*)'$/s, "$1").replace(/\\n/g, "\n");
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
