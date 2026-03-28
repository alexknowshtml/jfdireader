import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolve } from "path";

const DB_PATH = resolve(process.env.JFDIREADER_DB_PATH || "./data/jfdireader.db");

const sqlite = new Database(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

// FTS5 virtual table for full-text search
sqlite.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    content,
    author,
    content='items',
    content_rowid='id',
    tokenize='porter unicode61'
  )
`);

// Triggers to keep FTS index in sync with items table
sqlite.exec(`
  CREATE TRIGGER IF NOT EXISTS items_fts_insert AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, content, author)
    VALUES (new.id, new.title, new.content, new.author);
  END
`);
sqlite.exec(`
  CREATE TRIGGER IF NOT EXISTS items_fts_delete AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, content, author)
    VALUES ('delete', old.id, old.title, old.content, old.author);
  END
`);
sqlite.exec(`
  CREATE TRIGGER IF NOT EXISTS items_fts_update AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, content, author)
    VALUES ('delete', old.id, old.title, old.content, old.author);
    INSERT INTO items_fts(rowid, title, content, author)
    VALUES (new.id, new.title, new.content, new.author);
  END
`);

// Rebuild FTS index to ensure it's in sync with items table
// This is fast (<100ms for thousands of items) and idempotent
sqlite.exec("INSERT INTO items_fts(items_fts) VALUES('rebuild')");


export const db = drizzle(sqlite, { schema });
export { sqlite, schema };
