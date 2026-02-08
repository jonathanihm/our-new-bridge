# Our New Bridge

Our New Bridge is a starter kit for publishing local “help maps” (food, shelter, housing, legal) for any city.

Non-technical users should use the Admin Dashboard to add/edit cities and locations.

## Quick Start (Local)

Prereq: Node.js 18+

### Option A (recommended): use the setup script

**Windows (PowerShell):**

```powershell
Set-ExecutionPolicy -Scope Process Bypass; .\setup.ps1
```

**macOS/Linux (bash):**

```bash
chmod +x setup.sh
./setup.sh
```

The setup script installs dependencies and creates a `.env` file from `.env.example` (used for optional map keys).

### Option B: manual setup

```bash
npm install
```

Create `.env.local` (used by Next.js and by the Prisma scripts in `package.json`):

```bash
ADMIN_PASSWORD=admin123
```

(Optional) If you ran the setup script, it created `.env` already. You can leave it as-is unless you want to add a Google Maps key.

Run:

```bash
npm run dev
```

Open:
- App: http://localhost:3000/des-moines/food
- Admin: http://localhost:3000/admin

## Data Storage Options

This project supports two modes:

1) **JSON mode (simplest):** no database. Data lives in `config/` and `data/`.
2) **Supabase mode (recommended for deployments):** persistent cloud database.

The app automatically uses Supabase mode when `DATABASE_URL` is set and starts with `postgresql://` or `postgres://`.

## Supabase Setup (Optional)

1) Create a Supabase project and copy the **URI** connection string.

2) Update `.env.local`:

```bash
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=your-secure-password
```

3) Push schema:

```bash
npm run prisma:push
```

4) (Optional) Import existing JSON data into Supabase:

```bash
npm run migrate:json
```

If your network cannot reach Supabase, run the schema push from CI/GitHub Actions (Actions tab).

## Admin Dashboard

The Admin Dashboard works in both JSON mode and Supabase mode.

- URL: http://localhost:3000/admin
- Password: whatever you set as `ADMIN_PASSWORD` in `.env.local`
- Backup: use **Export** to download a single JSON file containing the same schema as `config/cities/*` + `data/*/resources.json`

## Routes (Resource Types)

All resource types reuse the same page UI. Use these routes:

- `/{city}/food`
- `/{city}/shelter`
- `/{city}/housing`
- `/{city}/legal`

These can be enabled/disabled per city via `config/cities/<slug>.json` → `features.<type>.enabled`.

## JSON File Schemas (If You Prefer Editing Files)

### City config

Create: `config/cities/your-city.json`

```json
{
  "slug": "your-city",
  "city": {
    "name": "Your City",
    "state": "Your State",
    "fullName": "Your City Metro",
    "tagline": "Find help. Fast.",
    "description": "A simple, humane platform for finding essential resources"
  },
  "map": {
    "centerLat": 41.5868,
    "centerLng": -93.625,
    "defaultZoom": 12
  },
  "features": {
    "food": { "enabled": true, "title": "Find Free Food", "icon": "🍽️" },
    "shelter": { "enabled": false, "title": "Find Shelter", "icon": "🏠" },
    "housing": { "enabled": false, "title": "Housing Help", "icon": "🏘️" },
    "legal": { "enabled": false, "title": "Legal Help", "icon": "⚖️" }
  },
  "contact": {
    "email": "hello@ournewbridge.org",
    "volunteer": true
  },
  "branding": {
    "primaryColor": "#3a5a40",
    "secondaryColor": "#588157",
    "accentColor": "#a3b18a",
    "backgroundColor": "#fdfbf7"
  }
}
```

### Resources

Create: `data/your-city/resources.json`

```json
{
  "food": [
    {
      "id": "your-city-001",
      "name": "Community Food Bank",
      "address": "123 Main St, Your City, ST 12345",
      "lat": 41.5868,
      "lng": -93.625,
      "hours": "9:00 AM - 5:00 PM",
      "daysOpen": "Mon, Tue, Wed, Thu, Fri",
      "phone": "(555) 123-4567",
      "website": "https://example.org",
      "requiresId": false,
      "walkIn": true,
      "notes": "Free food available"
    }
  ],
  "shelter": [],
  "housing": [],
  "legal": []
}
```

## Maps

Default is OpenStreetMap/Leaflet (no API key).

Google Maps is supported if you set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (either in `.env.local` or in `.env`).

## Key Commands

```bash
npm run dev
npm run validate
npm run prisma:push
npm run migrate:json
```

## Troubleshooting

**Port 3000 is in use**

```bash
npm run dev -- -p 3001
```

**Supabase not taking effect**

- Confirm `DATABASE_URL` is present in `.env.local` and starts with `postgresql://` or `postgres://`.
- Restart `npm run dev`.
