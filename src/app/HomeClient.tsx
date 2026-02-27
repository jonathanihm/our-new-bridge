'use client'

import { useMemo, useState } from 'react'
import { Button, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

type CityOption = {
  slug: string
  name: string
}

export default function HomeClient(props: {
  cities: CityOption[]
  defaultCitySlug: string
  foodEnabled: boolean
  foodTitle: string
}) {
  const options = useMemo(() => props.cities, [props.cities])
  const initialSlug = options.find((c) => c.slug === props.defaultCitySlug)?.slug ?? options[0]?.slug ?? ''
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug)

  return (
    <VStack gap={4} width="100%" maxW="400px" mt={2}>
      {options.length > 0 && (
        <select
          id="city"
          value={selectedSlug}
          onChange={(e) => setSelectedSlug(e.target.value)}
          style={{
            width: 'min(360px, 90vw)',
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            borderWidth: '1px',
            borderColor: '#a3b18a',
            borderRadius: '8px',
            backgroundColor: '#fdfbf7',
            color: '#3a5a40',
            fontFamily: "'Crimson Text', Georgia, serif",
          }}
        >
          {options.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {props.foodEnabled && selectedSlug && (
        <Link href={`/${selectedSlug}/food`} style={{ width: '100%', textDecoration: 'none' }}>
          <Button
            size="lg"
            width="100%"
            bg="primary.500"
            color="white"
            _hover={{ 
              bg: '#344e41',
              transform: 'translateY(-2px)',
              boxShadow: '0 6px 20px rgba(58, 90, 64, 0.3)'
            }}
            fontSize="xl"
            px={10}
            py={7}
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={4}
            borderRadius="8px"
            boxShadow="0 4px 12px rgba(58, 90, 64, 0.2)"
            transition="all 0.3s ease"
          >
            <MapPin size={24} />
            <span>{props.foodTitle}</span>
          </Button>
        </Link>
      )}
    </VStack>
  )
}
