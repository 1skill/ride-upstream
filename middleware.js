import { next } from "@vercel/functions";

// Browsing is public. Photo mutations are authenticated in the API handler.
export default function middleware(request) {
  if (new URL(request.url).pathname === "/blackberry-v2.gpx") {
    return new Response("This GPX has been withdrawn pending route verification.", {
      status: 410,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return next();
}

export const config = { matcher: ["/((?!favicon.ico).*)"] };
