# JFDI Reader

**Just read the damn internet.**

---

## What it is

JFDI Reader is a universal reading inbox - one place where everything you want to read arrives, gets triaged, and gets processed. RSS feeds, newsletters, social media posts, Discord threads - all normalized into a single stream with a fast keyboard-driven triage flow.

The internet's real problem isn't a lack of content. It's the difficulty of finding high-signal sources you can trust. Reading is fragmented across email, apps, and chat. There's no way to build a personal trust network around reading, and no way for good writing to surface to people who'd actually care about it. Volume makes it worse: when stuff is everywhere, even a manageable amount feels like drowning.

Google Reader accidentally solved part of this. Following someone's shared items was a trust signal - you weren't following their takes, you were following their taste. JFDI Reader makes that mechanic intentional. The social layer (coming in Phase 3) is built around curation as reputation: sharing means vouching, and the system knows whether you actually read the thing.

---

## Design Principles

These principles override the spec wherever they conflict:

1. **Unified inbox is the product thesis** - Without multi-source ingestion, this is just another RSS app. Universal feed normalization is core.
2. **The inbox is for deciding, not reading** - Triage and reading are separate modes with distinct UIs.
3. **Three-action triage** - Every item gets one of three decisions: archive, read now, or queue for later. Fast and final.
4. **AI is a pluggable enhancement, not a requirement** - BYO API keys as default. No AI needed for core functionality. Degrades gracefully.
5. **Profile is a pluggable layer** - The relevance engine queries a profile API. Manual doc is the first provider. Any knowledge base can be a future provider.
6. **Onboarding leverages existing AI context** - Generate a structured prompt users drop into their existing AI assistant to bootstrap their profile. Zero manual typing.
7. **Output actions are equal citizens** - Share, send, save, and fuel your work should all be one keystroke away from any article.
8. **Deployment: Dockerized for self, shareable, hosted maybe later** - Build for Alex first. Docker makes it easy to hand to others. Hosted SaaS is a future business decision.

---

## How it works

JFDI Reader has two modes. They're designed for different contexts and different devices.

**Triage mode** is the inbox. Dense, keyboard-driven, high information per screen. You process the firehose here. Every item gets one decision: `a` to archive it, `Enter` to read it now, or `q` to queue it for later. `j`/`k` to move between items. `z` to undo anything. The goal is to work through your inbox fast - without reading everything, but without missing anything worth reading.

**Reading mode** is the queue. Clean, focused, one article at a time. This is where you actually read. Actions from reading mode (archive, queue, star) automatically advance to the next article so you stay in flow. Designed for phone use - touch-friendly, safe-area padding, bottom action bar.

The triage flow is intentionally opinionated. Three actions, not ten. Keyboard shortcuts that feel like Vim. Round-robin interleaving so no single feed dominates your inbox. Optimistic updates so every action feels instant. Full undo (`z`) so you never lose anything by acting too fast.

Press `?` to see all shortcuts. Press `/` to search.

---

## What's next

Phase 1 remaining work: OPML import UI, full-text search (FTS5), newsletter email ingestion, reading queue polish, PWA offline support, Docker container.

Phase 2 adds universal inputs (Bluesky, YouTube, Reddit, Discord/Slack) and an AI layer for relevance blurbs - opt-in per feed, BYO API key.

Phase 3 is the social layer: ATProto integration, sharing as curation, following people's taste not their takes.

---

## Quick start

Requires [Bun](https://bun.sh/) v1.0+.

```bash
bun install
cd client && bun install && cd ..
bunx drizzle-kit migrate
bun run server/src/scripts/seed-feeds.ts  # optional: 13 curated starter feeds
cd client && bun run build && cd ..
bun run server/src/index.ts
```

Open http://localhost:3100.

For development with hot reload:
```bash
bun run dev:server   # API with watch mode
bun run dev:client   # Vite with HMR
```

---

## Stack

Bun + Hono + React 19 + SQLite + Tailwind CSS

See `server/src/routes/` for API details.

---

## Status

**Phase 1: 25 of 31 milestones complete.**

See [.claude/plans/2026-03-27-phase1-build.md](.claude/plans/2026-03-27-phase1-build.md) for detailed progress.

---

## License

Private. Not yet open source.
