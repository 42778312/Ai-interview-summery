import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileAudio, X, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { transcriptService } from "@/services/transcriptService";
import ProcessingView from "@/components/workspace/ProcessingView";
import { formatDuration } from "@/lib/transcriptUtils";

const ACCEPTED = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/aac", "audio/m4a", "audio/x-m4a", "audio/mp4", "audio/ogg", "audio/webm"];

// Supabase Storage rejects object keys with curly quotes, parentheses, and
// other non-ASCII/unsafe characters ("Invalid key") — sanitize the original
// filename down to a safe character set before using it as a storage path.
function sanitizeFileName(name) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  // NFKD decomposes accented letters into base letter + combining mark; the
  // next replace strips the combining marks along with every other non-safe
  // character in one pass.
  const safeBase = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "");
  return (safeBase || "audio") + safeExt;
}

export default function NewInterview() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  function pickFile(f) {
    setError(null);
    setFile(f);
  }

  async function startTranscription() {
    if (!file) return;
    setError(null);
    setProcessing(true);
    setStage(0);
    const timers = [];
    timers.push(setTimeout(() => setStage(1), 600));
    timers.push(setTimeout(() => setStage(2), 1400));
    timers.push(setTimeout(() => setStage(3), 2600));
    try {
      const path = `${Date.now()}_${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from("audio-files").upload(path, file);
      if (uploadError) throw uploadError;
      setStage(1);
      const res = await transcriptService.transcribe({
        file_uri: path,
        title: file.name.replace(/\.[^.]+$/, ""),
        language: "en"
      });
      timers.forEach(clearTimeout);
      setStage(4);
      const projectId = res.data?.project_id;
      setTimeout(() => navigate(`/workspace/${projectId}`), 500);
    } catch (err) {
      timers.forEach(clearTimeout);
      setError(err?.message || "We couldn't transcribe this recording. Please try again.");
      setProcessing(false);
    }
  }

  if (processing) {
    return <ProcessingView stage={stage} error={error} onRetry={startTranscription} fileName={file?.name} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-16">
        <Button variant="ghost" size="sm" className="mb-8 -ml-3 text-muted-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <h1 className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mb-2">New Interview</h1>
        <p className="text-muted-foreground mb-10">Upload an audio recording to transcribe and edit.</p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
        >
          <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files[0] && pickFile(e.target.files[0])} />
          <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-5">
            <UploadCloud className="w-7 h-7 text-primary/70" />
          </div>
          <p className="font-medium text-lg">Drop your interview recording here</p>
          <p className="text-muted-foreground mt-1">or browse files</p>
          <p className="text-xs text-muted-foreground/70 mt-4">MP3 · M4A · WAV · AAC</p>
        </div>

        {file && (
          <Card className="mt-6 p-5 shadow-none flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
              <FileAudio className="w-5 h-5 text-primary/70" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{file.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5 flex gap-3">
                <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>{file.type || "audio"}</span>
                <span>Ready to upload</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setFile(null)}><X className="w-4 h-4" /></Button>
          </Card>
        )}

        {error && (
          <div className="mt-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
            {error}
            <Button variant="link" className="h-auto p-0 ml-3 text-destructive" onClick={startTranscription}>Retry</Button>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="text-foreground font-medium">Language:</span> English
          </div>
          <Button size="lg" className="rounded-full" disabled={!file} onClick={startTranscription}>
            {file ? "Transcribe Interview" : "Select a file"}
          </Button>
        </div>
      </div>
    </div>
  );
}