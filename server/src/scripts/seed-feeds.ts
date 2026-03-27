/**
 * Seed the 13 starter RSS feeds from Alex's Gmail "Feed" label audit.
 * Run: bun run server/src/scripts/seed-feeds.ts
 */
import { db, schema } from "../db";
import { pollSingleFeed } from "../services/poller";

const STARTER_FEEDS = [
  // Business / Marketing / Creator
  { url: "https://seths.blog/feed/", title: "Seth Godin", folder: "Business" },
  { url: "https://www.iwillteachyoutoberich.com/feed/", title: "Ramit Sethi", folder: "Business" },
  { url: "https://nathanbarry.com/feed/", title: "Nathan Barry", folder: "Business" },
  { url: "https://jay.blog/feed", title: "Jay Clouse", folder: "Business" },
  { url: "https://commoncog.com/rss/", title: "Commoncog", folder: "Business" },

  // Tech / Design / Media
  { url: "https://www.platformer.news/rss/", title: "Platformer (Casey Newton)", folder: "Tech" },
  { url: "https://www.densediscovery.com/feed/", title: "Dense Discovery", folder: "Tech" },
  { url: "https://sentiers.media/rss/", title: "Sentiers", folder: "Tech" },

  // Philly / Local
  { url: "https://www.broadstreetreview.com/rss", title: "Broad Street Review", folder: "Philly" },
  { url: "https://broadandmarket.substack.com/feed", title: "Broad and Market", folder: "Philly" },
  { url: "https://www.whatareyoudoing.today/rss/", title: "what are you doing", folder: "Philly" },
  { url: "https://feeds.megaphone.fm/citycastphilly", title: "City Cast Philly", folder: "Philly" },

  // Other
  { url: "https://fromboise.com/feed/", title: "From Boise", folder: "Other" },
];

async function seed() {
  console.log("Seeding starter feeds...\n");

  // Create folders
  const folderNames = [...new Set(STARTER_FEEDS.map((f) => f.folder))];
  const folderMap: Record<string, number> = {};

  for (let i = 0; i < folderNames.length; i++) {
    const name = folderNames[i];
    const [folder] = await db
      .insert(schema.folders)
      .values({ name, sortOrder: i })
      .onConflictDoNothing()
      .returning();

    if (folder) {
      folderMap[name] = folder.id;
    }
  }

  console.log(`Created ${Object.keys(folderMap).length} folders: ${folderNames.join(", ")}\n`);

  // Insert feeds
  let added = 0;
  let skipped = 0;

  for (const feed of STARTER_FEEDS) {
    try {
      const [inserted] = await db
        .insert(schema.feeds)
        .values({
          url: feed.url,
          title: feed.title,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoNothing()
        .returning();

      if (!inserted) {
        console.log(`  SKIP ${feed.title} (already exists)`);
        skipped++;
        continue;
      }

      // Link to folder
      if (folderMap[feed.folder]) {
        await db.insert(schema.feedFolders).values({
          feedId: inserted.id,
          folderId: folderMap[feed.folder],
        });
      }

      console.log(`  ADD  ${feed.title} → ${feed.folder}/`);
      added++;
    } catch (e: any) {
      console.error(`  ERR  ${feed.title}: ${e.message}`);
    }
  }

  console.log(`\nSeeded: ${added} added, ${skipped} skipped`);

  // Now fetch all feeds
  console.log("\nFetching all feeds...\n");

  const allFeeds = await db.select().from(schema.feeds);

  for (const feed of allFeeds) {
    try {
      const result = await pollSingleFeed(feed.id);
      console.log(`  OK   ${feed.title || feed.url} → ${result.newItems} items`);
    } catch (e: any) {
      console.error(`  ERR  ${feed.title || feed.url}: ${e.message}`);
    }
  }

  const totalItems = await db.select().from(schema.items);
  console.log(`\nDone. ${totalItems.length} total items in database.`);
}

seed().catch(console.error);
