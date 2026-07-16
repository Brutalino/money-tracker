import { useEffect, useState } from 'react'
import styles from './components/AppShell.module.css'
import { BottomNav } from './components/BottomNav'
import { Fab } from './components/Fab'
import { QuickEntrySheet } from './components/QuickEntry/QuickEntrySheet'
import { SettingsScreen } from './screens/Settings/SettingsScreen'
import { HomeScreen } from './screens/Home/HomeScreen'
import { SpeseScreen } from './screens/Spese/SpeseScreen'
import { BudgetScreen } from './screens/Budget/BudgetScreen'
import { RisparmiScreen } from './screens/Risparmi/RisparmiScreen'
import { ReportScreen } from './screens/Report/ReportScreen'
import type { TabKey } from './types/nav'
import { ensureSeeded } from './lib/seed'
import { materializeRecurring, dedupeMaterializedTransactions } from './lib/recurring'
import { applyThemeToDocument, getStoredTheme } from './lib/theme'

function App() {
  const [ready, setReady] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      await ensureSeeded()
      await dedupeMaterializedTransactions()
      await materializeRecurring()
      const mode = await getStoredTheme()
      applyThemeToDocument(mode)
      if (!cancelled) setReady(true)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div className={styles.root}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <span className="muted">Caricamento...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
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
      {settingsOpen && <SettingsScreen onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}

export default App
