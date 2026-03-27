# Stack Research
_pexedu Q2 2026_

---

## Stripe Integration

**Recommendation: Stripe Checkout (hosted page) for initial Pro tier launch.**

### Options compared

| Option | What it is | Fit for pexedu |
|--------|-----------|----------------|
| **Stripe Checkout** | Hosted payment page on stripe.com | Best fit — zero PCI surface, handles VAT/invoices, supports subscriptions natively |
| **Stripe Elements** | Embedded card UI in your SPA | Overkill for MVP — requires more backend, custom validation, more PCI scope |
| **Payment Links** | No-code shareable URL | Wrong tool — no programmatic control, can't tie purchase to user account |

### Why Checkout, not Elements

The project constraint is "Supabase BaaS only, no custom API server." Stripe Checkout offloads the entire payment session to Stripe's servers. The integration surface is:

1. Supabase Edge Function creates a `checkout.session` via Stripe REST API (server-side, secret key never leaves the function).
2. Client redirects to `stripe.com/pay/...`.
3. On success, Stripe webhook fires → Edge Function receives it → sets `profiles.subscription_tier = 'pro'`.
4. Client polls or subscribes via Supabase Realtime to detect the update.

Elements requires your own server to create PaymentIntents and handle 3DS challenges — difficult to do safely in a Deno Edge Function under tight latency constraints. For B2B school-license flow (invoices, VAT IDs), Checkout also handles EU VAT collection automatically.

### Implementation notes

- Use `mode: 'subscription'` + a `price_id` for the monthly/annual Pro tier.
- Set `success_url` to `https://pexedu.cz/?upgraded=1` — the SPA reads the param and shows a success state.
- Use `customer_email` prefilled from `auth.user.email`.
- Webhook secret must live in Supabase Vault (`supabase secrets set STRIPE_WEBHOOK_SECRET=...`), verified in the Edge Function with `stripe.webhooks.constructEvent`.
- The `stripe` npm package works in Deno with `npm:stripe` specifier (Deno 1.x+). No separate server needed.
- For school licenses (annual invoice), add a Customer Portal link — Stripe provides this as a hosted page too.

### Freemium gate

Enforce free/Pro distinction in RLS or application logic, not just UI. Recommended: `subscription_tier` column on `profiles`, populated by webhook. The Edge Function for `generate-quiz` checks this column before calling the AI provider.

---

## OG Images

**Recommendation: Vercel Function with `@vercel/og` (Satori under the hood).**

### Options compared

| Option | Fit | Notes |
|--------|-----|-------|
| **Vercel Function + `@vercel/og`** | Best fit | Official support, Node.js runtime, CDN-cached, JSX syntax, 1200x630 in ~50ms |
| **Supabase Edge Function** | Possible but painful | Deno runtime — `@vercel/og` is Node-specific. Satori + Resvg-js port is fragile, no automatic CDN caching |
| **Static pre-generated** | Not viable | Deck count grows dynamically (32+ decks by end of Q2) |

### Why Vercel Function

The project is already deployed on Vercel. Adding a single Vercel Function (`api/og.tsx`) is a zero-infrastructure addition:
- Renders JSX to PNG via Satori + Resvg
- Supports flexbox layouts, custom fonts (TTF/OTF), nested images
- Automatically adds `Cache-Control` headers — Vercel CDN caches each unique OG image by URL params
- Bundle limit: 500 KB — sufficient for a card-preview with a logo font

### URL pattern

```
https://pexedu.cz/api/og?set=vlajky&score=92&lang=sk
```

### SPA caveat

Because pexedu is a Vite SPA (no SSR), social crawlers (WhatsApp, Telegram, iMessage) cannot execute JavaScript to read dynamic `<meta>` tags.

**Fix:** Add a thin Vercel Function at `/api/share` that returns `text/html` with correct `og:image` / `og:title` meta tags and a `<meta http-equiv="refresh">` redirect to the SPA. Social crawlers read the meta; humans land on the SPA immediately. Configure `vercel.json` rewrites so `/share/:deckId` routes to this function.

### Fonts

Load the display font from `public/` using `fs.readFile` inside the function. Keep the subset under 200 KB to stay within the 500 KB bundle limit.

---

## GDPR for Minors (SK/CZ)

**Recommendation: Teacher-as-intermediary model for classroom flows + age self-declaration at direct registration.**

### Legal baseline — GDPR Article 8

GDPR Art. 8 sets the general age of digital consent at 16, but allows member states to lower it to a minimum of 13.

| Country | Age of digital consent | Authority |
|---------|----------------------|-----------|
| Slovakia | **16** (no derogation exercised) | UOOU SK |
| Czech Republic | **15** (lowered by Act No. 110/2019 Coll.) | UOOU CZ |

