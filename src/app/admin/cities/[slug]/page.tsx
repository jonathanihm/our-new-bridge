'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, AlertCircle } from 'lucide-react'
import styles from '../../admin.module.css'

interface Resource {
  id: string
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
  const router = useRouter()

  useEffect(() => {
    const token = sessionStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin')
      return
    }
    fetchResources()
  }, [slug, router])

  const fetchResources = async () => {
    try {
      const token = sessionStorage.getItem('adminToken')
      const res = await fetch(`/api/admin/cities/${slug}/resources`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setResources(data.food || [])
      }
    } catch (err) {
      setError('Failed to load resources')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, type, value, checked } = e.target as any
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSaving(true)

    try {
      const token = sessionStorage.getItem('adminToken')

      if (!formData.id || !formData.name || !formData.address) {
        setError('ID, name, and address are required')
        setIsSaving(false)
        return
      }

      const res = await fetch(`/api/admin/cities/${slug}/resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resource')
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
              <label htmlFor="id">ID *</label>
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id || ''}
                onChange={handleFormChange}
                placeholder="unique-location-id"
                required
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
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="lat">Latitude</label>
              <input
                id="lat"
                name="lat"
                type="number"
                step="0.0001"
                value={formData.lat || ''}
                onChange={handleFormChange}
                placeholder="41.5868"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="lng">Longitude</label>
              <input
                id="lng"
                name="lng"
                type="number"
                step="0.0001"
                value={formData.lng || ''}
                onChange={handleFormChange}
                placeholder="-93.6250"
                className={styles.input}
              />
            </div>
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
                <button
                  type="button"
                  onClick={() => handleEdit(resource)}
                  className={styles.editButton}
                  disabled={isSaving}
                >
                  Edit
                </button>
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
    </div>
  )
}
