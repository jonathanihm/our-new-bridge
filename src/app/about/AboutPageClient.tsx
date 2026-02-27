"use client"

import { useState } from 'react'
import {
  Box,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Flex,
  Button,
  HStack,
} from '@chakra-ui/react'
import NavigationMenu from '@/components/NavigationMenu/NavigationMenu'

const GITHUB_REPO_URL = 'https://github.com/jonathanihm/our-new-bridge'

type CityOption = { slug: string; name: string }

export default function AboutPageClient({ cities }: { cities: CityOption[] }) {
  const [activeTab, setActiveTab] = useState<'helping' | 'run-your-own'>('helping')

  return (
    <div suppressHydrationWarning>
      <Box minH="100vh" display="flex" flexDirection="column" bg="background">
        <NavigationMenu
          pageTitle="About"
          currentPage="about"
          cities={cities}
          resourceType="food"
        />

        <Box as="main" flex={1} py={8} px={{ base: 4, md: 6, lg: 8 }} maxW="1200px" mx="auto" w="full">
          <VStack gap={8} align="stretch">
            <Box>
              <Heading as="h2" size="3xl" color="primary.500" mb={3}>
                Our Mission
              </Heading>
              <Text fontSize="xl" color="secondary.500">
                A simple, humane platform for finding essential resources.
              </Text>
            </Box>

          <Box pt={6} borderTop="1px" borderColor="border">
            <Heading as="h2" size="xl" color="primary.500" mb={4}>
              Mission
            </Heading>
            <VStack gap={3} align="stretch">
              <Text>
                Our mission is to make it fast and dignified to find help—food, shelter, housing, and legal
                resources—without hunting through outdated lists.
              </Text>
              <Text>
                Communities are always changing. This project is built so that regular people can keep information up to
                date.
              </Text>
            </VStack>
          </Box>

          <Box pt={6} borderTop="1px" borderColor="border">
            <Heading as="h2" size="xl" color="primary.500" mb={4}>
              Get involved
            </Heading>

            {/* Custom tab implementation */}
            <HStack bg="surface" p={1} borderRadius="md" border="1px" borderColor="border" gap={1} display="inline-flex" width="auto">
              <Button
                size="sm"
                onClick={() => setActiveTab('helping')}
                bg={activeTab === 'helping' ? 'primary.500' : 'transparent'}
                color={activeTab === 'helping' ? 'white' : 'gray.700'}
                borderRadius="sm"
                fontWeight={activeTab === 'helping' ? 'semibold' : 'normal'}
                boxShadow={activeTab === 'helping' ? 'sm' : 'none'}
                px={4}
                py={2}
                _hover={{
                  bg: activeTab === 'helping' ? 'primary.600' : 'gray.100',
                }}
                transition="all 0.2s"
              >
                Helping
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab('run-your-own')}
                bg={activeTab === 'run-your-own' ? 'primary.500' : 'transparent'}
                color={activeTab === 'run-your-own' ? 'white' : 'gray.700'}
                borderRadius="sm"
                fontWeight={activeTab === 'run-your-own' ? 'semibold' : 'normal'}
                boxShadow={activeTab === 'run-your-own' ? 'sm' : 'none'}
                px={4}
                py={2}
                _hover={{
                  bg: activeTab === 'run-your-own' ? 'primary.600' : 'gray.100',
                }}
                transition="all 0.2s"
              >
                Run your own version
              </Button>
            </HStack>

            {activeTab === 'helping' && (
              <Box
                mt={4}
                p={5}
                bg="surface"
                borderRadius="xl"
                border="1px"
                borderColor="border"
                boxShadow="sm"
              >
                <Heading as="h3" size="lg" color="primary.500" mb={3}>
                  Helping
                </Heading>
                <Text mb={4}>
                  The biggest impact comes from keeping listings accurate and adding new places as they open.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Volunteer by calling
                    </Heading>
                    <Text fontSize="sm">
                      Pick a few locations and confirm: address, hours, days open, phone number, and any
                      requirements.
                    </Text>
                  </Box>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Volunteer by updating locations
                    </Heading>
                    <Text fontSize="sm">
                      Use the Admin Dashboard to quickly add/edit resources. Small updates keep the map trustworthy.
                    </Text>
                  </Box>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Help create new areas
                    </Heading>
                    <Text fontSize="sm">
                      Start a new city/area and add the first batch of resources so others can build on it.
                    </Text>
                  </Box>
                </SimpleGrid>
              </Box>
            )}

            {activeTab === 'run-your-own' && (
              <Box
                mt={4}
                p={5}
                bg="surface"
                borderRadius="xl"
                border="1px"
                borderColor="border"
                boxShadow="sm"
              >
                <Heading as="h3" size="lg" color="primary.500" mb={3}>
                  Run your own version
                </Heading>
                <Text mb={4}>
                  Want to bring this to your community with your own name, your own cities, and your own partners?
                  You can run your own version—fully branded, tailored to your area, and managed by the people
                  closest to the need.
                </Text>

                <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={4}>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Make it yours
                    </Heading>
                    <Text fontSize="sm">
                      Use your logo, colors, and language. Focus on what matters locally and keep the experience
                      simple. This project is MIT licensed so you can just run with it.
                    </Text>
                  </Box>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Stay in control
                    </Heading>
                    <Text fontSize="sm">
                      Own your data and decide how updates happen—whether it's a small volunteer team or a bigger
                      network.
                    </Text>
                  </Box>
                  <Box bg="background" p={4} borderRadius="lg" border="1px" borderColor="border">
                    <Heading as="h4" size="md" color="primary.500" mb={2}>
                      Go live with confidence
                    </Heading>
                    <Text fontSize="sm">
                      Launch on the hosting provider you already use and keep improving as your community grows.
                    </Text>
                  </Box>
                </SimpleGrid>

                <Box p={4} borderLeft="4px" borderColor="accent.500" bg="surface" borderRadius="lg">
                  <Text>
                    If you're ready to run your own version, start with the project README on{' '}
                    <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#3a5a40' }}>
                      GitHub
                    </a>
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        </VStack>
      </Box>

      <Box as="footer" py={6} textAlign="center" bg="surface" borderTop="1px" borderColor="border">
        <Text fontSize="xl" fontWeight="600" color="primary.500">
          Help should be easy.
        </Text>
      </Box>
    </Box>
    </div>
  )
}
