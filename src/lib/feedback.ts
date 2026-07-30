// Anonymous in-app feedback, posted straight to a Discord webhook. No SDK,
// no backend: this is the entire wire format.
import { collectDiagnostics } from './diagnostics'

// Discord webhook for user feedback. Public by design (write-only). Filled at release time.
export const FEEDBACK_WEBHOOK_URL: string =
  'https://discord.com/api/webhooks/1532271860484673646/tWy7ak5CExTploN-x2Xcbs2Cv91kdlC9cyRIsULxXkbCs5gishftUj5NzGS-c-jPtoQE'

export async function sendFeedback(message: string, language: string): Promise<void> {
  if (!FEEDBACK_WEBHOOK_URL || !FEEDBACK_WEBHOOK_URL.startsWith('https://')) {
    throw new Error('Feedback webhook is not configured.')
  }

  const diagnostics = collectDiagnostics()
  const deviceInfo = `${diagnostics.standalone}/${diagnostics.displayMode}, ${diagnostics.innerWidth}x${diagnostics.innerHeight}`

  const body = {
    username: 'Money Tracker',
    embeds: [
      {
        title: 'Nuovo feedback',
        description: message,
        color: 5793266,
        fields: [
          { name: 'Versione', value: __APP_VERSION__, inline: true },
          { name: 'Lingua', value: language, inline: true },
          { name: 'Dispositivo', value: deviceInfo, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  }

  // ?wait=true makes Discord return 200 with the created message instead of
  // 204, so res.ok reliably means the feedback was actually delivered.
  const res = await fetch(`${FEEDBACK_WEBHOOK_URL}?wait=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Feedback webhook request failed with status ${res.status}`)
}
