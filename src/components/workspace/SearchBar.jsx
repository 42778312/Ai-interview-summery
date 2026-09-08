import React, { useEffect, useRef } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev} disabled={!matchCount}><ChevronUp className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext} disabled={!matchCount}><ChevronDown className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
    </div>
  );
}