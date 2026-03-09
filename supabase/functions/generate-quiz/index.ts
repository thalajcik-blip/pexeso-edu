import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { label } = await req.json()
    if (!label) {
      return new Response(JSON.stringify({ error: 'label is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Vytvoř kvízovou otázku pro vzdělávací pexeso o: "${label}"

Vrať JSON v tomto přesném formátu (pouze JSON, žádný jiný text):
{
  "question": "Jak se jmenuje ...?",
  "options": ["správná odpověď", "špatná odpověď 2", "špatná odpověď 3", "špatná odpověď 4"],
  "correct": "správná odpověď",
  "fun_fact": "Zajímavost v 1-2 větách."
}

Pravidla:
- Otázka musí být v češtině
- První možnost v options musí být správná odpověď (bude zamíchána)
- Špatné odpovědi musí být věrohodné, ale jednoznačně špatné
- Zajímavost musí být skutečná a zajímavá pro děti
- Vše v češtině`,
      }],
    })

    const text = (message.content[0] as { type: string; text: string }).text.trim()

    // Extract JSON even if surrounded by markdown code block
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid response from AI')

    const result = JSON.parse(jsonMatch[0])

    // Shuffle options so correct isn't always first
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
