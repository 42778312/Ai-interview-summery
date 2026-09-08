import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/transcriptUtils";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ audioRef, audioUrl, duration, onTimeUpdate }) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const localRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current || localRef.current;
    if (!audio) return;
    const onTime = () => { setCurrentTime(audio.currentTime); onTimeUpdate?.(audio.currentTime); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => { setTotal(audio.duration || duration || 0); setLoading(false); };
    const onEnd = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
  }, [duration, onTimeUpdate]);

  useEffect(() => {
    const audio = audioRef.current || localRef.current;
    if (audio && audioUrl) { audio.src = audioUrl; audio.load(); }
  }, [audioUrl]);

  const audio = () => audioRef.current || localRef.current;
  const toggle = () => { const a = audio(); if (!a) return; playing ? a.pause() : a.play(); };
  const skip = (sec) => { const a = audio(); if (a) a.currentTime = Math.max(0, Math.min(total, a.currentTime + sec)); };
  const onSeek = (e) => { const a = audio(); if (a) a.currentTime = Number(e.target.value); };
  const changeRate = (r) => { setRate(r); const a = audio(); if (a) a.playbackRate = r; };
  const changeVol = (v) => { setVolume(v); setMuted(v === 0); const a = audio(); if (a) { a.volume = v; a.muted = false; } };
  const toggleMute = () => { const a = audio(); if (!a) return; const m = !muted; setMuted(m); a.muted = m; };

  return (
    <div className="flex items-center gap-3 md:gap-5 px-4 py-3 bg-card border-b">
      <audio ref={(el) => { audioRef.current = el; localRef.current = el; }} preload="metadata" />
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skip(-5)} title="Back 5s"><SkipBack className="w-4 h-4" /></Button>
        <Button size="icon" className="h-11 w-11 rounded-full" onClick={toggle} title="Play/Pause">
          {loading && playing ? <Loader2 className="w-5 h-5 animate-spin" /> : playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skip(5)} title="Forward 5s"><SkipForward className="w-4 h-4" /></Button>
      </div>

      <div className="flex-1 flex items-center gap-3 min-w-0">
        <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">{formatTime(currentTime)}</span>
        <input type="range" min={0} max={total || 1} step={0.1} value={currentTime}
          onChange={onSeek}
          className="flex-1 h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer" />
        <span className="text-xs tabular-nums text-muted-foreground w-16">{formatTime(total)}</span>
      </div>

      <div className="hidden md:flex items-center gap-2">
        <select value={rate} onChange={(e) => changeRate(Number(e.target.value))}
          className="text-xs bg-muted/60 rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer">
          {SPEEDS.map((s) => <option key={s} value={s}>{s}x</option>)}
        </select>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleMute}>
          {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
        <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
          onChange={(e) => changeVol(Number(e.target.value))}
          className="w-20 h-1.5 rounded-full appearance-none bg-muted accent-primary cursor-pointer" />
      </div>
    </div>
  );
}