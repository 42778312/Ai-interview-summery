import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, MoreHorizontal, Copy, Trash2, Pencil, Download, AudioLines, Clock, Sparkles, CheckCircle2 } from "lucide-react";
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

const DONE_STATUSES = ["TRANSCRIBED", "CLEANED", "EDITING", "READY", "EXPORTED"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ icon: Icon, label, value }) {
  return (
    <Card className="p-5 shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-2xl font-semibold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const [projects, setProjects] = useState(null);
  const [query, setQuery] = useState("");
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

  const totalDuration = (projects || []).reduce((acc, p) => acc + (p.duration || 0), 0);
  const doneCount = (projects || []).filter((p) => DONE_STATUSES.includes(p.status)).length;
  const visible = (projects || []).filter((p) => p.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-12 md:py-16 relative">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight">{greeting()}</h1>
            <p className="text-muted-foreground mt-2 text-lg">Turn your interviews into clean, readable transcripts.</p>
          </div>
          <Button asChild size="lg" className="rounded-full">
            <Link to="/new"><Plus className="w-4 h-4 mr-2" /> New Interview</Link>
          </Button>
        </header>

        {projects !== null && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <Stat icon={AudioLines} label="Interviews" value={projects.length} />
            <Stat icon={Clock} label="Total duration" value={formatDuration(totalDuration)} />
            <Stat icon={CheckCircle2} label="Completed" value={doneCount} />
          </div>
        )}

        {projects === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-24 border-dashed shadow-none">
            <AudioLines className="w-10 h-10 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No interviews yet. Start by uploading a recording.</p>
          </Card>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-lg font-semibold">Your interviews</h2>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search interviews…"
                className="max-w-56 bg-card"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map((p) => (
                <Card key={p.id} className="group relative flex flex-col p-5 shadow-none hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <AudioLines className="w-5 h-5 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -mr-1.5 -mt-1.5"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/workspace/${p.id}`)}><Pencil className="w-4 h-4 mr-2" /> Open</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setRenaming(p.id); setRenameValue(p.title); }}><Pencil className="w-4 h-4 mr-2" /> Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(p.id)}><Copy className="w-4 h-4 mr-2" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/workspace/${p.id}?export=1`)}><Download className="w-4 h-4 mr-2" /> Export</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <button onClick={() => navigate(`/workspace/${p.id}`)} className="text-left flex-1 min-w-0">
                    {renaming === p.id ? (
                      <Input
                        autoFocus value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRename(p.id)}
                        onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 border-0 border-b border-primary rounded-none bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
                      />
                    ) : (
                      <div className="font-medium text-foreground truncate mb-1.5">{p.title}</div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />{formatDuration(p.duration)}
                      <span>·</span>
                      <span>{formatDate(p.created_date)}</span>
                    </div>
                  </button>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Badge variant="secondary" className={`font-medium ${statusColor(p.status)}`}>{statusLabel(p.status)}</Badge>
                    <span className="text-xs text-muted-foreground">Edited {formatRelative(p.last_edited || p.updated_date)}</span>
                  </div>
                </Card>
              ))}
              {visible.length === 0 && (
                <Card className="col-span-full text-center py-16 border-dashed shadow-none">
                  <Sparkles className="w-8 h-8 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground text-sm">No interviews match "{query}".</p>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
