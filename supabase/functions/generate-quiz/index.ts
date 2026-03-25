const LANG_CONFIG = {
  cs: {
    lang: 'Czech',
    example: 'Jak se jmenuje ...?',
    scriptWarning: 'CRITICAL: Write ONLY in standard written Czech (spisovná čeština). You MUST use correct Czech diacritics at all times — NEVER omit háčky or čárky (e.g. write "přechod" not "prechod", "řídit" not "ridit"). Use ONLY real Czech words that exist in standard Czech — NEVER invent or guess words. NEVER use Cyrillic. NEVER use Russian, Slovak or any other language.',
  },
  sk: {
    lang: 'Slovak',
    example: 'Ako sa volá ...?',
    scriptWarning: 'CRITICAL: Write ONLY in standard written Slovak (spisovná slovenčina). You MUST use correct Slovak diacritics at all times — NEVER omit háčky, dĺžne or mäkčene (e.g. write "križovatka" not "krizuvatka", "rýchlosť" not "rychlost"). Use ONLY real Slovak words that exist in standard Slovak — NEVER invent or guess words. NEVER use Cyrillic. NEVER use Czech, Slovenian or any other language.',
  },
  en: {
    lang: 'English',
    example: 'What is the name of ...?',
    scriptWarning: '',
  },
}

const DIFFICULTY_CONFIG = {
  easy: {
    question: 'Ask about the single most obvious, well-known fact. The question must be answerable by a 7-year-old child with no special knowledge. Use simple vocabulary. Avoid any technical terms.',
    options: 'Wrong answers must be clearly and obviously incorrect — even a child can immediately rule them out. They can be funny or absurd. Do NOT use plausible distractors.',
    fun_fact: 'One short, simple sentence. No numbers, statistics or complex concepts. Something a young child finds delightful.',
  },
  medium: {
    question: 'Ask about a moderately specific fact. Suitable for a curious 10-year-old. Can include one simple number or common characteristic.',
    options: 'Wrong answers are plausible but clearly distinguishable with basic knowledge.',
    fun_fact: 'Interesting fact that adds context. One or two sentences.',
  },
  hard: {
    question: 'Ask about a specific, detailed or lesser-known fact. Requires real knowledge of the subject. Can include precise numbers, dates, or technical details.',
    options: 'Wrong answers are very similar and highly plausible — requires precise knowledge to distinguish.',
    fun_fact: 'Surprising or lesser-known fact. Can be more detailed.',
  },
}

function buildPromptFromQuestion(question: string, language: string, difficulty: string): string {
  const cfg = LANG_CONFIG[language as keyof typeof LANG_CONFIG] ?? LANG_CONFIG.cs
  const diff = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] ?? DIFFICULTY_CONFIG.medium
  return `${cfg.scriptWarning ? `⚠️ LANGUAGE RULE: ${cfg.scriptWarning}\n\n` : ''}You are given a quiz question for an educational memory card game. Generate answer options and a fun fact for it.

Question: "${question}"
Difficulty level: ${difficulty.toUpperCase()}
- Wrong answers style: ${diff.options}
- Fun fact style: ${diff.fun_fact}

Return JSON in this exact format (JSON only, no other text):
{
  "answers": [
    {"text": "correct answer", "correct": true},
    {"text": "wrong answer 2", "correct": false},
    {"text": "wrong answer 3", "correct": false},
    {"text": "wrong answer 4", "correct": false},
    {"text": "wrong answer 5", "correct": false},
    {"text": "wrong answer 6", "correct": false}
  ],
  "fun_fact": "..."
}

Rules:
- ${cfg.scriptWarning ? `${cfg.scriptWarning}` : `Everything in ${cfg.lang} only`}
- Provide exactly 1 correct answer and 5 wrong answers (6 total)
- The correct answer must actually answer the question correctly
- Wrong answers must be plausible but clearly wrong at the given difficulty level
- Fun fact must be real, interesting, and related to the question topic`
}

