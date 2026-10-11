import { next } from "@vercel/functions";

// Browsing is public. Photo mutations are authenticated in the API handler.
export default function middleware() {
  return next();
}

export const config = { matcher: ["/((?!favicon.ico).*)"] };
