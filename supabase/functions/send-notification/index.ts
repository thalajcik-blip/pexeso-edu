import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM = 'hello@pexedu.com'
const ADMIN_EMAIL = 'thalajcik@gmail.com'

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

serve(async (req) => {
  try {
    let body: Record<string, any> = {}
    try { body = await req.json() } catch {
      return new Response(JSON.stringify({ skipped: 'no_body' }), { status: 200 })
    }
    const { type, record, userId } = body

    // ── Manual call: teacher approved via admin panel ──────────────────────
    if (type === 'teacher_approved' && userId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      const userEmail = userData?.user?.email
      if (!userEmail) return new Response(JSON.stringify({ skipped: 'no_email' }), { status: 200 })

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()
      const name = profile?.username ?? userEmail

      await sendEmail(
        userEmail,
        '✅ Váš učitelský účet na Pexedu byl schválen',
        `<!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#f5f5f5;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
            <div style="font-size:32px;margin-bottom:8px;">🎉</div>
            <h2 style="margin:0 0 8px;color:#1a1a2e;">Váš učitelský účet byl schválen!</h2>
            <p style="color:#555;margin:0 0 16px;">Ahoj ${name},</p>
            <p style="color:#555;margin:0 0 16px;">
              Váš účet na <strong>Pexedu</strong> byl schválen jako učitelský.
              Nyní máte přístup k editoru sad karet a správě tříd.
            </p>
            <a href="https://pexedu.com/admin"
               style="display:inline-block;background:#4f46e5;color:#fff;font-weight:bold;padding:12px 24px;border-radius:10px;text-decoration:none;margin-bottom:24px;">
              Přejít do administrace →
            </a>
            <p style="color:#aaa;font-size:12px;margin:0;">Tým Pexedu · pexedu.com</p>
          </div>
        </body>
        </html>`
      )
      return new Response(JSON.stringify({ sent: 'teacher_approved' }), { status: 200 })
    }

    // ── Manual call: teacher rejected via admin panel ──────────────────────
    if (type === 'teacher_rejected' && userId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: userData } = await supabase.auth.admin.getUserById(userId)
      const userEmail = userData?.user?.email
      if (!userEmail) return new Response(JSON.stringify({ skipped: 'no_email' }), { status: 200 })

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle()
      const name = profile?.username ?? userEmail

      await sendEmail(
        userEmail,
        'Informace o vaší žádosti na Pexedu',
        `<!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#f5f5f5;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;">
            <h2 style="margin:0 0 8px;color:#1a1a2e;">Vaše žádost nebyla schválena</h2>
            <p style="color:#555;margin:0 0 16px;">Ahoj ${name},</p>
            <p style="color:#555;margin:0 0 16px;">
              Bohužel, vaše žádost o učitelský účet na <strong>Pexedu</strong> nebyla tentokrát schválena.
              Pokud si myslíte, že jde o omyl, kontaktujte nás na hello@pexedu.com.
            </p>
            <p style="color:#aaa;font-size:12px;margin:0;">Tým Pexedu &middot; pexedu.com</p>
          </div>
        </body>
        </html>`
      )
      return new Response(JSON.stringify({ sent: 'teacher_rejected' }), { status: 200 })
    }

    // ── DB trigger: new user registered (INSERT into auth.users) ────────────
    // Trigger: new user registered (insert into auth.users via DB webhook)
    if (type === 'INSERT' && record?.email) {
      await sendEmail(
        ADMIN_EMAIL,
        '🆕 Nový uživatel na Pexedu',
        `<p>Zaregistroval se nový uživatel:</p>
         <ul>
           <li><strong>Email:</strong> ${record.email}</li>
           <li><strong>ID:</strong> ${record.id}</li>
           <li><strong>Čas:</strong> ${new Date(record.created_at).toLocaleString('cs-CZ')}</li>
         </ul>
         <p><a href="https://pexedu.com/admin/users">Spravovat uživatele →</a></p>`
      )
      return new Response(JSON.stringify({ sent: 'admin_new_user' }), { status: 200 })
    }

    return new Response(JSON.stringify({ skipped: true }), { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
