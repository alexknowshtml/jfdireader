import { Hono } from "hono";
import { db } from "../db";
import { appSettings } from "../db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = new Hono();

// Get all settings
settingsRouter.get("/", async (c) => {
  const rows = await db.select().from(appSettings);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return c.json(settings);
});

// Update settings (partial update)
settingsRouter.patch("/", async (c) => {
  const body = await c.req.json<Record<string, string | null>>();
  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  }
  // Return updated settings
  const rows = await db.select().from(appSettings);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return c.json(settings);
});

// Get email poller status
settingsRouter.get("/email/status", async (c) => {
  const rows = await db.select().from(appSettings);
  const settings: Record<string, string | null> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return c.json({
    enabled: settings["email.enabled"] === "true",
    label: settings["email.label"] || "",
    gogcliPath: settings["email.gogcliPath"] || "",
    pollIntervalMinutes: parseInt(settings["email.pollIntervalMinutes"] || "5"),
    lastPolledAt: settings["email.lastPolledAt"] || null,
    lastError: settings["email.lastError"] || null,
  });
});
