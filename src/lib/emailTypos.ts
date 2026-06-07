const SUSPICIOUS_TLDS = [".coms", ".con", ".cmo"];
const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cmo": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahho.com": "yahoo.com",
  "outlok.com": "outlook.com",
  "hotnail.com": "hotmail.com",
};

export function getSuspiciousEmailMessage(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  const domain = normalized.split("@").pop() ?? "";
  const suggested = DOMAIN_FIXES[domain];
  if (suggested) return `Did you mean ${normalized.split("@")[0]}@${suggested}?`;
  if (SUSPICIOUS_TLDS.some((suffix) => domain.endsWith(suffix))) {
    return "This email domain looks unusual. Confirm it is correct before continuing.";
  }
  return null;
}
