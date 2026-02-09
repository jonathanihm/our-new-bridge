This is an open source project to allow for quickly creating new help networks in any area you choose.

Our New Bridge can easily be run and managed as a standalone project for you, or you can create a new city/area for the main project and simply add the data.

Getting started
---------------

Run the dev server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open http://localhost:3000

Overview
--------

This repo is organized to make it easy to add new cities and their location data. Key paths:

- `config/cities/<city>.json` — per-city configuration (name, slug, map settings)
- `data/<city>/resources.json` — per-city resources (food locations)
- `src/app/[city]/food/page.tsx` — server page that loads city data and renders `FoodPageClient`
- `src/app/[city]/food/FoodPageClient.tsx` — client UI wrapper (loads map component dynamically)
- `components/FoodMap.tsx` — Google Maps implementation
- `components/FoodMapLeaflet.tsx` — Leaflet/OpenStreetMap implementation

Adding a new city
-----------------

### Recommended (non-technical): use the Admin Dashboard

1. Start the app, then open the Admin login:

- http://localhost:3000/admin

2. Enter the password (set via `ADMIN_PASSWORD` in `.env.local`).

3. On the dashboard, click **Add City** and fill out:

- **City Slug** (used in the URL, like `des-moines`)
- **City Name**
- (Optional) **State**, **Full Name**
- **Center Latitude** and **Center Longitude** (map starting position)

4. After creating the city, click **Manage** next to it and add resources:

- Required: **ID**, **Name**, **Address**
- Optional: **Latitude/Longitude**, **Hours**, **Days Open**, **Phone**, **Notes**, **Requires ID**, **Walk-ins Welcome**

Use **Add Resource** (or **Update Resource** when editing).

5. View the live page:

- `/{city}/food` (example: `/des-moines/food`)

### Advanced: edit JSON files directly

If you prefer file-based editing (JSON mode), add/edit:

- `config/cities/<slug>.json`
- `data/<slug>/resources.json`

Example `config/cities/<slug>.json`:

```json
{
  "slug": "des-moines",
  "city": {
    "name": "Des Moines",
    "state": "Iowa",
    "fullName": "Des Moines Metro"
  },
  "map": {
    "centerLat": 41.5868,
    "centerLng": -93.625,
    "defaultZoom": 12
  }
}
```

Example `data/<slug>/resources.json`:

```json
{
  "food": [
    {
      "id": "des-moines-001",
      "name": "Community Food Bank",
      "address": "123 Main St, Des Moines, IA",
      "lat": 41.5868,
      "lng": -93.625,
      "hours": "9:00 AM - 5:00 PM",
      "daysOpen": "Mon, Tue, Wed, Thu, Fri",
      "phone": "(555) 123-4567",
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

For Google Maps, use the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` environment variable (don’t commit API keys into JSON files).

Fields & features
------------------

- `requiresId` (boolean): toggles badge color and label.
- `walkIn` (boolean): shows a "Walk-ins Welcome" badge.
- `hours`, `daysOpen`, `phone`, `notes`: optional display fields in resource card.
- `externalId` (string): stable identifier used to match resources across imports/exports. In JSON mode it mirrors `id`; in database mode it preserves legacy IDs during migrations.

Map component options
---------------------

Two map implementations are provided:

- Google Maps: `components/FoodMap.tsx` — uses `@react-google-maps/api`. Do not commit API keys to config files; instead set an environment variable.
- Leaflet: `components/FoodMapLeaflet.tsx` — uses `react-leaflet` and OpenStreetMap tiles; works without an API key.

Leaflet is completely free and easier to setup. To change which map is used, open `src/app/[city]/food/FoodPageClient.tsx` and update the dynamic import. Example to use Leaflet:

```ts
const leafletFoodMapComponent = '../../../../components/FoodMapLeaflet'
const MapComponent = dynamic<any>(() => import(leafletFoodMapComponent).then(m => m.default), { ssr: false })
```


Scaffolding suggestion
----------------------
#TODO - create scripts to scaffold cities

Add a small script `scripts/add-city.ts` that copies a config template and sample resources into `config/cities/<city>.json` and `data/<city>/resources.json`. Also consider exposing `DEFAULT_CITY` env var for fallback redirects.

Environment variables (recommended)
---------------------------------

Update `.env.local` in the project root and add your Google Maps key

The server loader in `src/app/[city]/food/page.tsx` will automatically use the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

For address-only resource entry, set `GOOGLE_GEOCODING_API_KEY` (or reuse `GOOGLE_MAPS_API_KEY`). The admin API will geocode the address and store lat/lng automatically.

If you are going to use GitHub, please create a secret with the same secret name

Data sources
------------

This app can read data from one of three sources:

- `database` (recommended for production): uses Prisma/Postgres
- `airtable` (read-only in app): edits happen in Airtable UI
- `json` (local testing only): reads/writes `config/` and `data/` files on disk

Select the source with a single env var:

```
DATA_SOURCE=database
```

Valid values: `database`, `airtable`, `json` (or leave unset for auto-detect).

Important: `json` mode only works for local testing. Most production hosts use a read-only or ephemeral filesystem, so JSON edits will fail or be wiped on redeploy. Use `database` or `airtable` in production.

Airtable setup (optional)
-------------------------

Use Airtable as a read-only data source for public pages (admin edits happen in Airtable).

Step 1: Create a base and tables

1. Create a new Airtable base.
2. Add a table named `Cities` with these fields:
  - `slug` (single line text)
  - `name` (single line text)
  - `state` (single line text)
  - `fullName` (single line text)
  - `tagline` (single line text)
  - `description` (long text)
  - `centerLat` (number, precision 6)
  - `centerLng` (number, precision 6)
  - `defaultZoom` (number)
  - `mapType` (single line text, e.g. `google` or `leaflet`)
3. Add a table named `Resources` with these fields:
  - `externalId` (single line text)
  - `citySlug` (single line text; must match a Cities `slug`)
  - `category` (single select: `food`, `shelter`, `housing`, `legal`)
  - `name` (single line text)
  - `address` (single line text)
  - `lat` (number, precision 6)
  - `lng` (number, precision 6)
  - `hours` (single line text)
  - `daysOpen` (single line text)
  - `phone` (single line text)
  - `website` (url)
  - `requiresId` (checkbox)
  - `walkIn` (checkbox)
  - `notes` (long text)

Step 2: Create an API key

1. In Airtable, go to Account > Developer hub > Personal access tokens.
2. Create a token with `data.records:read` access to your base.

Step 3: Configure environment variables

Add these to `.env.local` (or your hosting provider settings):

```
DATA_SOURCE=airtable
AIRTABLE_API_KEY=your_token
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_CITIES_TABLE=Cities
AIRTABLE_RESOURCES_TABLE=Resources
```

Step 4: Restart the server

Restart `npm run dev` (or your production deploy). The app will read from Airtable.

Notes
-----

- Airtable mode is read-only in the app; use Airtable UI for edits.
- To switch sources, set `DATA_SOURCE=database`, `DATA_SOURCE=airtable`, or `DATA_SOURCE=json`.
