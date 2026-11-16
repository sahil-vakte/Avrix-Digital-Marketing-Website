import { promises as dns } from "node:dns";
import { env } from "./env";

export async function checkDns(domain: string) {
  const txt = async (name: string) => (await dns.resolveTxt(name).catch(() => [] as string[][])).map((r) => r.join(""));
  const [root, dmarc, dkim, mx] = await Promise.all([
    txt(domain), txt(`_dmarc.${domain}`), txt(`google._domainkey.${domain}`), dns.resolveMx(domain).catch(() => []),
  ]);
  const spf = root.find((r) => r.startsWith("v=spf1")) ?? null;
  return {
    domain,
    spf, spfOk: !!spf && (spf.includes("_spf.google.com") || !env.smtp.host.includes("gmail")),
    dkim: dkim.find((r) => r.includes("v=DKIM1") || r.includes("p=")) ?? null,
    dmarc: dmarc.find((r) => r.startsWith("v=DMARC1")) ?? null,
    mx: mx.map((m) => m.exchange),
  };
}

