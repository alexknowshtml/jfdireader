import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { feedsRouter } from "./routes/feeds";
import { itemsRouter } from "./routes/items";
import { foldersRouter } from "./routes/folders";

const app = new Hono();

app.use("*", logger());
app.use(
  "/api/*",
  cors({
    origin: "http://localhost:5173", // Vite dev server
  })
);

// Health check
app.get("/health", (c) => c.json({ status: "ok", version: "0.1.0" }));

// API routes
app.route("/api/feeds", feedsRouter);
app.route("/api/items", itemsRouter);
app.route("/api/folders", foldersRouter);

const port = parseInt(process.env.PORT || "3000");
console.log(`JFDI Reader server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
