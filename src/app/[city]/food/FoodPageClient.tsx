'use client'

// Client wrapper: render the full food page UI using server-provided props
import { useState } from 'react'
import Link from 'next/link'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Link as ChakraLink,
  Container,
} from '@chakra-ui/react'
import { MapPin, Clock, Phone, Info, Navigation, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import type { CityConfig, MapResource, ResourceType } from '../../../../types'
import type FoodMapProps from '../../../../components/FoodMapProps'
import ReportIssueButton from '@/components/ReportIssueButton/ReportIssueButton'
import NavigationMenu from '@/components/NavigationMenu/NavigationMenu'

const googleFoodMapComponent = '../../../../components/FoodMap'
const leafletFoodMapComponent = '../../../../components/FoodMapLeaflet'

const GoogleMapComponent = dynamic<FoodMapProps>(
  () => import(googleFoodMapComponent).then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-gradient-to-b from-[#c8d5b9] to-[#a3b18a] flex items-center justify-center text-xl text-[var(--primary)]">Loading map...</div>,
  }
)

const LeafletMapComponent = dynamic<FoodMapProps>(
  () => import(leafletFoodMapComponent).then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-gradient-to-b from-[#c8d5b9] to-[#a3b18a] flex items-center justify-center text-xl text-[var(--primary)]">Loading map...</div>,
  }
)

type CityOption = { slug: string; name: string }

type ResourcesByType = Partial<Record<ResourceType, MapResource[]>>

export default function FoodPageClient({
  cityConfig,
  resources,
  slug,
  cities = [],
  resourceType = 'food',
  pageTitle = 'Find Free Food',
  listTitle = 'All Food Resources',
}: {
  cityConfig: CityConfig
  resources: ResourcesByType
  slug: string
  cities?: CityOption[]
  resourceType?: ResourceType
  pageTitle?: string
  listTitle?: string
}) {
  const shouldUseGoogle =
    cityConfig.map?.type !== 'leaflet' &&
    typeof cityConfig.map?.googleApiKey === 'string' &&
    cityConfig.map.googleApiKey.trim().length > 0
  const MapComponent = shouldUseGoogle ? GoogleMapComponent : LeafletMapComponent
  const normalizedType: ResourceType = resourceType || 'food'
  const { status } = useSession()
  const canSuggestUpdates = status === 'authenticated'

  const [selectedResource, setSelectedResource] = useState<MapResource | null>(null)
  const resourceList: MapResource[] = Array.isArray(resources?.[normalizedType])
    ? resources[normalizedType] ?? []
    : []

  const buildSuggestUrl = (resource?: MapResource) => {
    const params = new URLSearchParams()
    params.set('category', normalizedType)
    if (resource) {
      params.set('resourceId', resource.id)
      if (resource.name) params.set('name', resource.name)
      if (resource.address) params.set('address', resource.address)
      if (resource.lat !== undefined && resource.lat !== null) params.set('lat', String(resource.lat))
      if (resource.lng !== undefined && resource.lng !== null) params.set('lng', String(resource.lng))
      if (resource.hours) params.set('hours', resource.hours)
      if (resource.daysOpen) params.set('daysOpen', resource.daysOpen)
      if (resource.phone) params.set('phone', resource.phone)
      if (resource.website) params.set('website', resource.website)
      if (resource.notes) params.set('notes', resource.notes)
      if (resource.requiresId !== undefined) params.set('requiresId', String(resource.requiresId))
      if (resource.walkIn !== undefined) params.set('walkIn', String(resource.walkIn))
      if (resource.availabilityStatus) params.set('availabilityStatus', resource.availabilityStatus)
    }
    return `/${slug}/food/suggest?${params.toString()}`
  }

  const formatAvailability = (value?: MapResource['availabilityStatus']) => {
    if (!value) return ''
    if (value === 'not_sure') return 'Not sure'
    return value === 'yes' ? 'Yes' : 'No'
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    const timeZone = cityConfig.city?.timeZone
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
        timeZoneName: timeZone ? 'short' : undefined,
      }).format(parsed)
    } catch {
      return parsed.toLocaleString()
    }
  }

  const handleGetDirections = (resource: MapResource) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(resource.address)}`
    window.open(url, '_blank')
  }

  return (
    <div suppressHydrationWarning>
      <Box minH="100vh" display="flex" flexDirection="column">
        <NavigationMenu
          pageTitle={pageTitle}
          currentPage="city"
          currentCitySlug={slug}
          cities={cities}
          addLocationUrl={canSuggestUpdates ? buildSuggestUrl() : undefined}
          resourceType={normalizedType}
        />

      <Box 
        h={{ base: '350px', sm: '400px', md: '420px' }}
        w="full"
        bg="transparent"
        position="relative"
      >
        <MapComponent
          resources={resourceList}
          selectedResource={selectedResource}
          onSelectResource={setSelectedResource}
          cityConfig={cityConfig}
        />

        {selectedResource && (
          <Box
            position="fixed"
            inset={0}
            bg="blackAlpha.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            p={4}
            zIndex={10000}
            onClick={() => setSelectedResource(null)}
          >
            <Box
              bg="white"
              borderRadius="xl"
              p={{ base: 6, md: 8 }}
              maxW="lg"
              w="full"
              maxH="90vh"
              overflowY="auto"
              boxShadow="2xl"
              position="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                position="absolute"
                top={4}
                right={4}
                bg="var(--surface)"
                borderRadius="full"
                w={8}
                h={8}
                minW={8}
                p={0}
                color="var(--primary)"
                _hover={{ bg: 'var(--border)' }}
                onClick={() => setSelectedResource(null)}
                aria-label="Close"
              >
                <X size={20} />
              </Button>

              <Heading
                as="h2"
                fontSize={{ base: '2xl', md: '3xl' }}
                color="var(--primary)"
                mb={6}
                pr={8}
              >
                {selectedResource.name}
              </Heading>

              <Flex gap={4} mb={5} color="var(--text)" alignItems="flex-start">
                <MapPin size={18} style={{ flexShrink: 0, color: 'var(--secondary)', marginTop: '2px' }} />
                <Text>{selectedResource.address}</Text>
              </Flex>

              <Flex gap={4} mb={5} color="var(--text)" alignItems="flex-start">
                <Clock size={18} style={{ flexShrink: 0, color: 'var(--secondary)', marginTop: '2px' }} />
                <Box>
                  <Text as="strong" display="block" mb={1}>{selectedResource.hours}</Text>
                  <Text fontSize="sm" color="var(--text-light)" mt={1}>{selectedResource.daysOpen}</Text>
                </Box>
              </Flex>

              {selectedResource.phone && (
                <Flex gap={4} mb={5} color="var(--text)" alignItems="flex-start">
                  <Phone size={18} style={{ flexShrink: 0, color: 'var(--secondary)', marginTop: '2px' }} />
                  <a href={`tel:${selectedResource.phone}`} style={{ color: 'var(--primary)' }}>{selectedResource.phone}</a>
                </Flex>
              )}

              <Flex gap={3} flexWrap="wrap" my={6}>
                <Badge
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="medium"
                  bg={!selectedResource.requiresId ? 'var(--success)' : 'var(--warning)'}
                  color={!selectedResource.requiresId ? 'var(--success-text)' : 'var(--warning-text)'}
                >
                  {selectedResource.requiresId ? 'ID Required' : 'No ID Required'}
                </Badge>
                {selectedResource.walkIn && (
                  <Badge
                    px={4}
                    py={2}
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight="medium"
                    bg="var(--success)"
                    color="var(--success-text)"
                  >
                    Walk-ins Welcome
                  </Badge>
                )}
              </Flex>

              {selectedResource.notes && (
                <Flex bg="#f8f6f1" p={4} borderRadius="lg" mt={4} fontSize="sm" color="#444" gap={4} alignItems="flex-start">
                  <Info size={18} style={{ flexShrink: 0, color: 'var(--secondary)' }} />
                  <Text>{selectedResource.notes}</Text>
                </Flex>
              )}

              {(selectedResource.availabilityStatus || selectedResource.lastAvailableAt) && (
                <Box bg="#f8f6f1" border="1px" borderColor="var(--border)" borderRadius="lg" p={3.5} mt={4}>
                  <Flex alignItems="center" gap={2.5} fontWeight="semibold" color="var(--primary)">
                    <Box
                      w="2.5"
                      h="2.5"
                      borderRadius="full"
                      bg={
                        selectedResource.availabilityStatus === 'yes'
                          ? '#2d6a4f'
                          : selectedResource.availabilityStatus === 'no'
                            ? '#b23b3b'
                            : '#9c6d38'
                      }
                      aria-hidden="true"
                    />
                    <Text as="strong">Availability</Text>
                    {selectedResource.availabilityStatus && (
                      <Text ml="auto" fontWeight="bold" color="var(--text)">
                        {formatAvailability(selectedResource.availabilityStatus)}
                      </Text>
                    )}
                  </Flex>
                  {selectedResource.lastAvailableAt && (
                    <Text mt={1.5} color="var(--text-light)" fontSize="sm">
                      Last reported available: {formatDateTime(selectedResource.lastAvailableAt)}
                    </Text>
                  )}
                </Box>
              )}

              <Flex flexDirection={{ base: 'column', sm: 'row' }} gap={3} mt={6}>
                <Button
                  flex={1}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={3}
                  bg="var(--primary)"
                  color="white"
                  px={4}
                  py={2.5}
                  borderRadius="lg"
                  fontSize="base"
                  _hover={{ bg: '#344e41' }}
                  onClick={() => selectedResource && handleGetDirections(selectedResource)}
                >
                  <Navigation size={18} />
                  Get Directions
                </Button>
                {canSuggestUpdates && selectedResource && (
                  <Link href={buildSuggestUrl(selectedResource)}>
                    <Button
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap={2}
                      bg="#f4f1e8"
                      color="var(--primary)"
                      border="1px"
                      borderColor="var(--border)"
                      px={4}
                      py={2.5}
                      borderRadius="lg"
                      fontWeight="semibold"
                      _hover={{ bg: '#ebe4d7' }}
                    >
                      Suggest Update
                    </Button>
                  </Link>
                )}
                {selectedResource && <ReportIssueButton resource={selectedResource} compact={true} />}
              </Flex>
            </Box>
          </Box>
        )}
      </Box>

      <Box bg="white" borderTop="2px" borderColor="var(--border)" p={6} maxH={{ base: '250px', md: '300px' }} overflowY="auto">
        <Heading as="h3" fontSize="xl" color="var(--primary)" mb={4}>{listTitle}</Heading>
        <VStack gap={0} alignItems="stretch">
          {resourceList.map((resource) => (
            <Box
              key={resource.id}
              p={4}
              borderBottom="1px"
              borderColor="var(--surface)"
              cursor="pointer"
              transition="colors 0.2s"
              _hover={{ bg: 'var(--background)' }}
              bg={selectedResource?.id === resource.id ? 'var(--surface)' : 'transparent'}
              borderLeft={selectedResource?.id === resource.id ? '3px' : '0'}
              borderLeftColor={selectedResource?.id === resource.id ? 'var(--primary)' : 'transparent'}
              pl={selectedResource?.id === resource.id ? 'calc(1rem - 3px)' : 4}
              onClick={() => setSelectedResource(resource)}
            >
              <Flex alignItems="center" gap={2} mb={2} color="var(--primary)">
                <MapPin size={16} style={{ flexShrink: 0 }} />
                <Text as="strong">{resource.name}</Text>
              </Flex>
              <Text fontSize="sm" color="var(--text-light)" ml={6} mb={2}>{resource.hours || ''}</Text>
              {resource.lastAvailableAt && (
                <Text fontSize="xs" color="var(--text-light)" ml={6} mb={1.5}>
                  Last reported available: {formatDateTime(resource.lastAvailableAt)}
                </Text>
              )}
              {resource.availabilityStatus && (
                <Text fontSize="xs" color="var(--text-light)" ml={6} mb={1.5}>
                  Availability: {formatAvailability(resource.availabilityStatus)}
                </Text>
              )}
              {!resource.requiresId && resource.requiresId !== undefined && (
                <Badge
                  display="inline-block"
                  px={3}
                  py={1}
                  borderRadius="2xl"
                  fontSize="xs"
                  ml={6}
                  bg="var(--success)"
                  color="var(--success-text)"
                >
                  No ID Required
                </Badge>
              )}
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
    </div>
  )
}