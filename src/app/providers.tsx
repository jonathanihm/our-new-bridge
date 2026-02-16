'use client'

import { ChakraProvider } from '@chakra-ui/react'
import { CacheProvider } from '@emotion/react'
import createCache from '@emotion/cache'
import { SessionProvider } from 'next-auth/react'
import { system } from './theme'

const emotionCache = createCache({ key: 'css', prepend: true })

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CacheProvider value={emotionCache}>
        <ChakraProvider value={system}>{children}</ChakraProvider>
      </CacheProvider>
    </SessionProvider>
  )
}
