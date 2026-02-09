'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import styles from './page.module.css'

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
    <>
      {options.length > 0 && (
        <div className={styles.cityPicker}>
          <select
            id="city"
            className={styles.cityPickerSelect}
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          >
            {options.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.buttons}>
        {props.foodEnabled && selectedSlug && (
          <Link href={`/${selectedSlug}/food`} className={styles.primaryButton}>
            <MapPin size={24} />
            <span>{props.foodTitle}</span>
          </Link>
        )}
      </div>
    </>
  )
}
