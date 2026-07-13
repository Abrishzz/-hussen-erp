# Hussen Bakery ERP

A bilingual (Amharic / English) ERP for a bakery in Bulehora, Oromia, Ethiopia.
Built with React 19 + TypeScript + Vite, Firebase (Auth, Firestore, Storage,
Functions, Hosting), Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand, and i18next.

## Roles

| Role | Access |
| --- | --- |
| **owner** | Everything: dashboard, POS, products, inventory, production, HR, finance, reports, settings |
| **cashier** | POS / sales only |
| **staff** | Inventory + production |

## Local development (with Firebase Emulators)

No live Firebase project is required — the app runs fully against the local
Emulator Suite. Requires Node 18+ and Java (for the Firestore emulator).

```bash
npm install

# Terminal 1 — start Auth + Firestore + Storage emulators
npm run emulators

# Terminal 2 — seed demo users + data into the running emulators
npm run seed

# Terminal 3 — start the Vite dev server (http://localhost:3000)
npm run dev
```

`.env.local` is preconfigured with `VITE_USE_EMULATORS=true`, which points the
app at the emulators. The Emulator UI is at http://localhost:4000.

### Demo logins (password for all: `password123`)

| Email | Role |
| --- | --- |
| owner@hussenbakery.com | owner |
| cashier@hussenbakery.com | cashier |
| staff@hussenbakery.com | staff |

## Production (real Firebase)

1. Create a Firebase project and copy `.env.example` to `.env`, filling in the real values.
2. Set `VITE_USE_EMULATORS=false` (or remove it) so the app talks to the real backend.
3. Assign roles via custom claims (the `onUserCreated` Cloud Function sets a role
   from the user's `/users` doc; the owner can manage roles from there).
4. `npm run build` then `firebase deploy`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run lint` | oxlint |
| `npm run emulators` | Auth + Firestore + Storage emulators |
| `npm run seed` | Seed demo users and data into the emulators |

## Status

- **Foundation** — auth, role-based routing, responsive layout (sidebar / mobile
  bottom tabs), i18n (EN/AM with Noto Sans Ethiopic), light/dark themes, shadcn UI kit.
- **Products** — full CRUD (owner).
- **POS** — product grid, cart with per-item and order-level discounts, cash /
  Telebirr / bank payments, change calculation, hold/resume orders, printable +
  PDF receipts, writes to `/sales`.
- **Dashboard** — live KPIs, top-selling chart, monthly net-revenue trend.
- Inventory, production, HR, finance, and reports pages are scaffolded and pending.
