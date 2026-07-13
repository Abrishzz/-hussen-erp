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

The app is deployed to Vercel at **https://hussen-erp.vercel.app** (project
`hussenerp`). Firebase config is set as Vercel env vars with `VITE_USE_EMULATORS=false`.

To (re)deploy the frontend: `vercel --prod`.
To deploy security rules/indexes: `firebase deploy --only firestore:rules,firestore:indexes`.

### Seed the real project (users with roles + catalog)

Assigning role custom claims requires Admin privileges, so this uses a service
account key that stays on your machine:

1. Firebase console → Project settings → Service accounts → **Generate new private key**.
2. Run:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/key.json \
   GCLOUD_PROJECT=hussenerp \
   npm run seed:prod
   ```

This creates the three demo users (owner/cashier/staff, password `password123`)
with the correct roles and seeds products, raw materials, suppliers, and settings —
after which the login page's quick-login buttons work live. The script is idempotent.

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
