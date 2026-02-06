import { CityConfig, FoodResource } from "@/types"

interface FoodMapProps {
  resources: FoodResource[]
  selectedResource: FoodResource | null
  onSelectResource: (resource: FoodResource | null) => void
  cityConfig: CityConfig
}

export default FoodMapProps