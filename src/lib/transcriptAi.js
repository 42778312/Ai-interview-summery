// Provider-independent transcript normalization + prompt-building. Ported
// verbatim from the original base44/shared/transcript.ts (Deepgram is the
// only provider wired up).

export function normalizeDeepgram(dgResponse) {
  const results = dgResponse?.results || {};
  const utterances = results.utterances;
  let segments = [];
  let speakers = [];

  if (utterances && utterances.length) {
    const speakerSet = new Set();
    utterances.forEach((u, i) => {
      speakerSet.add(u.speaker ?? 0);
      segments.push({
        id: `seg_${String(i + 1).padStart(3, "0")}`,
        speaker_index: u.speaker ?? 0,
        speaker_id: `spk_${u.speaker ?? 0}`,
        start_time: u.start ?? 0,
        end_time: u.end ?? 0,
        raw_text: (u.transcript || "").trim(),
        clean_text: "",
        current_text: (u.transcript || "").trim(),
        confidence: u.confidence ?? null,
        order_index: i,
        changes: []
      });
    });
    speakers = [...speakerSet].sort((a, b) => a - b).map((s) => ({
      id: `spk_${s}`,
      name: `Speaker ${s}`,
      role: s === 0 ? "Interviewer" : (s === 1 ? "Interviewee" : ""),
      deepgram_speaker_id: s
    }));
  } else {
    const alt = results.channels?.[0]?.alternatives?.[0];
    if (alt) {
      segments.push({
        id: "seg_001",
        speaker_index: 0,
        speaker_id: "spk_0",
        start_time: 0,
        end_time: dgResponse?.duration || 0,
        raw_text: (alt.transcript || "").trim(),
        clean_text: "",
        current_text: (alt.transcript || "").trim(),
        confidence: alt.confidence ?? null,
        order_index: 0,
        changes: []
      });
      speakers = [{ id: "spk_0", name: "Speaker 0", role: "Interviewer", deepgram_speaker_id: 0 }];
    }
  }

  const rawText = segments
    .map((s) => `${speakerLabel(speakers, s)}: ${s.raw_text}`)
    .join("\n\n");

  const duration = dgResponse?.duration || (segments.length ? segments[segments.length - 1].end_time : 0);

  const compactResponse = {
    model: dgResponse?.model || null,
    duration,
    utterances: utterances ? utterances.map((u) => ({
      speaker: u.speaker, start: u.start, end: u.end, transcript: u.transcript, confidence: u.confidence
    })) : null
  };

  return { segments, speakers, rawText, duration, compactResponse };
}

export function speakerLabel(speakers, seg) {
  const sp = speakers.find((s) => s.deepgram_speaker_id === seg.speaker_index || s.id === seg.speaker_id);
  return sp?.name || `Speaker ${seg.speaker_index}`;
}

