import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const qc = useQueryClient();

  const { data: emailStatus } = useQuery({
    queryKey: ["emailStatus"],
    queryFn: api.getEmailStatus,
    refetchInterval: 30_000,
  });

  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [gogcliPath, setGogcliPath] = useState("");
  const [pollInterval, setPollInterval] = useState(5);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (emailStatus) {
      setEnabled(emailStatus.enabled);
      setLabel(emailStatus.label);
      setGogcliPath(emailStatus.gogcliPath);
      setPollInterval(emailStatus.pollIntervalMinutes);
    }
  }, [emailStatus]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateSettings({
        "email.enabled": String(enabled),
        "email.label": label,
        "email.gogcliPath": gogcliPath,
        "email.pollIntervalMinutes": String(pollInterval),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emailStatus"] });
      setDirty(false);
    },
  });

  const handleChange = (setter: (v: any) => void) => (value: any) => {
    setter(value);
    setDirty(true);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Settings</h1>
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-accent"
          >
            ← Back
          </button>
        </div>

        {/* Email Ingestion */}
        <section>
          <h2 className="text-sm font-medium mb-3">Newsletter Email Ingestion</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Poll a Gmail label for newsletter emails and import them as feed items.
            Newsletters that already have RSS feeds will be automatically skipped.
          </p>

          <div className="space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => handleChange(setEnabled)(e.target.checked)}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Enable email polling</span>
            </label>

            {/* Gmail label */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Gmail Label
              </label>
              <Input
                value={label}
                onChange={(e) => handleChange(setLabel)(e.target.value)}
                placeholder="e.g. - Feed"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The Gmail label that contains your newsletter emails.
              </p>
            </div>

            {/* gogcli path */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                gogcli Script Path
              </label>
              <Input
                value={gogcliPath}
                onChange={(e) => handleChange(setGogcliPath)(e.target.value)}
                placeholder="/path/to/gog-wrapper.sh"
                className="text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Absolute path to the gogcli wrapper script.
              </p>
            </div>

            {/* Poll interval */}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Poll Interval (minutes)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={pollInterval}
                onChange={(e) => handleChange(setPollInterval)(parseInt(e.target.value) || 5)}
                className="text-sm w-24"
              />
            </div>

            {/* Status */}
            {emailStatus && (
              <div className="bg-muted rounded-md p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={emailStatus.enabled ? "text-green-600" : "text-muted-foreground"}>
                    {emailStatus.enabled ? "Active" : "Disabled"}
                  </span>
                </div>
                {emailStatus.lastPolledAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last polled</span>
                    <span>{new Date(emailStatus.lastPolledAt).toLocaleString()}</span>
                  </div>
                )}
                {emailStatus.lastError && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last error</span>
                    <span className="text-red-500 truncate max-w-[200px]">{emailStatus.lastError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Save button */}
            <div className="pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!dirty || saveMutation.isPending}
                className="text-sm"
              >
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
