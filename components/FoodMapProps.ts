import { CityConfig, MapResource } from "@/types"

interface FoodMapProps {
  resources: MapResource[]
  selectedResource: MapResource | null
  onSelectResource: (resource: MapResource | null) => void
  cityConfig: CityConfig
}

export default FoodMapProps