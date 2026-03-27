import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { feedsRouter } from "./routes/feeds";
import { itemsRouter } from "./routes/items";
import { foldersRouter } from "./routes/folders";
import { startPolling } from "./services/poller";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], // Vite dev server
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// API routes
app.route("/api/feeds", feedsRouter);
app.route("/api/items", itemsRouter);
app.route("/api/folders", foldersRouter);

// Start background feed polling (every 5 minutes)
startPolling(5 * 60 * 1000);

const port = parseInt(process.env.PORT || "3100");
console.log(`JFDI Reader server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