function buildPrompt(label: string, language: string, difficulty: string): string {
  const cfg = LANG_CONFIG[language as keyof typeof LANG_CONFIG] ?? LANG_CONFIG.cs
  const diff = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] ?? DIFFICULTY_CONFIG.medium
  return `${cfg.scriptWarning ? `⚠️ LANGUAGE RULE: ${cfg.scriptWarning}\n\n` : ''}Create a quiz question for an educational memory card game about: "${label}"

Difficulty level: ${difficulty.toUpperCase()}
- Question style: ${diff.question}
- Wrong answers style: ${diff.options}
- Fun fact style: ${diff.fun_fact}

Return JSON in this exact format (JSON only, no other text):
{
  "question": "...",
  "answers": [
    {"text": "correct answer", "correct": true},
    {"text": "wrong answer 2", "correct": false},
    {"text": "wrong answer 3", "correct": false},
    {"text": "wrong answer 4", "correct": false},
    {"text": "wrong answer 5", "correct": false},
    {"text": "wrong answer 6", "correct": false}
  ],
  "fun_fact": "..."
}

Rules:
- ${cfg.scriptWarning ? `${cfg.scriptWarning}` : `Everything in ${cfg.lang} only`}
- The correct answer must NOT be the label "${label}" itself or a trivial rephrasing of it. Ask about a fact, property, or characteristic of the subject — not its name.
- Example for "George Washington": ask "How many terms did he serve?" not "Who was the first US president?"
- CRITICAL: NEVER ask a question whose answer is directly readable or inferable from the label name itself. If the label contains a country, color, number, or other attribute — do NOT ask about that attribute. Example: for "český fúzač" do NOT ask "From which country does this breed come?" because "český" already reveals the answer. Instead ask about the breed's behavior, size, temperament, or use.
- IMPORTANT: The player can already see the image on the card. NEVER ask about the visual appearance of the subject (e.g. "what color is it?", "what shape does it have?", "what does it look like?"). Instead ask about meaning, purpose, rules, required behavior, or real-world context.
- Example for a "Stop sign": ask "What must a driver do when they see this sign?" not "What shape is this sign?"
- Provide exactly 1 correct answer and 5 wrong answers (6 total) for variety
- Wrong answers must be plausible and relevant to the difficulty level
- Fun fact must be real and interesting for children`
}

function parseResult(text: string) {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
  try {
    const result = JSON.parse(stripped)
    return { question: result.question, answers: result.answers, fun_fact: result.fun_fact }
  } catch {
    // Fallback: extract first {...} block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Invalid AI response: ${text.slice(0, 300)}`)
    const result = JSON.parse(jsonMatch[0])
    return { question: result.question, answers: result.answers, fun_fact: result.fun_fact }
  }
}

