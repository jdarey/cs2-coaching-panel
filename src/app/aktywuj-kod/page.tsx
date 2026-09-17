import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/roles'
import { ActivateCodeClient, AlreadyActiveNotice } from './activate-client'

export const metadata = {
  title: 'Aktywuj kod — Rutyna CS2',
  description: 'Wpisz kod dostępu otrzymany po zakupie i odbierz pełną rutynę CS2: każde ćwiczenie omówione filmem i tekstem.',
}

// Zawsze dynamicznie: strona czyta sesję i bazę (aktywne przypisania).
export const dynamic = 'force-dynamic'

export default async function ActivateCodePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    // Bez konta: najpierw konto (rejestracja/logowanie), potem powrót tutaj.
    redirect('/aktywuj-kod/enter')
  }
  if (isAdminRole((session.user as any).role)) {
    redirect('/coach/routines')
  }
  if ((session.user as any).role !== 'STUDENT') {
    redirect('/coach/dashboard')
  }

  const userId = (session.user as any).id

  // Już ma aktywny produkt? Nie pytaj o kod — pokaż potwierdzenie i link.
  const active = await prisma.routineAssignment.findFirst({
    where: { studentId: userId, status: 'ACTIVE', routine: { isProductRoutine: true } },
    select: { id: true, routine: { select: { title: true } } },
  })
  if (active) {
    return <AlreadyActiveNotice routineTitle={active.routine.title} />
  }

  return <ActivateCodeClient />
}
