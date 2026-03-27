# JFDI Reader - Phase 1 Build Plan

**Started:** 2026-03-27
**Status:** In Progress
**Repo:** github.com/alexknowshtml/jfdireader

## Progress Screenshots

![JFDI Reader - Triage Mode with Reading Pane](https://alexhillman.nyc3.digitaloceanspaces.com/screenshots/20260327-173641-9d3e.png)

*Reading pane showing article content with triage bar. 13 feeds, 1,134 items ingested.*

![JFDI Reader - Mobile List View](https://alexhillman.nyc3.digitaloceanspaces.com/screenshots/20260327-173257-770e.png)

*Mobile list view with interleaved feed items and bottom triage bar.*

---

## Completed (14 milestones)

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
- Post-read action timestamps, feed settings table
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
- Command palette search (/) and shortcuts help dialog (?)
- `f42caec` Build triage mode UI with keyboard navigation

### 6. Production Serving ✅
- Static file serving from Hono (single port 3100)
- No separate Vite dev server needed for mobile/remote
- Accessible via Tailscale at http://100.85.122.99:3100
- `aa9e832` Serve built client from Hono server on single port

### 7. Content Cleanup ✅
- Strip empty `<p><br></p>` tags from RSS content
- Tighter paragraph spacing, collapse consecutive breaks
- `6c7c183` Fix article line spacing and clean RSS content cruft

### 8. Undo ✅
- `z` key to undo last triage action
- Resets item to unseen/unread state
- `1e621d3` Add undo for triage actions (z key)

### 9. Click-to-Open + Reading Mode Bar ✅
- Clicking article in list opens reading mode directly
- Bottom bar with ← Back, Skip, Queue, Star, Original actions
- `73b6a83` Click-to-open articles and reading mode bar

### 10. Mobile Responsive ✅
- Collapsible sidebar with hamburger toggle (auto-close on selection)
- iOS safe area spacing (notch + home indicator + Safari toolbar)
- Triage bar padding and "Read Now" → "Read" on mobile
- `260dceb`, `649e189`, `1749a59`, `df3efac`

### 11. Optimistic Updates ✅
- Skip/queue/pin remove items instantly (no API wait)
- Feed unread counts update immediately
- Rollback on API failure (item snaps back)
- `9b50abe` Add optimistic updates for instant triage feel

### 12. Reading Flow ✅
- Skip/queue/pin in reading mode advance to next article (not back to list)
- Toolbar unread count shows real total from feeds (not page size)
- `210c296`, `67e9a18`

### 13. Round-Robin Sort ✅
- Unread view interleaves items across feeds (no single feed dominates)
- Feeds sorted by recency, round-robin dealt
- All 13 feeds visible in first 20 items
- `c797ed2` Add round-robin interleaving for unread items across feeds

### 14. Performance ✅
- localStorage cache (5min TTL) for instant repeat loads
- QueryClient hydration from cache on startup
- Cmd/Ctrl/Alt key passthrough (browser shortcuts work)
- Optimistic undo with snapshot restore
- `bde7d99`, `8cebaf1`, `17ed0cf`

---

## Remaining Phase 1

### 15. OPML Import UI
- File upload component
- Parse OPML, show preview of feeds to import
- Folder mapping from OPML categories
- Backend endpoint already exists (`POST /api/feeds/import/opml`)

### 16. Full-Text Search (FTS5)
- SQLite FTS5 virtual table for items
- Search by title, content, author
- Wire into command palette (/) and search bar

### 17. Newsletter Email Ingestion
- Dedicated email address per instance
- Incoming emails → feed items
- Sender auto-mapping to feeds
- This unlocks the other 13 email-only sources from the starter list

### 18. Reading Queue + Reading Mode Polish
- Queue sorting (pinned first, then chronological or relevance)
- Queue expiry (configurable, default 30 days)
- Swipe gestures for mobile triage
- Reading progress tracking (scroll depth, dwell time)

### 19. PWA Setup
- Service worker for offline support
- Web app manifest + install prompt

### 20. Docker Container
- Dockerfile (Bun runtime)
- SQLite + cache volume mount
- docker-compose.yml

---

## Session Stats

- **Date:** 2026-03-27
- **Commits:** 22
- **Milestones completed:** 14 of 20
- **Feeds:** 13 active, 1,134 items ingested
- **Key files:** 15 source files across client + server

## Tech Stack
- **Backend:** Bun + Hono
- **Frontend:** React 19 + Vite + shadcn/ui + Tailwind CSS
- **Database:** SQLite + Drizzle ORM + bun:sqlite
- **Feed parsing:** Feedsmith
- **Port:** 3100
