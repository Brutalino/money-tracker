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
    suggestBudget: string
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
    appearance: string
    themeAuto: string
    themeLight: string
    themeDark: string
    language: string
    languageEnglish: string
    languageItalian: string
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
  }
}
