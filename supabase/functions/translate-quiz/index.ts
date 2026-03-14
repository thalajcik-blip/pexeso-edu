const LANG_NAMES: Record<string, string> = {
  cs: 'Czech',
  sk: 'Slovak',
  en: 'English',
}

const LANG_ALPHABET_NOTE: Record<string, string> = {
  cs: 'Write in standard written Czech (spisovná čeština). ALWAYS use correct diacritics — háčky and čárky are mandatory. NEVER omit diacritics. NEVER invent or guess words — use only real Czech words that exist in standard Czech. NEVER mix Czech with Slovak or any other language.',
  sk: 'Write in standard written Slovak (spisovná slovenčina, Slovakia). ALWAYS use correct diacritics — háčky, dĺžne and mäkčene are mandatory. NEVER omit diacritics. NEVER invent or guess words — use only real Slovak words that exist in standard Slovak. NEVER mix Slovak with Czech or any other language. If you are unsure of the Slovak equivalent of a Czech word, use a different real Slovak word with the same meaning.',
  en: 'Use standard English only. NEVER invent words.',
}

const LANG_SYSTEM_NOTE: Record<string, string> = {
  cs: 'You are a professional Czech translator. You MUST write exclusively in standard written Czech (spisovná čeština) with full correct diacritics. NEVER omit háčky or čárky. NEVER invent words. If you do not know a word, use a synonym.',
  sk: 'You are a professional Slovak translator. You MUST write exclusively in standard written Slovak (spisovná slovenčina). NEVER omit diacritics. NEVER mix Czech and Slovak — they are different languages. NEVER invent or guess words by Slovakizing Czech words. If you are unsure of a Slovak word, use a real Slovak synonym instead.',
  en: 'You are a professional English translator. Use only real English words.',
}

type AnswerOption = { text: string; correct: boolean }

function buildPrompt(
  label: string,
  quiz_question: string,
  answers: AnswerOption[] | null,
  quiz_options: string[] | null,
  quiz_correct: string | null,
  fun_fact: string,
  source_lang: string,
  target_lang: string,
): string {
  // Normalize to answers format
  const normalizedAnswers: AnswerOption[] = answers && answers.length > 0
    ? answers
    : (quiz_options ?? []).map(o => ({ text: o, correct: o === quiz_correct }))

  const answerCount = normalizedAnswers.length
  const exampleAnswers = normalizedAnswers.map(a => `  {"text": "...", "correct": ${a.correct}}`).join(',\n')

  return `You are translating an educational quiz card from ${LANG_NAMES[source_lang] ?? source_lang} to ${LANG_NAMES[target_lang] ?? target_lang}.

Source content:
- label: "${label}"
- question: "${quiz_question}"
- answers (${answerCount} items): ${JSON.stringify(normalizedAnswers)}
- fun_fact: "${fun_fact}"

Translate ALL fields to ${LANG_NAMES[target_lang] ?? target_lang}. Keep the same meaning and keep correct:true/false flags unchanged.

Return JSON only (no other text), with EXACTLY ${answerCount} items in the answers array:
{
  "label": "...",
  "quiz_question": "...",
  "answers": [
${exampleAnswers}
  ],
  "fun_fact": "..."
}

Rules:
- Translate ALL text to ${LANG_NAMES[target_lang] ?? target_lang} only
- ${LANG_ALPHABET_NOTE[target_lang] ?? ''}
- answers array MUST have exactly ${answerCount} items — no more, no less
- correct:true/false flags must remain exactly as in the source`
}

function parseResult(text: string) {
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  try {
    return JSON.parse(stripped)
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Invalid AI response: ${text.slice(0, 300)}`)
    return JSON.parse(jsonMatch[0])
  }
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

async function callClaudeRaw(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 256, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!response.ok) throw new Error(`Claude error: ${response.status}`)
  const data = await response.json()
  return data.content[0].text.trim().replace(/^"|"$/g, '')
}

async function callGeminiRaw(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 256 } }),
    }
  )
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`)
  const data = await response.json()
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().replace(/^"|"$/g, '')
}

async function callClaude(prompt: string, apiKey: string, target_lang = 'cs') {
  const systemPrompt = LANG_SYSTEM_NOTE[target_lang] ?? 'You are a professional translator.'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages: [{ role: 'user', content: prompt }] }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Claude error: ${response.status}`)
    const data = await response.json()
    return parseResult(data.content[0].text.trim())
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(prompt: string, apiKey: string, target_lang = 'cs', retries = 3): Promise<ReturnType<typeof parseResult>> {
  const systemInstruction = LANG_SYSTEM_NOTE[target_lang] ?? 'You are a professional translator.'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, responseMimeType: 'application/json' } }),
        signal: controller.signal,
      }
    )
  } finally {
    clearTimeout(timeout)
  }
  if (response.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 10000))
    return callGemini(prompt, apiKey, target_lang, retries - 1)
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

    // Results config mode — translate tier titles and messages
    if (body.mode === 'results_config' && body.tiers) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const claudeKey   = Deno.env.get('ANTHROPIC_API_KEY')
      const geminiKey   = Deno.env.get('GEMINI_API_KEY')
      const aiSettings  = await getAiSettings(supabaseUrl, serviceKey)
      const alphabetNote = LANG_ALPHABET_NOTE[target_lang] ?? ''
      const tiersJson = JSON.stringify(body.tiers)
      const rcPrompt = `Translate the following quiz result tier texts from ${LANG_NAMES[source_lang] ?? source_lang} to ${LANG_NAMES[target_lang] ?? target_lang}. ${alphabetNote}
