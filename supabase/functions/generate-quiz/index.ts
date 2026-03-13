const LANG_CONFIG = {
  cs: { lang: 'češtině', example: 'Jak se jmenuje ...?', alphabet: 'Czech uses the Latin alphabet with diacritics (á, č, ď, é, ě, í, ň, ó, ř, š, ť, ú, ů, ý, ž). Do NOT use Cyrillic characters.' },
  sk: { lang: 'slovenčine', example: 'Ako sa volá ...?', alphabet: 'Slovak uses the Latin alphabet with diacritics (á, ä, č, ď, é, í, ĺ, ľ, ň, ó, ô, ŕ, š, ť, ú, ý, ž). Do NOT use Cyrillic characters.' },
  en: { lang: 'English', example: 'What is the name of ...?', alphabet: '' },
}

const DIFFICULTY_CONFIG = {
  easy: {
    question: 'Simple, straightforward question about a well-known basic fact.',
    options: 'Wrong answers are clearly different and easy to rule out.',
    fun_fact: 'Simple, easy to understand fact.',
  },
  medium: {
    question: 'Moderately specific question requiring some knowledge.',
    options: 'Wrong answers are plausible but distinguishable.',
    fun_fact: 'Interesting fact that adds context.',
  },
  hard: {
    question: 'Specific, detailed question about a less obvious fact or characteristic.',
    options: 'Wrong answers are very similar and plausible — requires precise knowledge to distinguish.',
    fun_fact: 'Surprising or lesser-known fact.',
  },
}

function buildPrompt(label: string, language: string, difficulty: string): string {
  const cfg = LANG_CONFIG[language as keyof typeof LANG_CONFIG] ?? LANG_CONFIG.cs
  const diff = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] ?? DIFFICULTY_CONFIG.medium
  return `Create a quiz question for an educational memory card game about: "${label}"

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
- Question, answers and fun_fact must be in ${cfg.lang}
- IMPORTANT: The correct answer must NOT be the label "${label}" itself or a trivial rephrasing of it. Ask about a fact, property, or characteristic of the subject — not its name.
- Example for "George Washington": ask "How many terms did he serve?" not "Who was the first US president?"
- Provide exactly 1 correct answer and 5 wrong answers (6 total) for variety
- Wrong answers must be plausible and relevant to the difficulty level
- Fun fact must be real and interesting for children
- Everything in ${cfg.lang} only, no mixing of languages
${cfg.alphabet ? `- ${cfg.alphabet}` : ''}`
}

function parseResult(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid AI response')
  const result = JSON.parse(jsonMatch[0])
  return {
    question: result.question,
    answers:  result.answers,
    fun_fact: result.fun_fact,
  }
}

async function callClaude(prompt: string, apiKey: string) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) throw new Error(`Claude error: ${response.status} ${await response.text()}`)
  const data = await response.json()
  return parseResult(data.content[0].text.trim())
}

async function callGemini(prompt: string, apiKey: string, retries = 3): Promise<ReturnType<typeof parseResult>> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 512 },
      }),
    }
  )
  if (response.status === 429 && retries > 0) {
    await new Promise(r => setTimeout(r, 10000))
    return callGemini(prompt, apiKey, retries - 1)
  }
  if (!response.ok) throw new Error(`Gemini error: ${response.status} ${await response.text()}`)
  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Empty Gemini response')
  return parseResult(text.trim())
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAiSettings(): Promise<{ primary: 'claude' | 'gemini'; fallback: boolean }> {
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
    const { label, language = 'cs', difficulty = 'medium' } = await req.json()
    if (!label) {
      return new Response(JSON.stringify({ error: 'label is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeKey  = Deno.env.get('ANTHROPIC_API_KEY')
    const geminiKey  = Deno.env.get('GEMINI_API_KEY')
    const prompt     = buildPrompt(label, language, difficulty)
    const aiSettings = await getAiSettings()

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