export function chunkSegments(segments, maxChars = 6000) {
  const chunks = [];
  let current = [];
  let charCount = 0;
  for (const seg of segments) {
    const segLen = (seg.raw_text || "").length;
    if (current.length && charCount + segLen > maxChars) {
      chunks.push(current);
      current = [];
      charCount = 0;
    }
    current.push(seg);
    charCount += segLen;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function defaultCleanupOptions() {
  return {
    remove_fillers: true,
    remove_repetition: true,
    remove_false_starts: true,
    fix_punctuation: true,
    fix_transcription_errors: true,
    remove_sound_markers: true,
    improve_paragraphs: true,
    strength: "balanced",
    environmental_sounds: "remove_non_meaningful"
  };
}

export function buildCleanupPrompt(chunk, options, speakers) {
  const strengthGuide = {
    conservative: "Make only the safest, most obvious corrections. Preserve the speaker's exact wording as much as possible.",
    balanced: "Improve readability while preserving the speaker's original meaning, personality, and voice.",
    aggressive: "Clean more aggressively for readability, but never change factual meaning or invent information."
  };
  const strength = options.strength || "balanced";

  const segJson = chunk.map((s) => ({
    segment_id: s.id,
    speaker: speakerLabel(speakers, s),
    raw_text: s.raw_text
  }));

  const enabled = [];
  if (options.remove_fillers) enabled.push("Remove meaningless filler words (um, uh, ah, mmm, like when meaningless).");
  if (options.remove_repetition) enabled.push("Remove excessive accidental repetition of words.");
  if (options.remove_false_starts) enabled.push("Remove false starts and meaningless fragments.");
  if (options.fix_punctuation) enabled.push("Fix punctuation and capitalization.");
  if (options.fix_transcription_errors) enabled.push("Fix obvious transcription mistakes and duplicated words.");
  if (options.remove_sound_markers) enabled.push("Remove non-meaningful environmental sound markers (e.g. [background noise], [coughing]). Keep meaningful sounds like [laughter] only if they convey emotion.");
  if (options.improve_paragraphs) enabled.push("Improve paragraph structure where it aids readability.");

  const system = `You are a professional transcript editor. Perform CLEAN VERBATIM editing — not summarization or rewriting. ${strengthGuide[strength]}

Rules:
- KEEP meaningful statements, meaningful repetition, important corrections, uncertainty, the speaker's personality and natural voice, technical terminology, names, numbers, quotes, and meaningful emotional expressions.
- NEVER invent information, add facts, summarize, change meaning, change factual statements, substantially rewrite the speaker, or remove meaningful uncertainty.
${enabled.map((e) => `- ${e}`).join("\n")}

Return ONLY JSON in this exact shape:
{"segments":[{"segment_id":"seg_001","clean_text":"...","changes":[{"type":"deletion|insertion|substitution|punctuation","original":"...","new":"...","reason":"..."}]}]}
The clean_text must be the full cleaned text for that segment. List every individual change in the changes array. If no change, return an empty changes array.`;

  const user = `Clean these transcript segments:\n${JSON.stringify(segJson, null, 2)}`;

  return { messages: [{ role: "system", content: system }, { role: "user", content: user }] };
}

export function buildAcademicReportPrompt(transcriptText, meta = {}) {
  const { title, interviewee, interviewer } = meta;

  const system = `You are an experienced academic researcher who writes formal, university-level qualitative research reports based on interview transcripts.

You will be given the full transcript of an interview (a series of questions and answers). Transform it into a formal academic report analyzing the interview's content — this is a qualitative analysis of interview data, not a transcript reproduction and not a casual summary.

REQUIREMENTS:
- Length: the report body MUST be more than 2000 words (excluding the title). Aim for 2200-2800 words so you comfortably clear the minimum. This is a hard requirement — do not stop early.
- Tone: formal, academic, third-person, analytical. Avoid conversational language, contractions, and first-person commentary.
- Grounding: base every claim strictly on what is present in or reasonably inferable from the transcript. Never invent facts, statistics, sources, or quotes that are not in the transcript.
- Structure the report with clear Markdown headings, in this order:
  # <A descriptive academic title for the report>
  ## Abstract
  (150-200 words summarizing the purpose, approach, and key findings)
  ## Introduction
  (context and purpose of the interview, who was involved if known, objectives of this analysis)
  ## Methodology
  (briefly state that this report is a qualitative thematic analysis of a single semi-structured interview; note the inherent limitations of single-source qualitative data)
  ## Thematic Findings
  (identify 3-6 coherent themes across the interview; use a "### Theme name" subheading for each; synthesize and interpret what was said in each theme rather than just quoting — paraphrase primarily, and use short direct quotations sparingly, clearly introduced, e.g. As the interviewee explained, "...")
  ## Discussion
  (interpret the findings collectively, connect themes to broader implications, note any tensions, contradictions, or notable emphases)
  ## Conclusion
  (summarize key insights and, if appropriate, suggest areas for further inquiry)
- Return ONLY the report text in Markdown, starting with the "# " title line. No preamble, no commentary, no meta-notes about the task.`;

  const metaLines = [];
  if (title) metaLines.push(`Interview title: ${title}`);
  if (interviewee) metaLines.push(`Interviewee: ${interviewee}`);
  if (interviewer) metaLines.push(`Interviewer: ${interviewer}`);
  const metaBlock = metaLines.length ? `${metaLines.join("\n")}\n\n` : "";

  const user = `${metaBlock}Interview transcript:\n\n${transcriptText}`;

  return { messages: [{ role: "system", content: system }, { role: "user", content: user }] };
}

export function buildReportExpansionPrompt(priorMessages, currentWordCount) {
  return [
    ...priorMessages,
    {
      role: "user",
      content: `The report so far is only about ${currentWordCount} words, and it must be more than 2000. Continue the report directly from where it left off — add further thematic elaboration, discussion, and analysis grounded in the transcript — until the total exceeds 2000 words. Do not repeat earlier content, do not restart the title or headings already covered, and do not add any commentary about this instruction. Continue in the same Markdown style.`
    }
  ];
}

export function countWords(text) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export const AI_EDIT_GUIDES = {
  clean: "Clean verbatim: remove filler words, false starts, and meaningless repetition while preserving meaning and the speaker's voice. Do not summarize.",
  grammar: "Fix grammar, punctuation, and obvious spelling/transcription errors without changing meaning.",
  shorten: "Shorten the text for conciseness while keeping all key meaning. Do not remove important information.",
  clarify: "Clarify the text for readability while preserving the original meaning and tone.",
  note: "Add a brief editorial note about this passage. Return the note prefixed with 'NOTE: '."
};
