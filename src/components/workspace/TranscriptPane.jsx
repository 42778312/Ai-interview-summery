import React, { useState } from "react";
import { Search, Bold, Italic, StickyNote } from "lucide-react";
import SearchBar from "./SearchBar";
import ReadOnlyTranscript from "./ReadOnlyTranscript";
import SegmentEditor from "./SegmentEditor";
import CompareView from "./CompareView";

const VIEWS = [
  { key: "current", label: "Current" },
  { key: "raw", label: "Raw" },
  { key: "clean", label: "Clean" },
  { key: "compare", label: "Compare" }
];

const TIMESTAMP_MODES = [
  { key: "none", label: "No timestamps" },
  { key: "speaker", label: "Speaker timestamps" },
  { key: "paragraph", label: "Paragraph timestamps" }
];

export default function TranscriptPane({
  activeView, setActiveView, timestampMode, setTimestampMode,
  segments, speakers, isActive, onSeek,
  onSegmentChange, onSplit, onMerge,
  onAccept, onReject, onAcceptAll, onRejectAll,
  searchOpen, setSearchOpen, searchQuery, setSearchQuery, matchCount, currentMatch, onPrevMatch, onNextMatch,
  matchSegIndex, currentMatchSegIndex, refreshKey
}) {
  const [focusedSeg, setFocusedSeg] = useState(null);

  const exec = (cmd) => { document.execCommand(cmd, false, null); };
  const insertNote = () => { document.execCommand("insertText", false, " [Editor's note: ]"); };

  const matchSegIndexes = matchSegIndex || [];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-1">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setActiveView(v.key)}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${activeView === v.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {activeView === "raw" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Original transcript</span>}
          <select value={timestampMode} onChange={(e) => setTimestampMode(e.target.value)}
            className="text-xs bg-muted/40 rounded-lg px-2 py-1 border-0 outline-none cursor-pointer">
            {TIMESTAMP_MODES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button onClick={() => setSearchOpen(!searchOpen)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><Search className="w-4 h-4" /></button>
        </div>
      </div>

      {searchOpen && (
        <SearchBar query={searchQuery} onChange={setSearchQuery} matchCount={matchCount} currentMatch={currentMatch}
          onPrev={onPrevMatch} onNext={onNextMatch} onClose={() => { setSearchOpen(false); setSearchQuery(""); }} />
      )}

      {activeView === "current" && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-muted/20">
          <button onMouseDown={(e) => { e.preventDefault(); exec("bold"); }} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center font-bold"><Bold className="w-3.5 h-3.5" /></button>
          <button onMouseDown={(e) => { e.preventDefault(); exec("italic"); }} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center italic"><Italic className="w-3.5 h-3.5" /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button onMouseDown={(e) => { e.preventDefault(); insertNote(); }} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center"><StickyNote className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {activeView === "compare" ? (
          <CompareView segments={segments} speakers={speakers} onAccept={onAccept} onReject={onReject} onAcceptAll={onAcceptAll} onRejectAll={onRejectAll} onSeek={onSeek} />
        ) : activeView === "current" ? (
          <div className="h-full overflow-auto">
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-1">
              {segments.map((seg) => (
                <SegmentEditor
                  key={`${seg.id}-${refreshKey}`}
                  segment={seg}
                  speaker={speakers.find((s) => s.deepgram_speaker_id === seg.speaker_index || s.id === seg.speaker_id)?.name || `Speaker ${seg.speaker_index}`}
                  isActive={isActive(seg.id)}
                  timestampMode={timestampMode}
                  onSeek={onSeek}
                  onChange={(change) => onSegmentChange(seg.id, change)}
                  onSplit={onSplit}
                  onMerge={onMerge}
                  searchQuery={searchQuery}
                />
              ))}
              {segments.length === 0 && <div className="text-center text-muted-foreground py-12 text-sm">No transcript available.</div>}
            </div>
          </div>
        ) : (
          <ReadOnlyTranscript
            segments={segments} speakers={speakers}
            field={activeView === "raw" ? "raw_text" : "clean_text"}
            isActive={isActive} onSeek={onSeek} timestampMode={timestampMode}
            searchQuery={searchQuery} matchSegIndex={matchSegIndexes} currentMatchSegIndex={currentMatchSegIndex}
          />
        )}
      </div>
    </div>
  );
}