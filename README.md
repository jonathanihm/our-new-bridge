This is an open source project to allow for quickly create new help networks in any area you choose.

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

1. Create a config file at `config/cities/<city>.json` with at least:

```json
{
  "name": "Des Moines",
  "slug": "des-moines",
  "map": {
    "centerLat": 41.5868,
    "centerLng": -93.6250,
    "defaultZoom": 12,
    "googleApiKey": "YOUR_GOOGLE_KEY"
  }
}
```

2. Add resources at `data/<city>/resources.json` using this shape:

```json
{
  "food": [
    {
      "id": "unique-id",
      "name": "Site name",
      "address": "123 Main St",
      "lat": "41.5868",
      "lng": "-93.6250",
      "hours": "10:00 AM - 2:00 PM",
      "daysOpen": "Mon, Wed, Fri",
      "phone": "(555) 555-5555",
      "requiresId": false,
      "walkIn": true,
      "notes": "Additional notes"
    }
  ]
}

You can have ChatGPT manually create these with you or create a small application to help you with this.
```

3. Visit `/<city>/food` (for example `/des-moines/food`). The server page will read the config and resources files and pass them to the client wrapper.

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