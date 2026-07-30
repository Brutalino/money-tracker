import { useState } from 'react'
import { Sheet } from '../../components/ui/Sheet'
import { sendFeedback } from '../../lib/feedback'
import { useT, useLanguage } from '../../i18n'

interface Props {
  onClose: () => void
}

export function FeedbackSheet({ onClose }: Props) {
  const t = useT()
  const { language } = useLanguage()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const canSend = message.trim().length > 0 && !sending

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      await sendFeedback(message.trim(), language)
      setSent(true)
    } catch {
      setError(t.feedback.error)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <Sheet title={t.feedback.title} onClose={onClose}>
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 40 }}>💌</div>
          <div>{t.feedback.thanks}</div>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t.common.close}
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title={t.feedback.title} onClose={onClose}>
      <div className="stack">
        <div className="muted" style={{ fontSize: 13 }}>
          {t.feedback.hint}
        </div>
        <textarea
          className="textarea"
          rows={5}
          maxLength={2000}
          placeholder={t.feedback.placeholder}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="button" className="btn btn-primary btn-block" disabled={!canSend} onClick={handleSend}>
          {sending ? t.feedback.sending : t.feedback.send}
        </button>
        {error && (
          <div style={{ color: 'var(--status-critical)', fontSize: 12, textAlign: 'center' }}>{error}</div>
        )}
      </div>
    </Sheet>
  )
}
