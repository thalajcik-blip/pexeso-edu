import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = 'hello@pexedu.com'
const SITE_URL = 'https://pexedu.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLE_LABELS: Record<string, string> = {
  player: 'Hráč',
  teacher: 'Učitel',
  superadmin: 'Superadmin',
}

function rolesForType(role: string): string[] {
  if (role === 'superadmin') return ['superadmin', 'teacher', 'player']
  if (role === 'teacher') return ['teacher', 'player']
  return ['player']
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { email, role, callerToken } = body

    if (!callerToken) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    if (!email) return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: corsHeaders })
    if (!role || !ROLE_LABELS[role]) return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: corsHeaders })

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${callerToken}` } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized – invalid token' }), { status: 401, headers: corsHeaders })

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('roles')
      .eq('id', caller.id)
      .single()
    if (!(callerProfile?.roles ?? []).includes('superadmin')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders })
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${SITE_URL}/admin` },
    })
    if (linkError) {
      const alreadyExists = linkError.message?.toLowerCase().includes('already been registered')
      return new Response(
        JSON.stringify({ error: alreadyExists ? 'Uživatel s tímto e-mailem už existuje.' : linkError.message }),
        { status: alreadyExists ? 409 : 500, headers: corsHeaders }
      )
    }

    const invitedUserId = linkData.user.id
    const actionLink = linkData.properties.action_link

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: invitedUserId, roles: rolesForType(role) }, { onConflict: 'id' })
    if (profileError) return new Response(JSON.stringify({ error: profileError.message }), { status: 500, headers: corsHeaders })

    const roleLabel = ROLE_LABELS[role]
    await sendEmail(
      email,
      '📩 Pozvánka do Pexedu',
      `<!DOCTYPE html>
      <html>
      <body style="font-family:sans-serif;background:#f5f5f5;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
          <div style="font-size:32px;margin-bottom:8px;">📩</div>
          <h2 style="margin:0 0 8px;color:#1a1a2e;">Byli jste pozváni do Pexedu</h2>
          <p style="color:#555;margin:0 0 16px;">Ahoj,</p>
          <p style="color:#555;margin:0 0 16px;">
            Byl vám vytvořen účet na <strong>Pexedu</strong> s rolí <strong>${roleLabel}</strong>.
            Kliknutím na tlačítko níže pozvánku přijmete a budete přihlášeni.
          </p>
          <a href="${actionLink}"
             style="display:inline-block;background:#4f46e5;color:#fff;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
            Přijmout pozvánku →
          </a>
          <p style="color:#aaa;font-size:12px;margin:0;">Tým Pexedu · pexedu.com</p>
        </div>
      </body>
      </html>`
    )

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
