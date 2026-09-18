import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession, getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/create → 302 na Stripe Checkout.
 * Używane jako href przycisku zakupu na landing page. Bez skonfigurowanego
 * Stripe zwraca 503 z jasnym komunikatem (landing wtedy pokazuje fallback).
 */
export async function GET(request: NextRequest) {
  if (!getStripe()) {
    return NextResponse.json(
      { error: 'Płatności chwilowo niedostępne — skontaktuj się z nami' },
      { status: 503 },
    )
  }
  try {
    const { url } = await createCheckoutSession(request)
    return NextResponse.redirect(url, 302)
  } catch (error) {
    console.error('Checkout create error:', error)
    return NextResponse.json({ error: 'Nie udało się rozpocząć płatności — spróbuj ponownie' }, { status: 500 })
  }
}
