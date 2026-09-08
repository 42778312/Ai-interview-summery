import { supabase } from "@/lib/supabaseClient";
import { transcribeWithDeepgram } from "@/lib/deepgram";
import { callDeepSeek, safeParseJson } from "@/lib/deepseek";
import {
  normalizeDeepgram,
  speakerLabel,
  chunkSegments,
  defaultCleanupOptions,
  buildCleanupPrompt,
  AI_EDIT_GUIDES,
} from "@/lib/transcriptAi";

// Everything here used to run as a Supabase Edge Function (server-side, with
// the API keys kept out of the browser). By request, it now runs entirely in
// the client, reading DEEPGRAM/DEEPSEEK keys straight from Vite env vars —
// which means those keys ship inside the browser bundle.

export const transcriptService = {
  async getByProject(projectId) {
    const { data, error } = await supabase.from("transcripts").select("*").eq("project_id", projectId);
    if (error) throw error;
    return data;
  },
  async update(id, data) {
    const { data: updated, error } = await supabase.from("transcripts").update(data).eq("id", id).select().single();
    if (error) throw error;
    return updated;
  },

  async transcribe({ file_uri, title, language }) {
    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert({
        title: title || "Untitled Interview",
        audio_file_uri: file_uri,
        language: language || "en",
        status: "TRANSCRIBING",
        processing_stage: "Preparing transcription",
        speakers: [],
        chapters: [],
        changes_count: 0,
      })
      .select()
      .single();
    if (createError) throw createError;

    try {
      await supabase.from("projects").update({ processing_stage: "Uploading audio to transcription engine" }).eq("id", project.id);

      const { data: signedUrlData, error: signError } = await supabase.storage
        .from("audio-files")
        .createSignedUrl(file_uri, 600);
      if (signError) throw signError;

      const audioRes = await fetch(signedUrlData.signedUrl);
      if (!audioRes.ok) throw new Error("Failed to read audio file from storage.");
      const audioBlob = await audioRes.blob();
      const contentType = audioRes.headers.get("content-type") || "audio/mpeg";

      await supabase.from("projects").update({ processing_stage: "Transcribing with Deepgram" }).eq("id", project.id);
      const dgResponse = await transcribeWithDeepgram(audioBlob, contentType, language || "en");

      await supabase.from("projects").update({ processing_stage: "Processing transcript" }).eq("id", project.id);
      const { segments, speakers, rawText, duration, compactResponse } = normalizeDeepgram(dgResponse);
      if (!segments.length) throw new Error("Deepgram returned no transcript segments.");

      const { data: transcript, error: transcriptError } = await supabase
        .from("transcripts")
        .insert({
          project_id: project.id,
          raw_text: rawText,
          segments,
          deepgram_response: compactResponse,
        })
        .select()
        .single();
      if (transcriptError) throw transcriptError;

      await supabase.from("transcript_versions").insert({
        project_id: project.id,
        version_type: "RAW",
        content: rawText,
        label: "Original Deepgram Transcript",
      });

      await supabase
        .from("projects")
        .update({ status: "TRANSCRIBED", processing_stage: "Ready to review", speakers, duration })
        .eq("id", project.id);

      return { data: { project_id: project.id, transcript_id: transcript.id, segments, speakers, duration } };
    } catch (err) {
      await supabase.from("projects").update({ status: "ERROR", processing_stage: "Transcription failed" }).eq("id", project.id);
      throw err;
    }
  },

  async clean({ project_id, options }) {
    const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", project_id).single();
    if (projectError) throw new Error("Project not found");

    const { data: transcripts, error: transcriptsError } = await supabase.from("transcripts").select("*").eq("project_id", project_id);
    if (transcriptsError) throw transcriptsError;
    if (!transcripts.length) throw new Error("Transcript not found");
    const transcript = transcripts[0];

    const opts = { ...defaultCleanupOptions(), ...(options || {}) };
    await supabase.from("projects").update({ status: "CLEANING", processing_stage: "Cleaning with DeepSeek", cleanup_options: opts }).eq("id", project_id);

    try {
      const segments = transcript.segments || [];
      const speakers = project.speakers || [];
      const chunks = chunkSegments(segments, 6000);
      const allResults = [];

      for (const chunk of chunks) {
        const prompt = buildCleanupPrompt(chunk, opts, speakers);
        const raw = await callDeepSeek(prompt.messages, { jsonMode: true, temperature: 0.2 });
        const parsed = safeParseJson(raw);
        if (parsed?.segments) allResults.push(...parsed.segments);
      }

      let changesCount = 0;
      const updatedSegments = segments.map((seg) => {
        const result = allResults.find((r) => r.segment_id === seg.id);
        if (result) {
          const cleanText = (result.clean_text || seg.raw_text).trim();
          const changes = Array.isArray(result.changes) ? result.changes : [];
          changesCount += changes.length;
          return { ...seg, clean_text: cleanText, current_text: cleanText, changes };
        }
        return { ...seg, clean_text: seg.raw_text, current_text: seg.raw_text, changes: [] };
      });

      const cleanText = updatedSegments.map((s) => `${speakerLabel(speakers, s)}: ${s.clean_text}`).join("\n\n");

      await supabase.from("transcripts").update({ clean_text: cleanText, segments: updatedSegments, cleanup_options: opts }).eq("id", transcript.id);

      const changeRecords = [];
      updatedSegments.forEach((seg) => {
        (seg.changes || []).forEach((ch) => {
          changeRecords.push({
            project_id,
            transcript_id: transcript.id,
            segment_id: seg.id,
            original_text: ch.original || "",
            new_text: ch.new || "",
            change_type: ch.type || "edit",
            reason: ch.reason || "",
            accepted: true,
          });
        });
      });
      if (changeRecords.length) {
        const { error: changesError } = await supabase.from("ai_changes").insert(changeRecords);
        if (changesError) throw changesError;
      }

      await supabase.from("transcript_versions").insert({
        project_id, version_type: "CLEAN", content: cleanText, label: "DeepSeek Cleaned Transcript",
      });

      await supabase.from("projects").update({ status: "CLEANED", processing_stage: "Cleanup complete", changes_count: changesCount }).eq("id", project_id);

      return { data: { success: true, changes_count: changesCount, segments: updatedSegments, clean_text: cleanText } };
    } catch (err) {
      await supabase.from("projects").update({ status: "ERROR", processing_stage: "Cleanup failed" }).eq("id", project_id);
      throw err;
    }
  },

  async generateChapters({ project_id }) {
    const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", project_id).single();
    if (projectError) throw new Error("Project not found");

    const { data: transcripts, error: transcriptsError } = await supabase.from("transcripts").select("*").eq("project_id", project_id);
    if (transcriptsError) throw transcriptsError;
    if (!transcripts.length) throw new Error("Transcript not found");
    const transcript = transcripts[0];

    const segments = transcript.segments || [];

    const system = `You are an expert interview analyst. Analyze the transcript and identify logical chapters/sections. Return ONLY JSON: {"chapters":[{"title":"...","start_time":0,"end_time":0}]}.
start_time and end_time are in seconds, derived from the transcript timing. Cover the whole interview in order. Use clear, descriptive chapter titles. Do not modify transcript content.`;

    const userMsg = `Transcript segments (with start/end times in seconds):\n${JSON.stringify(segments.map((s) => ({ speaker: s.speaker_index, start: s.start_time, end: s.end_time, text: (s.current_text || s.raw_text).slice(0, 200) })), null, 2)}`;

    const raw = await callDeepSeek(
      [{ role: "system", content: system }, { role: "user", content: userMsg }],
      { jsonMode: true, temperature: 0.3 }
    );
    const parsed = safeParseJson(raw);
    let chapters = Array.isArray(parsed?.chapters) ? parsed.chapters : [];
    chapters = chapters.map((c, i) => ({
      id: `ch_${Date.now()}_${i}`,
      title: c.title || `Chapter ${i + 1}`,
      start_time: Number(c.start_time) || 0,
      end_time: Number(c.end_time) || 0,
    }));

    await supabase.from("projects").update({ chapters }).eq("id", project_id);

    return { data: { success: true, chapters } };
  },

  async aiEdit({ text, action, context }) {
    if (!text) throw new Error("Text selection is required");
    if (!action) throw new Error("Action is required");

    const system = `You are a professional transcript editor. ${AI_EDIT_GUIDES[action] || AI_EDIT_GUIDES.clean}
Return only the resulting text (no explanations), unless the action is 'note'.`;
    const userMsg = context
      ? `Context (surrounding transcript):\n${context}\n\nText to edit:\n${text}`
      : `Text to edit:\n${text}`;

    const result = await callDeepSeek(
      [{ role: "system", content: system }, { role: "user", content: userMsg }],
      { temperature: 0.2 }
    );

    return { data: { success: true, result: result.trim() } };
  },

  async versions(projectId) {
    const { data, error } = await supabase
      .from("transcript_versions")
      .select("*")
      .eq("project_id", projectId)
      .order("created_date", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  async createVersion(data) {
    const { data: created, error } = await supabase.from("transcript_versions").insert(data).select().single();
    if (error) throw error;
    return created;
  },
  async changes(projectId) {
    const { data, error } = await supabase
      .from("ai_changes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_date", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  },
};
