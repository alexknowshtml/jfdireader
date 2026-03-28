import { db } from "../db";
import { feeds, items, appSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

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

function cleanEmailHTML(html: string, title?: string): string {
  if (!html) return "";

  // If it's not HTML, do basic plaintext cleanup
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return cleanPlaintext(html);
  }

  try {
    const { document } = parseHTML(html);

    // Step 1: Remove scripts, styles, and comments
    document.querySelectorAll("script, style, noscript").forEach((el: any) => el.remove());

    // Step 2: Remove email-specific cruft
    const selectorsToRemove = [
      'a[href*="unsubscribe"]',
      'a[href*="manage-preferences"]',
      'a[href*="subscription"]',
      'a[href*="view-in-browser"]',
      'a[href*="webversion"]',
      'img[width="1"]',
      'img[height="1"]',
      'img[src*="open.convertkit"]',
      'img[src*="tracking"]',
      'img[src*="beacon"]',
    ];

    for (const selector of selectorsToRemove) {
      try {
        document.querySelectorAll(selector).forEach((el: any) => {
          const parent = el.parentElement;
          if (parent && parent.children.length === 1 && parent.textContent?.trim() === el.textContent?.trim()) {
            parent.remove();
          } else {
            el.remove();
          }
        });
      } catch { /* selector may not be supported */ }
    }

    // Step 3: Flatten email layout tables
    // Email newsletters use tables for layout (role="presentation" or just structural).
    // Replace layout tables with their inner content so Readability sees clean HTML.
    flattenLayoutTables(document);

    // Step 4: Run Readability on the flattened content
    const reader = new Readability(document as any, {
      charThreshold: 0,
    });
    const article = reader.parse();

    if (article?.content) {
      // Strip all remaining table elements (layout tables, button tables, etc.)
      return article.content
        .replace(/<table[^>]*>/gi, "<div>")
        .replace(/<\/table>/gi, "</div>")
        .replace(/<t(?:body|head|foot|r|d|h)[^>]*>/gi, "")
        .replace(/<\/t(?:body|head|foot|r|d|h)>/gi, "");
    }
  } catch (err) {
    console.error("[email-poller] Readability failed, using fallback:", err);
  }

  // Fallback: strip scripts/styles, flatten tables, return
  return stripEmailLayoutFromHTML(html);
}

function flattenLayoutTables(document: any): void {
  // Process tables from innermost to outermost
  let tables = document.querySelectorAll('table');
  let passes = 0;
  const maxPasses = 10;

  while (tables.length > 0 && passes < maxPasses) {
    let changed = false;
    tables = document.querySelectorAll('table');

    for (const table of Array.from(tables) as any[]) {
      // Skip tables that look like actual data tables (multiple rows with data)
      const rows = table.querySelectorAll('tr');
      const isLayoutTable =
        table.getAttribute('role') === 'presentation' ||
        table.getAttribute('role') === 'none' ||
        rows.length <= 2 ||
        // Single-column tables are almost always layout
        table.querySelectorAll('td').length <= rows.length;

      if (isLayoutTable) {
        // Replace table with a div containing just the cell contents
        const div = document.createElement('div');
        const cells = table.querySelectorAll('td, th');
        for (const cell of Array.from(cells) as any[]) {
          div.innerHTML += cell.innerHTML;
        }
        table.replaceWith(div);
        changed = true;
      }
    }

    passes++;
    if (!changed) break;
  }
}

function stripEmailLayoutFromHTML(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<table[^>]*>/gi, "<div>")
    .replace(/<\/table>/gi, "</div>")
    .replace(/<t(?:body|head|foot|r|d|h)[^>]*>/gi, "")
    .replace(/<\/t(?:body|head|foot|r|d|h)>/gi, "");
}

function cleanPlaintext(text: string): string {
  return text
    // Remove tracking URLs (long encoded URLs from email services)
    .replace(/\(\s*https?:\/\/[^\s)]*(?:click\.|convertkit|mailchimp|campaign-archive)[^\s)]*\s*\)/g, "")
    // Remove dashed separators
    .replace(/^-{5,}$/gm, "")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    "--body-format", "html",
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

      // Clean email HTML into readable article content
      const cleanedContent = cleanEmailHTML(msg.body || "", msg.subject);

      // Insert item
      await db.insert(items).values({
        feedId,
        guid,
        title: msg.subject || "(no subject)",
        author: name,
        content: cleanedContent,
        publishedAt,
        fetchedAt: new Date().toISOString(),
        wordCount: cleanedContent ? countWords(cleanedContent.replace(/<[^>]*>/g, "")) : 0,
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
