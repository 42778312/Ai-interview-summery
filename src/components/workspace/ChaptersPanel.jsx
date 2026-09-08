import React, { useState } from "react";
import { ListTree, Plus, Trash2, Loader2, ChevronUp, ChevronDown, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/transcriptUtils";

export default function ChaptersPanel({ chapters, onGenerate, generating, onAdd, onRename, onDelete, onReorder, onSeek }) {
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");

  const add = () => {
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTree className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">Chapters</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={generating} onClick={onGenerate}>
          {generating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Generate
        </Button>
      </div>

      <div className="flex gap-2 mb-3">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add chapter…"
          className="flex-1 text-sm bg-muted/40 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary" />
        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={add}><Plus className="w-4 h-4" /></Button>
      </div>

      <div className="space-y-1">
        {chapters.map((ch, i) => (
          <div key={ch.id} className="group flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
            <button onClick={() => onSeek?.(ch.start_time)} className="text-[10px] font-mono text-muted-foreground hover:text-primary tabular-nums">{formatTime(ch.start_time)}</button>
            {editing === ch.id ? (
              <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)}
                onBlur={() => { setEditing(null); if (editVal.trim() && editVal !== ch.title) onRename(ch.id, editVal.trim()); }}
                onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(null); }}
                className="text-sm bg-transparent border-b border-primary outline-none flex-1" />
            ) : (
              <button onClick={() => onSeek?.(ch.start_time)} className="text-sm text-left flex-1 truncate">{ch.title}</button>
            )}
            <div className="opacity-0 group-hover:opacity-100 flex items-center">
              <button onClick={() => onReorder(i, -1)} disabled={i === 0} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5" /></button>
              <button onClick={() => onReorder(i, 1)} disabled={i === chapters.length - 1} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setEditing(ch.id); setEditVal(ch.title); }} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => onDelete(ch.id)} className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {chapters.length === 0 && <p className="text-xs text-muted-foreground py-2">No chapters yet. Add one or generate with DeepSeek.</p>}
      </div>
    </div>
  );
}