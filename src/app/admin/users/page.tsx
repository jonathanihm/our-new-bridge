'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Shield, Trash2, AlertCircle } from 'lucide-react'
import styles from '../admin.module.css'

type AdminRole = 'super_admin' | 'city_admin' | 'local_admin'

type CityOption = {
  slug: string
  name: string
}

type UserOption = {
  email: string
  name?: string | null
}

type LocationOption = {
  id: string
  label: string
}

type Assignment = {
  id: string
  userEmail: string
  role: AdminRole
  scopeType: 'global' | 'city' | 'location'
  citySlug: string | null
  locationId: string | null
}

const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  city_admin: 'City Admin',
  local_admin: 'Local Admin',
}

export default function ManagePermissionsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isSuperAdmin = session?.user?.isSuperAdmin === true

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [cities, setCities] = useState<CityOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [locationsByCity, setLocationsByCity] = useState<Record<string, LocationOption[]>>({})
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const [userEmail, setUserEmail] = useState('')
  const [role, setRole] = useState<AdminRole>('city_admin')
  const [citySlug, setCitySlug] = useState('')
  const [locationId, setLocationId] = useState('')

  const fetchPermissions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/permissions')
      if (res.status === 401) {
        router.push('/admin')
        return
      }
      if (res.status === 403) {
        setError('Only super admins can manage permissions.')
        setIsLoading(false)
        return
      }

      const data = (await res.json()) as {
        assignments?: Assignment[]
        cities?: CityOption[]
        users?: UserOption[]
        locationsByCity?: Record<string, LocationOption[]>
      }
      setAssignments(data.assignments || [])
      setCities(data.cities || [])
      setUsers(data.users || [])
      setLocationsByCity(data.locationsByCity || {})
    } catch (requestError) {
      console.error(requestError)
      setError('Failed to load permissions')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin')
      return
    }
    if (status === 'authenticated' && !session) {
      return
    }
    if (status === 'authenticated' && !isSuperAdmin) {
      signOut({ callbackUrl: '/admin' })
      return
    }
    if (status === 'authenticated' && isSuperAdmin) {
      fetchPermissions()
    }
  }, [fetchPermissions, isSuperAdmin, router, session, status])

  const groupedAssignments = useMemo(() => {
    const grouped = new Map<string, Assignment[]>()
    for (const assignment of assignments) {
      const key = assignment.userEmail
      const existing = grouped.get(key) || []
      existing.push(assignment)
      grouped.set(key, existing)
    }
    return Array.from(grouped.entries())
  }, [assignments])

  const locationOptions = useMemo(() => {
    if (!citySlug) return []
    return locationsByCity[citySlug] || []
  }, [citySlug, locationsByCity])

  const resetForm = () => {
    setUserEmail('')
    setRole('city_admin')
    setCitySlug('')
    setLocationId('')
  }

  const handleAddAssignment = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!userEmail) {
      setError('Select a user')
      return
    }
    if ((role === 'city_admin' || role === 'local_admin') && !citySlug) {
      setError('City is required for city/local admins')
      return
    }
    if (role === 'local_admin' && !locationId.trim()) {
      setError('Location ID is required for local admins')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim().toLowerCase(),
          role,
          citySlug: role === 'super_admin' ? undefined : citySlug,
          locationId: role === 'local_admin' ? locationId.trim() : undefined,
        }),
      })

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add permission')
      }

      resetForm()
      await fetchPermissions()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to add permission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError('')
    setIsDeletingId(id)
    try {
      const res = await fetch(`/api/admin/permissions/${id}`, { method: 'DELETE' })
      if (res.status === 401) {
        router.push('/admin')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove permission')
      }
      await fetchPermissions()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to remove permission')
    } finally {
      setIsDeletingId(null)
    }
  }

  if (isLoading) {
    return <div className={styles.dashboard}><p>Loading...</p></div>
  }

  return (
    <div className={styles.dashboard}>
      <Link href="/admin/dashboard" className={styles.breadcrumbLink}>
        <ArrowLeft size={16} /> Back
      </Link>

      <div className={styles.dashboardHeader}>
        <div>
          <h1>Manage Permissions</h1>
          <p className={styles.subtitle}>Assign super, city, and local admin access</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.updateCard}>
        <h2>Add Permission</h2>
        <form onSubmit={handleAddAssignment} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="userEmail">User Email</label>
            <select
              id="userEmail"
              className={styles.input}
              value={userEmail}
              onChange={(event) => setUserEmail(event.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select an existing user</option>
              {users.map((user) => (
                <option key={user.email} value={user.email}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <small className={styles.hint}>No existing users found yet. Users appear after they submit or review updates.</small>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                className={styles.input}
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
                disabled={isSubmitting}
              >
                <option value="super_admin">Super Admin</option>
                <option value="city_admin">City Admin</option>
                <option value="local_admin">Local Admin</option>
              </select>
            </div>

            {(role === 'city_admin' || role === 'local_admin') && (
              <div className={styles.formGroup}>
                <label htmlFor="citySlug">City</label>
                <select
                  id="citySlug"
                  className={styles.input}
                  value={citySlug}
                  onChange={(event) => {
                    setCitySlug(event.target.value)
                    setLocationId('')
                  }}
                  disabled={isSubmitting}
                >
                  <option value="">Select a city</option>
                  {cities.map((city) => (
                    <option key={city.slug} value={city.slug}>
                      {city.name} ({city.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {role === 'local_admin' && (
            <div className={styles.formGroup}>
              <label htmlFor="locationId">Location ID</label>
              <select
                id="locationId"
                className={styles.input}
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                disabled={isSubmitting || !citySlug}
              >
                <option value="">Select a location</option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </select>
              {!citySlug && (
                <small className={styles.hint}>Select a city first.</small>
              )}
              {citySlug && locationOptions.length === 0 && (
                <small className={styles.hint}>No locations found for this city.</small>
              )}
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.submitButton} disabled={isSubmitting || users.length === 0}>
              {isSubmitting ? 'Saving...' : 'Add Permission'}
            </button>
          </div>
        </form>
      </div>

      <div className={styles.section}>
        <h2>Current Assignments</h2>
        {groupedAssignments.length === 0 ? (
          <p className={styles.emptyState}>No permissions assigned yet.</p>
        ) : (
          <div className={styles.updateList}>
            {groupedAssignments.map(([email, emailAssignments]) => (
              <div key={email} className={styles.updateCard}>
                <h3>{email}</h3>
                {emailAssignments.map((assignment) => (
                  <div key={assignment.id} className={styles.updateHeader}>
                    <p className={styles.updateMeta}>
                      <Shield size={14} /> {ROLE_LABEL[assignment.role]}
                      {assignment.citySlug ? ` • ${assignment.citySlug}` : ''}
                      {assignment.locationId ? ` • ${assignment.locationId}` : ''}
                    </p>
                    <button
                      type="button"
                      className={styles.dangerLinkButton}
                      onClick={() => handleDelete(assignment.id)}
                      disabled={isDeletingId === assignment.id}
                    >
                      <Trash2 size={16} /> {isDeletingId === assignment.id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
