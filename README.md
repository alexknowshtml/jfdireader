# JFDI Reader

**Just read the damn internet.**

A universal reading inbox where everything you want to read arrives, gets triaged, and gets processed. RSS feeds, newsletters, social media posts - all normalized into a single stream with a fast keyboard-driven triage flow.

Built for people who read a lot and need a better system for it.

## What it does

- **Inbox** - All untriaged items across all feeds in one place. Round-robin interleaved so no single feed dominates.
- **Fast triage** - Three-action flow: skip (archive), read now, or queue for later. Optimistic updates make every action feel instant.
- **Reading queue** - Queue articles for focused reading later. Pin the important ones to the top. Separate count badge so you always know what's waiting.
- **Reading mode** - Clean, focused article view. Skip/queue/star from reading mode advances to the next article automatically.
- **Signal capture** - Tracks engagement across five tiers (unseen through acted-on) to understand your reading patterns.
- **Mobile-first** - Responsive design with collapsible sidebar, iOS safe area support, touch-friendly triage bar.
- **Instant loads** - localStorage cache hydrates the UI immediately on repeat visits. Slim API responses (content fetched on demand).
- **Undo everything** - Press `z` to instantly undo any triage action. Snapshot-based restore, no server round-trip.

## Quick start

Requires [Bun](https://bun.sh/) v1.0+.

```bash
# Install dependencies
bun install
cd client && bun install && cd ..

# Run database migrations
bunx drizzle-kit migrate

# Seed with starter feeds (optional - 13 curated feeds across 4 categories)
bun run server/src/scripts/seed-feeds.ts

# Build the client
cd client && bun run build && cd ..

# Start the server (serves both API and client on port 3100)
bun run server/src/index.ts
```

Open http://localhost:3100.

For development with hot reload:
```bash
bun run dev:server   # API server with watch mode
bun run dev:client   # Vite dev server with HMR
```

## Concepts

- **Inbox** - Untriaged items. Anything you haven't acted on yet. Interleaved across feeds.
- **Skip** - Archive. You've seen it, you don't want it. Gone from inbox, findable in "All."
- **Queue** - Saved for later. Has its own view and count badge. Read when you're ready.
- **Pin** - Pinned items stick to the top of your queue.
- **Star** - Favorites. Persists across all views.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` / `↑` / `↓` | Next / previous item |
| `s` | Skip (archive) |
| `Enter` | Read now (open article) |
| `q` | Queue for later |
| `p` | Pin to top of queue |
| `f` | Star / favorite |
| `z` | Undo last action (instant) |
| `Shift+A` | Mark all read |
| `v` | Open original in browser |
| `r` | Refresh all feeds |
| `/` | Search |
| `?` | Show shortcuts |
| `Esc` | Back to list |

## URL state

The URL hash preserves your position across refreshes:
- `#unread` - Inbox view
- `#queue` - Reading queue
- `#starred` - Starred items
- `#read/42` - Reading article ID 42
- `#unread/5` - Inbox filtered to feed ID 5

## Stack

- **Backend:** Bun + Hono
- **Frontend:** React 19 + Vite + Tailwind CSS 4 + shadcn/ui
- **Database:** SQLite + Drizzle ORM (via bun:sqlite)
- **Feed parsing:** Feedsmith (RSS, Atom, RDF, JSON Feed)
- **Virtualization:** @tanstack/react-virtual
- **Typography:** @tailwindcss/typography for article rendering

## Project structure

```
server/
  src/
    db/           # Drizzle schema and database connection
    routes/       # Hono API routes (feeds, items, folders)
    services/     # Feed fetcher, poller, ingestion engine
    scripts/      # Seed scripts
client/
  src/
    components/
      article/    # ArticleList (virtual scroll), ReadingPane
      layout/     # Sidebar with feed list
      triage/     # TriageBar, ShortcutsHelp
      ui/         # shadcn/ui primitives
    hooks/        # Keyboard navigation
    lib/          # API client, utilities
shared/
  types/          # TypeScript types shared between server and client
docs/
  design.md       # Full design document
  starter-feeds.md # Curated starter feed list
drizzle/          # Database migrations
data/             # SQLite database (gitignored)
```

## API

All endpoints under `/api/`:

**Feeds**
- `GET /feeds` - List feeds with unread and queue counts
- `POST /feeds` - Subscribe to a new feed (auto-fetches immediately)
- `POST /feeds/import/opml` - Import OPML file
- `POST /feeds/poll` - Trigger refresh of all due feeds
- `POST /feeds/:id/refresh` - Refresh a single feed
- `DELETE /feeds/:id` - Unsubscribe (cascades to items)

**Items**
- `GET /items` - List items (params: feedId, starred, unread, queued, includeContent, limit, offset)
- `GET /items/:id` - Get single item with full content (for reading mode)
- `GET /items/queue` - Reading queue (pinned first)
- `PATCH /items/:id/triage` - Triage action (skip, read_now, queue, pin)
- `PATCH /items/:id/undo` - Undo triage (reset to unseen)
- `PATCH /items/:id/read` - Mark read/unread
- `PATCH /items/:id/star` - Star/unstar
- `PATCH /items/:id/signal` - Record scroll depth, dwell time, completion
- `POST /items/mark-all-read` - Mark all read (optional feedId filter)

## Design

See [docs/design.md](docs/design.md) for the full design document covering:
- Two-mode architecture (triage + reading)
- Signal capture and engagement tiers
- Universal feed normalization
- Social layer via ATProto (Phase 3)
- Build phases and roadmap

## Status

**Phase 1: 18 of 24 milestones complete.**

Working today: RSS ingestion (13 feeds), inbox triage with keyboard shortcuts, reading mode, mobile-responsive UI, optimistic updates, localStorage caching, undo, round-robin sort, feed filtering.

Remaining: OPML import UI, full-text search (FTS5), newsletter email ingestion, reading queue polish, PWA, Docker container.

See [.claude/plans/2026-03-27-phase1-build.md](.claude/plans/2026-03-27-phase1-build.md) for detailed progress.

## License

Private. Not yet open source.
