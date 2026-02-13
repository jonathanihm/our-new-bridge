'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './suggest.module.css'

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error'

type PlaceSuggestion = {
  placeId: string
  description: string
}

type FormState = {
  resourceId: string
  name: string
  address: string
  lat: string
  lng: string
  hours: string
  daysOpen: string
  phone: string
  website: string
  notes: string
  requiresId: boolean
  walkIn: boolean
  category: 'food' | 'shelter' | 'housing' | 'legal'
  availabilityStatus: 'yes' | 'no' | 'not_sure'
}

function readBool(value: string | null) {
  return value === 'true' || value === '1'
}

export default function SuggestResourceUpdatePage() {
  const params = useParams() as { city?: string }
  const searchParams = useSearchParams()
  const { status } = useSession()
  const [statusMessage, setStatusMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suppressSuggestions, setSuppressSuggestions] = useState(false)
  const [lastSelectedAddress, setLastSelectedAddress] = useState('')
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const initialState = useMemo<FormState>(() => {
    return {
      resourceId: searchParams.get('resourceId') || '',
      name: searchParams.get('name') || '',
      address: searchParams.get('address') || '',
      lat: searchParams.get('lat') || '',
      lng: searchParams.get('lng') || '',
      hours: searchParams.get('hours') || '',
      daysOpen: searchParams.get('daysOpen') || '',
      phone: searchParams.get('phone') || '',
      website: searchParams.get('website') || '',
      notes: searchParams.get('notes') || '',
      requiresId: readBool(searchParams.get('requiresId')),
      walkIn: readBool(searchParams.get('walkIn')),
      category: (searchParams.get('category') || 'food') as FormState['category'],
      availabilityStatus: (searchParams.get('availabilityStatus') || 'not_sure') as FormState['availabilityStatus'],
    }
  }, [searchParams])

  const [formData, setFormData] = useState<FormState>(initialState)

  useEffect(() => {
    if (initialState.address) {
      setLastSelectedAddress(initialState.address)
    }
  }, [initialState.address])

  const isEditing = Boolean(formData.resourceId)
  const citySlug = params.city || ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target
    const name = target.name

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: target.checked }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: target.value }))
  }

  const fetchAddressSuggestions = useCallback(async (input: string) => {
    if (!googleApiKey) return

    setIsFetchingSuggestions(true)
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googleApiKey,
          'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
        },
        body: JSON.stringify({ input }),
      })

      if (!response.ok) {
        setAddressSuggestions([])
        return
      }

      const data = (await response.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId?: string
            text?: { text?: string }
          }
        }>
      }

      const nextSuggestions: PlaceSuggestion[] = (data.suggestions || [])
        .map((item) => ({
          placeId: item.placePrediction?.placeId || '',
          description: item.placePrediction?.text?.text || '',
        }))
        .filter((item) => item.placeId && item.description)

      setAddressSuggestions(nextSuggestions)
    } catch (error) {
      console.error(error)
      setAddressSuggestions([])
    } finally {
      setIsFetchingSuggestions(false)
    }
  }, [googleApiKey])

  useEffect(() => {
    if (suppressSuggestions) {
      setSuppressSuggestions(false)
      setAddressSuggestions([])
      return
    }

    const input = formData.address.trim()
    if (input && input === lastSelectedAddress) {
      setAddressSuggestions([])
      return
    }
    if (!googleApiKey || input.length < 3) {
      setAddressSuggestions([])
      return
    }

    const timeoutId = window.setTimeout(() => {
      fetchAddressSuggestions(input)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [fetchAddressSuggestions, formData.address, googleApiKey, lastSelectedAddress, suppressSuggestions])

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setAddressSuggestions([])
    setSuppressSuggestions(true)
    setLastSelectedAddress(suggestion.description)

    if (!googleApiKey) {
      setFormData((prev) => ({
        ...prev,
        address: suggestion.description,
      }))
      return
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${suggestion.placeId}?fields=location,formattedAddress`,
        {
          headers: {
            'X-Goog-Api-Key': googleApiKey,
            'X-Goog-FieldMask': 'location,formattedAddress',
          },
        }
      )

      if (!response.ok) {
        setFormData((prev) => ({
          ...prev,
          address: suggestion.description,
        }))
        return
      }

      const data = (await response.json()) as {
        formattedAddress?: string
        location?: { latitude?: number; longitude?: number }
      }

      setFormData((prev) => ({
        ...prev,
        address: data.formattedAddress || suggestion.description,
        lat: data.location?.latitude !== undefined ? String(data.location.latitude) : prev.lat,
        lng: data.location?.longitude !== undefined ? String(data.location.longitude) : prev.lng,
      }))
      setLastSelectedAddress(data.formattedAddress || suggestion.description)
    } catch (error) {
      console.error(error)
      setFormData((prev) => ({
        ...prev,
        address: suggestion.description,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage('')

    if (status !== 'authenticated') {
      setStatusMessage('Please sign in to submit an update.')
      setSubmitStatus('error')
      return
    }

    if (!formData.name.trim() || !formData.address.trim()) {
      setStatusMessage('Name and address are required.')
      setSubmitStatus('error')
      return
    }

    setSubmitStatus('submitting')

    try {
      const response = await fetch('/api/updates/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citySlug,
          payload: {
            resourceId: formData.resourceId.trim() || undefined,
            name: formData.name.trim(),
            address: formData.address.trim(),
            lat: formData.lat ? Number(formData.lat) : null,
            lng: formData.lng ? Number(formData.lng) : null,
            hours: formData.hours || null,
            daysOpen: formData.daysOpen || null,
            phone: formData.phone || null,
            website: formData.website || null,
            notes: formData.notes || null,
            requiresId: formData.requiresId,
            walkIn: formData.walkIn,
            category: formData.category,
            availabilityStatus: formData.availabilityStatus,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to submit update')
      }

      setSubmitStatus('success')
      setStatusMessage('Thanks! Your update is pending admin approval.')
    } catch (error) {
      setSubmitStatus('error')
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit update')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>{isEditing ? 'Suggest an Update' : 'Add a New Location'}</h1>
          <p className={styles.subtitle}>
            {isEditing
              ? 'Share corrections and improvements. An admin will review before publishing.'
              : 'Add a new location for this city. An admin will review before publishing.'}
          </p>
        </div>
        <Link href={`/${citySlug}/food`} className={styles.backLink}>
          Back to map
        </Link>
      </div>

      {status !== 'authenticated' && (
        <div className={styles.signInCallout}>
          <p>Sign in with Google to submit updates.</p>
          <button type="button" onClick={() => signIn('google')} className={styles.signInButton}>
            Sign in with Google
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Location Name *</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Community Food Bank"
              required
              disabled={submitStatus === 'submitting'}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={submitStatus === 'submitting'}
              className={styles.select}
            >
              <option value="food">Food</option>
              <option value="shelter">Shelter</option>
              <option value="housing">Housing</option>
              <option value="legal">Legal</option>
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="address">Address *</label>
          <input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main St"
            required
            disabled={submitStatus === 'submitting'}
            className={styles.input}
          />
          {googleApiKey && isFetchingSuggestions && (
            <div className={styles.suggestionHint}>Searching addresses...</div>
          )}
          {googleApiKey && addressSuggestions.length > 0 && (
            <ul className={styles.suggestionsList}>
              {addressSuggestions.map((suggestion) => (
                <li key={suggestion.placeId}>
                  <button
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion.description}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="availabilityStatus">Does this location currently have this resource?</label>
          <select
            id="availabilityStatus"
            name="availabilityStatus"
            value={formData.availabilityStatus}
            onChange={handleChange}
            disabled={submitStatus === 'submitting'}
            className={styles.select}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
            <option value="not_sure">Not sure</option>
          </select>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="hours">Hours</label>
            <input
              id="hours"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              placeholder="Mon-Fri, 9am-4pm"
              disabled={submitStatus === 'submitting'}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="daysOpen">Days Open</label>
            <input
              id="daysOpen"
              name="daysOpen"
              value={formData.daysOpen}
              onChange={handleChange}
              placeholder="Mon, Tue, Wed"
              disabled={submitStatus === 'submitting'}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
              disabled={submitStatus === 'submitting'}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://example.org"
              disabled={submitStatus === 'submitting'}
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Any helpful details"
            disabled={submitStatus === 'submitting'}
            className={styles.textarea}
          />
        </div>

        <div className={styles.checkboxRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="requiresId"
              checked={formData.requiresId}
              onChange={handleChange}
              disabled={submitStatus === 'submitting'}
            />
            ID required
          </label>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              name="walkIn"
              checked={formData.walkIn}
              onChange={handleChange}
              disabled={submitStatus === 'submitting'}
            />
            Walk-ins welcome
          </label>
        </div>

        {statusMessage && (
          <div className={submitStatus === 'success' ? styles.success : styles.error}>
            {statusMessage}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            disabled={submitStatus === 'submitting'}
            className={styles.submitButton}
          >
            {submitStatus === 'submitting' ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  )
}
