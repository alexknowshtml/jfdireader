import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { feedsRouter } from "./routes/feeds";
import { itemsRouter } from "./routes/items";
import { foldersRouter } from "./routes/folders";
import { settingsRouter } from "./routes/settings";
import { startPolling } from "./services/poller";
import { startEmailPolling } from "./services/email-poller";
import { resolve } from "path";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: (origin) => origin, // Allow all origins in dev
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// API routes
app.route("/api/feeds", feedsRouter);
app.route("/api/items", itemsRouter);
app.route("/api/folders", foldersRouter);
app.route("/api/settings", settingsRouter);

// Serve built client static files
const clientDist = resolve(import.meta.dir, "../../client/dist");
app.use("/*", serveStatic({ root: clientDist }));
// SPA fallback - serve index.html for all non-API, non-file routes
app.get("/*", serveStatic({ root: clientDist, path: "/index.html" }));

// Start background feed polling (every 5 minutes)
startPolling(5 * 60 * 1000);

// Start email polling (every 5 minutes)
startEmailPolling(5 * 60 * 1000);

const port = parseInt(process.env.PORT || "3100");
console.log(`JFDI Reader server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
