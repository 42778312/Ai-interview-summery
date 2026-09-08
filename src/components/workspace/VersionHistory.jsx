import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Loader2 } from "lucide-react";
import { transcriptService } from "@/services/transcriptService";
import { formatDate } from "@/lib/transcriptUtils";

export default function VersionHistory({ open, onClose, project, onRestore }) {
  const [versions, setVersions] = useState(null);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (open && project) {
      transcriptService.versions(project.id).then(setVersions).catch(() => setVersions([]));
    }
  }, [open, project]);

  const builtIn = [
    { version_type: "RAW", label: "Original Deepgram Transcript", desc: "The exact transcription from Deepgram. Never overwritten." },
    { version_type: "CLEAN", label: "DeepSeek Cleaned Transcript", desc: "AI clean verbatim version derived from RAW." },
    { version_type: "CURRENT", label: "Current Working Version", desc: "Your accepted and manually edited version." }
  ];

  const manual = (versions || []).filter((v) => v.version_type === "MANUAL");

  const handleRestore = async (type) => {
    setRestoring(type);
    try { await onRestore(type); } finally { setRestoring(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Version History</DialogTitle>
          <DialogDescription>Restore any previous version. The original Deepgram transcript is never deleted.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {builtIn.map((v) => (
            <div key={v.version_type} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="min-w-0">
                <div className="text-sm font-medium">{v.label}</div>
                <div className="text-xs text-muted-foreground">{v.desc}</div>
              </div>
              {v.version_type !== "CURRENT" && (
                <Button variant="outline" size="sm" disabled={restoring === v.version_type} onClick={() => handleRestore(v.version_type)}>
                  {restoring === v.version_type ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />} Restore
                </Button>
              )}
            </div>
          ))}
          {manual.length > 0 && (
            <div className="pt-2">
              <div className="text-xs text-muted-foreground mb-2">Manual snapshots</div>
              {manual.map((v) => (
                <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{v.label || "Snapshot"}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(v.created_date)}</div>
                  </div>
                  <Button variant="outline" size="sm" disabled={restoring === v.id} onClick={() => handleRestore(v.id)}>
                    {restoring === v.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 mr-1.5" />} Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
          {versions === null && <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}