Each tier has a "title" and "messages" array. Translate all text fields. Return JSON only (same structure):
${tiersJson}`
      const primaryKey = aiSettings.primary === 'claude' ? claudeKey : geminiKey
      const primaryCall = aiSettings.primary === 'claude'
        ? (k: string) => callClaude(rcPrompt, k, target_lang)
        : (k: string) => callGemini(rcPrompt, k, target_lang)
      const fallbackProvider = aiSettings.primary === 'claude' ? 'gemini' : 'claude'
      const fallbackKey  = fallbackProvider === 'claude' ? claudeKey : geminiKey
      const fallbackCall = fallbackProvider === 'claude'
        ? (k: string) => callClaude(rcPrompt, k, target_lang)
        : (k: string) => callGemini(rcPrompt, k, target_lang)
      let rcResult
      if (primaryKey) {
        try { rcResult = await primaryCall(primaryKey) }
        catch (e) {
          if (!aiSettings.fallback || !fallbackKey) throw e
          rcResult = await fallbackCall(fallbackKey)
        }
      } else if (aiSettings.fallback && fallbackKey) {
        rcResult = await fallbackCall(fallbackKey)
      } else throw new Error('No AI provider configured')
      // rcResult is parsed JSON — ensure it's an array
      const tiers = Array.isArray(rcResult) ? rcResult : (rcResult?.tiers ?? rcResult)
      return new Response(JSON.stringify({ tiers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Text-only mode (for translating deck title)
    if (body.mode === 'text' && body.text) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const claudeKey   = Deno.env.get('ANTHROPIC_API_KEY')
      const geminiKey   = Deno.env.get('GEMINI_API_KEY')
      const aiSettings  = await getAiSettings(supabaseUrl, serviceKey)
      const alphabetNote = LANG_ALPHABET_NOTE[target_lang] ?? ''
      const textPrompt  = `Translate this text from ${LANG_NAMES[source_lang] ?? source_lang} to ${LANG_NAMES[target_lang] ?? target_lang}. ${alphabetNote} Return only the translated text, nothing else: ${body.text}`
      const primaryKey  = aiSettings.primary === 'claude' ? claudeKey : geminiKey
      const primaryRaw  = aiSettings.primary === 'claude' ? callClaudeRaw : callGeminiRaw
      const fallbackProvider = aiSettings.primary === 'claude' ? 'gemini' : 'claude'
      const fallbackKey  = fallbackProvider === 'claude' ? claudeKey : geminiKey
      const fallbackRaw  = fallbackProvider === 'claude' ? callClaudeRaw : callGeminiRaw
      let translatedText: string
      if (primaryKey) {
        try { translatedText = await primaryRaw(textPrompt, primaryKey) }
        catch (e) {
          if (!aiSettings.fallback || !fallbackKey) throw e
          translatedText = await fallbackRaw(textPrompt, fallbackKey)
        }
      } else if (aiSettings.fallback && fallbackKey) {
        translatedText = await fallbackRaw(textPrompt, fallbackKey)
      } else throw new Error('No AI provider configured')
      return new Response(JSON.stringify({ text: translatedText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { label, quiz_question, answers, quiz_options, quiz_correct, fun_fact } = body

    if (!quiz_question || (!answers?.length && !quiz_options?.length)) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const claudeKey   = Deno.env.get('ANTHROPIC_API_KEY')
    const geminiKey   = Deno.env.get('GEMINI_API_KEY')
    const aiSettings  = await getAiSettings(supabaseUrl, serviceKey)

    const prompt = buildPrompt(label ?? '', quiz_question, answers ?? null, quiz_options ?? null, quiz_correct ?? null, fun_fact ?? '', source_lang, target_lang)

    const primaryKey  = aiSettings.primary === 'claude' ? claudeKey : geminiKey
    const primaryCall = aiSettings.primary === 'claude'
      ? (k: string) => callClaude(prompt, k, target_lang)
      : (k: string) => callGemini(prompt, k, target_lang)
    const fallbackProvider = aiSettings.primary === 'claude' ? 'gemini' : 'claude'
    const fallbackKey  = fallbackProvider === 'claude' ? claudeKey : geminiKey
    const fallbackCall = fallbackProvider === 'claude'
      ? (k: string) => callClaude(prompt, k, target_lang)
      : (k: string) => callGemini(prompt, k, target_lang)

    let result
    if (primaryKey) {
      try {
        result = await primaryCall(primaryKey)
      } catch (e) {
        if (!aiSettings.fallback || !fallbackKey) throw e
        console.warn(`[translate-quiz] ${aiSettings.primary} failed (${String(e)}), falling back to ${fallbackProvider}`)
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
