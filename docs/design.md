# JFDI Reader - Design Document

*Synthesized from design interview, March 27, 2026*

---

## Product Vision

JFDI Reader is a **universal reading inbox** - one place where everything you want to read arrives, gets triaged, and gets processed. RSS feeds, newsletters, social media posts, Discord threads, Slack channels - all normalized into a single stream with a fast keyboard-driven triage flow.

The tagline: **Just read the damn internet.**

---

## Core Problem: Signal Discovery and Trust

The internet's real problem isn't a lack of content - it's the difficulty of finding high-signal sources you can trust. This breaks down into two sides of the same coin:

1. **For readers:** Who can I trust to consistently find good stuff? Reading is fragmented across email, social apps, chat, and RSS. There's no way to discover reliable curators or build a personal trust network around reading.
2. **For creators:** How do I surface my work to people who actually care? Good writing gets buried in algorithmic feeds that reward engagement over substance.

These compound with two practical problems:
3. **Scattered sources** - Reading is spread across too many apps. You can never find that thing you read last week.
4. **Volume overwhelm** - Too much comes in. When stuff is everywhere, even a manageable volume feels like drowning.

Google Reader solved the trust problem accidentally. Following someone's shared items was a trust signal - you weren't following their *takes*, you were following their *taste*. It was pre-social social media. JFDI Reader makes that mechanic intentional.

---

## Design Principles

These emerged from the interview and override the original spec where they conflict:

1. **Unified inbox is the product thesis** - Without multi-source ingestion, this is just another RSS app. Universal feed normalization is core, not a "Phase 1.5."
2. **The inbox is for deciding, not reading** - Triage and reading are separate modes with distinct UIs.
3. **Three-action triage** - Every item gets one of three decisions: skip, read now, or queue for later. Fast and final.
4. **AI is a pluggable enhancement, not a requirement** - BYO API keys as default. Claude Code harness as a plugin. No AI needed for core functionality. Degrades gracefully.
5. **Profile is a pluggable layer** - The relevance engine queries a profile API. Manual doc is the first provider. Andy Core, Obsidian vaults, or any knowledge base can be future providers.
6. **Onboarding leverages existing AI context** - Generate a structured prompt users can drop into their existing AI assistant to bootstrap their profile. Zero manual typing.
7. **Output actions are equal citizens** - Share publicly, send to someone, save for reference, and fuel your work should all be one keystroke away from any article.
8. **Deployment: Dockerized for self, shareable, hosted maybe later** - Build for Alex first. Docker image makes it easy to hand to others. Hosted SaaS is a future business decision, not a launch requirement.

---

## Two-Mode Architecture

### Triage Mode (Desktop-primary)

The inbox. Dense, keyboard-driven, high information per screen. This is where you process the firehose.

**What you see per item:**
- Source name + favicon
- Title
- Timestamp
- Optional: LLM-generated "why you'd care" relevance blurb (per-feed, off by default)

**Keyboard actions:**
- `j`/`k` - Navigate items
- `s` - Skip (mark read, move on)
- `Enter` - Read now (expand inline or open reading mode)
- `q` - Queue for later (add to reading queue)
- `p` - Pin to top of reading queue
- `Shift+A` - Mark all read in current view

**LLM relevance blurbs** (opt-in per feed):
Instead of summarizing the article, the blurb tells you *why it's relevant to you specifically*, based on your profile:
> "Author wrote the coworking economics piece you starred last month. This one's about pricing models."
> "ATProto federation update - relevant to JFDI Reader's social layer."

The relevance engine runs through a pluggable AI provider interface:
- **Default:** BYO API keys (Anthropic, OpenAI, local models)
- **Plugin:** Claude Code harness for users who have it
- **Future:** Hosted inference if JFDI Reader becomes a service

### Reading Mode (Phone-primary)

The queue. Clean, focused, one article at a time. This is where you actually read.

