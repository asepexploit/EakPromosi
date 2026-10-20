# @eak/web — Frontend (React 18 + Vite)

## Target struktur

```
apps/web/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  src/
    main.tsx
    app/
      routes.tsx              # route config
      providers.tsx           # QueryClient, Zustand store, Theme
    pages/
      auth/
      dashboard/
      accounts/
      campaigns/
      broadcasts/
      monitoring/
      reports/
      billing/
      settings/
    components/
      ui/                     # Radix wrappers + Tailwind variants
      forms/
      charts/
      flow/                   # React Flow nodes (campaign builder)
    features/
      <domain>/
        api.ts                # TanStack Query hooks
        store.ts              # Zustand slice (jika perlu)
        schema.ts             # re-export dari @eak/shared
        components/
    lib/
      http.ts                 # fetch wrapper + credentials
      ws.ts                   # WebSocket client (monitoring)
      format.ts
    styles/
      tailwind.css
  tests/
```

## Aturan

* Tidak ada panggilan ke Telegram / Pakasir langsung dari web.
* Semua state server lewat TanStack Query. Zustand hanya untuk UI-state (modal, filter, draft form).
* Komponen UI dasar dari Radix + Tailwind. React Flow untuk campaign builder visual (opsional fase 1.5).
