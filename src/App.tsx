import { useEffect, useState } from 'react'
import styles from './components/AppShell.module.css'
import { BottomNav } from './components/BottomNav'
import { Fab } from './components/Fab'
import { QuickEntrySheet } from './components/QuickEntry/QuickEntrySheet'
import { WelcomeSheet } from './components/WelcomeSheet'
import { WhatsNewSheet } from './components/WhatsNewSheet'
import { SettingsScreen } from './screens/Settings/SettingsScreen'
import { GuideScreen } from './screens/Guide/GuideScreen'
import { HomeScreen } from './screens/Home/HomeScreen'
import { SpeseScreen } from './screens/Spese/SpeseScreen'
import { BudgetScreen } from './screens/Budget/BudgetScreen'
import { RisparmiScreen } from './screens/Risparmi/RisparmiScreen'
import { ReportScreen } from './screens/Report/ReportScreen'
import type { TabKey } from './types/nav'
import { db } from './db/db'
import { ensureSeeded } from './lib/seed'
import { materializeRecurring, dedupeMaterializedTransactions } from './lib/recurring'
import { applyThemeToDocument, getStoredTheme } from './lib/theme'
import { getOnboardingDone, setOnboardingDone } from './lib/onboarding'
import { changelogToShow, getLastSeenVersion, setLastSeenVersion } from './lib/changelog'
import type { ChangelogEntry } from './lib/changelog'
import { useT } from './i18n'
import { usePeriodStartDay } from './period'

function App() {
  const t = useT()
  const { periodStartDay } = usePeriodStartDay()
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [whatsNew, setWhatsNew] = useState<ChangelogEntry[]>([])

  useEffect(() => {
    let cancelled = false
    async function init() {
      await ensureSeeded()
      await dedupeMaterializedTransactions()
      await materializeRecurring()
      const mode = await getStoredTheme()
      applyThemeToDocument(mode)
      let freshInstall = false
      if (!(await getOnboardingDone())) {
        // Only fresh installs (zero transactions) see the welcome sheet —
        // existing active users must never see it, even if they somehow
        // never had the flag set to true.
        const txCount = await db.transactions.count()
        if (txCount === 0) {
          freshInstall = true
          setWelcomeOpen(true)
        } else {
          await setOnboardingDone()
        }
      }
      // A fresh install has no update to catch up on, so it only records the
      // version it started on. This also keeps the two sheets from stacking.
      if (freshInstall) {
        await setLastSeenVersion(__APP_VERSION__)
      } else {
        const entries = changelogToShow(await getLastSeenVersion(), __APP_VERSION__)
        if (entries.length > 0) {
          if (!cancelled) setWhatsNew(entries)
        } else {
          await setLastSeenVersion(__APP_VERSION__)
        }
      }
      if (!cancelled) setReady(true)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleOpenGuideFromWelcome() {
    setWelcomeOpen(false)
    setGuideOpen(true)
    await setOnboardingDone()
  }

  async function handleSkipWelcome() {
    setWelcomeOpen(false)
    await setOnboardingDone()
  }

  async function handleCloseWhatsNew() {
    setWhatsNew([])
    await setLastSeenVersion(__APP_VERSION__)
  }

  if (!ready) {
    return (
      <div className={styles.root}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="muted">{t.common.loading}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.content} key={periodStartDay}>
        {activeTab === 'home' && (
          <HomeScreen onOpenSettings={() => setSettingsOpen(true)} onNavigate={setActiveTab} />
        )}
        {activeTab === 'spese' && <SpeseScreen onOpenSettings={() => setSettingsOpen(true)} />}
        {activeTab === 'budget' && <BudgetScreen onOpenSettings={() => setSettingsOpen(true)} />}
        {activeTab === 'risparmi' && <RisparmiScreen onOpenSettings={() => setSettingsOpen(true)} />}
        {activeTab === 'report' && <ReportScreen onOpenSettings={() => setSettingsOpen(true)} />}
      </div>

      <Fab onClick={() => setQuickAddOpen(true)} />
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {quickAddOpen && <QuickEntrySheet onClose={() => setQuickAddOpen(false)} />}
      {settingsOpen && (
        <SettingsScreen onClose={() => setSettingsOpen(false)} onOpenGuide={() => setGuideOpen(true)} />
      )}
      {welcomeOpen && (
        <WelcomeSheet onOpenGuide={handleOpenGuideFromWelcome} onSkip={handleSkipWelcome} />
      )}
      {guideOpen && <GuideScreen onClose={() => setGuideOpen(false)} />}
      {whatsNew.length > 0 && <WhatsNewSheet entries={whatsNew} onClose={handleCloseWhatsNew} />}
    </div>
  )
}

export default App
