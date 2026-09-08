import { supabase } from "@/lib/supabaseClient";

export const projectService = {
  async list() {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("updated_date", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
  async get(id) {
    const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("projects")
      .update({ ...data, last_edited: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },
  async remove(id) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
  },
  rename(id, title) {
    return projectService.update(id, { title });
  },
  async duplicate(id) {
    const { data: p, error: getError } = await supabase.from("projects").select("*").eq("id", id).single();
    if (getError) throw getError;

    const { data: copy, error: createError } = await supabase
      .from("projects")
      .insert({
        title: `${p.title} (Copy)`,
        language: p.language || "en",
        status: "TRANSCRIBED",
        speakers: p.speakers || [],
        chapters: p.chapters || [],
        duration: p.duration || 0,
        changes_count: 0,
        processing_stage: "Ready to review",
      })
      .select()
      .single();
    if (createError) throw createError;

    const { data: transcripts, error: tError } = await supabase
      .from("transcripts")
      .select("*")
      .eq("project_id", id);
    if (tError) throw tError;

    if (transcripts.length) {
      const t = transcripts[0];
      const { error: insertTError } = await supabase.from("transcripts").insert({
        project_id: copy.id,
        raw_text: t.raw_text,
        clean_text: t.clean_text,
        current_text: t.current_text || t.clean_text || t.raw_text,
        segments: t.segments,
        deepgram_response: t.deepgram_response,
      });
      if (insertTError) throw insertTError;
    }
    return copy;
  },
};
