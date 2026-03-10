const LANG_NAMES: Record<string, string> = {
  cs: 'Czech',
  sk: 'Slovak',
  en: 'English',
}

function buildPrompt(
  label: string,
  quiz_question: string,
  quiz_options: string[],
  quiz_correct: string,
  fun_fact: string,
  source_lang: string,
  target_lang: string,
): string {
  return `You are translating an educational quiz card about "${label}" from ${LANG_NAMES[source_lang] ?? source_lang} to ${LANG_NAMES[target_lang] ?? target_lang}.

Source content:
- question: "${quiz_question}"
- options: ${JSON.stringify(quiz_options)}
- correct: "${quiz_correct}"
- fun_fact: "${fun_fact}"

Translate ALL fields to ${LANG_NAMES[target_lang] ?? target_lang}. Keep the same meaning. The correct answer in the translation must correspond to the translated version of "${quiz_correct}".

Return JSON only (no other text):
{
  "quiz_question": "...",
  "quiz_options": ["...", "...", "...", "..."],
  "quiz_correct": "...",
  "fun_fact": "..."
}

Rules:
- Translate ALL text to ${LANG_NAMES[target_lang] ?? target_lang} only
- quiz_correct must be one of the items in quiz_options (exact match)
- Keep all 4 options`
}

function parseResult(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  return JSON.parse(jsonMatch[0])
}

async function getAiSettings(supabaseUrl: string, serviceKey: string): Promise<{ primary: 'claude' | 'gemini'; fallback: boolean }> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/admin_settings?key=eq.ai_provider&select=value`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    })
    const data = await res.json()
    return data?.[0]?.value ?? { primary: 'claude', fallback: true }
  } catch {
    return { primary: 'claude', fallback: true }
  }
}

async function callClaude(prompt: string, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!response.ok) throw new Error(`Claude error: ${response.status}`)
  const data = await response.json()
  return parseResult(data.content[0].text.trim())
}

async function callGemini(prompt: string, apiKey: string, retries = 3): Promise<ReturnType<typeof parseResult>> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 512 } }),
    }
  )
  if (response.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 10000))
    return callGemini(prompt, apiKey, retries - 1)
  }
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Gemini response')
  return parseResult(text.trim())
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { source_lang, target_lang } = body

    if (!source_lang || !target_lang) {
      return new Response(JSON.stringify({ error: 'Missing source_lang or target_lang' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Text-only mode (for translating deck title)
    if (body.mode === 'text' && body.text) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const claudeKey   = Deno.env.get('ANTHROPIC_API_KEY')
      const geminiKey   = Deno.env.get('GEMINI_API_KEY')
      const aiSettings  = await getAiSettings(supabaseUrl, serviceKey)
      const textPrompt  = `Translate this text from ${LANG_NAMES[source_lang] ?? source_lang} to ${LANG_NAMES[target_lang] ?? target_lang}. Return only the translated text, nothing else:\n\n"${body.text}"`
      const primaryKey  = aiSettings.primary === 'claude' ? claudeKey : geminiKey
      const primaryCall = aiSettings.primary === 'claude'
        ? (k: string) => callClaude(textPrompt, k)
        : (k: string) => callGemini(textPrompt, k)
      const fallbackProvider = aiSettings.primary === 'claude' ? 'gemini' : 'claude'
      const fallbackKey  = fallbackProvider === 'claude' ? claudeKey : geminiKey
      const fallbackCall = fallbackProvider === 'claude'
        ? (k: string) => callClaude(textPrompt, k)
        : (k: string) => callGemini(textPrompt, k)
      let translated: { quiz_question?: string } | string
      if (primaryKey) {
        try { translated = await primaryCall(primaryKey) }
        catch (e) {
          if (!aiSettings.fallback || !fallbackKey) throw e
          translated = await fallbackCall(fallbackKey)
        }
      } else if (aiSettings.fallback && fallbackKey) {
        translated = await fallbackCall(fallbackKey)
      } else throw new Error('No AI provider configured')
      // For text mode, AI returns JSON with quiz_question field or raw text — extract plain text
      const translatedText = typeof translated === 'string'
        ? translated
        : (translated as { quiz_question?: string }).quiz_question ?? body.text
      return new Response(JSON.stringify({ text: translatedText.replace(/^"|"$/g, '') }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { label, quiz_question, quiz_options, quiz_correct, fun_fact } = body

    if (!quiz_question || !quiz_options || !quiz_correct) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const claudeKey   = Deno.env.get('ANTHROPIC_API_KEY')
    const geminiKey   = Deno.env.get('GEMINI_API_KEY')
    const aiSettings  = await getAiSettings(supabaseUrl, serviceKey)

    const prompt = buildPrompt(label ?? '', quiz_question, quiz_options, quiz_correct, fun_fact ?? '', source_lang, target_lang)

    const primaryKey  = aiSettings.primary === 'claude' ? claudeKey : geminiKey
    const primaryCall = aiSettings.primary === 'claude'
      ? (k: string) => callClaude(prompt, k)
      : (k: string) => callGemini(prompt, k)
    const fallbackProvider = aiSettings.primary === 'claude' ? 'gemini' : 'claude'
    const fallbackKey  = fallbackProvider === 'claude' ? claudeKey : geminiKey
    const fallbackCall = fallbackProvider === 'claude'
      ? (k: string) => callClaude(prompt, k)
      : (k: string) => callGemini(prompt, k)

    let result
    if (primaryKey) {
      try {
        result = await primaryCall(primaryKey)
      } catch (e) {
        if (!aiSettings.fallback || !fallbackKey) throw e
        result = await fallbackCall(fallbackKey)
      }
    } else if (aiSettings.fallback && fallbackKey) {
      result = await fallbackCall(fallbackKey)
    } else {
      throw new Error('No AI provider configured')
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
