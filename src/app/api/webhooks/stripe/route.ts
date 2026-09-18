import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { generateAccessCode } from '@/lib/access-codes'
import { sendEmail } from '@/lib/mail'
import { renderEmail } from '@/lib/email-templates'
import { appBaseUrl } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * Webhook Stripe — jedyne miejsce, gdzie kod dostępu jest wydawany po zakupie.
 *
 * Bezpieczeństwo: podpis webhooka weryfikowany SUROWYM body (Stripe wymaga
 * dokładnie tych bajtów, które podpisał — Next.json() ich nie gwarantuje).
 * Idempotencja: po event.id (Stripe ponawia dostawy przy sieciowym failu).
 *
 * checkout.session.completed:
 *  1. generujemy unikalny kod (CS2-XXXX-XXXX),
 *  2. zapisujemy z notą (email kupującego + id sesji — ślad dla właściciela),
 *  3. wysyłamy mail z kodem i linkiem /aktywuj-kod (system szablonów aplikacji,
 *     edytowalny w /admin/emails pod kluczem 'access-code').
 */

// Idempotencja dostaw webhooka: tabela Key-value na bazie EmailTemplate nie
// pasuje semantycznie, więc używamy deduplikacji po znalezionym kodzie z notą
// sesji: jeśli dla sessionId istnieje już kod, NIE wydajemy kolejnego.
async function codeExistsForSession(sessionId: string): Promise<boolean> {
  const found = await prisma.accessCode.findFirst({
    where: { note: { contains: sessionId } },
    select: { id: true },
  })
  return !!found
}

export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook nie skonfigurowany' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Brak podpisu' }, { status: 400 })
  }

  const rawBody = await request.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    console.error('Stripe webhook: błędny podpis', err)
    return NextResponse.json({ error: 'Błędny podpis' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const sessionId = session.id
      const email = session.customer_details?.email || session.customer_email
      const amountTotal = session.amount_total ?? null

      if (!email) {
        // Bez emaila nie dostarczymy kodu — zaznacz w logu, owner sprawdzi w Stripe.
        console.error(`[stripe] checkout.session.completed BEZ EMAILA: ${sessionId}`)
        return NextResponse.json({ received: true, note: 'brak emaila w sesji' })
      }

      if (await codeExistsForSession(sessionId)) {
        return NextResponse.json({ received: true, note: 'duplikat (kod już wydany)' })
      }

      const code = await prisma.$transaction(async (tx) => {
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = generateAccessCode()
          try {
            const created = await tx.accessCode.create({
              data: {
                code: candidate,
                note: `Stripe ${sessionId} · ${email}${amountTotal != null ? ` · ${amountTotal / 100} zł` : ''}`,
              },
            })
            return created.code
          } catch (e: any) {
            if (e?.code === 'P2002') continue // kolizja kodu — wylosuj kolejny
            throw e
          }
        }
        throw new Error('Nie udało się wygenerować unikalnego kodu')
      })

      const base = appBaseUrl(request)
      const activateUrl = `${base}/aktywuj-kod`
      const vars = {
        code,
        activateUrl,
        amount: amountTotal != null ? `${(amountTotal / 100).toFixed(0)} zł` : null,
      }

      const { subject, html, text } = await renderEmail(
        'access-code',
        vars,
        { buttonUrl: activateUrl, rawUrl: activateUrl, safeKeys: ['code'] },
      )

      const mailResult = await sendEmail({ to: email, subject, html, text })
      if (!mailResult.ok) {
        // Kod JEST zapisany (nie przepadnie) — tylko mail padł. Owner widzi
        // kod w bazie (nota = sessionId) i może go przesłać ręcznie.
        console.error(`[stripe] KOD WYDANY, ale mail FAILED: ${sessionId} code=${code}`)
      }

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    // 500 → Stripe ponowi dostawę (retry z backoffem po swojej stronie).
    return NextResponse.json({ error: 'Błąd przetwarzania webhooka' }, { status: 500 })
  }
}
