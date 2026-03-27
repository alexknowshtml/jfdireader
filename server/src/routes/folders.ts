import { Hono } from "hono";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";

export const foldersRouter = new Hono();

// List all folders
foldersRouter.get("/", async (c) => {
  const result = await db.select().from(schema.folders).orderBy(schema.folders.sortOrder);
  return c.json(result);
});

// Create a folder
foldersRouter.post("/", async (c) => {
  const { name, parentId } = await c.req.json<{ name: string; parentId?: number }>();

  const [folder] = await db
    .insert(schema.folders)
    .values({ name, parentId: parentId ?? null })
    .returning();

  return c.json(folder, 201);
});

// Delete a folder
foldersRouter.delete("/:id", async (c) => {
  const id = parseInt(c.req.param("id"));
  await db.delete(schema.feedFolders).where(eq(schema.feedFolders.folderId, id));
  await db.delete(schema.folders).where(eq(schema.folders.id, id));
  return c.json({ ok: true });
});
