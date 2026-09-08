export async function transcribeWithDeepgram(audioBlob, contentType, language = "en") {
  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("Deepgram API key not configured. Add VITE_DEEPGRAM_API_KEY to .env.");

  const url = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&utterances=true&punctuate=true&language=" + language;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Token ${apiKey}`, "Content-Type": contentType },
    body: audioBlob
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Deepgram transcription failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  return res.json();
}
