/**
 * Generuje kody dostępu do produktu (rutyna CS2) i zapisuje je w bazie.
 *
 * Użycie (wymaga DATABASE_URL w .env / środowisku):
 *   npx tsx scripts/gen-access-codes.ts 10
 *   npx tsx scripts/gen-access-codes.ts 10 --note "zamówienie #1234"
 *
 * Kody wypisywane na stdout — kopiuj je do maili dla kupujących.
 */
import { PrismaClient } from '@prisma/client'
import { generateAccessCodes } from '../src/lib/access-codes'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const count = Math.max(1, Math.min(500, parseInt(args[0] || '1', 10) || 1))
  const noteIdx = args.indexOf('--note')
  const note = noteIdx >= 0 ? args[noteIdx + 1] : null

  const codes = generateAccessCodes(count)

  // createMany + skipDuplicates: ponowne odpalenie na tej samej partii nie rzuci
  // błędu unique — kolizje (praktycznie niemożliwe) po prostu przepadną.
  const result = await prisma.accessCode.createMany({
    data: codes.map((code) => ({ code, note })),
    skipDuplicates: true,
  })

  console.log(`✅ Zapisano ${result.count} kodów${note ? ` (nota: ${note})` : ''}\n`)
  for (const code of codes) {
    console.log(code)
  }
  console.log(`\nWysłane kody mailem do kupujących. Status: /aktywuj-kod`)
}

main()
  .catch((e) => {
    console.error('❌ Generowanie kodów nie powiodło się:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
