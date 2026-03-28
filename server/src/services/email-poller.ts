import { db } from "../db";
import { feeds, items, appSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  body?: string;
  labels?: string[];
}

function parseSender(from: string): { name: string; email: string } {
  // "Justin Welsh <hello@justinwelsh.me>" -> { name: "Justin Welsh", email: "hello@justinwelsh.me" }
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim().toLowerCase() };
  }
  return { name: from, email: from.toLowerCase() };
}

function extractDomain(email: string): string {
  return email.split("@")[1] || "";
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function getSetting(key: string): Promise<string | null> {
  const row = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return row[0]?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
}

async function fetchGmailMessages(gogcliPath: string, label: string, maxResults = 20): Promise<GmailMessage[]> {
  const proc = Bun.spawn([
    "bash", gogcliPath,
    "gmail", "messages", "search",
    `label:${label}`,
    "--max", String(maxResults),
    "-j", "--results-only", "--include-body",
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`gogcli failed (exit ${exitCode}): ${stderr}`);
  }

  return JSON.parse(stdout);
}

async function getOrCreateEmailFeed(senderName: string, senderEmail: string): Promise<number> {
  // Check if a feed already exists for this sender
  const existing = await db.select()
    .from(feeds)
    .where(eq(feeds.senderEmail, senderEmail))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].id;
  }

  // Check if there's an RSS feed with a matching domain (dedup)
  const domain = extractDomain(senderEmail);
  const allFeeds = await db.select().from(feeds).where(eq(feeds.sourceType, "rss"));
  for (const feed of allFeeds) {
    try {
      const feedDomain = new URL(feed.url).hostname.replace(/^www\./, "");
      if (feedDomain === domain || feedDomain.endsWith(`.${domain}`)) {
        // RSS feed exists for this domain - skip creating email feed
        console.log(`[email-poller] Skipping ${senderEmail} - RSS feed exists for ${feedDomain}`);
        return -1; // Signal to skip
      }
    } catch { /* invalid URL, skip */ }
  }

  // Create new email feed
  const result = await db.insert(feeds).values({
    url: `email://${senderEmail}`,
    title: senderName,
    sourceType: "email",
    senderEmail,
    createdAt: new Date().toISOString(),
  }).returning({ id: feeds.id });

  console.log(`[email-poller] Created email feed for ${senderName} <${senderEmail}>`);
  return result[0].id;
}

export async function pollEmails(): Promise<{ polled: number; newItems: number; skipped: number; errors: number }> {
  const enabled = await getSetting("email.enabled");
  if (enabled !== "true") {
    return { polled: 0, newItems: 0, skipped: 0, errors: 0 };
  }

  const label = await getSetting("email.label");
  const gogcliPath = await getSetting("email.gogcliPath");

  if (!label || !gogcliPath) {
    await setSetting("email.lastError", "Missing label or gogcli path configuration");
    return { polled: 0, newItems: 0, skipped: 0, errors: 1 };
  }

  let messages: GmailMessage[];
  try {
    messages = await fetchGmailMessages(gogcliPath, label);
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`[email-poller] Error fetching emails: ${errorMsg}`);
    await setSetting("email.lastError", errorMsg);
    return { polled: 0, newItems: 0, skipped: 0, errors: 1 };
  }

  let newItems = 0;
  let skipped = 0;
  let errors = 0;

  for (const msg of messages) {
    try {
      const { name, email } = parseSender(msg.from);
      const feedId = await getOrCreateEmailFeed(name, email);

      if (feedId === -1) {
        skipped++;
        continue;
      }

      // Use Gmail message ID as GUID for dedup
      const guid = `gmail:${msg.id}`;

      // Check if item already exists
      const existing = await db.select({ id: items.id })
        .from(items)
        .where(and(eq(items.feedId, feedId), eq(items.guid, guid)))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Parse date
      const publishedAt = msg.date ? new Date(msg.date).toISOString() : new Date().toISOString();

      // Insert item
      await db.insert(items).values({
        feedId,
        guid,
        title: msg.subject || "(no subject)",
        author: name,
        content: msg.body || "",
        publishedAt,
        fetchedAt: new Date().toISOString(),
        wordCount: msg.body ? countWords(msg.body) : 0,
      });

      newItems++;
    } catch (err: any) {
      console.error(`[email-poller] Error processing message ${msg.id}: ${err.message}`);
      errors++;
    }
  }

  await setSetting("email.lastPolledAt", new Date().toISOString());
  if (errors === 0) {
    await setSetting("email.lastError", "");
  }

  console.log(`[email-poller] Polled ${messages.length} messages: ${newItems} new, ${skipped} skipped, ${errors} errors`);
  return { polled: messages.length, newItems, skipped, errors };
}

let emailPollInterval: ReturnType<typeof setInterval> | null = null;

export function startEmailPolling(intervalMs = 5 * 60 * 1000) {
  // Initial poll
  pollEmails().catch((err) => console.error("[email-poller] Initial poll failed:", err));

  emailPollInterval = setInterval(() => {
    pollEmails().catch((err) => console.error("[email-poller] Poll failed:", err));
  }, intervalMs);

  console.log(`[email-poller] Started polling every ${intervalMs / 1000}s`);
}

export function stopEmailPolling() {
  if (emailPollInterval) {
    clearInterval(emailPollInterval);
    emailPollInterval = null;
  }
}
