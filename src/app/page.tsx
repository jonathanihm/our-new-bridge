// CHANGE THIS: update with your city-specific config and types
import config from '../../config/cities/des-moines.json'

import Link from 'next/link'
import styles from './page.module.css'
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
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Our New Bridge</h1>
          
          
          {
            /* Uncomment this section and remove brackets if you are running this project for a specific city or community. You may also
             want to remove the city selector dropdown. You can also customize the subtitle and footer text to be more specific to your community. */
          
            /* <p className={styles.subtitle}>{city.fullName}</p>
            <div className={styles.divider}></div>
            <p className={styles.tagline}>{city.tagline}</p> */
          }

          <HomeClient
            cities={cityOptions}
            defaultCitySlug={defaultCitySlug}
            foodEnabled={features.food.enabled}
            foodTitle={features.food.title}
          />
          
          <p className={styles.comingSoon}>More resources coming soon</p>
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>{city.description}</p>
        <p>
          <Link href="/about" className={styles.footerLink}>
            About
          </Link>
        </p>
        <p className={styles.footerTagline}>Help should be easy.</p>
      </footer>
    </div>
  )
}