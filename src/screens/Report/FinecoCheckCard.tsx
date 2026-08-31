import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import reportStyles from './ReportScreen.module.css'
import styles from './FinecoCheckCard.module.css'
import { FinecoCheckSheet } from './FinecoCheckSheet'
import { parseFinecoFile, getFinecoVerifiedDate } from '../../lib/fineco'
import type { FinecoParseResult } from '../../lib/fineco'
import { dayMonthLabel } from '../../lib/dates'
import { useT } from '../../i18n'

interface Props {
  /** The Report tab's currently selected accounting period (month key). */
  month: string
}

interface LoadedFile {
  parseResult: FinecoParseResult
  fileName: string
}

export function FinecoCheckCard({ month }: Props) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState<LoadedFile | null>(null)

  const verifiedDate = useLiveQuery(() => getFinecoVerifiedDate(month), [month])

  async function handleFile(file: File) {
    setLoading(true)
    try {
      const buf = await file.arrayBuffer()
      const parseResult = await parseFinecoFile(buf)
      setLoaded({ parseResult, fileName: file.name })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`card ${reportStyles.sectionCard}`}>
        <div className={reportStyles.sectionTitleRow}>
          <span className={reportStyles.sectionTitle}>{t.finecoCheck.cardTitle}</span>
          <span className={styles.badge}>{t.finecoCheck.cardBadge}</span>
        </div>
        <div className={styles.description}>{t.finecoCheck.cardDescription}</div>
        <button
          type="button"
          className={`btn btn-primary btn-block ${styles.uploadBtn}`}
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? t.finecoCheck.parsing : t.finecoCheck.uploadButton}
        </button>
        {verifiedDate && (
          <div className={styles.verifiedLine}>{t.finecoCheck.verifiedOn(dayMonthLabel(verifiedDate))}</div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className={styles.hiddenInput}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </div>

      {loaded && (
        <FinecoCheckSheet
          parseResult={loaded.parseResult}
          fileName={loaded.fileName}
          month={month}
          onClose={() => setLoaded(null)}
          onPickAnotherFile={() => inputRef.current?.click()}
        />
      )}
    </>
  )
}
