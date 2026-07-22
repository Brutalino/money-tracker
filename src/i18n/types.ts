/**
 * Shared shape for both language dictionaries. `en.ts` and `it.ts` each
 * `satisfies TranslationKeys`, so TypeScript errors at build time on any
 * missing or extra key in either file.
 */
export interface TranslationKeys {
  common: {
    save: string
    saveChanges: string
    cancel: string
    close: string
    back: string
    delete: string
    edit: string
    add: string
    name: string
    emoji: string
    date: string
    noteOptional: string
    total: string
    loading: string
    saveFailed: string
    deleteFailed: string
    category: string
    other: string
    all: string
    reactivate: string
    notAvailable: string
    seeAll: string
    amountOfTarget: (amount: string, target: string) => string
    perMonth: (amount: string) => string
  }
  nav: {
    ariaLabel: string
    home: string
    expenses: string
    budget: string
    savings: string
    report: string
  }
  header: {
    settingsAriaLabel: string
  }
  monthSelector: {
    prevMonth: string
    nextMonth: string
  }
  finance: {
    income: string
    incomePlural: string
    expense: string
    expensePlural: string
    balance: string
  }
  transactionRow: {
    categoryFallback: string
    generatedFromRecurring: string
  }
  fab: {
    addTransaction: string
  }
  keypad: {
    deleteAriaLabel: string
    decimalAriaLabel: string
  }
  pace: {
    good: string
    critical: string
    warning: string
    wayAhead: string
  }
  charts: {
    noExpensesToShow: string
    noDataRecentMonths: string
    noExpensesInCategory: string
  }
  home: {
    canStillSpend: string
    spentOfBudget: (spent: string, budget: string) => string
    observeModeTitle: string
    observeModeText: string
    goToBudget: string
    noGoalsSubtitle: string
    recentTransactions: string
    noTransactionsSubtitle: string
    savingsTargetLine: (amount: string, detail?: string) => string
  }
  transactions: {
    noneTitle: string
  }
  goals: {
    noGoalsTitle: string
  }
  quickEntry: {
    closeAriaLabel: string
    deleteAriaLabel: string
    notePlaceholder: string
    chooseCategory: string
    enterAmount: string
    confirmDelete: string
  }
  spese: {
    fixedCostsHeader: (activeCount: number) => string
    addFixedCostAriaLabel: string
    noFixedCosts: string
    disabledSuffix: string
    searchPlaceholder: string
    noTransactionsFilteredSubtitle: string
  }
  frequency: {
    monthly: string
    bimonthly: string
    quarterly: string
    annual: string
  }
  recurringForm: {
    editTitle: string
    newTitle: string
    expenseOption: string
    incomeOption: string
    namePlaceholder: string
    amountLabel: string
    frequencyLabel: string
    deactivate: string
    confirmDelete: string
    confirmDeleteThisMonthTx: (amount: string) => string
    deleteFailedRetry: string
  }
  budget: {
    totalBudget: string
    suggestFromHabits: string
    suggestWithTarget: string
    copyFrom: (month: string) => string
    noBudgetToCopy: (month: string) => string
    confirmCopy: (from: string, to: string) => string
    noCategoriesTitle: string
    noCategoriesSubtitle: string
    budgetForCategoryAriaLabel: (category: string) => string
    spent: (amount: string) => string
    remaining: string
    exceededBy: string
    noBudget: string
    suggestedBudgetTitle: string
    notEnoughHistory: string
    suggestExplanation: string
    applyToMonth: string
  }
  risparmi: {
    leftoverOf: (month: string) => string
    leftoverExplanation: string
    setAside: string
    noGoalsSubtitle: string
    newGoal: string
  }
  goalCard: {
    reached: string
    deadlinePassed: string
    byDeadline: (month: string, amount: string) => string
    projection: (month: string) => string
    addContributionsForProjection: string
    editGoalAriaLabel: string
    addContribution: string
  }
  goalForm: {
    editTitle: string
    newTitle: string
    nameLabel: string
    namePlaceholder: string
    targetLabel: string
    deadlineLabel: string
    confirmDelete: string
    archive: string
  }
  contributionSheet: {
    title: (goalName: string) => string
    amountLabel: string
  }
  report: {
    savingsRate: string
    avg6Months: string
    expensesByCategory: string
    incomeVsExpenses6m: string
    categoryTrend: string
  }
  settings: {
    title: string
    guideTitle: string
    openGuide: string
    appearance: string
    themeAuto: string
    themeLight: string
    themeDark: string
    language: string
    languageEnglish: string
    languageItalian: string
    periodTitle: string
    periodStartLabel: string
    periodFirstDay: string
    periodDayN: (day: number) => string
    periodSheetTitle: string
    periodExplainer: string
    periodFootnote: string
    expenseCategories: string
    incomeCategories: string
    archivedTag: string
    newExpenseCategory: string
    newIncomeCategory: string
    dataSection: string
    exportBackupJson: string
    exportTransactionsCsv: string
    importBackupJson: string
    dangerZone: string
    deleteAllData: string
    diagnostics: string
    invalidBackupFile: string
    confirmImport: string
    importSuccess: string
    readFileFailed: string
    confirmDeleteAll1: string
    confirmDeleteAll2: string
    deleteAllSuccess: string
    diagVersion: string
    diagStandalone: string
    diagDisplayMode: string
    diagViewportSize: string
    diagScreenSize: string
    diagVisualViewportHeight: string
    diagSafeAreaTop: string
    diagSafeAreaRight: string
    diagSafeAreaBottom: string
    diagSafeAreaLeft: string
  }
  categoryForm: {
    editTitle: string
    newTitle: string
    colorLabel: string
    reactivateCategory: string
    archiveCategory: string
    flexibilityLabel: string
    flexibilityEssential: string
    flexibilityEssentialHint: string
    flexibilityFlexible: string
    flexibilityVeryFlexible: string
    flexibilityVeryFlexibleHint: string
    habitLabel: string
    habitHint: string
  }
  smartBudget: {
    title: string
    targetQuestion: string
    targetInputLabel: string
    linkGoalLabel: string
    linkGoalNone: string
    goalPaceHint: (amount: string) => string
    motivationLabel: string
    motivationPlaceholder: string
    continue: string
    noIncomeTitle: string
    noIncomeBody: string
    absurdTitle: string
    absurdMessage: (target: string, max: string) => string
    adjustTarget: string
    noCutsNeededBanner: (slack: string) => string
    cutsAppliedBanner: (target: string) => string
    insufficientBanner: (max: string, target: string) => string
    proceedWithMax: string
    lowerTarget: string
    baselineLabel: string
    proposedLabel: string
    categoryBudgetAriaLabel: (category: string) => string
    habitInsight: (name: string, monthly: string, yearly: string) => string
    confirm: string
    noHistoryTitle: string
    noHistoryBody: string
  }
  guide: {
    title: string
    intro: string
    sections: {
      gettingStarted: { title: string; body: string[] }
      home: { title: string; body: string[] }
      addTransaction: { title: string; body: string[] }
      spese: { title: string; body: string[] }
      recurring: { title: string; body: string[] }
      budget: { title: string; body: string[] }
      risparmi: { title: string; body: string[] }
      report: { title: string; body: string[] }
      settings: { title: string; body: string[] }
    }
  }
  welcome: {
    title: string
    subtitle: string
    bullet1: string
    bullet2: string
    bullet3: string
    openGuide: string
    skip: string
  }
}
