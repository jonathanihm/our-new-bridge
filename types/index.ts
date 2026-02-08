export interface FoodResource {
  id: number
  name: string
  address: string
  city: string
  lat: number
  lng: number
  phone: string
  website?: string | null
  hours: string
  daysOpen: string
  requiresId: boolean
  proofOfAddress?: boolean
  incomeLimits?: boolean
  walkIn: boolean
  familyFriendly?: boolean
  accessibilityNotes?: string
  notes: string
  lastVerified: string
}

export interface ShelterResource {
  id: number
  name: string
  address: string
  city: string
  lat: number
  lng: number
  phone: string
  website?: string | null
  hours: string
  walkIn: boolean
  familiesAllowed: boolean
  curfew?: string
  petFriendly?: boolean
  seasonal?: boolean
  notes: string
  lastVerified: string
}

export interface HousingResource {
  id: number
  name: string
  address: string
  city: string
  phone: string
  website?: string | null
  helpType: 'rent' | 'utilities' | 'eviction' | 'counseling' | 'general'
  appointmentRequired: boolean
  notes: string
  lastVerified: string
}

export interface LegalResource {
  id: number
  name: string
  address: string
  city: string
  phone: string
  website?: string | null
  focusArea: 'housing' | 'domestic_violence' | 'workers' | 'immigration' | 'general'
  freeOrLowCost: 'free' | 'low-cost' | 'sliding-scale'
  notes: string
  lastVerified: string
}

export interface ResourcesData {
  food: FoodResource[]
  shelter: ShelterResource[]
  housing: HousingResource[]
  legal: LegalResource[]
}

export type ResourceType = keyof ResourcesData

// Minimal shared shape used by the map + list UI.
export interface MapResource {
  id: string
  name: string
  address: string
  lat?: number | null
  lng?: number | null
  hours?: string
  daysOpen?: string
  phone?: string
  website?: string
  notes?: string
  requiresId?: boolean
  walkIn?: boolean
}

export interface CityConfig {
  slug?: string,
  map: {
    centerLat: number
    centerLng: number
    defaultZoom: number
    googleApiKey?: string
    bounds?: {
      north: number
      south: number
      east: number
      west: number
    }
  }
  features: {
    food: FeatureConfig
    shelter: FeatureConfig
    housing: FeatureConfig
    legal: FeatureConfig
  }
  contact: {
    email: string
    volunteer: boolean
  }
  branding: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
  }
  city?: {
    fullName?: string
    tagline?: string
    description?: string
  }
}

export interface FeatureConfig {
  enabled: boolean
  title: string
  icon: string
}