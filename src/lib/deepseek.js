export async function callDeepSeek(messages, { temperature = 0.2, jsonMode = false } = {}) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API key not configured. Add VITE_DEEPSEEK_API_KEY to .env.");
  const baseUrl = (import.meta.env.VITE_DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = import.meta.env.VITE_DEEPSEEK_MODEL || "deepseek-chat";

  const body = { model, messages, temperature };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API error (${res.status}): ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export function safeParseJson(content) {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}