Slovakia did not exercise the Art. 8(1) derogation. Apply the stricter SK threshold of 16 to all users since jurisdiction cannot be reliably separated in a bilingual SK/CZ app.

### What the existing privacy policy is missing

The current `PrivacyModal.tsx` (March 2026) does not: ask for age declaration, collect parental consent, mention Art. 8 obligations, or provide consent verification. This is a **blocker for school pilots** — schools will not onboard without this.

### Required additions

**1. Age declaration at registration**
`OnboardingModal.tsx` / `IntentScreen.tsx` must ask: "Are you under 16?" Self-declaration is standard practice (Duolingo, Khan Academy, Google Workspace for Education all use it). Shifts the compliance burden and is documented in the privacy policy.

**2. For users who declare under-16**
- Show parental consent screen before registration completes
- Present simplified privacy notice (Art. 8 requires language comprehensible to a child)
- Store timestamped consent record: `{ child_user_id, consented_by_email, timestamp, consent_version }`

**3. For classroom flow (teacher-as-intermediary)**
Teacher checkbox at class creation: "I confirm our school has parental consent from guardians of students I add to this class." Store this declaration with the classroom record. GDPR Recital 38 and EU EdTech practice recognize schools as trusted intermediaries. Google Workspace for Education, Microsoft for Education, and Duolingo for Schools all operate this way in the EU.

**4. Right to erasure (Art. 17)**
Existing `delete-account` Edge Function must also delete: game results, XP history, profile avatars from Storage. Log deletion timestamp (audit trail) but delete all PII.

**5. Privacy-by-default for child accounts**
Child accounts default to: profile not publicly visible, no leaderboard appearance, no share-link generation with their username.

### DPA references

- Slovakia: Úrad na ochranu osobných údajov SR — dataprotection.gov.sk
- Czech Republic: Úřad pro ochranu osobních údajů — uoou.cz (Act No. 110/2019 Sb.)

---

## Deep Links / Viral Sharing

**Recommendation: Extend existing `shareService.ts` pattern. No third-party deep link SDK needed.**

### Current state

`shareService.ts` already builds and handles links:
```
https://pexedu.cz/?set=vlajky&mode=bleskovy_kviz&challenge=92&time=4&from=<username>
```
This is the correct pattern. Only extension is needed, not redesign.

### Param vocabulary to add

| Param | Values | Purpose |
|-------|--------|---------|
| `set` | deck slug | Which deck to load |
| `mode` | `bleskovy_kviz`, `pexequiz` | Game mode |
| `challenge` | accuracy 0–100 | Show challenge banner |
| `time` | avg seconds | Time-based challenge |
| `from` | username | Challenger display name |
| `daily` | `1` | Open today's daily challenge |
| `class` | join code | Teacher sharing class invite |
| `ref` | source identifier | Internal viral attribution |

### Attribution without external analytics

Do NOT add Google Analytics or Meta Pixel — incompatible with child-user GDPR posture. Instead, log the `ref` param to a `share_events` table in Supabase (`{ deck_id, ref, created_at }`) on game start. Viral attribution without third-party trackers.

### Class invite links

```
https://pexedu.cz/?class=PX-A4T2
```
Student visits → prompted to register/login → automatically added to the class.

### What NOT to add

- Firebase Dynamic Links — shut down August 2025, do not use
- Branch.io or Adjust — overkill, adds third-party data processors that complicate GDPR
- UTM params with GA — incompatible with no-tracking-cookie policy

### OG coupling

Deep links for viral sharing are only effective if the link preview (WhatsApp, Telegram, iMessage) shows a card image. The Vercel OG Function and the share link system must be implemented together — a share link without an OG preview card has significantly lower click-through.

---

## Confidence Levels

| Area | Confidence | Basis |
|------|------------|-------|
| Stripe Checkout recommendation | MEDIUM | Core Checkout vs Elements tradeoffs are architecturally stable. Flag: verify `npm:stripe` Deno compatibility in current Supabase Edge Function runtime before implementation. |
| Vercel OG image generation | HIGH | Confirmed from official Vercel docs (2026-03-27). Node.js runtime, CDN caching, 500 KB limit, JSX/TTF support all verified. |
| GDPR SK/CZ age thresholds | MEDIUM-HIGH | Slovakia = 16, Czech Republic = 15 are established law. Teacher-as-intermediary is standard EU EdTech practice. Consult a local privacy lawyer before school pilot launch. |
| Deep link implementation | HIGH | Based on existing codebase (`shareService.ts` already implements the pattern). Firebase Dynamic Links deprecation confirmed. |

---
_Researched: 2026-03-27 · gsd-project-researcher_
