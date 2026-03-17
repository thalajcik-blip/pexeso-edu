import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { callerToken } = body

    if (!callerToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    // Verify caller via their JWT
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${callerToken}` } } }
    )
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Clean up related records first
    await adminClient.from('game_history').delete().eq('user_id', user.id)
    await adminClient.from('profiles').delete().eq('id', user.id)

    const { error } = await adminClient.auth.admin.deleteUser(user.id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
