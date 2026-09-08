export function formatTime(seconds) {
  if (seconds == null || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatDuration(seconds) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

export function speakerName(speakers, seg) {
  const sp = speakers.find((s) => s.deepgram_speaker_id === seg.speaker_index || s.id === seg.speaker_id);
  return sp?.name || `Speaker ${seg.speaker_index}`;
}

export function buildText(segments, speakers, field = "current_text") {
  return segments
    .map((s) => `${speakerName(speakers, s)}: ${s[field] || s.raw_text}`)
    .join("\n\n");
}

export function statusColor(status) {
  const map = {
    UPLOADING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    TRANSCRIBING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    TRANSCRIBED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    CLEANING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    CLEANED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    EDITING: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
    READY: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    EXPORTED: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
    ERROR: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
  };
  return map[status] || "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400";
}

export function statusLabel(status) {
  const map = {
    UPLOADING: "Uploading",
    TRANSCRIBING: "Transcribing",
    TRANSCRIBED: "Transcribed",
    CLEANING: "Cleaning",
    CLEANED: "Cleaned",
    EDITING: "Editing",
    READY: "Ready",
    EXPORTED: "Exported",
    ERROR: "Error"
  };
  return map[status] || status;
}

// Simple word-level diff for compare view highlighting.
export function diffWords(original, edited) {
  const a = (original || "").split(/(\s+)/);
  const b = (edited || "").split(/(\s+)/);
  const rows = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ type: "equal", value: a[i] });
      i++; j++;
    } else if (i < a.length && j < b.length && a[i].trim() && b[j].trim() && a[i].toLowerCase() === b[j].toLowerCase()) {
      rows.push({ type: "changed", value: b[j], original: a[i] });
      i++; j++;
    } else {
      if (j < b.length && (i >= a.length || a[i] !== b[j])) {
        if (i < a.length && a[i] === b[j]) { rows.push({ type: "equal", value: a[i] }); i++; j++; continue; }
        rows.push({ type: "added", value: b[j] });
        j++;
      } else if (i < a.length) {
        rows.push({ type: "removed", value: a[i] });
        i++;
      }
    }
  }
  return rows;
}