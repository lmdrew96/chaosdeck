"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type ResolvedLine = {
  raw: string;
  section: "deck" | "sideboard" | "commander" | "companion";
  quantity: number;
  requestedName: string;
  matchType: "exact_local" | "fuzzy";
  oracleId: string;
  resolvedName: string;
};

type UnresolvedLine = {
  raw: string;
  requestedName: string;
  reason: "not_found" | "ambiguous" | "not_cached";
  suggestions: string[];
};

export default function ImportExportPanel({ deckId }: { deckId: Id<"decks"> }) {
  const importDeckList = useAction(api.deckImport.importDeckList);
  const importResolvedLines = useMutation(api.decks.importResolvedLines);
  const exportText = useQuery(api.decks.exportDeck, { deckId });

  const [pasted, setPasted] = useState("");
  const [resolved, setResolved] = useState<ResolvedLine[] | null>(null);
  const [unresolved, setUnresolved] = useState<UnresolvedLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState(false);

  const handleResolve = async () => {
    if (!pasted.trim()) return;
    setBusy(true);
    setImported(false);
    try {
      const result = await importDeckList({ text: pasted });
      setResolved(result.resolved);
      setUnresolved(result.unresolved);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!resolved || resolved.length === 0) return;
    setBusy(true);
    try {
      await importResolvedLines({
        deckId,
        lines: resolved.map((r) => ({ section: r.section, quantity: r.quantity, oracleId: r.oracleId })),
      });
      setImported(true);
      setResolved(null);
      setUnresolved([]);
      setPasted("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tech-panel flex flex-col gap-4 p-4">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Import / export</h2>

      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Paste a decklist
        </h3>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={6}
          placeholder={"4 Lightning Bolt\nSideboard\n2 Rest in Peace"}
          className="tech-control min-h-32 px-3 py-2 text-sm text-orchid-hush outline-none transition"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void handleResolve()}
            disabled={busy || !pasted.trim()}
            className="tech-button bg-orchid-hush px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-50"
          >
            Resolve cards
          </button>
          {resolved && resolved.length > 0 && (
            <button
              onClick={() => void handleConfirm()}
              disabled={busy}
              className="tech-button bg-deep-teal px-3 py-1.5 text-xs font-semibold text-coffee-bean disabled:opacity-50"
            >
              Add {resolved.length} resolved to deck
            </button>
          )}
        </div>

        {imported && <p className="font-mono text-xs uppercase tracking-[0.2em] text-ash-grey">Imported.</p>}

        {resolved && (
          <div className="tech-row flex flex-col gap-2 px-3 py-2 pl-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ash-grey/80">{resolved.length} resolved</p>
            {unresolved.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-orchid-hush">{unresolved.length} unresolved</p>
                {unresolved.map((u, i) => (
                  <p key={i} className="text-xs text-ash-grey/80">
                    &ldquo;{u.requestedName}&rdquo; — {u.reason.replace("_", " ")}
                    {u.suggestions.length > 0 && ` (try: ${u.suggestions.slice(0, 3).join(", ")})`}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Export</h3>
        <textarea
          readOnly
          value={exportText ?? ""}
          rows={6}
          className="tech-control min-h-32 px-3 py-2 text-sm text-orchid-hush outline-none"
        />
        <button
          onClick={() => exportText && void navigator.clipboard.writeText(exportText)}
          disabled={!exportText}
          className="tech-button w-fit bg-orchid-hush px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-50"
        >
          Copy to clipboard
        </button>
      </div>
    </div>
  );
}
