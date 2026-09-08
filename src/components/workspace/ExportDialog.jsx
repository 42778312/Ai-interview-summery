import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, FileType2, FileCode, Copy, Check, GraduationCap, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatTime, speakerName } from "@/lib/transcriptUtils";
import {
  exportDocx, exportPdf, exportTxt, exportMarkdown, copyToClipboard,
  exportReportDocx, exportReportPdf, exportReportTxt, exportReportMarkdown, copyReportToClipboard,
} from "@/lib/exportUtils";
import { transcriptService } from "@/services/transcriptService";

const FORMATS = [
  { key: "professional", label: "Professional" },
  { key: "academic", label: "Academic" },
  { key: "simple", label: "Simple" }
];

export default function ExportDialog({ open, onClose, project, transcript, onReportGenerated }) {
  const [mode, setMode] = useState("transcript");
  const [reportText, setReportText] = useState(transcript?.report_text || "");
  const [generating, setGenerating] = useState(false);
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    setReportText(transcript?.report_text || "");
  }, [transcript?.report_text]);

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

  const runReport = async (fn) => { try { await fn({ project, reportText, settings }); } catch (e) { alert("Export failed: " + e.message); } };
  const doCopyReport = async () => { await runReport(copyReportToClipboard); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const generateReport = async () => {
    if (!project?.id) return;
    setGenerating(true);
    setReportError("");
    try {
      const res = await transcriptService.generateReport({ project_id: project.id });
      const report = res.data?.report || "";
      setReportText(report);
      if (res.data?.persisted) {
        onReportGenerated?.(report);
      } else {
        setReportError(
          `Report generated, but couldn't be saved (${res.data?.persistError || "unknown error"}). ` +
          `It's available below for this session — export it now, since reopening this dialog without saving will lose it.`
        );
      }
    } catch (e) {
      setReportError(e.message || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Document</DialogTitle>
          <DialogDescription>Configure and export your transcript as a professional document.</DialogDescription>
        </DialogHeader>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v)}
          className="grid grid-cols-2 gap-1.5 mb-1"
        >
          <ToggleGroupItem value="transcript" className="border gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <FileText className="w-3.5 h-3.5" /> Transcript
          </ToggleGroupItem>
          <ToggleGroupItem value="report" className="border gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <GraduationCap className="w-3.5 h-3.5" /> Academic Report
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="grid md:grid-cols-2 gap-6 overflow-auto pr-1">
          <div className="space-y-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Document information</Label>
              <div className="space-y-2">
                <Input value={settings.title} onChange={(e) => set("title", e.target.value)} placeholder="Document title" className="bg-muted/40 border-0" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={settings.interviewee} onChange={(e) => set("interviewee", e.target.value)} placeholder="Interviewee" className="bg-muted/40 border-0" />
                  <Input value={settings.interviewer} onChange={(e) => set("interviewer", e.target.value)} placeholder="Interviewer" className="bg-muted/40 border-0" />
                  <Input value={settings.date} onChange={(e) => set("date", e.target.value)} placeholder="Date" className="bg-muted/40 border-0" />
                  <Input value={settings.company} onChange={(e) => set("company", e.target.value)} placeholder="Company / Organization" className="bg-muted/40 border-0" />
                </div>
              </div>
            </div>

            {mode === "transcript" ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Formatting</Label>
                  <ToggleGroup
                    type="single"
                    value={settings.formatting}
                    onValueChange={(v) => v && set("formatting", v)}
                    className="grid grid-cols-3 gap-1.5"
                  >
                    {FORMATS.map((f) => (
                      <ToggleGroupItem key={f.key} value={f.key} className="text-xs border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                        {f.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
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
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Include</Label>
                  <div className="flex items-center gap-2.5">
                    <Checkbox id="inc-title_page" checked={!!settings.include.title_page} onCheckedChange={() => toggleInclude("title_page")} />
                    <Label htmlFor="inc-title_page" className="text-sm font-normal cursor-pointer">Title page</Label>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  DeepSeek analyzes the full interview and writes a formal, university-level academic report
                  (2000+ words) with an abstract, thematic findings, discussion, and conclusion — based only on
                  what was actually said in the interview.
                </div>

                {reportError && (
                  <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">{reportError}</div>
                )}

                <Button className="w-full rounded-full" onClick={generateReport} disabled={generating}>
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating report…</>
                  ) : reportText ? (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate report</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate academic report</>
                  )}
                </Button>

                {reportText && !generating && (
                  <div className="space-y-2 pt-2">
                    <Button className="w-full rounded-full" variant="outline" onClick={() => runReport(exportReportDocx)}><FileText className="w-4 h-4 mr-2" /> Export Word Document</Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => runReport(exportReportPdf)}><FileType2 className="w-3.5 h-3.5 mr-1.5" /> PDF</Button>
                      <Button variant="outline" size="sm" onClick={() => runReport(exportReportTxt)}><FileText className="w-3.5 h-3.5 mr-1.5" /> TXT</Button>
                      <Button variant="outline" size="sm" onClick={() => runReport(exportReportMarkdown)}><FileCode className="w-3.5 h-3.5 mr-1.5" /> Markdown</Button>
                      <Button variant="outline" size="sm" onClick={doCopyReport}>{copied ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-xl border bg-white p-6 overflow-auto max-h-[60vh] shadow-inner">
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide mb-3">Preview</div>
            {mode === "transcript" ? (
              <>
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
              </>
            ) : reportText ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{reportText}</div>
            ) : (
              <div className="text-sm text-muted-foreground italic py-12 text-center">
                No report yet — generate one to see a preview here.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}