import { timingSafeEqual } from "node:crypto";

function sameText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export default function handler(req, res) {
  const header = String(req.headers.authorization || "");
  const expected = process.env.SITE_PASSWORD;
  let valid = false;
  if (expected && header.startsWith("Basic ")) {
    try {
      const value = Buffer.from(header.slice(6), "base64").toString("utf8");
      const split = value.indexOf(":");
      valid = split > 0 && sameText(value.slice(0, split), "ride") && sameText(value.slice(split + 1), expected);
    } catch {}
  }
  res.setHeader("Cache-Control", "no-store");
  if (!valid) return res.status(401).json({ ok: false });
  return res.status(200).json({ ok: true });
}
