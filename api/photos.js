import { del, list, put } from "@vercel/blob";
import { timingSafeEqual } from "node:crypto";

const ROUTES = new Set([
  "regnart", "blackberry", "apple", "mary",
  "los-gatos-creek", "coyote-creek", "sawyer-camp", "portola-loop",
  "west-cliff", "wilder-ranch", "alameda-loop", "iron-horse"
]);

function sameText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function isAdmin(req) {
  const expected = process.env.SITE_PASSWORD;
  const header = String(req.headers.authorization || "");
  if (!expected || !header.startsWith("Basic ")) return false;
  try {
    const credentials = Buffer.from(header.slice(6), "base64").toString("utf8");
    const split = credentials.indexOf(":");
    return split > 0 && sameText(credentials.slice(0, split), "ride") && sameText(credentials.slice(split + 1), expected);
  } catch {
    return false;
  }
}

function requireAdmin(res) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(401).json({ error: "Admin authentication required" });
}

function allowedOrigin(req) {
  const origin = String(req.headers.origin || "");
  if (!origin) return true;
  return /^https:\/\/(ride\.willll\.com|[a-z0-9-]+\.vercel\.app)$/.test(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export default async function handler(req, res) {
  const route = String(req.query.route || req.headers["x-route"] || "");
  if (!ROUTES.has(route)) return res.status(400).json({ error: "Invalid route" });

  if (req.method === "GET") {
    const { blobs } = await list({ prefix: `rides/${route}/`, limit: 1000 });
    const photos = blobs.map((blob) => {
      const name = blob.pathname.split("/").pop().replace(/\.webp$/i, "");
      const [lat, lon, created] = name.split("_").map(Number);
      return { route, url: blob.url, lat, lon, created: created || new Date(blob.uploadedAt).getTime() };
    }).filter((photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lon));
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(photos);
  }

  if (!allowedOrigin(req)) return res.status(403).json({ error: "Origin denied" });
  if (!isAdmin(req)) return requireAdmin(res);

  if (req.method === "POST") {
    const lat = Number(req.headers["x-lat"]);
    const lon = Number(req.headers["x-lon"]);
    const length = Number(req.headers["content-length"] || 0);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return res.status(400).json({ error: "Invalid metadata" });
    if (length > 4_000_000) return res.status(413).json({ error: "Photo too large" });
    const created = Date.now();
    const pathname = `rides/${route}/${lat}_${lon}_${created}.webp`;
    const blob = await put(pathname, req, { access: "public", contentType: "image/webp", addRandomSuffix: false });
    return res.status(200).json({ route, url: blob.url, lat, lon, created });
  }

  if (req.method === "DELETE") {
    const url = String(req.headers["x-photo-url"] || "");
    const { blobs } = await list({ prefix: `rides/${route}/`, limit: 1000 });
    const match = blobs.find((blob) => blob.url === url);
    if (!match) return res.status(404).json({ error: "Photo not found on this route" });
    await del(match.url);
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}

export const config = { api: { bodyParser: false } };
