import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, Copy, Trash2, Pencil, Download, AudioLines, Clock } from "lucide-react";
import { projectService } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRelative, formatDate, statusColor, statusLabel } from "@/lib/transcriptUtils";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem
} from "@/components/ui/dropdown-menu";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [projects, setProjects] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const navigate = useNavigate();

  async function load() {
    try {
      const list = await projectService.list();
      setProjects(list);
    } catch {
      setProjects([]);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleRename(id) {
    if (!renameValue.trim()) return;
    await projectService.rename(id, renameValue.trim());
    setRenaming(null);
    load();
  }
  async function handleDuplicate(id) {
    await projectService.duplicate(id);
    load();
  }
  async function handleDelete(id) {
    await projectService.remove(id);
    load();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">{greeting()}</h1>
            <p className="text-muted-foreground mt-2 text-lg">Turn your interviews into clean, readable transcripts.</p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link to="/new"><Plus className="w-4 h-4 mr-2" /> New Interview</Link>
          </Button>
        </header>

        {projects === null ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-24 border-dashed shadow-none">
            <AudioLines className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No interviews yet. Start by uploading a recording.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <Card key={p.id} className="group flex items-center gap-4 p-5 shadow-none hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <AudioLines className="w-5 h-5 text-primary/70" />
                </div>
                <button onClick={() => navigate(`/workspace/${p.id}`)} className="flex-1 text-left min-w-0">
                  {renaming === p.id ? (
                    <Input
                      autoFocus value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRename(p.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 max-w-xs border-0 border-b border-primary rounded-none bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    <div className="font-medium text-foreground truncate">{p.title}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span>{formatDate(p.created_date)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(p.duration)}</span>
                    <span>Edited {formatRelative(p.last_edited || p.updated_date)}</span>
                  </div>
                </button>
                <Badge variant="secondary" className={`font-medium ${statusColor(p.status)}`}>{statusLabel(p.status)}</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/workspace/${p.id}`)}><Pencil className="w-4 h-4 mr-2" /> Open</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setRenaming(p.id); setRenameValue(p.title); }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(p.id)}><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/workspace/${p.id}?export=1`)}><Download className="w-4 h-4 mr-2" /> Export</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
