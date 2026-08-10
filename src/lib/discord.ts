import { prisma } from '@/lib/prisma'

// Discord webhook notifications for the coach. The webhook URL and the
// notificationDiscord toggle live in CoachSettings (settings page). This
// helper is fire-and-forget: a Discord failure must never fail the request
// that triggered the notification.

interface DiscordNotificationInput {
  coachId: string
  title: string
  description: string
  color?: number // Discord embed color (decimal). Default: teal #2de5ca
  fields?: { name: string; value: string; inline?: boolean }[]
}

export async function sendDiscordNotification({
  coachId,
  title,
  description,
  color = 3007946, // 0x2DE5CA
  fields = [],
}: DiscordNotificationInput): Promise<void> {
  try {
    const settings = await prisma.coachSettings.findUnique({
      where: { coachId },
      select: { notificationDiscord: true, discordWebhook: true },
    })

    if (!settings?.notificationDiscord || !settings.discordWebhook) {
      return
    }

    await fetch(settings.discordWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'CS2 Coaching',
        embeds: [
          {
            title,
            description,
            color,
            fields,
            timestamp: new Date().toISOString(),
            footer: { text: 'CS2 Coaching Panel' },
          },
        ],
      }),
    })
  } catch (error) {
    console.error('Discord notification error:', error)
  }
}
