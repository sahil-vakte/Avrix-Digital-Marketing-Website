const SPAM_WORDS = [
  "free", "guarantee", "guaranteed", "risk-free", "act now", "urgent", "limited time", "click here", "buy now",
  "100%", "winner", "cash", "earn money", "no obligation", "special promotion", "exclusive deal", "once in a lifetime",
  "double your", "cheap", "lowest price", "save big", "no catch", "amazing", "congratulations", "dear friend",
  "apply now", "order now", "while supplies last", "this isn't spam", "unsubscribe below", "$$$", "£££", "€€€",
];

export function spamCheck(subject: string, html: string) {
  const text = (subject + " " + html.replace(/<[^>]+>/g, " ")).toLowerCase();
  const words = SPAM_WORDS.filter((w) => text.includes(w));
  const warnings: string[] = [];
  if (words.length) warnings.push(`Spam-trigger words: ${words.join(", ")}`);
  if (/[A-Z]{6,}/.test(subject)) warnings.push("Subject contains words in ALL CAPS");
  if ((subject.match(/!/g) ?? []).length > 1) warnings.push("Subject has more than one exclamation mark");
  if (subject.length > 70) warnings.push("Subject is longer than 70 characters");
  const linkCount = (html.match(/<a\s/gi) ?? []).length;
  if (linkCount > 4) warnings.push(`${linkCount} links — cold emails with more than 3 links are often filtered`);
  if (/<img/i.test(html)) warnings.push("Images in cold email reduce inbox placement; plain text performs best");
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length < 80) warnings.push("Very short body text");
  return { score: Math.max(0, 10 - words.length * 2 - (warnings.length - (words.length ? 1 : 0))), warnings };
}
