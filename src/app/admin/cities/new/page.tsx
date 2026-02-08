'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import styles from '../../admin.module.css'

export default function NewCityPage() {
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    state: '',
    fullName: '',
    centerLat: '',
    centerLng: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!sessionStorage.getItem('adminToken')) {
      router.push('/admin')
    }
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const token = sessionStorage.getItem('adminToken')

      if (!formData.slug || !formData.name || !formData.centerLat || !formData.centerLng) {
        setError('All required fields must be filled')
        setIsLoading(false)
        return
      }

      const res = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
          city: {
            name: formData.name,
            state: formData.state,
            fullName: formData.fullName || formData.name,
          },
          map: {
            centerLat: parseFloat(formData.centerLat),
            centerLng: parseFloat(formData.centerLng),
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create city')
      }

      router.push('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create city')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.dashboard}>
      <Link href="/admin/dashboard" className={styles.breadcrumbLink}>
        <ArrowLeft size={16} /> Back
      </Link>

      <h1>Create New City</h1>
      <p className={styles.subtitle}>Add a new city to the platform</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="slug">City Slug *</label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={formData.slug}
            onChange={handleChange}
            placeholder="e.g. des-moines"
            required
            disabled={isLoading}
            className={styles.input}
          />
          <small>Used in URL: /{'{slug}'}/food</small>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="name">City Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Des Moines"
            required
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="state">State</label>
          <input
            id="state"
            name="state"
            type="text"
            value={formData.state}
            onChange={handleChange}
            placeholder="e.g. Iowa"
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="e.g. Des Moines Metro"
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="centerLat">Center Latitude *</label>
            <input
              id="centerLat"
              name="centerLat"
              type="number"
              step="0.0001"
              value={formData.centerLat}
              onChange={handleChange}
              placeholder="41.5868"
              required
              disabled={isLoading}
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="centerLng">Center Longitude *</label>
            <input
              id="centerLng"
              name="centerLng"
              type="number"
              step="0.0001"
              value={formData.centerLng}
              onChange={handleChange}
              placeholder="-93.6250"
              required
              disabled={isLoading}
              className={styles.input}
            />
          </div>
        </div>

        <small className={styles.hint}>
          Find coordinates:{' '}
          <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
            Google Maps
          </a>{' '}
          (click the location to see coordinates in URL)
        </small>

        {error && (
          <div className={styles.error}>
            <span>{error}</span>
          </div>
        )}

        <div className={styles.formActions}>
          <Link href="/admin/dashboard" className={styles.cancelButton}>
            Cancel
          </Link>
          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? 'Creating...' : 'Create City'}
          </button>
        </div>
      </form>
    </div>
  )
}
