import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileText, FileType2, FileCode, Copy, Check } from "lucide-react";
import { formatTime, speakerName } from "@/lib/transcriptUtils";
import { exportDocx, exportPdf, exportTxt, exportMarkdown, copyToClipboard } from "@/lib/exportUtils";

const FORMATS = [
  { key: "professional", label: "Professional" },
  { key: "academic", label: "Academic" },
  { key: "simple", label: "Simple" }
];

export default function ExportDialog({ open, onClose, project, transcript }) {
  const [settings, setSettings] = useState({
    title: project?.title || "Interview Transcript",
    interviewee: "",
    interviewer: "",
    date: "",
    company: "",
    formatting: "professional",
    include: { title_page: true, speaker_names: true, timestamps: false, chapter_headings: false, page_numbers: false }
  });
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setSettings({ ...settings, [k]: v });
  const toggleInclude = (k) => setSettings({ ...settings, include: { ...settings.include, [k]: !settings.include[k] } });

  const previewSegments = useMemo(() => (transcript?.segments || []).slice(0, 6), [transcript]);

  const run = async (fn) => { try { await fn({ project, transcript, settings }); } catch (e) { alert("Export failed: " + e.message); } };
  const doCopy = async () => { await run(copyToClipboard); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>Configure and export your transcript as a professional document.</DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 overflow-auto pr-1">
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Document information</Label>
              <div className="space-y-2">
                <input value={settings.title} onChange={(e) => set("title", e.target.value)} placeholder="Document title" className="w-full text-sm bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={settings.interviewee} onChange={(e) => set("interviewee", e.target.value)} placeholder="Interviewee" className="text-sm bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                  <input value={settings.interviewer} onChange={(e) => set("interviewer", e.target.value)} placeholder="Interviewer" className="text-sm bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                  <input value={settings.date} onChange={(e) => set("date", e.target.value)} placeholder="Date" className="text-sm bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                  <input value={settings.company} onChange={(e) => set("company", e.target.value)} placeholder="Company / Organization" className="text-sm bg-muted/40 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Formatting</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {FORMATS.map((f) => (
                  <button key={f.key} onClick={() => set("formatting", f.key)}
                    className={`text-xs py-1.5 rounded-lg border ${settings.formatting === f.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{f.label}</button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Include</Label>
              <div className="space-y-2">
                {[["title_page", "Title page"], ["speaker_names", "Speaker names"], ["timestamps", "Timestamps"], ["chapter_headings", "Chapter headings"], ["page_numbers", "Page numbers"]].map(([k, label]) => (
                  <div key={k} className="flex items-center gap-2.5">
                    <Checkbox id={`inc-${k}`} checked={!!settings.include[k]} onCheckedChange={() => toggleInclude(k)} />
                    <Label htmlFor={`inc-${k}`} className="text-sm font-normal cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button className="w-full rounded-full" onClick={() => run(exportDocx)}><FileText className="w-4 h-4 mr-2" /> Export Word Document</Button>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => run(exportPdf)}><FileType2 className="w-3.5 h-3.5 mr-1.5" /> PDF</Button>
                <Button variant="outline" size="sm" onClick={() => run(exportTxt)}><FileText className="w-3.5 h-3.5 mr-1.5" /> TXT</Button>
                <Button variant="outline" size="sm" onClick={() => run(exportMarkdown)}><FileCode className="w-3.5 h-3.5 mr-1.5" /> Markdown</Button>
                <Button variant="outline" size="sm" onClick={doCopy}>{copied ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 overflow-auto max-h-[60vh] shadow-inner">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Preview</div>
            {settings.include.title_page ? (
              <div className="text-center mb-6">
                <div className="font-heading text-xl font-semibold">{settings.title || "Interview Transcript"}</div>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  {settings.interviewee && <div>Interviewee: {settings.interviewee}</div>}
                  {settings.interviewer && <div>Interviewer: {settings.interviewer}</div>}
                  {settings.date && <div>Date: {settings.date}</div>}
                  {settings.company && <div>Organization: {settings.company}</div>}
                </div>
                <div className="border-t my-4" />
              </div>
            ) : (
              <div className="font-heading text-lg font-semibold mb-3">{settings.title || "Interview Transcript"}</div>
            )}
            {previewSegments.map((seg) => {
              const text = (seg.current_text || seg.clean_text || seg.raw_text || "").replace(/<[^>]+>/g, "");
              return (
                <div key={seg.id} className="mb-3 text-sm leading-relaxed">
                  {settings.include.timestamps && <span className="text-muted-foreground font-mono text-[11px]">[{formatTime(seg.start_time)}] </span>}
                  {settings.include.speaker_names && <span className="font-semibold">{speakerName(project?.speakers || [], seg)}: </span>}
                  {text}
                </div>
              );
            })}
            {previewSegments.length < (transcript?.segments?.length || 0) && (
              <div className="text-xs text-muted-foreground italic mt-4">… {(transcript?.segments?.length || 0) - previewSegments.length} more segments</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}