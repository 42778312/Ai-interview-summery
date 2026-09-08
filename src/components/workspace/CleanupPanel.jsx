import React from "react";
import { Sparkles, Loader2, Eye, CheckCheck, XCircle, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const OPTION_LABELS = [
  { key: "remove_fillers", label: "Remove filler words" },
  { key: "remove_repetition", label: "Remove meaningless repetition" },
  { key: "remove_false_starts", label: "Remove false starts" },
  { key: "fix_punctuation", label: "Fix punctuation" },
  { key: "fix_transcription_errors", label: "Fix obvious transcription errors" },
  { key: "remove_sound_markers", label: "Remove non-meaningful sound markers" },
  { key: "improve_paragraphs", label: "Improve paragraph structure" }
];

const STRENGTHS = [
  { key: "conservative", label: "Conservative" },
  { key: "balanced", label: "Balanced" },
  { key: "aggressive", label: "Aggressive" }
];

const SOUND_OPTIONS = [
  { key: "remove_non_meaningful", label: "Remove non-meaningful" },
  { key: "keep_meaningful", label: "Keep meaningful" },
  { key: "keep_all", label: "Keep all" }
];

export default function CleanupPanel({ options, setOptions, onClean, cleaning, changesCount, hasClean, onViewChanges, onAcceptAll, onRejectAll, onExport }) {
  const toggle = (key) => setOptions({ ...options, [key]: !options[key] });

  return (
    <div className="p-4 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">AI Cleanup</h3>
        </div>
        <p className="text-xs text-muted-foreground">Powered by DeepSeek</p>
      </div>

      <div className="space-y-2.5">
        {OPTION_LABELS.map((opt) => (
          <div key={opt.key} className="flex items-center gap-2.5">
            <Checkbox id={opt.key} checked={!!options[opt.key]} onCheckedChange={() => toggle(opt.key)} />
            <Label htmlFor={opt.key} className="text-sm font-normal cursor-pointer">{opt.label}</Label>
          </div>
        ))}
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Cleanup strength</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {STRENGTHS.map((s) => (
            <button key={s.key} onClick={() => setOptions({ ...options, strength: s.key })}
              className={`text-xs py-1.5 rounded-lg border transition-colors ${options.strength === s.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">DeepSeek will improve readability while preserving the speaker's original meaning, personality, and voice.</p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Environmental sounds</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {SOUND_OPTIONS.map((s) => (
            <button key={s.key} onClick={() => setOptions({ ...options, environmental_sounds: s.key })}
              className={`text-xs py-1.5 rounded-lg border transition-colors ${options.environmental_sounds === s.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <Button className="w-full rounded-full" disabled={cleaning} onClick={onClean}>
        {cleaning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cleaning…</> : <><Sparkles className="w-4 h-4 mr-2" /> Clean Transcript</>}
      </Button>

      {hasClean && (
        <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
          <p className="text-sm font-medium">{changesCount} changes made</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onViewChanges}><Eye className="w-3.5 h-3.5 mr-1.5" /> View Changes</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onAcceptAll}><CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Accept all</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={onRejectAll}><XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject all</Button>
          </div>
        </div>
      )}

      <div className="pt-3 border-t">
        <Button variant="outline" className="w-full rounded-full" onClick={onExport}><FileDown className="w-4 h-4 mr-2" /> Export Document</Button>
      </div>
    </div>
  );
}