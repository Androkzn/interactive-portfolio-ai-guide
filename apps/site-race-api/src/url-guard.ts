// Visitors can type any URL into the challenger box, and that URL is opened in a
// real browser on Cloudflare's network. Only public http(s) sites on default
// ports are accepted, and the hostname must look like a public DNS name.

const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".corp", ".test", ".invalid", ".example"];

export type GuardResult = { ok: true; url: string } | { ok: false; reason: string };

export function normalizeRaceUrl(input: string): GuardResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "Enter a website address." };
  if (raw.length > 300) return { ok: false, reason: "That address is too long." };
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return { ok: false, reason: "That does not look like a website address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "Only http and https sites can race." };
  if (url.username || url.password) return { ok: false, reason: "Addresses with credentials are not accepted." };
  if (url.port && url.port !== "443" && url.port !== "80") return { ok: false, reason: "Only sites on the standard ports can race." };
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return { ok: false, reason: "Use a public domain name, like example.com." };
  if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return { ok: false, reason: "Use a domain name, not an IP address." };
  if (host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) return { ok: false, reason: "Only public websites can race." };
  if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) {
    return { ok: false, reason: "That domain name is not valid." };
  }
  url.hash = "";
  return { ok: true, url: url.toString() };
}
