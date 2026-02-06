// CHANGE THIS: update with your city-specific config and types
import config from '../../config/cities/des-moines.json'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import styles from './page.module.css'
import type { CityConfig } from '../../types'

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

export default function Home() {
  // use `city` and `features` as before
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Our New Bridge</h1>
          <p className={styles.subtitle}>{city.fullName}</p>
          <div className={styles.divider}></div>
          <p className={styles.tagline}>{city.tagline}</p>
          
          <div className={styles.buttons}>
            {features.food.enabled && (
              <Link href={`/${cityConfig.slug}/food`} className={styles.primaryButton}>
                <MapPin size={24} />
                <span>{features.food.title}</span>
              </Link>
            )}
          </div>
          
          <p className={styles.comingSoon}>More resources coming soon</p>
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>{city.description}</p>
        <p className={styles.footerTagline}>Help should be easy.</p>
      </footer>
    </div>
  )
}