**Queue organization:**
- Default sort: chronological or relevance (toggle)
- **Pin** action during skimming - pinned items stick to the top
- Three states: pinned (top, won't move), queued (in the flow), read/expired (done or fell off)

**Post-read actions (all one keystroke/tap):**
- **Share** → Post to ATProto/Bluesky (public)
- **Send** → Pick a person, add a note ("you'd like this")
- **Save** → Tag it, file it, find it later
- **Fuel** → Clip into something you're working on (draft, project, note)

**Device-specific UX:**
- Desktop: keyboard shortcuts, dense layout, multi-column possible
- Phone: swipe gestures replace keyboard, single-column, touch targets optimized
- PWA: one codebase, responsive layout, genuinely different experiences per device

---

## Signal Capture

JFDI Reader captures reading behavior at multiple levels to power the relevance engine, social trust layer, and personal analytics. The key insight: there's a meaningful difference between "this was in my feed," "I saw the headline," "I actively skipped it," and "I actually read it."

### Explicit Signal (Keyboard Actions)

These are clean, user-initiated decisions captured from day one:

- **Skip** (`s`) → "I saw this, don't want it." Negative signal. Useful for tuning relevance.
- **Queue** (`q`) → "I'm interested." Positive intent signal.
- **Read now** (`Enter`) → "Engaging with this right now." Strong interest signal.
- **Pin** (`p`) → "This is important enough to hold onto." Priority signal.
- **Post-read actions** (share/send/save/fuel) → Highest-value signal. The user found this worth doing something with.
- **Mark all read** (`Shift+A`) → Bulk dismissal. Weak negative signal (could mean "overwhelmed" not "uninterested").

### Implicit Signal (On-Page Analytics)

These layer on later as DOM event listeners logging to the same `item_state` table:

- **Scroll depth** - How far did they get in the article? 10% vs 90% tells different stories.
- **Dwell time** - Opened and spent 4 minutes vs 3 seconds. Time-on-content correlates with value.
- **Completion** - Reached the end of the article. Strong consumption signal.
- **Bounce back** - Expanded then immediately returned to triage. False positive on interest.

### Engagement Tiers

Every item accumulates a signal profile across five tiers:

1. **Unseen** - Never appeared in the user's viewport. No signal.
2. **Seen** - Headline was visible in triage. Awareness only.
3. **Decided** - User made an explicit triage action (skip or queue). Decision captured.
4. **Consumed** - User opened and spent meaningful time reading. Verified engagement.
5. **Acted on** - User shared, saved, sent, or fueled from this item. Highest signal.

### Why This Matters

**For the relevance engine:** Skip patterns train the model on what you don't care about. Consumption patterns train it on what you do. Over time, the "why you'd care" blurbs get sharper.

**For the social layer:** When someone shares an article, the system knows whether they *actually read it* (consumed or acted-on tier) vs just passed along the headline. This is a trust signal no other platform captures. A share from someone who read the full article and spent 6 minutes with it carries more weight than a reshare from a headline skimmer.

**For personal analytics:** "Last month you queued 200 items, read 80, and acted on 15." Understanding your own reading patterns helps you curate better sources.

---

## Universal Feed Normalization

Every content source becomes a feed. Every feed produces items. Every item supports the same triage actions, search, tagging, and sharing - regardless of where it came from.

### Input Sources

**RSS/Atom feeds** (core)
- OPML import/export
- Adaptive polling with ETag/Last-Modified
- Full-text extraction via Readability for summary-only feeds
- Feed health indicators

**Newsletters** (core)
- Dedicated email address per instance
- Incoming emails converted to feed items
- Senders auto-map to feeds
- DKIM/SPF verification
- Unsubscribe link surfacing

**Social Media**
- Bluesky: native ATProto integration
- Mastodon: via existing RSS feeds
- YouTube channels: RSS bridge
- Reddit subreddits: RSS bridge
- Twitter/X: API integration
- Digest modes: real-time, daily rollup, engagement-filtered

**Chat Platforms**
- Discord: bot token, channel selection
- Slack: app token, channel selection
- Message clustering by thread/proximity
- Link auto-extraction with Readability
- Highlights filtering by reactions or specific users

### Data Model

All sources normalize to: `source_type → feed → item → item_state`

Every item supports: read/unread, starring, tagging, searching, sharing, keyboard navigation.

---

## Social Layer (ATProto)

The social layer serves two purposes: it's the **secret weapon** (what makes JFDI Reader worth building) and the **adoption engine** (how new users discover it).

### Social Philosophy: Curation Over Commentary

JFDI Reader is not a discussion platform. Comments, reactions, and hot takes belong on social media. The social layer here is about **curation as reputation** and **taste as trust signal**.

- **Sharing = vouching.** When you share an article, you're saying "I read this and it was worth my time." The act of sharing is the signal. No like buttons, no engagement metrics.
- **No on-platform opinions.** If someone wants to post their thoughts about an article, that should happen on Bluesky, their blog, or wherever they publish. JFDI Reader links out to those responses rather than hosting them.
- **Intentional friction for commentary.** Sharing an article is one keystroke (low friction, high volume). Writing an annotation requires more effort - closer to a mini blog post than a reply. This friction is a feature: it filters for substance over reaction.
- **The platform rewards thoughtfulness.** "I read this, here's what I think" should feel considered, not reactive. The design should encourage people to sit with something before commenting on it.

### Three Social Primitives

1. **Share** (`app.reader.share`) - "I read this, you should too." One-keystroke curation. Post an article to your ATProto PDS with optional tags. Flows through Jetstream to followers. The share itself is the endorsement.

2. **Bundle** (`app.reader.bundle`) - "Here's my starter pack for topic X." Curated feed collections published as ATProto records. One-click subscribe to the whole set. This is the growth mechanic - analogous to Bluesky starter packs but for reading lists.

3. **Follow** (`app.reader.follow`) - "This person finds good stuff." Subscribe to anyone's reading activity. You're following their taste, not their takes. Their shares appear as a feed in your sidebar.

### Annotations (Considered Responses)

Annotations (`app.reader.annotation`) are the exception to the "no commentary" rule. They're designed for substantive reflection, not quick reactions:
- Require a highlighted passage from the article (you must engage with the text)
- Minimum length encourages thought over hot takes
- Published as ATProto records (portable, owned by the author)
- Visible to followers as a distinct content type - clearly marked as "response to" rather than mixed into a comment thread

### Social Discovery

- "Friends' Shared Items" composite feed (highest-signal reading)
- Profile pages showing what someone curates (their taste profile)
- Trending articles across the network (based on shares, not clicks)
- Bundle directory for topic-based onboarding

### Identity

Users authenticate with existing ATProto identity (Bluesky account or self-hosted PDS). No new account required. Existing social graph imports automatically.

---

## Target Audience

In priority order:

1. **Newsletter-heavy knowledge workers** - Drowning in Substacks, need a better triage flow. Largest addressable market.
2. **ATProto/Bluesky power users** - Already in the ecosystem, want a reading layer on top of their social graph. Will use and evangelize the social features.
3. **RSS nostalgists** - Miss Google Reader, will try anything that promises to bring it back. Vocal evangelists.

### Onboarding by Audience

- **Newsletter crowd:** "Import your Substacks. Triage 50 newsletters in 5 minutes."
- **ATProto crowd:** "Sign in with your Bluesky account. See what your friends are reading."
- **RSS nostalgists:** "Import your OPML. J/K navigation. Auto-mark-as-read. You're home."

---

## Technology Stack

**Backend:** Bun + Hono (lightweight, fast, native Bun support)
**Frontend:** React 19 + Vite SPA + shadcn/ui + Tailwind CSS
**Database:** SQLite + Drizzle ORM + FTS5 for full-text search
**Feed parsing:** Feedsmith
**Content extraction:** Mozilla Readability
**Social:** @atproto/api + Jetstream (WebSocket)
**Virtualization:** @tanstack/react-virtual (1000+ item scrolling)
**Deployment:** Docker container, SQLite + cache volume mount

---

## Build Phases (Revised)

### Phase 1: Core Reading Loop
*Build for Alex. Nail the triage + reading queue flow.*

- RSS feed ingestion with adaptive polling
- Newsletter email ingestion (dedicated address → feed items)
- Triage mode UI (desktop, keyboard-driven)
- Reading mode UI (mobile-responsive, clean)
- Reading queue with pin/sort/expire
- Three-action triage: skip, read now, queue
- OPML import/export
- Full-text search (FTS5)
- Basic tagging and starring
- PWA with offline support
- Docker container

### Phase 2: Universal Inputs + AI Layer
*Expand the inbox. Add intelligence.*

- Social media source connectors (Bluesky, YouTube, Reddit RSS)
- Discord/Slack digest connectors
- AI provider interface (BYO keys)
- LLM relevance blurbs (per-feed opt-in)
- User profile system (manual doc + pluggable providers)
- AI-generated onboarding prompt
- Post-read action menu (share/send/save/fuel)
- Output destination plugins

### Phase 3: Social Layer
*ATProto integration. Growth engine.*

- ATProto OAuth authentication
- Custom lexicons (share, follow, bundle, annotation)
- Jetstream consumer for social feed indexing
- "Friends' Shared Items" composite feed
- Bundle creation and discovery
- Starter packs
- Profile pages
- Google Reader API compatibility (for mobile clients)

### Phase 4: Hosted (Maybe)
*Business decision. Only if demand warrants.*

- Multi-tenant hosted infrastructure
- Billing/subscription management
- Managed AI inference
- SLA and support

---

## Open Design Questions

These were not resolved in the interview and should be addressed as they arise:

1. **Reading queue expiry** - How long before unread queued items fall off? User-configurable? Default 30 days?
2. **"Fuel" action destinations** - What tools/apps should the first output plugins target? Obsidian? Notion? Plain clipboard?
3. **Newsletter email setup** - Self-hosted email receiving vs. third-party service (e.g., Cloudflare Email Workers)?
4. **Social feed indexing scale** - How many followed users can the Jetstream consumer handle before needing infrastructure changes?
5. **Mobile app vs PWA** - Is PWA sufficient for the reading mode, or will a native app be needed eventually?
6. **Monetization model** - If hosted launches, pricing structure (freemium? flat rate? usage-based?)

---

## Repo & Status

- **GitHub:** github.com/alexknowshtml/jfdireader
- **Stack:** Bun + Hono + React 19 + shadcn + SQLite + Drizzle
- **Current state:** Phase 1 complete. Phase 1.5 (email content quality) complete.
- **Phase 1 shipped (36 milestones):** RSS ingestion, adaptive polling, newsletter email ingestion via Gmail label, triage mode (desktop keyboard + mobile swipe), reading mode (clean article view), reading queue with pin/sort, three-action triage (archive/read now/queue), OPML import/export, full-text search (FTS5), starring, PWA with offline support, Docker container, engagement tier tracking, undo system.
- **Phase 1.5 shipped (email quality):** HTML email body fetching (gogcli `--body-format html`), Readability-based content extraction, email layout table stripping, social share button removal (FeedBlitz/AddToAny/ShareThis), scroll-to-top on article navigation.
- **Next step:** Phase 2 - Universal Inputs + AI Layer. Candidates: YouTube/Reddit RSS bridges, Bluesky ATProto connector, AI relevance blurbs, post-read action menu.
