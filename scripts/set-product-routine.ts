/**
 * Oznacza rutynę jako PRODUKTOWĄ (sprzedawaną za kody dostępu).
 * Rutyna pozostaje na koncie właściciela (coachId) — kupujący dostają
 * przypisanie do tej samej rutyny po aktywacji kodu.
 *
 * Użycie (wymaga DATABASE_URL):
 *   npx tsx scripts/set-product-routine.ts <routineId>
 *   npx tsx scripts/set-product-routine.ts --list          # pokaż rutyny właściciela
 *   npx tsx scripts/set-product-routine.ts --clear         # wyłącz flagę produktową
 */
import { PrismaClient } from '@prisma/client'
import { ADMIN_EMAIL } from '../src/lib/roles'

const prisma = new PrismaClient()

async function main() {
  const arg = process.argv[2]

  if (!ADMIN_EMAIL) {
    console.error('❌ Brak ADMIN_EMAIL w środowisku — ustaw go przed użyciem.')
    process.exit(1)
  }
  const owner = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true, email: true } })
  if (!owner) {
    console.error(`❌ Nie znaleziono konta właściciela: ${ADMIN_EMAIL}`)
    process.exit(1)
  }

  if (arg === '--list') {
    const routines = await prisma.routine.findMany({
      where: { coachId: owner.id },
      select: { id: true, title: true, isProductRoutine: true, isStarterRoutine: true, _count: { select: { tasks: true } } },
      orderBy: { updatedAt: 'desc' },
    })
    console.log(`Rutyny konta ${owner.email}:\n`)
    for (const r of routines) {
      const flags = [
        r.isProductRoutine ? 'PRODUKT ⭐' : '',
        r.isStarterRoutine ? 'starter' : '',
      ].filter(Boolean).join(', ')
      console.log(`  ${r.id}  ${r.title} (${r._count.tasks} ćwiczeń)${flags ? ` — ${flags}` : ''}`)
    }
    return
  }

  if (arg === '--clear') {
    await prisma.routine.updateMany({ where: { isProductRoutine: true }, data: { isProductRoutine: false } })
    console.log('✅ Zdjęto flagę produktową ze wszystkich rutyn.')
    return
  }

  if (!arg) {
    console.log('Użycie: npx tsx scripts/set-product-routine.ts <routineId | --list | --clear>')
    process.exit(1)
  }

  const routine = await prisma.routine.findFirst({ where: { id: arg, coachId: owner.id } })
  if (!routine) {
    console.error('❌ Rutyna nie znaleziona wśród rutyn właściciela (sprawdź --list).')
    process.exit(1)
  }

  await prisma.$transaction([
    prisma.routine.updateMany({ where: { isProductRoutine: true }, data: { isProductRoutine: false } }),
    prisma.routine.update({ where: { id: routine.id }, data: { isProductRoutine: true } }),
  ])

  const taskCount = await prisma.routineTask.count({ where: { routineId: routine.id } })
  console.log(`✅ „${routine.title}" (${taskCount} ćwiczeń) jest teraz PRODUKTEM.`)
  console.log('   Upewnij się, że każde ćwiczenie ma film i opis — to obiekt sprzedaży.')
  console.log('   Nowe kody: npx tsx scripts/gen-access-codes.ts 10')
}

main()
  .catch((e) => {
    console.error('❌ Błąd:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
