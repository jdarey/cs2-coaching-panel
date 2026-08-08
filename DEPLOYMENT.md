# CS2 Coaching Panel - Deployment Guide (100% Free & Secure)

## 🎯 Stack Overview (Wszystko za 0 zł)

| Usługa | Plan Free | Limity |
|--------|-----------|--------|
| **Vercel** | Hobby | Nieograniczone projekty, 100GB bandwidth/miesiąc |
| **Neon** | Free | 0.5GB storage, 190 compute hrs/miesiąc, autoscaling |
| **NextAuth** | Self-hosted | Brak limitów |
| **Resend** | Free | 3000 emaili/miesiąc |
| **Cloudflare R2** | Free | 10GB storage, 1M operacji Class A |
| **Upstash Redis** | Free | 10k commands/dzień (dla rate limiting) |

---

## 🚀 Quick Start (5 minut)

### 1. Fork & Clone
```bash
git clone https://github.com/TWOJ_USERNAME/cs2-coaching-panel.git
cd cs2-coaching-panel
```

### 2. Setup Neon Database (2 min)
1. Idź na [neon.tech](https://neon.tech) → Sign up (GitHub)
2. Create Project → `cs2-coaching` → Region: `Europe West (Frankfurt)`
3. Skopiuj `Connection String` (pooled, z `?sslmode=require`)

### 3. Setup Vercel (1 min)
1. Idź na [vercel.com](https://vercel.com) → Import Git Repository
2. Wybierz repo → Framework: Next.js
3. **Environment Variables** (dodaj wszystkie z `.env.example`):
   ```
   DATABASE_URL=postgresql://... (z Neon)
   NEXTAUTH_SECRET=openssl rand -base64 32
   NEXTAUTH_URL=https://twoj-projekt.vercel.app
   ```

### 4. Deploy!
```bash
git add .
git commit -m "Initial commit"
git push origin main
```
Vercel automatycznie zbuduje i wdroży!

---

## 🔐 Security Checklist (Gotowe w kodzie)

### ✅ Zaimplementowane:
- **NextAuth v4** z JWT + bcrypt (12 rounds)
- **Middleware** z rate limiting (10 req/min auth, 100 req/min API)
- **Security Headers**: CSP, X-Frame-Options, HSTS, itd.
- **Zod Validation** na wszystkich API endpoints
- **Prisma** - parameterized queries (SQL injection proof)
- **Role-based access** (COACH/STUDENT) na middleware + API
- **CSRF Protection** via NextAuth callbacks
- **Secure Cookies** (HttpOnly, Secure, SameSite=Lax)

### 🔧 Do skonfigurowania na Vercel:
1. **Environment Variables** → wszystkie z `.env.example`
2. **Project Settings** → Enable "Vercel Authentication" dla preview deployments
3. **Domains** → Add custom domain (opcjonalnie)

---

## 📦 Docker Local Development

```bash
# Start everything (PostgreSQL + App)
docker-compose up -d

# View logs
docker-compose logs -f app

# Run migrations
docker-compose exec app npm run db:push

# Seed demo data
docker-compose exec app npm run db:seed

# Stop
docker-compose down -v  # -v removes database volume
```

**Login demo**: `coach@test.com` / `password123` lub `student@test.com` / `password123`

---

## 🗄️ Database Management

### Prisma Commands
```bash
# Generate client
npm run db:generate

# Push schema (dev)
npm run db:push

# Create migration (prod)
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Seed data
npm run db:seed
```

### Backup Strategy (Free)
```bash
# Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Auto backup via GitHub Actions (see .github/workflows/backup.yml)
```

---

## 📧 Email Setup (Resend - Free)

1. [resend.com](https://resend.com) → Sign up
2. Add domain (lub użyj `onboarding@resend.dev` dla testów)
3. Create API Key
4. Add to Vercel:
   ```
   RESEND_API_KEY=re_xxx
   EMAIL_FROM=CS2 Coach <noreply@twoja-domena.com>
   ```

---

## 📁 File Storage (Vercel Blob / Cloudflare R2)

### Option A: Vercel Blob (Najprostsze)
```bash
npm i @vercel/blob
```
```typescript
// src/lib/blob.ts
import { put } from '@vercel/blob'

export async function uploadFile(file: File, folder: string) {
  const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  return blob.url
}
```

### Option B: Cloudflare R2 (Bardziej darmowe)
1. Cloudflare → R2 → Create bucket
2. Generate API Token (Object Read/Write)
3. Use S3-compatible SDK

---

## 🔔 Notifications (Discord Webhook)

1. Discord Server → Settings → Integrations → Webhooks
2. New Webhook → Copy URL
3. Add to Vercel: `DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...`
4. W `CoachSettings` włącz `notificationDiscord`

---

## 📊 Analytics (Vercel Analytics - Free)

1. Vercel Dashboard → Project → Analytics → Enable
2. Auto-tracking: page views, Web Vitals, speed insights

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Plik: `.github/workflows/ci-cd.yml`

**Na każdym PR:**
- Lint + TypeCheck
- Tests
- Build
- Deploy Preview na Vercel

**Na push do main:**
- Wszystkie powyższe
- Deploy Production

**Secrets do dodania w GitHub:**
```
VERCEL_TOKEN          # z vercel.com/account/tokens
VERCEL_ORG_ID         # z .vercel/project.json
VERCEL_PROJECT_ID     # z .vercel/project.json
DATABASE_URL          # Neon connection string
NEXTAUTH_SECRET       # ten sam co na Vercel
NEXTAUTH_URL          # https://twoja-domena.vercel.app
CRON_SECRET           # losowy string dla cron jobs
```

---

## 🛡️ Production Hardening

### 1. Rate Limiting z Upstash Redis (Free: 10k/day)
```bash
npm i @upstash/ratelimit @upstash/redis
```

```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})
```

### 2. Database Connection Pooling (Neon)
Używaj `pooler` connection string:
```
postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require
```

### 3. Monitoring
- **Vercel Logs** - real-time
- **Neon Dashboard** - query performance
- **Sentry** (free: 5k errors/month) - error tracking

---

## 💰 Cost Summary (Monthly)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| Vercel | 100GB bandwidth | ~5GB | $0 |
| Neon | 0.5GB storage | ~50MB | $0 |
| Resend | 3000 emails | ~100 | $0 |
| Cloudflare R2 | 10GB | ~100MB | $0 |
| Upstash Redis | 10k cmds/day | ~5k | $0 |
| **Total** | | | **$0** |

---

## 🚨 Troubleshooting

### Build fails on Vercel
```bash
# Local test
npm run build
# Check for TypeScript errors
npx tsc --noEmit
```

### Database connection errors
1. Sprawdź `DATABASE_URL` na Vercel (musi być pooled URL)
2. Neon → Project → Connection Details → Pooled connection
3. Upewnij się, że `sslmode=require` jest w URL

### NextAuth errors
1. `NEXTAUTH_SECRET` musi być taki sam na Vercel i local
2. `NEXTAUTH_URL` = `https://twoja-domena.vercel.app` (bez trailing slash)
3. Sprawdź `middleware.ts` - matcher paths

### Prisma Client not found
```bash
# W package.json dodaj:
"postinstall": "prisma generate"
```

---

## 📚 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run db:studio        # Open Prisma Studio
npm run db:seed          # Seed demo data

# Production
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma migrate dev   # Create migration
npx prisma db push       # Push schema (dev)
npx prisma generate      # Generate client
```

---

## 🔗 Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Console**: https://console.neon.tech
- **Resend Dashboard**: https://resend.com/dashboard
- **Cloudflare R2**: https://dash.cloudflare.com/r2
- **Upstash Console**: https://console.upstash.com

---

## 📝 Next Steps

1. [ ] Add custom domain na Vercel
2. [ ] Configure Resend z własną domeną
3. [ ] Setup Upstash Redis dla rate limiting
4. [ ] Add Sentry dla error tracking
5. [ ] Configure backup cron job
6. [ ] Add PWA support (offline mode)
7. [ ] Implement Discord bot integration

---

**Happy Coaching! 🎮📚**

*Built with Next.js 14, TypeScript, Prisma, NextAuth, Tailwind CSS - all free tiers.*