async function callClaude(prompt: string, apiKey: string, difficulty: string, language: string) {
  const langNote = language === 'cs'
    ? 'You MUST write ALL text exclusively in standard written Czech (spisovná čeština). Use ONLY Latin script — NEVER use Cyrillic, Devanagari, Arabic, Greek, or any other non-Latin characters or scripts. ALWAYS use correct diacritics — háčky and čárky are mandatory (e.g. "přechod", "řídit", "průjezd"). NEVER omit diacritics. NEVER use English words or phrases. NEVER invent words — use only real Czech words. Never use Slovak, Russian or any other language. If you are unsure of a Czech word, use a simpler synonym.'
    : language === 'sk'
    ? 'You MUST write ALL text exclusively in standard written Slovak (spisovná slovenčina). Use ONLY Latin script — NEVER use Cyrillic or any non-Latin script. ALWAYS use correct diacritics — háčky, dĺžne and mäkčene are mandatory (e.g. "križovatka", "rýchlosť", "priechod"). NEVER omit diacritics. NEVER invent words — use only real Slovak words. NEVER use Czech, Polish, Russian or any other language — not even a single word from another language. WATCH OUT for Czech words that look similar to Slovak: use "využívať" NOT "využívať", "rýb" NOT "ryb", "jazvec" NOT "jazavec", "chutný" NOT "chuťový", "oblasť" NOT "oblast", "výsledok" NOT "výsledek", "rovnaký" NOT "rovný" when meaning "same". If unsure about a Slovak word, use a simpler synonym rather than guessing.'
    : ''

  const diffNote = difficulty === 'easy'
    ? 'You write quiz questions for young children (ages 6–9). Use only very simple words. Questions must be obvious and trivial. Wrong answers must be clearly wrong, even silly. Never use technical terms, statistics, or complex concepts.'
    : difficulty === 'hard'
    ? 'You write challenging quiz questions for knowledgeable adults and teens. Questions should test precise, specific knowledge. Wrong answers should be highly plausible and require careful thinking to distinguish.'
    : 'You write quiz questions for a general audience. Keep questions clear and fair.'

  const systemPrompt = [langNote, diffNote].filter(Boolean).join(' ')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Claude error: ${response.status} ${await response.text()}`)
    const data = await response.json()
    return parseResult(data.content[0].text.trim())
  } finally {
    clearTimeout(timeout)
  }
}

async function callOpenAI(prompt: string, apiKey: string, difficulty: string, language: string) {
  const langNote = language === 'cs'
    ? 'You MUST write ALL text exclusively in standard written Czech (spisovná čeština). ALWAYS use correct diacritics — háčky and čárky are mandatory. NEVER omit diacritics. NEVER invent words — use only real Czech words. Never use Cyrillic or any other language.'
    : language === 'sk'
    ? 'You MUST write ALL text exclusively in standard written Slovak (spisovná slovenčina, Slovakia). ALWAYS use correct diacritics — háčky, dĺžne and mäkčene are mandatory. NEVER omit diacritics. NEVER invent words — use only real Slovak words. NEVER use Czech, Polish, Russian or any other language.'
    : ''

  const diffNote = difficulty === 'easy'
    ? 'You write quiz questions for young children (ages 6–9). Use only very simple words. Questions must be obvious and trivial. Wrong answers must be clearly wrong, even silly. Never use technical terms, statistics, or complex concepts.'
    : difficulty === 'hard'
    ? 'You write challenging quiz questions for knowledgeable adults and teens. Questions should test precise, specific knowledge. Wrong answers should be highly plausible and require careful thinking to distinguish.'
    : 'You write quiz questions for a general audience. Keep questions clear and fair.'

  const systemPrompt = [langNote, diffNote].filter(Boolean).join(' ')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`OpenAI error: ${response.status} ${await response.text()}`)
    const data = await response.json()
    return parseResult(data.choices[0].message.content.trim())
  } finally {
    clearTimeout(timeout)
  }
}

async function callGemini(prompt: string, apiKey: string, difficulty: string, language: string, retries = 3): Promise<ReturnType<typeof parseResult>> {
  const langNote = language === 'cs'
    ? 'You MUST write ALL text exclusively in standard written Czech (spisovná čeština). ALWAYS use correct diacritics — háčky and čárky are mandatory (e.g. "přechod", "řídit", "průjezd"). NEVER omit diacritics. NEVER invent words — use only real Czech words. Never use Cyrillic or any other language.'
    : language === 'sk'
    ? 'You MUST write ALL text exclusively in standard written Slovak (spisovná slovenčina). ALWAYS use correct diacritics — háčky, dĺžne and mäkčene are mandatory (e.g. "križovatka", "rýchlosť", "priechod"). NEVER omit diacritics. NEVER invent words — use only real Slovak words. NEVER use Czech, Polish, Russian or any other language. WATCH OUT for Czech words that look similar to Slovak: use "rýb" NOT "ryb", "jazvec" NOT "jazavec", "oblasť" NOT "oblast", "výsledok" NOT "výsledek". If unsure, use a simpler synonym.'
    : ''

  const diffNote = difficulty === 'easy'
    ? 'You write quiz questions for young children (ages 6–9). Use only very simple words. Questions must be obvious and trivial. Wrong answers must be clearly wrong, even silly. Never use technical terms, statistics, or complex concepts.'
    : difficulty === 'hard'
    ? 'You write challenging quiz questions for knowledgeable adults and teens. Questions should test precise, specific knowledge. Wrong answers should be highly plausible and require careful thinking to distinguish.'
    : 'You write quiz questions for a general audience. Keep questions clear and fair.'

  const visualNote = 'The player can already see the image on the card. NEVER ask about visual appearance (color, shape, what it looks like). Ask about meaning, rules, required behavior, or real-world context.'

  const systemInstruction = [langNote, diffNote, visualNote].filter(Boolean).join(' ')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  let response: Response
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      }
    )
  } finally {
    clearTimeout(timeout)
  }
  if (response.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 10000))
    return callGemini(prompt, apiKey, difficulty, language, retries - 1)
  }
  if (!response.ok) throw new Error(`Gemini error: ${response.status} ${await response.text()}`)
  const data = await response.json()
  const parts: Array<{ text?: string; thought?: boolean }> = data.candidates?.[0]?.content?.parts ?? []
  const textPart = parts.find(p => !p.thought) ?? parts[0]
  const text = textPart?.text
  if (!text) throw new Error('Empty Gemini response')
  return parseResult(text.trim())
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAiSettings(): Promise<{ primary: 'claude' | 'gemini' | 'openai'; fallback: boolean; fallbackProvider?: 'claude' | 'gemini' | 'openai' }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return { primary: 'claude', fallback: true }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/admin_settings?key=eq.ai_provider&select=value`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    })
    const data = await res.json()
    return data?.[0]?.value ?? { primary: 'claude', fallback: true }
  } catch {
    return { primary: 'claude', fallback: true }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { label, question: inputQuestion, language = 'cs', difficulty = 'medium' } = await req.json()
    if (!label && !inputQuestion) {
      return new Response(JSON.stringify({ error: 'label or question is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeKey  = Deno.env.get('ANTHROPIC_API_KEY')
    const geminiKey  = Deno.env.get('GEMINI_API_KEY')
    const openaiKey  = Deno.env.get('OPENAI_API_KEY')
    const prompt     = inputQuestion
      ? buildPromptFromQuestion(inputQuestion, language, difficulty)
      : buildPrompt(label, language, difficulty)
    const aiSettings = await getAiSettings()

    const getKey = (p: string) => p === 'gemini' ? geminiKey : p === 'openai' ? openaiKey : claudeKey
    const getCall = (p: string) => p === 'gemini'
      ? (k: string) => callGemini(prompt, k, difficulty, language)
      : p === 'openai'
      ? (k: string) => callOpenAI(prompt, k, difficulty, language)
      : (k: string) => callClaude(prompt, k, difficulty, language)

    const fallbackProvider = aiSettings.fallbackProvider
      ?? (aiSettings.primary === 'claude' ? 'gemini' : 'claude')
    const primaryKey  = getKey(aiSettings.primary)
    const primaryCall = getCall(aiSettings.primary)
    const fallbackKey  = getKey(fallbackProvider)
    const fallbackCall = getCall(fallbackProvider)

    let result
    let usedProvider = aiSettings.primary

    if (primaryKey) {
      try {
        result = await primaryCall(primaryKey)
      } catch (e) {
        if (!aiSettings.fallback) throw e
        console.warn(`${aiSettings.primary} failed, falling back to ${fallbackProvider}:`, e)
        usedProvider = fallbackProvider
        if (!fallbackKey) throw new Error(`${aiSettings.primary} failed and ${fallbackProvider} key not set`)
        result = await fallbackCall(fallbackKey)
      }
    } else if (aiSettings.fallback && fallbackKey) {
      usedProvider = fallbackProvider
      result = await fallbackCall(fallbackKey)
    } else {
      throw new Error('No AI provider configured')
    }

    return new Response(JSON.stringify({ ...result, _provider: usedProvider }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
