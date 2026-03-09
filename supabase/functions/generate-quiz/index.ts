const LANG_CONFIG = {
  cs: { lang: 'češtině', example: 'Jak se jmenuje ...?' },
  sk: { lang: 'slovenčine', example: 'Ako sa volá ...?' },
  en: { lang: 'English', example: 'What is the name of ...?' },
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
  "options": ["correct answer", "wrong answer 2", "wrong answer 3", "wrong answer 4"],
  "correct": "correct answer",
  "fun_fact": "..."
}

Rules:
- Question, options and fun_fact must be in ${cfg.lang}
- IMPORTANT: The correct answer must NOT be the label "${label}" itself or a trivial rephrasing of it. Ask about a fact, property, or characteristic of the subject — not its name.
- Example for "George Washington": ask "How many terms did he serve?" not "Who was the first US president?"
- First option in options array must be the correct answer (will be shuffled)
- Fun fact must be real and interesting for children
- Everything in ${cfg.lang} only, no mixing of languages`
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

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
        messages: [{
          role: 'user',
          content: buildPrompt(label, language, difficulty),
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${err}`)
    }

    const data = await response.json()
    const text = data.content[0].text.trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')

    const result = JSON.parse(jsonMatch[0])
    const shuffled = [...result.options].sort(() => Math.random() - 0.5)

    return new Response(JSON.stringify({
      question: result.question,
      options:  shuffled,
      correct:  result.correct,
      fun_fact: result.fun_fact,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
