# JFDI Reader - Starter Feed List

*Generated from Alex's Gmail "Feed" label, March 27, 2026*

---

## Summary

- **26 real newsletters** identified (noise filtered out)
- **13 have RSS feeds** (can ingest via RSS today)
- **13 are email-only** (need newsletter ingestion to work)
- This confirms newsletters are the right Phase 1 starting point - half the sources require email ingestion to work at all

---

## RSS-Available Sources (13)

### Business / Marketing / Creator
▸ **Seth Godin** — `https://seths.blog/feed/` (daily, short posts)
▸ **Ramit Sethi** — `https://www.iwillteachyoutoberich.com/feed/` (note: feed is podcast-formatted)
▸ **Nathan Barry** — `https://nathanbarry.com/feed/` (creator economy)
▸ **Jay Clouse** — `https://jay.blog/feed` (trust & influence for creators)
▸ **Commoncog** — `https://commoncog.com/rss/` (business education, Cedric Chin)

### Tech / Design / Media
▸ **Casey Newton / Platformer** — `https://www.platformer.news/rss/` (tech policy, Ghost-hosted)
▸ **Dense Discovery** — `https://www.densediscovery.com/feed/` (design & culture curation, Kai Brach)
▸ **Patrick Tanguay / Sentiers** — `https://sentiers.media/rss/` (futures & technology, Ghost-hosted)

### Philly / Local
▸ **Broad Street Review** — `https://www.broadstreetreview.com/rss` (Philadelphia arts)
▸ **Lauren Vidas / Broad and Market** — `https://broadandmarket.substack.com/feed` (Philly City Council)
▸ **"what are you doing"** — `https://www.whatareyoudoing.today/rss/` (Philly events, Ghost-hosted)
▸ **City Cast Philly** — `https://feeds.megaphone.fm/citycastphilly` (daily podcast feed)

### Other
▸ **From Boise** — `https://fromboise.com/feed/` (Boise local, WordPress)

---

## Email-Only Sources (13)

These require the newsletter email ingestion feature to work in JFDI Reader.

### Business / Marketing / Creator
▸ **Katelyn Bourgoin / Why We Buy** — kbo@customercamp.co
▸ **Kasey Jones / Essentialist CEO** — essentialistceo@mail.beehiiv.com
▸ **Paco / The Hell Yeah Group** — hello@thehellyeahgroup.com
▸ **Brennan Dunn / RightMessage** — hello@rightmessage.com
▸ **Justin Welsh** — (justinwelsh.me, ConvertKit)
▸ **Active Voice** — hello@activevoicehq.com
▸ **Stacking the Bricks** — newsletter@stackingthebricks.com

### Tech / Design
▸ **Nick Disabato / Draft** — nickd@draft.nu
▸ **Emil Kowalski / Animations on the Web** — emilkowal.ski
▸ **Indie Hackers** — channing@indiehackers.com

### Culture / Media
▸ **Dan Runcie / Trapital** — memo@trapital.com (music industry)

### Philly / Local
▸ **Blue Stoop** — info@bluestoop.org (Philly literary community)
▸ **5th Square** — 5thsq@5thsq.org (Philly urbanism - site currently unreachable)

---

## Filtered Out (Not Real Newsletters)

These were in the "Feed" label but aren't newsletters worth reading:
- PECO utility notices
- Shopify billing
- Skool community notifications (Dev Builders, Skoolers)
- Nyte Comics (transactional)
- Foo Fighters (band updates)
- Twitch notifications
- Design System University (promotional)
- CreativeMornings/PHL (event announcements)
- Northern Liberties BID + NLNA (neighborhood updates)
- Wine School of Philadelphia (event marketing)
- White Meat (film project updates)
- MISSION Story Slam (event marketing)

---

## Build Implications

**Phase 1 must include both RSS and newsletter ingestion.** Only half the feeds Alex actually reads have RSS. Building RSS-only would miss Katelyn Bourgoin, Nick Disabato, Indie Hackers, Trapital, and other high-value sources.

**Recommended Phase 1 build order:**
1. RSS ingestion engine (13 feeds ready to go)
2. Newsletter email ingestion (unlocks the other 13)
3. Triage mode UI (test with real content from both sources)
4. Reading queue + reading mode

**Category distribution for folder defaults:**
- Business/Marketing/Creator: 12 sources
- Philly/Local: 6 sources
- Tech/Design: 5 sources
- Culture/Media: 4 sources
(Some sources span multiple categories)
