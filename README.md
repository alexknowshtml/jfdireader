# JFDI Reader

**Just read the damn internet.**

A universal reading inbox where everything you want to read arrives, gets triaged, and gets processed. RSS feeds, newsletters, social media posts - all normalized into a single stream with a fast keyboard-driven triage flow.

Built for people who read a lot and need a better system for it.

## What it does

- **Unified inbox** - RSS, Atom, JSON feeds all in one place. Newsletter email ingestion coming soon.
- **Fast triage** - Keyboard-driven three-action flow: skip, read now, or queue for later. Process hundreds of items in minutes.
- **Reading queue** - Queue articles for focused reading later. Pin the important ones to the top.
- **Signal capture** - Tracks engagement across five tiers (unseen through acted-on) to understand your reading patterns.
- **Round-robin sorting** - Unread view interleaves items across feeds so no single high-volume source buries everything else.

## Quick start

Requires [Bun](https://bun.sh/) v1.0+.

```bash
# Install dependencies
bun install
cd client && bun install && cd ..

# Run database migrations
bunx drizzle-kit migrate

# Seed with starter feeds (optional)
bun run server/src/scripts/seed-feeds.ts

# Build the client
cd client && bun run build && cd ..

# Start the server (serves both API and client on port 3100)
bun run server/src/index.ts
```

Open http://localhost:3100.

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous item |
| `s` | Skip (mark read) |
| `Enter` | Read now (open article) |
| `q` | Queue for later |
| `p` | Pin to top of queue |
| `f` | Star / favorite |
| `z` | Undo last action |
| `Shift+A` | Mark all read |
| `v` | Open original in browser |
| `r` | Refresh all feeds |
| `/` | Search |
| `?` | Show shortcuts |
| `Esc` | Back to list |

## Stack

- **Backend:** Bun + Hono
- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **Database:** SQLite + Drizzle ORM (via bun:sqlite)
- **Feed parsing:** Feedsmith (RSS, Atom, RDF, JSON Feed)
- **Virtualization:** @tanstack/react-virtual

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
    components/   # React components (article list, reading pane, triage bar, sidebar)
    hooks/        # Keyboard navigation hook
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
- `GET /feeds` - List feeds with unread counts
- `POST /feeds` - Subscribe to a new feed (auto-fetches)
- `POST /feeds/import/opml` - Import OPML file
- `POST /feeds/poll` - Trigger refresh of all due feeds
- `POST /feeds/:id/refresh` - Refresh a single feed
- `DELETE /feeds/:id` - Unsubscribe

**Items**
- `GET /items` - List items (params: feedId, starred, unread, queued, limit, offset)
- `GET /items/queue` - Reading queue (pinned first)
- `PATCH /items/:id/triage` - Triage action (skip, read_now, queue, pin)
- `PATCH /items/:id/undo` - Undo last triage action
- `PATCH /items/:id/read` - Mark read/unread
- `PATCH /items/:id/star` - Star/unstar
- `PATCH /items/:id/signal` - Record scroll depth, dwell time
- `POST /items/mark-all-read` - Mark all read (optional feedId filter)

## Design

See [docs/design.md](docs/design.md) for the full design document covering:
- Two-mode architecture (triage + reading)
- Signal capture and engagement tiers
- Universal feed normalization
- Social layer via ATProto (Phase 3)
- Build phases and roadmap

## Status

Phase 1 in progress. Core reading loop works - RSS ingestion, triage UI, reading queue, optimistic updates. See [.claude/plans/2026-03-27-phase1-build.md](.claude/plans/2026-03-27-phase1-build.md) for detailed progress.

## License

Private. Not yet open source.
