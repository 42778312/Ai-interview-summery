import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, History, Loader2, PanelLeft, PanelRight, AlertCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { projectService } from "@/services/projectService";
import { transcriptService } from "@/services/transcriptService";
import { buildText } from "@/lib/transcriptUtils";
import AudioPlayer from "@/components/workspace/AudioPlayer";
import TranscriptPane from "@/components/workspace/TranscriptPane";
import ProjectInfo from "@/components/workspace/ProjectInfo";
import ChaptersPanel from "@/components/workspace/ChaptersPanel";
import CleanupPanel from "@/components/workspace/CleanupPanel";
import ExportDialog from "@/components/workspace/ExportDialog";
import VersionHistory from "@/components/workspace/VersionHistory";
import { Button } from "@/components/ui/button";

const DEFAULT_OPTIONS = {
  remove_fillers: true, remove_repetition: true, remove_false_starts: true,
  fix_punctuation: true, fix_transcription_errors: true, remove_sound_markers: true,
  improve_paragraphs: true, strength: "balanced", environmental_sounds: "remove_non_meaningful"
};

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [segments, setSegments] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("current");
  const [timestampMode, setTimestampMode] = useState("speaker");
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [saving, setSaving] = useState("idle");
  const [cleanupOptions, setCleanupOptions] = useState(DEFAULT_OPTIONS);
  const [cleaning, setCleaning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const audioRef = useRef(null);
  const saveTimer = useRef(null);
  const segmentsRef = useRef([]);
  const speakersRef = useRef([]);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);
  useEffect(() => { speakersRef.current = speakers; }, [speakers]);

  useEffect(() => {
    (async () => {
      try {
        const p = await projectService.get(id);
        setProject(p);
        setSpeakers(p.speakers || []);
        setCleanupOptions({ ...DEFAULT_OPTIONS, ...(p.cleanup_options || {}) });
        const ts = await transcriptService.getByProject(id);
        if (ts.length) { setTranscript(ts[0]); setSegments(ts[0].segments || []); }
        if (p.audio_file_uri) {
          try {
            const { data } = await supabase.storage.from("audio-files").createSignedUrl(p.audio_file_uri, 3600);
            setAudioUrl(data?.signedUrl);
          } catch {}
        }
        if (new URLSearchParams(window.location.search).get("export")) setShowExport(true);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const onTimeUpdate = useCallback((t) => {
    const segs = segmentsRef.current;
    let active = null;
    for (const s of segs) { if (s.start_time <= t && t < s.end_time) { active = s.id; break; } }
    if (active == null) { for (let i = segs.length - 1; i >= 0; i--) { if (segs[i].start_time <= t) { active = segs[i].id; break; } } }
    setActiveSegmentId(active);
  }, []);

  const seek = useCallback((time) => {
    const a = audioRef.current;
    if (a) { a.currentTime = time; a.play?.().catch(() => {}); }
  }, []);
  const togglePlay = useCallback(() => { const a = audioRef.current; if (!a) return; a.paused ? a.play().catch(() => {}) : a.pause(); }, []);
  const isActive = useCallback((segId) => segId === activeSegmentId, [activeSegmentId]);

  const flushSave = useCallback(async () => {
    if (!transcript || !project) return;
    clearTimeout(saveTimer.current);
    setSaving("saving");
    try {
      const flat = buildText(segmentsRef.current, speakersRef.current, "current_text").replace(/<[^>]+>/g, "");
      await transcriptService.update(transcript.id, { segments: segmentsRef.current, current_text: flat });
      await projectService.update(project.id, { status: "EDITING" });
      setSaving("saved");
      setTimeout(() => setSaving("idle"), 2000);
    } catch { setSaving("idle"); }
  }, [transcript, project]);

  const scheduleSave = useCallback(() => {
    setSaving("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 1200);
  }, [flushSave]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" && !isEditable(e.target)) { e.preventDefault(); togglePlay(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); flushSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, flushSave]);

  const renameSpeaker = useCallback(({ speaker, title }) => {
    if (title) { projectService.update(project.id, { title }); setProject((p) => ({ ...p, title })); return; }
    if (speaker) {
      const updated = (project.speakers || []).map((s) => {
        if (speaker.id && s.id === speaker.id) return { ...s, name: speaker.name };
        if (speaker.deepgram_speaker_id != null && s.deepgram_speaker_id === speaker.deepgram_speaker_id) return { ...s, name: speaker.name };
        return s;
      });
      setSpeakers(updated);
      setProject((p) => ({ ...p, speakers: updated }));
      projectService.update(project.id, { speakers: updated });
    }
  }, [project]);

  const onSegmentChange = useCallback((segId, change) => {
    if (change.speaker) {
      const seg = segmentsRef.current.find((s) => s.id === segId);
      if (!seg) return;
      renameSpeaker({ speaker: { deepgram_speaker_id: seg.speaker_index, name: change.speaker } });
      return;
    }
    setSegments((prev) => prev.map((s) => (s.id === segId ? { ...s, current_text: change.text } : s)));
    scheduleSave();
  }, [scheduleSave, renameSpeaker]);

  const onSplit = useCallback((seg, offset) => {
    const text = (seg.current_text || seg.raw_text || "").replace(/<[^>]+>/g, "");
    const before = text.slice(0, offset).trim();
    const after = text.slice(offset).trim();
    const newSeg = { id: `seg_${Date.now()}`, speaker_index: seg.speaker_index, speaker_id: seg.speaker_id, start_time: seg.start_time, end_time: seg.end_time, raw_text: seg.raw_text, clean_text: seg.clean_text, current_text: after, confidence: seg.confidence, order_index: (seg.order_index || 0) + 0.5, changes: [] };
    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === seg.id);
      if (idx < 0) return prev;
      const updated = [...prev];
      updated[idx] = { ...seg, current_text: before };
      updated.splice(idx + 1, 0, newSeg);
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const onMerge = useCallback((segId) => {
    setSegments((prev) => {
      const idx = prev.findIndex((s) => s.id === segId);
      if (idx <= 0) return prev;
      const a = prev[idx - 1], b = prev[idx];
      const merged = { ...a, current_text: ((a.current_text || a.raw_text || "") + " " + (b.current_text || b.raw_text || "")).trim() };
      const updated = [...prev];
      updated[idx - 1] = merged;
      updated.splice(idx, 1);
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const acceptChange = useCallback((segId) => { setSegments((p) => p.map((s) => (s.id === segId ? { ...s, current_text: s.clean_text || s.raw_text, resolved: true } : s))); setRefreshKey((k) => k + 1); scheduleSave(); }, [scheduleSave]);
  const rejectChange = useCallback((segId) => { setSegments((p) => p.map((s) => (s.id === segId ? { ...s, current_text: s.raw_text, resolved: true } : s))); setRefreshKey((k) => k + 1); scheduleSave(); }, [scheduleSave]);
  const acceptAll = useCallback(() => { setSegments((p) => p.map((s) => ({ ...s, current_text: s.clean_text || s.raw_text, resolved: true }))); setRefreshKey((k) => k + 1); scheduleSave(); }, [scheduleSave]);
  const rejectAll = useCallback(() => { setSegments((p) => p.map((s) => ({ ...s, current_text: s.raw_text, resolved: true }))); setRefreshKey((k) => k + 1); scheduleSave(); }, [scheduleSave]);

  const clean = async () => {
    setCleaning(true);
    try {
      await transcriptService.clean({ project_id: project.id, options: cleanupOptions });
      const ts = await transcriptService.getByProject(id);
      if (ts.length) { setTranscript(ts[0]); setSegments(ts[0].segments || []); }
      const p = await projectService.get(id);
      setProject(p); setSpeakers(p.speakers || []);
      setRefreshKey((k) => k + 1);
      setActiveView("compare");
    } catch (e) { alert(e.message || "Cleanup failed. Please try again."); }
    finally { setCleaning(false); }
  };

  const updateChapters = (chapters) => { setProject((p) => ({ ...p, chapters })); projectService.update(project.id, { chapters }); };
  const generateChapters = async () => {
    setGenerating(true);
    try { const r = await transcriptService.generateChapters({ project_id: project.id }); setProject((p) => ({ ...p, chapters: r.data?.chapters || [] })); }
    catch (e) { alert(e.message); }
    finally { setGenerating(false); }
  };
  const addChapter = (title) => updateChapters([...(project.chapters || []), { id: `ch_${Date.now()}`, title, start_time: 0, end_time: 0 }]);
  const renameChapter = (cid, title) => updateChapters((project.chapters || []).map((c) => (c.id === cid ? { ...c, title } : c)));
  const deleteChapter = (cid) => updateChapters((project.chapters || []).filter((c) => c.id !== cid));
  const reorderChapter = (i, dir) => { const arr = [...(project.chapters || [])]; const j = i + dir; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; updateChapters(arr); };

  const restoreVersion = async (type) => {
    if (type === "RAW") setSegments((p) => p.map((s) => ({ ...s, current_text: s.raw_text })));
    else if (type === "CLEAN") setSegments((p) => p.map((s) => ({ ...s, current_text: s.clean_text || s.raw_text })));
    setRefreshKey((k) => k + 1);
    scheduleSave();
    setShowVersions(false);
    setActiveView("current");
  };

  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return segments.map((s, i) => {
      const text = (s.current_text || s.clean_text || s.raw_text || "").replace(/<[^>]+>/g, "").toLowerCase();
      return text.includes(q) ? i : -1;
    }).filter((i) => i >= 0);
  }, [segments, searchQuery]);
  const matchCount = searchMatches.length;
  const currentMatchSegIndex = matchCount ? searchMatches[currentMatch % matchCount] : -1;
  const onNextMatch = () => matchCount && setCurrentMatch((m) => (m + 1) % matchCount);
  const onPrevMatch = () => matchCount && setCurrentMatch((m) => (m - 1 + matchCount) % matchCount);

  useEffect(() => {
    if (currentMatchSegIndex >= 0) {
      const seg = segments[currentMatchSegIndex];
      if (seg) { const el = document.querySelector(`[data-seg-id="${seg.id}"]`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }
    }
  }, [currentMatchSegIndex, segments]);

  // Keep the currently-playing segment in view during playback, instead of
  // leaving the highlight to scroll off-screen while the page stays put.
  useEffect(() => {
    if (!activeSegmentId) return;
    const el = document.querySelector(`[data-seg-id="${activeSegmentId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSegmentId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><AlertCircle className="w-8 h-8 text-destructive" /><p className="text-muted-foreground">{error}</p><Button variant="outline" onClick={() => navigate("/")}>Back to dashboard</Button></div>;
  if (!project) return null;

  const hasClean = !!(transcript?.clean_text || segments.some((s) => s.clean_text && s.clean_text !== s.raw_text));
  const changesCount = project.changes_count || segments.reduce((acc, s) => acc + (s.changes?.length || 0), 0);

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4" /></Button>
        <h1 className="font-heading font-semibold truncate flex-1">{project.title}</h1>
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          {saving === "saving" ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : saving === "saved" ? <><Save className="w-3 h-3" /> Saved</> : "All changes saved"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShowVersions(true)}><History className="w-4 h-4 mr-1.5" /> History</Button>
        <Button size="sm" onClick={() => setShowExport(true)} className="rounded-full">Export</Button>
        <Button variant="ghost" size="icon" className="lg:hidden rounded-full shrink-0" onClick={() => setLeftOpen(true)}><PanelLeft className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" className="lg:hidden rounded-full shrink-0" onClick={() => setRightOpen(true)}><PanelRight className="w-4 h-4" /></Button>
      </div>

      <AudioPlayer audioRef={audioRef} audioUrl={audioUrl} duration={project.duration} onTimeUpdate={onTimeUpdate} />

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`${leftOpen ? "absolute inset-y-0 left-0 z-30 shadow-xl" : "hidden"} lg:relative lg:flex lg:shadow-none w-72 bg-card flex-col overflow-auto border-r`}>
          <ProjectInfo project={project} onRenameSpeaker={renameSpeaker} />
          <ChaptersPanel chapters={project.chapters || []} onGenerate={generateChapters} generating={generating} onAdd={addChapter} onRename={renameChapter} onDelete={deleteChapter} onReorder={reorderChapter} onSeek={seek} />
          {leftOpen && (
            <Button variant="secondary" size="icon" className="lg:hidden absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => setLeftOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </aside>

        <main className="flex-1 overflow-hidden">
          <TranscriptPane
            activeView={activeView} setActiveView={setActiveView} timestampMode={timestampMode} setTimestampMode={setTimestampMode}
            segments={segments} speakers={speakers} isActive={isActive} onSeek={seek}
            onSegmentChange={onSegmentChange} onSplit={onSplit} onMerge={onMerge}
            onAccept={acceptChange} onReject={rejectChange} onAcceptAll={acceptAll} onRejectAll={rejectAll}
            searchOpen={searchOpen} setSearchOpen={setSearchOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            matchCount={matchCount} currentMatch={currentMatch} onPrevMatch={onPrevMatch} onNextMatch={onNextMatch}
            matchSegIndex={searchMatches} currentMatchSegIndex={currentMatchSegIndex} refreshKey={refreshKey}
          />
        </main>

        <aside className={`${rightOpen ? "absolute inset-y-0 right-0 z-30 shadow-xl" : "hidden"} lg:relative lg:flex lg:shadow-none w-80 bg-card flex-col overflow-auto border-l`}>
          <CleanupPanel options={cleanupOptions} setOptions={setCleanupOptions} onClean={clean} cleaning={cleaning} changesCount={changesCount} hasClean={hasClean}
            onViewChanges={() => setActiveView("compare")} onAcceptAll={acceptAll} onRejectAll={rejectAll} onExport={() => setShowExport(true)} />
          {rightOpen && (
            <Button variant="secondary" size="icon" className="lg:hidden absolute top-2 left-2 h-7 w-7 rounded-full" onClick={() => setRightOpen(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </aside>
      </div>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        project={project}
        transcript={transcript}
        onReportGenerated={(report) => setTranscript((t) => (t ? { ...t, report_text: report } : t))}
      />
      <VersionHistory open={showVersions} onClose={() => setShowVersions(false)} project={project} onRestore={restoreVersion} />
    </div>
  );
}