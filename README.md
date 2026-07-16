# 💰 Money Tracker

App personale per tracciare spese, budget e risparmi. PWA installabile sul telefono, pensata per un uso quotidiano rapidissimo: registrare una spesa richiede meno di 5 secondi.

**App live:** https://brutalino.github.io/money-tracker/

## Cosa fa

- **Spese** — inserimento rapido con tastierino numerico e categorie a icone; storico per mese con ricerca e filtri
- **Costi fissi** — bollette, abbonamenti e rate senza date: ogni voce ha solo importo e frequenza (mensile/bimestrale/trimestrale/annuale) e viene convertita in equivalente mensile, registrato automaticamente il 1° del mese
- **Budget mensile** — budget per categoria a cifre intere, barre di avanzamento con soglie 80%/100%, suggerimenti automatici basati sui mesi precedenti (arrotondati ai 5€), confronto mese su mese
- **Risparmi** — obiettivi multipli con target e scadenza, contributi, proiezione di raggiungimento
- **Report** — torta per categoria, entrate vs uscite (6 mesi), andamento per categoria, tasso di risparmio
- **Dati** — tutto in locale sul dispositivo (IndexedDB), nessun account, nessun server; export/import JSON e export CSV

Tutta in italiano, valuta EUR, tema chiaro/scuro/auto.

## Installazione sul telefono (iOS)

1. Apri l'URL in **Safari**
2. Condividi → **Aggiungi a schermata Home**
3. L'app funziona anche offline; si aggiorna da sola alla riapertura dopo un deploy

> I dati vivono nel contenitore dell'app installata: rimuovere l'icona li cancella. Fai un backup da **Impostazioni → Esporta JSON** prima di rimuoverla o cambiare telefono.

## Stack

React 18 + TypeScript + Vite · Dexie (IndexedDB) · Recharts · vite-plugin-pwa · CSS Modules

Tutti gli importi sono gestiti in **centesimi interi**; le transazioni generate dai costi fissi hanno id deterministico (`rec-<recurringId>-<yyyy-mm>`) così la materializzazione è idempotente anche tra dispositivi concorrenti.

```
src/
  db/          schema Dexie (v2) e tipi
  lib/         logica pura: money, dates, recurring, stats, budgets, backup
  components/  UI riusabile (AppShell, BottomNav, QuickEntry, charts, ...)
  screens/     una cartella per tab: Home, Spese, Budget, Risparmi, Report, Settings
```

## Sviluppo

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # tsc + vite build
npm run preview   # serve il bundle di produzione su :4173
```

**Deploy:** push su `main` → GitHub Actions compila e pubblica su GitHub Pages automaticamente.

## Note iOS (imparate a caro prezzo)

- `apple-mobile-web-app-status-bar-style` deve restare **`default`**: con `black-translucent` iOS dimensiona la finestra standalone come schermo−status bar ma la ancora in alto, lasciando una banda morta di ~62pt in fondo
- Niente `100dvh`/percentuali su `html/body` da sole: si usa `100vh` + la variabile `--app-height` misurata via JS in `index.html` (bug WebKit #237961 e affini)
- "Aggiungi a schermata Home" **fotografa l'HTML che il service worker sta servendo** — per questo il SW è registrato manualmente con `immediate: true` (vedi `src/main.tsx`), così gli aggiornamenti si attivano subito
- In caso di problemi di layout su un dispositivo: **Impostazioni → Diagnostica** dentro l'app mostra versione, viewport e safe-area reali
