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

Map component options
---------------------

Two map implementations are provided:

- Google Maps: `components/FoodMap.tsx` — uses `@react-google-maps/api`. Do not commit API keys to config files; instead set an environment variable.
- Leaflet: `components/FoodMapLeaflet.tsx` — uses `react-leaflet` and OpenStreetMap tiles; works without an API key.

To change which map is used, open `src/app/[city]/food/FoodPageClient.tsx` and update the dynamic import. Example to use Leaflet:

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

If you are going to use GitHub, please create a secret with the same secret name
