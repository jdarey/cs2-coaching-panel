import Stripe from 'stripe'
import type { NextRequest } from 'next/server'

/**
 * Stripe Checkout — sprzedaż kodów dostępu do rutyny CS2.
 *
 * Przepływ: landing → GET /api/checkout/create → Stripe → płatność →
 * webhook checkout.session.completed → generujemy kod AccessCode →
 * mail z kodem do kupującego (system mailowy aplikacji) → /dzieki.
 *
 * Konfiguracja (Vercel env):
 *  - STRIPE_SECRET_KEY     (wymagany do uruchomienia płatności)
 *  - STRIPE_WEBHOOK_SECRET (wymagany do bezpiecznej aktywacji po opłaceniu)
 *  - STRIPE_PRICE_ID       (opcjonalny; bez niego cena z PRODUCT_PRICE_PLN)
 *  - PRODUCT_PRICE_PLN     (cena prezentowana i używana inline w Stripe)
 */

export const STRIPE_PRICE_CURRENCY = 'pln'

let cached: Stripe | null = null

/** Klient Stripe albo null, gdy integracja nie jest skonfigurowana. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) {
    // Pin wersji API do tej z types SDK — buildy nie łamią się przy zmianach po stronie Stripe.
    cached = new Stripe(key, { apiVersion: '2026-08-26.dahlia', typescript: true })
  }
  return cached
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET
}

/** Baza URL aplikacji (success/cancel URL, link aktywacji w mailu). */
export function appBaseUrl(req?: NextRequest): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.SITE_URL ||
    (req ? new URL(req.url).origin : '') ||
    'http://localhost:3000'
  )
}

export interface CheckoutTarget {
  url: string
}

/** Tworzy sesję Checkout na produkt (Rutyna CS2) i zwraca URL płatności. */
export async function createCheckoutSession(req: NextRequest): Promise<CheckoutTarget> {
  const stripe = getStripe()
  if (!stripe) throw new Error('STRIPE_SECRET_KEY nie ustawiony')

  const base = appBaseUrl(req)
  const priceId = process.env.STRIPE_PRICE_ID
  const pricePln = Number(process.env.PRODUCT_PRICE_PLN || '97')

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: STRIPE_PRICE_CURRENCY,
              unit_amount: Math.round(pricePln * 100),
              product_data: {
                name: 'Rutyna CS2 — pełny dostęp',
                description:
                  'Plan treningowy do Counter-Strike 2: każde ćwiczenie omówione filmem i tekstem. Dostęp na zawsze.',
              },
            },
          },
    ],
    // Email kupującego potrzebny do wysyłki kodu — zbieramy w Stripe.
    customer_creation: priceId ? undefined : 'always',
    success_url: `${base}/dzieki?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/?anulowano=1`,
    allow_promotion_codes: false,
    billing_address_collection: 'auto',
    metadata: { product: 'cs2-routine' },
  }

  const session = await stripe.checkout.sessions.create(params)
  if (!session.url) throw new Error('Stripe nie zwrócił URL checkout')
  return { url: session.url }
}

/** Odczyt statusu sesji na stronie /dzieki (best-effort, tylko prezentacja). */
export async function retrieveSessionPaid(sessionId: string): Promise<boolean | null> {
  const stripe = getStripe()
  if (!stripe) return null
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    return session.payment_status === 'paid' || session.status === 'complete'
  } catch {
    return null
  }
}
