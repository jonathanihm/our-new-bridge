'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Menu, X, ChevronDown, ChevronRight, Check, Coffee } from 'lucide-react'

type CityOption = { slug: string; name: string }

interface NavigationMenuProps {
  pageTitle: string
  currentPage: 'home' | 'about' | 'city'
  currentCitySlug?: string
  cities: CityOption[]
  addLocationUrl?: string
  resourceType?: string
}

export default function NavigationMenu({
  pageTitle,
  currentPage,
  currentCitySlug,
  cities,
  addLocationUrl,
  resourceType = 'food',
}: NavigationMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCitiesExpanded, setIsCitiesExpanded] = useState(false)
  const { status } = useSession()
  const router = useRouter()
  const canSignOut = status === 'authenticated'

  return (
    <>
      <Box
        as="header"
        bg="primary.500"
        color="white"
        px={{ base: 4, md: 6 }}
        py={{ base: 3, md: 4 }}
        boxShadow="md"
        zIndex={1000}
        position={currentPage === 'about' ? 'sticky' : 'relative'}
        top={currentPage === 'about' ? 0 : undefined}
      >
        <Flex align="center" justify="space-between" gap={4}>
          <Button
            bg="transparent"
            color="white"
            p={2}
            minW="auto"
            h="auto"
            _hover={{ bg: 'rgba(255, 255, 255, 0.15)' }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </Button>

          <Heading as="h1" size={{ base: 'lg', md: 'xl' }} flex="1" textAlign="center">
            {pageTitle}
          </Heading>

          <Box w="40px" />
        </Flex>
      </Box>

      {/* Side Menu Drawer */}
      {isMenuOpen && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.600"
          zIndex={9999}
          onClick={() => setIsMenuOpen(false)}
        >
          <Box
            position="absolute"
            top={0}
            left={0}
            bottom={0}
            w={{ base: '280px', sm: '320px' }}
            bg="white"
            boxShadow="2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Flex direction="column" h="full">
              <Flex
                align="center"
                justify="space-between"
                p={4}
                borderBottom="1px"
                borderColor="gray.200"
                bg="primary.500"
                color="white"
              >
                <Heading size="md">Menu</Heading>
                <Button
                  bg="transparent"
                  color="white"
                  p={2}
                  minW="auto"
                  h="auto"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.15)' }}
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X size={24} />
                </Button>
              </Flex>

              <VStack align="stretch" gap={0} flex={1}>
                {/* Home Link */}
                {currentPage === 'home' ? (
                  <Box
                    p={4}
                    bg="gray.50"
                    borderBottom="1px"
                    borderColor="gray.100"
                  >
                    <Flex align="center" justify="space-between">
                      <Text fontSize="lg" color="primary.500" fontWeight="semibold">
                        Home
                      </Text>
                      <Check size={18} color="var(--primary)" />
                    </Flex>
                  </Box>
                ) : (
                  <Link href="/" style={{ textDecoration: 'none' }}>
                    <Box
                      p={4}
                      _hover={{ bg: 'gray.50' }}
                      cursor="pointer"
                      borderBottom="1px"
                      borderColor="gray.100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Text fontSize="lg" color="primary.500" fontWeight="semibold">
                        Home
                      </Text>
                    </Box>
                  </Link>
                )}

                {/* About Link */}
                {currentPage === 'about' ? (
                  <Box
                    p={4}
                    bg="gray.50"
                    borderBottom="1px"
                    borderColor="gray.100"
                  >
                    <Flex align="center" justify="space-between">
                      <Text fontSize="lg" color="primary.500" fontWeight="semibold">
                        About
                      </Text>
                      <Check size={18} color="var(--primary)" />
                    </Flex>
                  </Box>
                ) : (
                  <Link href="/about" style={{ textDecoration: 'none' }}>
                    <Box
                      p={4}
                      _hover={{ bg: 'gray.50' }}
                      cursor="pointer"
                      borderBottom="1px"
                      borderColor="gray.100"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Text fontSize="lg" color="primary.500" fontWeight="semibold">
                        About
                      </Text>
                    </Box>
                  </Link>
                )}

                {/* Cities Collapsible */}
                <Box borderBottom="1px" borderColor="gray.100">
                  <Flex
                    p={4}
                    align="center"
                    justify="space-between"
                    cursor="pointer"
                    _hover={{ bg: 'gray.50' }}
                    onClick={() => setIsCitiesExpanded(!isCitiesExpanded)}
                  >
                    <Text fontSize="lg" color="primary.500" fontWeight="semibold">
                      Cities
                    </Text>
                    {isCitiesExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </Flex>
                  {isCitiesExpanded && (
                    <VStack align="stretch" gap={0}>
                      {(cities || []).map((c) => (
                        <Box
                          key={c.slug}
                          pl={6}
                          pr={4}
                          py={3}
                          cursor="pointer"
                          _hover={{ bg: 'gray.50' }}
                          bg={currentCitySlug === c.slug ? 'gray.50' : 'transparent'}
                          onClick={() => {
                            router.push(`/${c.slug}/${resourceType}`)
                            setIsMenuOpen(false)
                          }}
                        >
                          <Flex align="center" justify="space-between">
                            <Text
                              fontSize="md"
                              color={currentCitySlug === c.slug ? 'primary.500' : 'gray.700'}
                              fontWeight={currentCitySlug === c.slug ? 'semibold' : 'normal'}
                            >
                              {c.name}
                            </Text>
                            {currentCitySlug === c.slug && <Check size={18} color="var(--primary)" />}
                          </Flex>
                        </Box>
                      ))}
                    </VStack>
                  )}
                </Box>

                <Box flex={1} />

                {/* Add Location Button (conditional) */}
                {canSignOut && addLocationUrl && (
                  <Box p={4} borderBottom="1px" borderColor="gray.100">
                    <Link href={addLocationUrl} style={{ textDecoration: 'none' }}>
                      <Button
                        w="full"
                        bg="primary.500"
                        color="white"
                        size="lg"
                        _hover={{ bg: 'primary.600' }}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Add Location
                      </Button>
                    </Link>
                  </Box>
                )}

                <Box flex={0} />

                {/* Ko-fi Button */}
                <Box p={4} borderTop="1px" borderColor="gray.100">
                  <a
                    href="https://ko-fi.com/K3K21TR9I"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <Button
                      w="full"
                      bg="#72a4f2"
                      color="white"
                      size="lg"
                      _hover={{ bg: '#5a8fd6' }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Flex align="center" gap={2}>
                        <Coffee size={20} />
                        <Text>Support me on Ko-fi</Text>
                      </Flex>
                    </Button>
                  </a>
                </Box>

                {/* Sign In/Out Button */}
                <Box
                  p={4}
                  borderTop="1px"
                  borderColor="gray.200"
                  bg="gray.50"
                >
                  {!canSignOut ? (
                    <Button
                      w="full"
                      bg="primary.500"
                      color="white"
                      _hover={{ bg: 'primary.600' }}
                      onClick={() => {
                        setIsMenuOpen(false)
                        signIn('google')
                      }}
                    >
                      Sign In
                    </Button>
                  ) : (
                    <Button
                      w="full"
                      variant="outline"
                      borderColor="primary.500"
                      color="primary.500"
                      _hover={{ bg: 'primary.50' }}
                      onClick={() => {
                        setIsMenuOpen(false)
                        signOut({ callbackUrl: '/' })
                      }}
                    >
                      Sign Out
                    </Button>
                  )}
                </Box>
              </VStack>
            </Flex>
          </Box>
        </Box>
      )}
    </>
  )
}
