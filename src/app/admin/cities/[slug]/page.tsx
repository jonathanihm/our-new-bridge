'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Trash2 } from 'lucide-react'
import styles from '../../admin.module.css'

interface Resource {
  id?: string
  name: string
  address: string
  lat: string
  lng: string
  hours: string
  daysOpen: string
  phone: string
  requiresId: boolean
  walkIn: boolean
  notes: string
}

type PlaceSuggestion = {
  placeId: string
  description: string
}

export default function CityPage() {
  const { slug } = useParams() as { slug?: string }
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Resource>>({
    id: '',
    name: '',
    address: '',
    lat: '',
    lng: '',
    hours: '',
    daysOpen: '',
    phone: '',
    requiresId: false,
    walkIn: false,
    notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [resourceToDelete, setResourceToDelete] = useState<Resource | null>(null)
  const [isDeletingResource, setIsDeletingResource] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([])
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suppressSuggestions, setSuppressSuggestions] = useState(false)
  const router = useRouter()
  const { status } = useSession()
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/cities/${slug}/resources`)

      if (res.ok) {
        const data = await res.json()
        setResources(data.food || [])
      }
    } catch (error) {
      console.error(error)
      setError('Failed to load resources')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin')
      return
    }
    if (status === 'authenticated') {
      fetchResources()
    }
  }, [fetchResources, router, status])

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target
    const name = target.name

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: target.value,
    }))
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
    const input = (formData.address || '').trim()
    if (!googleApiKey || input.length < 3) {
      setAddressSuggestions([])
      return
    }

    const timeoutId = window.setTimeout(() => {
      fetchAddressSuggestions(input)
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [fetchAddressSuggestions, formData.address, googleApiKey])

  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    setAddressSuggestions([])
    setSuppressSuggestions(true)

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
    setError('')
    setIsSaving(true)

    try {
      if (!formData.name || !formData.address) {
        setError('Name and address are required')
        setIsSaving(false)
        return
      }

      const payload = { ...formData }
      if (!payload.id) {
        const baseSlug = String(slug || 'resource').trim() || 'resource'
        payload.id = `${baseSlug}-${Date.now()}`
      }

      const res = await fetch(`/api/admin/cities/${slug}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save resource')
      }

      await fetchResources()
      setEditingId(null)
      setFormData({
        id: '',
        name: '',
        address: '',
        lat: '',
        lng: '',
        hours: '',
        daysOpen: '',
        phone: '',
        requiresId: false,
        walkIn: false,
        notes: '',
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save resource')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (resource: Resource) => {
    setEditingId(resource.id)
    setFormData(resource)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({
      id: '',
      name: '',
      address: '',
      lat: '',
      lng: '',
      hours: '',
      daysOpen: '',
      phone: '',
      requiresId: false,
      walkIn: false,
      notes: '',
    })
  }

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return

    setIsDeletingResource(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/cities/${slug}/resources`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: resourceToDelete.id }),
      })

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete resource')
      }

      setResourceToDelete(null)
      if (editingId === resourceToDelete.id) {
        handleCancel()
      }
      await fetchResources()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete resource')
    } finally {
      setIsDeletingResource(false)
    }
  }

  if (isLoading) {
    return <div className={styles.dashboard}><p>Loading...</p></div>
  }

  return (
    <div className={styles.dashboard}>
      <Link href="/admin/dashboard" className={styles.breadcrumbLink}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <h1>Manage Resources: {slug}</h1>
      <p className={styles.subtitle}>{resources.length} resource{resources.length !== 1 ? 's' : ''}</p>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.resourceForm}>
        <fieldset disabled={isSaving}>
          <legend>{editingId ? 'Edit Resource' : 'Add New Resource'}</legend>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="id">
                ID (optional)
                <span
                  className={styles.tooltip}
                  title="Used to match records across imports/exports. Leave blank to auto-generate."
                  aria-label="Used to match records across imports/exports. Leave blank to auto-generate."
                >
                  ?
                </span>
              </label>
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id || ''}
                onChange={handleFormChange}
                placeholder="unique-location-id"
                className={styles.input}
                readOnly={!!editingId}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name || ''}
                onChange={handleFormChange}
                placeholder="Community Food Bank"
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address">Address *</label>
            <input
              id="address"
              name="address"
              type="text"
              value={formData.address || ''}
              onChange={handleFormChange}
              placeholder="123 Main St, City"
              required
              className={styles.input}
              autoComplete="off"
            />
            {isFetchingSuggestions && (
              <div className={styles.suggestionHint}>Searching addresses...</div>
            )}
            {addressSuggestions.length > 0 && (
              <ul className={styles.suggestionsList} role="listbox">
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

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="hours">Hours</label>
              <input
                id="hours"
                name="hours"
                type="text"
                value={formData.hours || ''}
                onChange={handleFormChange}
                placeholder="9:00 AM - 5:00 PM"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="daysOpen">Days Open</label>
              <input
                id="daysOpen"
                name="daysOpen"
                type="text"
                value={formData.daysOpen || ''}
                onChange={handleFormChange}
                placeholder="Mon, Tue, Wed, Thu, Fri"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={handleFormChange}
              placeholder="(555) 123-4567"
              className={styles.input}
            />
          </div>

          <div className={styles.checkboxGroup}>
            <label>
              <input
                name="requiresId"
                type="checkbox"
                checked={formData.requiresId || false}
                onChange={handleFormChange}
              />
              Requires ID
            </label>
            <label>
              <input
                name="walkIn"
                type="checkbox"
                checked={formData.walkIn || false}
                onChange={handleFormChange}
              />
              Walk-ins Welcome
            </label>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes || ''}
              onChange={handleFormChange}
              placeholder="Any special information..."
              className={styles.textarea}
              rows={3}
            />
          </div>

          <div className={styles.formActions}>
            {editingId && (
              <button type="button" onClick={handleCancel} className={styles.cancelButton} disabled={isSaving}>
                Cancel
              </button>
            )}
            <button type="submit" className={styles.submitButton} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingId ? 'Update Resource' : 'Add Resource'}
            </button>
          </div>
        </fieldset>
      </form>

      <div className={styles.resourcesList}>
        <h2>Resources ({resources.length})</h2>
        {resources.length === 0 ? (
          <p className={styles.emptyState}>No resources yet. Add one above!</p>
        ) : (
          resources.map((resource) => (
            <div key={resource.id} className={styles.resourceItem}>
              <div className={styles.resourceHeader}>
                <h3>{resource.name}</h3>
                <div className={styles.resourceHeaderActions}>
                  <button
                    type="button"
                    onClick={() => handleEdit(resource)}
                    className={styles.editButton}
                    disabled={isSaving || isDeletingResource}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setResourceToDelete(resource)}
                    className={styles.dangerButtonSmall}
                    disabled={isSaving || isDeletingResource}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
              <p>{resource.address}</p>
              {resource.hours && <p className={styles.resourceDetail}>Hours: {resource.hours}</p>}
              {resource.daysOpen && <p className={styles.resourceDetail}>Days: {resource.daysOpen}</p>}
              {resource.phone && <p className={styles.resourceDetail}>Phone: {resource.phone}</p>}
              {resource.requiresId && <span className={styles.badge}>ID Required</span>}
              {resource.walkIn && <span className={styles.badge}>Walk-ins Welcome</span>}
            </div>
          ))
        )}
      </div>

      {resourceToDelete && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete resource?</h3>
            <p className={styles.modalBody}>
              This will permanently delete <strong>{resourceToDelete.name}</strong> (<code>{resourceToDelete.id}</code>).
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setResourceToDelete(null)}
                disabled={isDeletingResource}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDeleteResource}
                disabled={isDeletingResource}
              >
                {isDeletingResource ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
