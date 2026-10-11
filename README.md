# Bay Rides

An iPhone-first public guide to cycling routes across Cupertino, the South Bay,
Peninsula, Santa Cruz, and East Bay. It includes road-level maps, direction
arrows, filters, GPX downloads, drive-to-start links, and Google/Apple Maps
handoff.

Browsing and historical photos are public. Photo upload and deletion require
the administrator password stored as `SITE_PASSWORD` in Vercel. Photos remain
in the existing Vercel Blob store under `rides/<route-id>/`; the four original
route IDs and paths are unchanged.

## Local checks

```sh
npm install
npm run check
npx vercel dev
```

Production: https://ride.willll.com
