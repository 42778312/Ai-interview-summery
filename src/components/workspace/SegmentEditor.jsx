import React, { useRef, useEffect, useState } from "react";
import { formatTime } from "@/lib/transcriptUtils";

function getCaretOffset(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  return pre.toString().length;
}

export default function SegmentEditor({ segment, speaker, isActive, timestampMode, onSeek, onChange, onSplit, onMerge, onAddNote, searchQuery }) {
  const ref = useRef(null);
  const [editingSpeaker, setEditingSpeaker] = useState(false);
  const [speakerValue, setSpeakerValue] = useState(speaker);

  useEffect(() => { setSpeakerValue(speaker); }, [speaker]);

  useEffect(() => {
    if (ref.current) {
      const content = segment.current_text || segment.clean_text || segment.raw_text || "";
      if (ref.current.innerHTML !== content) ref.current.innerHTML = content;
    }
  }, [segment.id, segment._refreshKey]);

  const highlight = searchQuery && searchQuery.trim();
  const text = segment.current_text || segment.clean_text || segment.raw_text || "";

  return (
    <div data-seg-id={segment.id} className={`group/seg rounded-lg px-3 py-2.5 transition-colors ${isActive ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {timestampMode !== "none" && (
          <button onClick={() => onSeek?.(segment.start_time)} className="text-xs tabular-nums text-muted-foreground hover:text-primary font-mono">
            [{formatTime(segment.start_time)}]
          </button>
        )}
        {editingSpeaker ? (
          <input
            autoFocus value={speakerValue}
            onChange={(e) => setSpeakerValue(e.target.value)}
            onBlur={() => { setEditingSpeaker(false); if (speakerValue.trim() && speakerValue !== speaker) onChange?.({ speaker: speakerValue.trim() }); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.target.blur(); } if (e.key === "Escape") { setSpeakerValue(speaker); setEditingSpeaker(false); } }}
            className="text-xs font-semibold bg-transparent border-b border-primary outline-none px-0.5"
          />
        ) : (
          <button onClick={() => setEditingSpeaker(true)} className="text-xs font-semibold text-foreground/80 hover:text-primary">
            {speaker}
          </button>
        )}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange?.({ text: ref.current?.innerHTML })}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSplit?.(segment, getCaretOffset(ref.current)); }
          else if (e.key === "Backspace" && getCaretOffset(ref.current) === 0) { e.preventDefault(); onMerge?.(segment.id); }
        }}
        className="text-sm leading-relaxed outline-none focus:outline-none"
      />
      {highlight && !text.toLowerCase().includes(highlight.toLowerCase()) && null}
    </div>
  );
}