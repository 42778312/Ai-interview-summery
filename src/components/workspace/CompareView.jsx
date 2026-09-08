import React, { useMemo, useState, useEffect } from "react";
import { Check, X, ChevronUp, ChevronDown, CheckCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime, speakerName, diffWords } from "@/lib/transcriptUtils";

export default function CompareView({ segments, speakers, onAccept, onReject, onAcceptAll, onRejectAll, onSeek }) {
  // "Has a suggestion" (raw differs from clean) vs "still pending review"
  // (has a suggestion AND hasn't been explicitly accepted/rejected yet) are
  // different things: Accept/Reject All should stay usable even after every
  // segment has been resolved (to let you reset the whole batch the other
  // way), while the navigation/counter should only track what's left to
  // decide.
  const suggestionIndexes = useMemo(() => {
    const idxs = [];
    segments.forEach((s, i) => {
      if ((s.clean_text || s.raw_text) !== s.raw_text) idxs.push(i);
    });
    return idxs;
  }, [segments]);

  const pendingIndexes = useMemo(
    () => suggestionIndexes.filter((i) => !segments[i].resolved),
    [suggestionIndexes, segments]
  );

  const [cursor, setCursor] = useState(0);
  const currentPendingIdx = pendingIndexes.length ? pendingIndexes[Math.min(cursor, pendingIndexes.length - 1)] : -1;

  const goPrev = () => setCursor((c) => Math.max(0, c - 1));
  const goNext = () => setCursor((c) => Math.min(pendingIndexes.length - 1, c + 1));

  // Keep the current diff in view — including on first mount, so switching
  // into the Compare tab jumps straight to the first pending change.
  useEffect(() => {
    if (currentPendingIdx < 0) return;
    const seg = segments[currentPendingIdx];
    if (!seg) return;
    const el = document.querySelector(`[data-seg-id="${seg.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentPendingIdx, segments]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Changes</span>
          <span className="text-xs text-muted-foreground">{pendingIndexes.length} pending of {suggestionIndexes.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} disabled={!pendingIndexes.length} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={goNext} disabled={!pendingIndexes.length} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
          {pendingIndexes.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums px-1">{Math.min(cursor, pendingIndexes.length - 1) + 1} / {pendingIndexes.length}</span>
          )}
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={onAcceptAll} disabled={!suggestionIndexes.length}><CheckCheck className="w-3.5 h-3.5 mr-1" />Accept all</Button>
          <Button variant="outline" size="sm" onClick={onRejectAll} disabled={!suggestionIndexes.length}><XCircle className="w-3.5 h-3.5 mr-1" />Reject all</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 sticky top-0 z-10 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
          <div className="px-4 py-2 border-r">Raw Transcript</div>
          <div className="px-4 py-2">Clean Transcript</div>
        </div>
        {segments.map((seg, i) => {
          const hasSuggestion = (seg.clean_text || seg.raw_text) !== seg.raw_text;
          const isPending = hasSuggestion && !seg.resolved;
          const isActive = i === currentPendingIdx;
          const diff = isPending ? diffWords(seg.raw_text, seg.clean_text || seg.raw_text) : [];
          const acceptedClean = hasSuggestion && seg.resolved && seg.current_text === (seg.clean_text || seg.raw_text);
          const rejectedRaw = hasSuggestion && seg.resolved && seg.current_text === seg.raw_text;
          return (
            <div key={seg.id} data-seg-id={seg.id} className={`grid grid-cols-2 border-b ${isActive ? "ring-1 ring-primary/30" : ""}`}>
              <div className="px-4 py-3 border-r text-sm leading-relaxed">
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-2">
                  <button onClick={() => onSeek?.(seg.start_time)} className="font-mono hover:text-primary">[{formatTime(seg.start_time)}]</button>
                  <span>{speakerName(speakers, seg)}</span>
                </div>
                {seg.raw_text}
              </div>
              <div className="px-4 py-3 text-sm leading-relaxed">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">{speakerName(speakers, seg)}</span>
                  {hasSuggestion && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onAccept(seg.id)}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${acceptedClean ? "bg-emerald-600 text-white" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                      >
                        <Check className="w-3 h-3" />Accept
                      </button>
                      <button
                        onClick={() => onReject(seg.id)}
                        className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${rejectedRaw ? "bg-red-600 text-white" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                      >
                        <X className="w-3 h-3" />Reject
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  {isPending ? (
                    diff.map((d, k) => {
                      if (d.type === "equal") return <span key={k}>{d.value}</span>;
                      if (d.type === "added") return <span key={k} className="bg-emerald-100 text-emerald-800 rounded px-0.5">{d.value}</span>;
                      if (d.type === "removed") return null;
                      if (d.type === "changed") return <span key={k} className="bg-amber-100 text-amber-800 rounded px-0.5">{d.value}</span>;
                      return null;
                    })
                  ) : (
                    seg.current_text || seg.clean_text || seg.raw_text
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {segments.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">No transcript yet.</div>}
      </div>
    </div>
  );
}
