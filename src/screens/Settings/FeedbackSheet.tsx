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
  const [closing, setClosing] = useState(false)

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
      <Sheet title={t.feedback.title} closing={closing} onClose={onClose} variant="full">
        <div className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
          <div style={{ fontSize: 40 }}>💌</div>
          <div>{t.feedback.thanks}</div>
          <button type="button" className="btn btn-primary" onClick={() => setClosing(true)}>
            {t.common.close}
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    // Full-screen on purpose: as a bottom sheet, focusing the textarea makes
    // iOS pan the whole standalone viewport to reveal the caret and the sheet
    // slides off screen. Anchored at the top, everything already sits above
    // the keyboard and iOS has nothing to pan.
    <Sheet title={t.feedback.title} closing={closing} onClose={onClose} variant="full">
      <div className="stack">
        <div className="muted" style={{ fontSize: 13 }}>
          {t.feedback.hint}
        </div>
        <textarea
          className="textarea"
          rows={7}
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
