import React, { useMemo, useState } from "react";
import { Check, X, ChevronUp, ChevronDown, CheckCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime, speakerName, diffWords } from "@/lib/transcriptUtils";

export default function CompareView({ segments, speakers, onAccept, onReject, onAcceptAll, onRejectAll, onSeek }) {
  const changedIndexes = useMemo(() => {
    const idxs = [];
    segments.forEach((s, i) => {
      if ((s.clean_text || s.raw_text) !== s.raw_text) idxs.push(i);
    });
    return idxs;
  }, [segments]);

  const [cursor, setCursor] = useState(0);
  const currentChangedIdx = changedIndexes.length ? changedIndexes[Math.min(cursor, changedIndexes.length - 1)] : -1;

  const goPrev = () => setCursor((c) => Math.max(0, c - 1));
  const goNext = () => setCursor((c) => Math.min(changedIndexes.length - 1, c + 1));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Changes</span>
          <span className="text-xs text-muted-foreground">{changedIndexes.length} segments changed</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} disabled={!changedIndexes.length} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={goNext} disabled={!changedIndexes.length} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button variant="outline" size="sm" onClick={onAcceptAll} disabled={!changedIndexes.length}><CheckCheck className="w-3.5 h-3.5 mr-1" />Accept all</Button>
          <Button variant="outline" size="sm" onClick={onRejectAll} disabled={!changedIndexes.length}><XCircle className="w-3.5 h-3.5 mr-1" />Reject all</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 sticky top-0 z-10 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
          <div className="px-4 py-2 border-r">Raw Transcript</div>
          <div className="px-4 py-2">Clean Transcript</div>
        </div>
        {segments.map((seg, i) => {
          const isChanged = (seg.clean_text || seg.raw_text) !== seg.raw_text;
          const isActive = i === currentChangedIdx;
          const diff = isChanged ? diffWords(seg.raw_text, seg.clean_text || seg.raw_text) : [];
          return (
            <div key={seg.id} className={`grid grid-cols-2 border-b ${isActive ? "ring-1 ring-primary/30" : ""}`}>
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
                  {isChanged && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => onAccept(seg.id)} className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 flex items-center gap-1"><Check className="w-3 h-3" />Accept</button>
                      <button onClick={() => onReject(seg.id)} className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1"><X className="w-3 h-3" />Reject</button>
                    </div>
                  )}
                </div>
                <div>
                  {diff.map((d, k) => {
                    if (d.type === "equal") return <span key={k}>{d.value}</span>;
                    if (d.type === "added") return <span key={k} className="bg-emerald-100 text-emerald-800 rounded px-0.5">{d.value}</span>;
                    if (d.type === "removed") return null;
                    if (d.type === "changed") return <span key={k} className="bg-amber-100 text-amber-800 rounded px-0.5">{d.value}</span>;
                    return null;
                  })}
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