import { useEffect, useState } from 'react'
import styles from './components/AppShell.module.css'
import { BottomNav } from './components/BottomNav'
import { Fab } from './components/Fab'
import { QuickEntrySheet } from './components/QuickEntry/QuickEntrySheet'
import { WelcomeSheet } from './components/WelcomeSheet'
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

  useEffect(() => {
    let cancelled = false
    async function init() {
      await ensureSeeded()
      await dedupeMaterializedTransactions()
      await materializeRecurring()
      const mode = await getStoredTheme()
      applyThemeToDocument(mode)
      if (!(await getOnboardingDone())) {
        // Only fresh installs (zero transactions) see the welcome sheet —
        // existing active users must never see it, even if they somehow
        // never had the flag set to true.
        const txCount = await db.transactions.count()
        if (txCount === 0) {
          setWelcomeOpen(true)
        } else {
          await setOnboardingDone()
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
    </div>
  )
}

export default App
