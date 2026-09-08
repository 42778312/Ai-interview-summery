import React from "react";
import { formatTime, speakerName } from "@/lib/transcriptUtils";

function highlight(text, query) {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const parts = [];
  let last = 0;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  let idx = lower.indexOf(ql);
  let key = 0;
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(<mark key={key++} className="bg-yellow-200 dark:bg-yellow-500/30 dark:text-foreground rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>);
    last = idx + q.length;
    idx = lower.indexOf(ql, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function ReadOnlyTranscript({ segments, speakers, field, isActive, onSeek, timestampMode, searchQuery, matchSegIndex, currentMatchSegIndex }) {
  return (
    <div className="overflow-auto h-full">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-1">
        {segments.map((seg, i) => {
          const text = seg[field] || seg.raw_text || "";
          const isMatch = matchSegIndex?.includes(i);
          const active = isActive?.(seg.id);
          return (
            <div key={seg.id} data-seg-id={seg.id} className={`rounded-lg px-3 py-2.5 transition-colors ${active ? "bg-primary/5 ring-1 ring-primary/20" : isMatch ? "bg-yellow-50 dark:bg-yellow-500/10" : ""} ${currentMatchSegIndex === i ? "ring-2 ring-yellow-400 dark:ring-yellow-500/60" : ""}`}>
              <div className="flex items-center gap-2 mb-1.5">
                {timestampMode !== "none" && (
                  <button onClick={() => onSeek?.(seg.start_time)} className="text-xs tabular-nums text-muted-foreground hover:text-primary font-mono">[{formatTime(seg.start_time)}]</button>
                )}
                <span className="text-xs font-semibold text-foreground/80">{speakerName(speakers, seg)}</span>
              </div>
              <p className="text-sm leading-relaxed">{highlight(text, searchQuery)}</p>
            </div>
          );
        })}
        {segments.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">No transcript available.</div>}
      </div>
    </div>
  );
}