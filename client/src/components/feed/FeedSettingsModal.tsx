import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";

interface FeedSettingsModalProps {
  feedId: number | null;
  onClose: () => void;
}

export function FeedSettingsModal({ feedId, onClose }: FeedSettingsModalProps) {
  const qc = useQueryClient();
  const [feed, setFeed] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [pollInterval, setPollInterval] = useState(60);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!feedId) return;
    api.getFeed(feedId).then((f) => {
      setFeed(f);
      setTitle(f.title || "");
      setPollInterval(f.pollIntervalMinutes || 60);
    });
  }, [feedId]);

  if (!feedId || !feed) return null;

  const handleSave = async () => {
    setSaving(true);
    await api.updateFeed(feedId, { title, pollIntervalMinutes: pollInterval });
    qc.invalidateQueries({ queryKey: ["feeds"] });
    setSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    await api.deleteFeed(feedId);
    qc.invalidateQueries({ queryKey: ["feeds"] });
    qc.invalidateQueries({ queryKey: ["items"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-popover border rounded-lg shadow-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Feed Settings</h2>

        {/* Title */}
        <label className="block mb-3">
          <span className="text-sm text-muted-foreground">Display Name</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background"
          />
        </label>

        {/* Feed URL (read-only) */}
        <label className="block mb-3">
          <span className="text-sm text-muted-foreground">Feed URL</span>
          <input
            type="text"
            value={feed.url}
            readOnly
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-muted text-muted-foreground"
          />
        </label>

        {/* Poll Interval */}
        <label className="block mb-3">
          <span className="text-sm text-muted-foreground">Check every</span>
          <select
            value={pollInterval}
            onChange={(e) => setPollInterval(parseInt(e.target.value))}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>1 hour</option>
            <option value={120}>2 hours</option>
            <option value={360}>6 hours</option>
            <option value={720}>12 hours</option>
            <option value={1440}>Daily</option>
          </select>
        </label>

        {/* Site URL */}
        {feed.siteUrl && (
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">Website</span>
            <a
              href={feed.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1 text-sm text-primary hover:underline truncate"
            >
              {feed.siteUrl}
            </a>
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 text-xs text-muted-foreground space-y-1">
          {feed.lastFetchedAt && <div>Last checked: {new Date(feed.lastFetchedAt).toLocaleString()}</div>}
          {feed.errorCount > 0 && (
            <div className="text-destructive">Errors: {feed.errorCount} - {feed.lastError}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border hover:bg-accent"
          >
            Cancel
          </button>
        </div>

        {/* Unsubscribe */}
        <div className="mt-4 pt-4 border-t">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">Remove this feed and all its items?</span>
              <button
                onClick={handleDelete}
                className="px-3 py-1 text-xs rounded-md bg-destructive text-destructive-foreground"
              >
                Yes, remove
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1 text-xs rounded-md border"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-destructive hover:underline"
            >
              Unsubscribe from this feed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
