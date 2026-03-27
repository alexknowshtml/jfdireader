# JFDI Reader - Phase 1 Build Plan

**Started:** 2026-03-27
**Status:** In Progress
**Repo:** github.com/alexknowshtml/jfdireader

## Progress Screenshot

![JFDI Reader - Triage Mode with Reading Pane](https://alexhillman.nyc3.digitaloceanspaces.com/screenshots/20260327-173641-9d3e.png)

*Reading pane showing article content with triage bar. 13 feeds, 1,134 items ingested.*

---

## Completed

### 1. Scaffold ✅
- Bun + Hono + React 19 + shadcn/ui + Drizzle + SQLite
- `270f9b4` Initial scaffold

### 2. Design Docs ✅
- Design doc and starter feed list saved to `docs/`
- `b034ce3` Add design doc and starter feed list to repo

### 3. Schema Update ✅
- 5-tier engagement model (unseen → acted_on)
- Triage actions (skip/read_now/queue/pin)
- Implicit signals (scroll depth, dwell time, completion)
- Post-read action timestamps
- Feed settings table (relevance blurbs, digest mode)
- `3fcfc7c` Update schema for signal capture, triage states, and reading queue

### 4. RSS Ingestion Engine ✅
- Feed fetcher with ETag/Last-Modified conditional GET
- Feedsmith parser with RSS/Atom/RDF/JSON normalization
- Background poller (5min interval)
- 13 starter feeds from Alex's Gmail audit, 4 folders
- Switched from better-sqlite3 to bun:sqlite
- 1,134 items ingested on first run
- `af83c8c` Add RSS ingestion engine with 13 starter feeds

### 5. Triage Mode UI ✅
- Virtual-scrolled article list (expanded + headline modes)
- Keyboard navigation: j/k, s (skip), Enter (read), q (queue), p (pin)
- Reading pane with typography styling, word count, reading time
- Triage bar with action buttons and keyboard hints
- Sidebar with Unread/All/Starred/Queue views + per-feed filtering
- Command palette search (/)
- Shortcuts help dialog (?)
- `f42caec` Build triage mode UI with keyboard navigation

### 6. Production Serving ✅
- Static file serving from Hono (single port 3100)
- No separate Vite dev server needed for mobile/remote
- Accessible via Tailscale at http://100.85.122.99:3100
- `aa9e832` Serve built client from Hono server on single port

### 7. Content Cleanup ✅
- Strip empty `<p><br></p>` tags from RSS content
- Tighter paragraph spacing (prose-p:my-2)
- Collapse consecutive breaks, clean nbsp spacers
- `6c7c183` Fix article line spacing and clean RSS content cruft

### 8. Undo ✅
- `z` key to undo last triage action
- Resets item to unseen/unread state
- Prevents accidental skips during fast triage
- `1e621d3` Add undo for triage actions (z key)

---

## Remaining Phase 1

### 9. OPML Import UI
- File upload component
- Parse OPML, show preview of feeds to import
- Folder mapping from OPML categories
- Backend endpoint already exists (`POST /api/feeds/import/opml`)

### 10. Full-Text Search (FTS5)
- SQLite FTS5 virtual table for items
- Search by title, content, author
- Wire into command palette (/) and search bar

### 11. Newsletter Email Ingestion
- Dedicated email address per instance
- Incoming emails → feed items
- Sender auto-mapping to feeds
- This unlocks the other 13 email-only sources from the starter list

### 12. Reading Queue + Reading Mode
- Queue sorting (pinned first, then chronological or relevance)
- Queue expiry (configurable, default 30 days)
- Mobile-optimized reading mode (swipe gestures)
- Reading progress tracking (scroll depth, dwell time)

### 13. PWA Setup
- Service worker for offline support
- Web app manifest
- Install prompt

### 14. Docker Container
- Dockerfile (Bun runtime)
- SQLite + cache volume mount
- docker-compose.yml

---

## Tech Stack
- **Backend:** Bun + Hono
- **Frontend:** React 19 + Vite + shadcn/ui + Tailwind CSS
- **Database:** SQLite + Drizzle ORM + bun:sqlite
- **Feed parsing:** Feedsmith
- **Port:** 3100
