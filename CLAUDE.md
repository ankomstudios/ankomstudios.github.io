# ankomstudios.com — project context for Claude Code

This file is a handoff so a fresh Claude Code session in this repo has full context on the media/hosting setup already in progress. Drop this at the root of the local website repo as `CLAUDE.md`.

## Goal

Finish/polish the ankomstudios.com site (owned via Cloudflare, which is also where the domain is registered) without hitting GitHub's file-size limits, and without media looking rough due to size constraints.

## What's already done

**GitHub repo:** `https://github.com/ankomstudios/ankomstudios.github.io.git` (public — renamed at some point from the original `LFS` repo this doc used to reference). This is the repo GitHub Pages deploys the site from.

**Cloudflare R2 bucket:** `ankomstudios` (region ENAM, Standard storage class), created 2026-09-12, live in the same Cloudflare account that holds the domain.

**Custom domain on the bucket:** `raw.ankomstudios.com` — status Active. Anything uploaded to the bucket is publicly reachable at:

```
https://raw.ankomstudios.com/<path-in-bucket>
```

(Subdomain name is a deliberate nod to GitHub's `raw.githubusercontent.com` convention — same "raw file" purpose.)

## Critical constraint — why media does NOT go through Git LFS

**GitHub Pages cannot serve Git LFS content.** Per GitHub's own docs: "Git LFS cannot be used with GitHub Pages sites." If LFS-tracked files are pushed to a Pages-deployed repo, visitors get small text pointer files instead of the actual image/audio/video — broken media, not a size problem. (Cloudflare Pages has similar LFS-resolution gaps unless you add a build step for it.)

Given that, the decision was: **large/media files go to the R2 bucket above, not into git at all** (LFS or otherwise). This sidesteps the incompatibility entirely and has no practical size ceiling.

Also worth knowing: individual files discussed so far are ~26MB, which is well under GitHub's own hard block (100MB/file) and soft-warning threshold (50MB/file) anyway — so anything that size could technically live in plain git with zero LFS setup. LFS/R2 only matters once files are consistently bigger than that, or there are many binary revisions bloating repo history.

**Practical rule going forward:** keep the git repo for site code/markup/small assets (icons, small compressed images) using plain git, no LFS tracking needed. Put audio, video, large images, spritesheet packs, and any mod/download files in the R2 bucket, referenced by their `raw.ankomstudios.com` URL from the site's HTML/CSS.

## Open item to confirm with the user

Resolved as of 2026-09-12: the site runs on a real **Cloudflare Worker** (`src/worker.js`, deployed per `wrangler.jsonc`'s `main` field), which handles two Stripe donation API routes and falls through to `env.ASSETS` (the `assets.directory: "."` binding) for everything else — i.e. the Worker serves the whole static site, not just the API routes. The GitHub Actions Pages workflow was deliberately moved from `.github/workflows/static.yml` to `workflows/static.yml` (outside `.github`, so GitHub no longer runs it) — confirming GitHub Pages was retired in favor of the Worker. There's no GitHub Actions step that runs `wrangler deploy`, so the Worker most likely auto-builds on push via Cloudflare's own **Workers Builds** Git integration (dashboard-configured, invisible from the repo) — that matches "pushing to main updates the domain." Not independently confirmed against the dashboard, but behavior after the 2026-09-12 push (see below) is consistent with it.

## Next steps

1. **Bulk-migrate existing local media into the R2 bucket.** Not needed yet — as of 2026-09-12 there are no files over 5MB and no audio/video in the repo; all current `assets/images/*` refs are small icons/GIFs/placeholder JPGs, fine to stay in plain git. Revisit once real media (audio, video, spritesheets, mod builds) gets added locally. Recommended tool: `rclone` configured as an S3-compatible remote against R2 (needs an R2 API token — Account ID + Access Key ID + Secret Access Key, generated from Cloudflare dashboard → R2 → Manage API Tokens):
   ```
   rclone sync ./path/to/media r2:ankomstudios
   ```
   For one-off single-file uploads instead, Wrangler works (no bulk/folder support though, 315MB cap):
   ```
   wrangler r2 object put ankomstudios/<path> --file=<local-path> --content-type=<mime-type>
   ```

   **Auth gotcha (learned 2026-09-12):** R2 API tokens created via **R2 → Manage R2 API Tokens** only work with R2's **S3-compatible API** (signed with the Access Key ID + Secret Access Key shown alongside the token) — they return a `403 Forbidden` "Authentication error" if used as `CLOUDFLARE_API_TOKEN` for Wrangler, because Wrangler's `r2 object put` calls the standard Cloudflare REST API, which is a separate auth surface these tokens don't cover. So:
   - **rclone / aws-cli / boto3** (S3-compatible, endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`) → use the **Access Key ID + Secret Access Key**. This worked and is what actually did the `ynf` upload below.
   - **Wrangler** → needs a *different* token type: a standard Cloudflare API Token from **My Profile → API Tokens → Create Token**, with `Workers R2 Storage: Edit` permission — not the one from the R2 tab.
   - Also note: `wrangler r2 object put` defaults to wrangler's **local simulated R2** (Miniflare) and silently succeeds without touching the real bucket — pass `--remote` explicitly or it looks done but nothing is actually live.

2. **Update site source references** — swap any local/relative paths to images, audio, video, or downloadable assets over to `https://raw.ankomstudios.com/<path>`. Done for one spot: `assets/js/downloads.js` used to pull mod build downloads (`buy/index.html`'s `data-download-file` buttons, e.g. `downloads/wannasmile-v0.9-windows.zip`) through jsDelivr from a GitHub repo path — that directly conflicted with the "mod/download files go to R2, not git" rule above, and pointed at a stale repo name to boot. Rewired it to fetch from `https://raw.ankomstudios.com/<path>` instead. No build has been uploaded there yet — clicking Download currently shows the "not available yet" state until a file is put at that path in the bucket. Any other new HTML/CSS references to large media should be hardcoded to the full `raw.ankomstudios.com` URL directly (site has no templating/build step to centralize a base URL).

3. **Git LFS tracking:** confirmed non-issue — no `.gitattributes` file exists in the repo, so nothing to remove.

4. **Deploy pipeline** — resolved, see Open item above: Cloudflare Worker (`src/worker.js` + `wrangler.jsonc`), not GitHub Pages.

5. **Yeezy Night Funkin universal build — done.** The real YNF page is `pages/yeezy-night-funkin/index.html` (already existed on `origin/main`, with its own logo/trailer/hero assets and a nav link at `/pages/yeezy-night-funkin/` — **not** a separate `/ynf/` page; an earlier pass in this session created a redundant `/ynf/index.html` before discovering the real page and merging in 6 commits it had been missing — that page was deleted). Added a download-card section (matching `/buy/`'s pattern) at the page's `<!-- More Yeezy Night Funkin download content goes here. -->` marker, wired to `data-download-file="downloads/ynf-universal-build-v1.0.5.zip"`, and added the `downloads.js` `<script>` include the page didn't have yet. Uploaded `universal-build-v1.0.5.zip` (239,048,638 bytes) to that exact R2 path via boto3/S3-API (see auth gotcha above) and verified `https://raw.ankomstudios.com/downloads/ynf-universal-build-v1.0.5.zip` returns `200 OK` with matching `Content-Length` and a real ZIP signature. Download button is live end-to-end once this commit deploys.

6. **Lesson learned (2026-09-12):** this local clone was 6 commits stale (someone/something pushed directly — commit authorship shows `ankomstudios <ankomstudios@gmail.com>`, likely uploaded via GitHub's web UI rather than this working copy) when a commit was made on the old base, causing a real merge with one conflict in `index.html` (resolved by taking `origin/main`'s version wholesale, since local edits were against stale content and fully superseded). **Always `git fetch && git log main..origin/main` before assuming local is current**, especially before adding new pages — the redundant `/ynf/` page above only happened because this wasn't done upfront.
