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

## Completed (27 milestones)

### 1. Scaffold ✅
- Bun + Hono + React 19 + shadcn/ui + Drizzle + SQLite
- `270f9b4` Initial scaffold

### 2. Design Docs ✅
- Design doc and starter feed list saved to `docs/`
- `b034ce3` Add design doc and starter feed list to repo

### 3. Schema Update ✅
- 5-tier engagement model (unseen → acted_on)
- Triage actions (archive/read_now/queue/pin)
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
- Keyboard navigation: j/k, s (archive), Enter (read), q (queue), p (pin)
- Reading pane with typography styling, word count, reading time
- Triage bar with action buttons and keyboard hints
- Sidebar with Inbox/Queue/Starred/All views + per-feed filtering
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
- Optimistic snapshot restore (instant undo)
- `1e621d3`, `17ed0cf`

### 9. Click-to-Open + Reading Mode Bar ✅
- Clicking article in list opens reading mode directly
- Bottom bar with ← Back, Skip, Queue, Star, Original actions
- `73b6a83` Click-to-open articles and reading mode bar

### 10. Mobile Responsive ✅
- Collapsible sidebar with hamburger toggle (auto-close on selection)
- iOS safe area spacing (notch + home indicator + Safari toolbar)
- Symmetric top/bottom padding on triage bars
- "Read Now" → "Read" on mobile
- `260dceb`, `649e189`, `1749a59`, `df3efac`, `37e9463`

### 11. Optimistic Updates ✅
- Archive/queue/pin remove items instantly (no API wait)
- Feed unread counts update immediately
- Rollback on API failure (item snaps back)
- `9b50abe` Add optimistic updates for instant triage feel

### 12. Reading Flow ✅
- Archive/queue/pin in reading mode advance to next article (not back to list)
- `210c296`

### 13. Round-Robin Sort ✅
- Inbox view interleaves items across feeds (no single feed dominates)
- Feeds sorted by recency, round-robin dealt
- All 13 feeds visible in first 20 items
- `c797ed2` Add round-robin interleaving for unread items across feeds

### 14. Performance ✅
- localStorage cache (5min TTL) for instant repeat loads
- QueryClient hydration from cache on startup
- Cmd/Ctrl/Alt key passthrough (browser shortcuts work)
- Slim list queries (no content in list API, fetched on demand)
- `bde7d99`, `8cebaf1`, `a1d2cb4`

### 15. URL State Persistence ✅
- URL hash tracks current view and reading position
- Refresh restores view, feed filter, and open article
- `576714e` Persist view state in URL hash

### 16. Inbox/Queue Separation ✅
- Inbox = untriaged items only (archive and queue remove from inbox)
- Queue is its own bucket with count badge in sidebar and toolbar
- Archive = decided, gone from inbox
- Cleared 853 old City Cast Philly items (kept 2 weeks)
- `5b2bef0` Separate inbox from queue

### 17. Toolbar Refinement ✅
- Renamed Unread → Inbox
- Reordered: Inbox | Queue | Starred (All moved to sidebar only)
- Counts always visible on Inbox and Queue tabs
- `2d8f7a2`, `da408bd`

### 18. Feed Filtering ✅
- Clicking feed in sidebar filters item list to that feed
- Filter chip appears in toolbar with feed name and ✕ to clear
- Toolbar view buttons clear feed filter when clicked
- `b5df538` Add feed filter chip

### 19. Feed Settings Modal ✅
- Gear icon on hover for each feed in sidebar
- Modal: display name, poll interval, feed URL, site link, error status
- Unsubscribe with confirmation dialog
- PATCH /feeds/:id endpoint
- `01f01be` Add feed settings modal

### 20. Ingestion Age Filter ✅
- Items older than 14 days silently skipped during ingestion
- Prevents high-volume feeds (City Cast 865 episodes) from backlog buildup
- `3dfbac1` Skip items older than 14 days

### 21. Where Clause Fix ✅
- Multiple .where() calls in Drizzle were overwriting each other
- Combined into single and() for proper feed + unread filtering
- `01f01be` (included in feed settings commit)

