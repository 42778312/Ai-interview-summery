import React, { useState } from "react";
import { Clock, Globe, User, Pencil, Check, X } from "lucide-react";
import { formatDuration, formatDate, statusLabel } from "@/lib/transcriptUtils";

export default function ProjectInfo({ project, onRenameSpeaker }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [speakerVal, setSpeakerVal] = useState("");

  return (
    <div className="p-4 border-b">
      {editingTitle ? (
        <div className="flex items-center gap-2 mb-3">
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
            onBlur={() => { setEditingTitle(false); if (title.trim() && title !== project.title) onRenameSpeaker?.({ title: title.trim() }); }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="font-heading text-base font-semibold bg-transparent border-b border-primary outline-none flex-1" />
        </div>
      ) : (
        <button onClick={() => { setTitle(project.title); setEditingTitle(true); }} className="flex items-center gap-1.5 mb-3 group">
          <h2 className="font-heading text-base font-semibold text-left truncate">{project.title}</h2>
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
        </button>
      )}
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {formatDuration(project.duration)}</div>
        <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> English</div>
        <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> {statusLabel(project.status)}</div>
      </div>

      {project.speakers?.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">Speakers</div>
          <div className="space-y-1.5">
            {project.speakers.map((sp) => (
              <div key={sp.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">{(sp.name || "S").charAt(0)}</div>
                {editingSpeaker === sp.id ? (
                  <input autoFocus value={speakerVal} onChange={(e) => setSpeakerVal(e.target.value)}
                    onBlur={() => { setEditingSpeaker(null); if (speakerVal.trim() && speakerVal !== sp.name) onRenameSpeaker?.({ speaker: { id: sp.id, name: speakerVal.trim() } }); }}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingSpeaker(null); }}
                    className="text-sm bg-transparent border-b border-primary outline-none flex-1" />
                ) : (
                  <button onClick={() => { setEditingSpeaker(sp.id); setSpeakerVal(sp.name); }} className="text-sm text-foreground hover:text-primary flex-1 text-left">{sp.name}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}