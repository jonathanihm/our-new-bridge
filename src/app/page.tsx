// CHANGE THIS: update with your city-specific config and types
import config from '../../config/cities/des-moines.json'

import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import type { CityConfig } from '../../types'
import HomeClient from './HomeClient'
import { getCities } from '@/lib/db-utils'

const cityConfig = config as CityConfig

// provide safe defaults if `city` was removed from the config
const city = cityConfig.city ?? {
  fullName: 'Our Community',
  tagline: '',
  description: ''
}

const features = cityConfig.features ?? {
  food: { enabled: false, title: 'Find Free Food' }
}

export default async function Home() {
  const cities = await getCities()
  const cityOptions = (cities || [])
    .map((c) => ({
      slug: String(c.slug),
      name: String(c.name ?? c.slug),
    }))
    .filter((c) => Boolean(c.slug))

  const defaultCitySlug =
    cityOptions.find((c) => c.slug === cityConfig.slug)?.slug ??
    cityOptions[0]?.slug ??
    cityConfig.slug

  // use `city` and `features` as before
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Box
        flex="1"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={8}
        py={8}
        bgGradient="linear(135deg, border 0%, background 100%)"
      >
        <VStack gap={6} textAlign="center" maxW="500px">
          <Heading
            as="h1"
            fontSize={{ base: '3rem', md: '4rem' }}
            color="primary.500"
            fontWeight="400"
            lineHeight="1"
            letterSpacing="-1px"
          >
            Our New Bridge
          </Heading>
          
          {/* Uncomment this section and remove brackets if you are running this project for a specific city or community. You may also
             want to remove the city selector dropdown. You can also customize the subtitle and footer text to be more specific to your community.
          <Text fontSize="2xl" color="secondary.500">{city.fullName}</Text>
          <Box h="2px" w="60px" bg="accent.500" />
          <Text fontSize="xl" color="primary.500">{city.tagline}</Text>
          */}

          <HomeClient
            cities={cityOptions}
            defaultCitySlug={defaultCitySlug}
            foodEnabled={features.food.enabled}
            foodTitle={features.food.title}
          />
          
          <Text fontSize="md" color="accent.500" fontStyle="italic" mt={4}>
            More resources coming soon
          </Text>
        </VStack>
      </Box>
      
      <Box
        as="footer"
        py={8}
        px={8}
        textAlign="center"
        bg="primary.500"
        color="border"
      >
        <VStack gap={2}>
          <Text fontSize="sm">{city.description}</Text>
          <Link href="/about" style={{ color: '#e8dcc4', textDecoration: 'underline' }}>
            About
          </Link>
          <Text fontSize="sm" fontStyle="italic" color="#dad7cd">
            Help should be easy.
          </Text>
        </VStack>
      </Box>
    </Box>
  )
}