### 22. Skip → Archive Rename ✅
- Renamed triage action from "skip" to "archive" across UI, types, and API
- Updated 8 files: types, API client, keyboard nav, triage bar, shortcuts help, App, server routes, schema
- `4996739` Rename triage action 'skip' to 'archive'

### 23. PWA Bottom Padding ✅
- Safe-area bottom padding for home indicator in PWA mode
- Uses `pb-[max(0.75rem,env(safe-area-inset-bottom))]` on both triage and reading bars
- `30c86c4` Add safe-area bottom padding for PWA mode

### 24. Long-Press Feed Settings ✅
- Press and hold (500ms) on sidebar feed opens settings modal
- Works on both touch (onTouchStart/End) and mouse (onMouseDown/Up)
- Desktop gear-on-hover remains intact
- `33cfb65` Add long-press to open feed settings on mobile

### 25. Haptic Feedback ✅
- ios-vibrator-pro-max polyfill for iOS Safari vibration API
- Light haptic (10ms) on triage actions (archive, queue, pin, star)
- Medium haptic (25ms) on long-press feed settings trigger
- Utility at `client/src/lib/haptics.ts` with graceful no-op fallback
- `8bf26a9` Add haptic feedback for triage actions and long-press

### 26. Archive Shortcut Key ✅
- Changed archive keyboard shortcut from `s` to `a` (mnemonic match)
- Updated across keyboard nav hook, triage bar, shortcuts help, reading mode bar, README
- No conflict with Shift+A (mark all read) — browser sends capital `A` for shifted key
- `3f2baa2` Change archive keyboard shortcut from s to a

### 27. README + Plan Update ✅
- Rewrote README to lead with vision and design principles instead of API docs
- Pulled product vision, core problem statement, and design principles from design doc
- Updated plan with milestones 22-27
- `0f36661` Rewrite README with vision-first framing

---

## Remaining Phase 1

### 28. OPML Import UI ✅
- Drag-and-drop file upload with click-to-browse fallback
- Client-side OPML parsing via feedsmith for preview before import
- Feeds grouped by OPML folder structure in preview
- Shows imported/skipped/errors results after import
- "+ Import OPML" button in sidebar
- `7a8dd8e` Add OPML import UI with drag-and-drop, preview, and folder grouping

### 29. Full-Text Search (FTS5) ✅
- SQLite FTS5 virtual table with porter stemming + unicode61 tokenizer
- Auto-sync via INSERT/UPDATE/DELETE triggers
- Index rebuild on server startup (idempotent)
- Search API at `GET /api/items/search?q=...` with `<mark>` highlighted snippets
- Command palette (`/`) now queries FTS5 server-side with 200ms debounce
- Search icon in toolbar for mobile access, autofocus, 16px font to prevent iOS zoom
- `2fd0f34` Add FTS5 full-text search with highlighted snippets
- `265d018` Add search icon button to toolbar for mobile access
- `60204bb` Make search mobile-friendly: autofocus, no zoom, better positioning

### 30. Newsletter Email Ingestion
- Dedicated email address per instance
- Incoming emails → feed items
- Sender auto-mapping to feeds
- This unlocks the other 13 email-only sources from the starter list

### 31. Reading Queue + Reading Mode Polish
- Queue sorting (pinned first, then chronological or relevance)
- Queue expiry (configurable, default 30 days)
- Swipe gestures for mobile triage
- Reading progress tracking (scroll depth, dwell time)

### 32. PWA Setup
- Service worker for offline support
- Web app manifest + install prompt

### 33. Docker Container
- Dockerfile (Bun runtime)
- SQLite + cache volume mount
- docker-compose.yml

---

## Session Stats

- **Date:** 2026-03-27
- **Commits:** 44
- **Milestones completed:** 29 of 33
- **Feeds:** 13 active, ~281 items (after City Cast cleanup)

## Tech Stack
- **Backend:** Bun + Hono
- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **Database:** SQLite + Drizzle ORM (via bun:sqlite)
- **Feed parsing:** Feedsmith
- **Port:** 3100
