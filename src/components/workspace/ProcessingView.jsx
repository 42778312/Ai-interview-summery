import React from "react";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const STAGES = [
  "Uploading audio",
  "Preparing transcription",
  "Transcribing with Deepgram",
  "Processing transcript",
  "Ready to review"
];

export default function ProcessingView({ stage, error, onRetry, fileName }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h1 className="font-heading text-2xl font-semibold mb-1">Transcribing your interview</h1>
        <p className="text-muted-foreground text-sm mb-8 truncate">{fileName}</p>
        <div className="space-y-1">
          {STAGES.map((label, i) => {
            const state = i < stage ? "done" : i === stage && !error ? "active" : "waiting";
            return (
              <div key={label} className="flex items-center gap-3 py-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {state === "done" ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"><Check className="w-3.5 h-3.5" /></div>
                  ) : state === "active" ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-muted" />
                  )}
                </div>
                <span className={state === "done" ? "text-foreground" : state === "active" ? "text-foreground font-medium" : "text-muted-foreground"}>{label}</span>
              </div>
            );
          })}
        </div>
        {error && (
          <div className="mt-8 p-4 rounded-xl bg-destructive/10">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Retry</Button>
          </div>
        )}
      </div>
    </div>
  );
}