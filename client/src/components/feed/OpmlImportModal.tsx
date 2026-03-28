import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseOpml } from "feedsmith";
import { Upload, FileUp, Check, AlertCircle } from "lucide-react";
import * as api from "@/lib/api";

interface ParsedFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  folder?: string;
}

interface OpmlImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = "upload" | "preview" | "importing" | "done";

export function OpmlImportModal({ open, onClose }: OpmlImportModalProps) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [rawOpml, setRawOpml] = useState("");
  const [feeds, setFeeds] = useState<ParsedFeed[]>([]);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setRawOpml("");
    setFeeds([]);
    setError("");
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const parseFile = useCallback((text: string) => {
    try {
      const opml = parseOpml(text);
      const parsed: ParsedFeed[] = [];

      function walk(outlines: any[], folder?: string) {
        for (const o of outlines) {
          if (o.xmlUrl) {
            parsed.push({
              title: o.title || o.text || o.xmlUrl,
              xmlUrl: o.xmlUrl,
              htmlUrl: o.htmlUrl,
              folder,
            });
          }
          if (o.outlines?.length) {
            walk(o.outlines, o.text || o.title || folder);
          }
        }
      }

      walk(opml.body?.outlines || []);

      if (parsed.length === 0) {
        setError("No feeds found in this OPML file.");
        return;
      }

      setRawOpml(text);
      setFeeds(parsed);
      setError("");
      setStep("preview");
    } catch {
      setError("Could not parse this file. Make sure it's a valid OPML file.");
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(opml|xml)$/i) && file.type !== "text/xml" && file.type !== "application/xml") {
      setError("Please select an .opml or .xml file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => parseFile(reader.result as string);
    reader.readAsText(file);
  }, [parseFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    setStep("importing");
    try {
      const res = await api.importOpml(rawOpml);
      setResult(res);
      setStep("done");
      qc.invalidateQueries({ queryKey: ["feeds"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    } catch {
      setError("Import failed. Try again.");
      setStep("preview");
    }
  }, [rawOpml, qc]);

  if (!open) return null;

  // Group feeds by folder for preview
  const grouped = feeds.reduce<Record<string, ParsedFeed[]>>((acc, f) => {
    const key = f.folder || "Unfiled";
    (acc[key] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-popover border rounded-lg shadow-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Import OPML</h2>

        {/* Upload step */}
        {step === "upload" && (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-muted-foreground/50"}
              `}
            >
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop your OPML file here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".opml,.xml,text/xml,application/xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <p className="text-xs text-muted-foreground mt-3">
              Export from your current reader (Feedly, Inoreader, NetNewsWire, etc.) and import here.
            </p>
          </>
        )}

        {/* Preview step */}
        {step === "preview" && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              Found <span className="font-medium text-foreground">{feeds.length}</span> feeds to import
            </p>
            <div className="overflow-y-auto flex-1 min-h-0 border rounded-md">
              {Object.entries(grouped).map(([folder, items]) => (
                <div key={folder}>
                  {folder !== "Unfiled" && (
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b sticky top-0">
                      {folder}
                    </div>
                  )}
                  {items.map((feed, i) => (
                    <div key={i} className="px-3 py-2 text-sm border-b last:border-0 flex items-center gap-2">
                      <FileUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{feed.title}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleImport}
                className="flex-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Import {feeds.length} feeds
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 text-sm rounded-md border hover:bg-accent"
              >
                Back
              </button>
            </div>
          </>
        )}

        {/* Importing step */}
        {step === "importing" && (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Importing feeds...</p>
          </div>
        )}

        {/* Done step */}
        {step === "done" && result && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Import complete</span>
            </div>
            <div className="space-y-1 text-sm">
              {result.imported > 0 && (
                <p className="text-green-600 dark:text-green-400">{result.imported} feeds imported</p>
              )}
              {result.skipped > 0 && (
                <p className="text-muted-foreground">{result.skipped} already subscribed (skipped)</p>
              )}
              {result.errors > 0 && (
                <p className="text-destructive">{result.errors} failed</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="mt-4 w-full px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
