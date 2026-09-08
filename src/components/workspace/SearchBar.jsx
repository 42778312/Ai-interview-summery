import React, { useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";

export default function SearchBar({ query, onChange, matchCount, currentMatch, onPrev, onNext, onClose }) {
  const inputRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-card">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.shiftKey ? onPrev?.() : onNext?.(); }
        }}
        placeholder="Search transcript…  (⌘F)"
        className="flex-1 bg-transparent outline-none text-sm"
      />
      {query && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {matchCount > 0 ? `${currentMatch + 1} of ${matchCount}` : "0 matches"}
        </span>
      )}
      <button onClick={onPrev} disabled={!matchCount} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
      <button onClick={onNext} disabled={!matchCount} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
      <button onClick={onClose} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
    </div>
  );
}