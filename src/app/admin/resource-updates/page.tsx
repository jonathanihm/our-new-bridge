'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import styles from '../admin.module.css'

type UpdateRequest = {
  id: string
  citySlug: string
  resourceExternalId?: string | null
  category: string
  changeType: string
  payload: Record<string, unknown>
  submittedByEmail: string
  submittedByName?: string | null
  submittedAt: string
}

type ActionState = {
  id: string
  action: 'approve' | 'reject'
}

export default function ResourceUpdatesPage() {
  const [updates, setUpdates] = useState<UpdateRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionState, setActionState] = useState<ActionState | null>(null)
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.isAdmin === true

  const fetchUpdates = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/resource-updates')
      if (res.status === 401) {
        router.push('/admin')
        return
      }
      const data = await res.json()
      setUpdates(data)
    } catch (err) {
      console.error(err)
      setError('Failed to load pending updates')
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
    if (status === 'authenticated' && !isAdmin) {
      signOut({ callbackUrl: '/admin' })
      return
    }
    if (status === 'authenticated' && isAdmin) {
      fetchUpdates()
    }
  }, [fetchUpdates, isAdmin, router, status])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setError('')
    setActionState({ id, action })

    try {
      const res = await fetch(`/api/admin/resource-updates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to update request')
      }

      setUpdates((prev) => prev.filter((item) => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request')
    } finally {
      setActionState(null)
    }
  }

  const pendingCount = useMemo(() => updates.length, [updates.length])

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
          <h1>Pending Resource Updates</h1>
          <p className={styles.subtitle}>{pendingCount} request{pendingCount === 1 ? '' : 's'} awaiting review</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {updates.length === 0 ? (
        <p className={styles.emptyState}>No pending updates right now.</p>
      ) : (
        <div className={styles.updateList}>
          {updates.map((update) => {
            const payload = update.payload || {}
            const name = String(payload.name || '')
            const address = String(payload.address || '')
            const hours = String(payload.hours || '')
            const daysOpen = String(payload.daysOpen || '')
            const phone = String(payload.phone || '')
            const website = String(payload.website || '')
            const notes = String(payload.notes || '')
            const requiresId = Boolean(payload.requiresId)
            const walkIn = Boolean(payload.walkIn)
            const availabilityStatus = String(payload.availabilityStatus || '')
            const lat = payload.lat !== undefined && payload.lat !== null ? String(payload.lat) : ''
            const lng = payload.lng !== undefined && payload.lng !== null ? String(payload.lng) : ''

            return (
              <div key={update.id} className={styles.updateCard}>
                <div className={styles.updateHeader}>
                  <div>
                    <h3>{name || 'New resource'}</h3>
                    <p className={styles.updateMeta}>
                      {update.changeType.toUpperCase()} • {update.category} • {update.citySlug}
                    </p>
                  </div>
                  <div className={styles.updateActions}>
                    <button
                      type="button"
                      className={styles.approveButton}
                      onClick={() => handleAction(update.id, 'approve')}
                      disabled={Boolean(actionState)}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      type="button"
                      className={styles.rejectButton}
                      onClick={() => handleAction(update.id, 'reject')}
                      disabled={Boolean(actionState)}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>

                <div className={styles.updateBody}>
                  <p><strong>Address:</strong> {address || '—'}</p>
                  {hours && <p><strong>Hours:</strong> {hours}</p>}
                  {daysOpen && <p><strong>Days Open:</strong> {daysOpen}</p>}
                  {phone && <p><strong>Phone:</strong> {phone}</p>}
                  {website && <p><strong>Website:</strong> {website}</p>}
                  {lat && lng && <p><strong>Coordinates:</strong> {lat}, {lng}</p>}
                  <p><strong>Requires ID:</strong> {requiresId ? 'Yes' : 'No'}</p>
                  <p><strong>Walk-ins Welcome:</strong> {walkIn ? 'Yes' : 'No'}</p>
                  {availabilityStatus && (
                    <p>
                      <strong>Has Resource:</strong>{' '}
                      {availabilityStatus === 'not_sure'
                        ? 'Not sure'
                        : availabilityStatus === 'yes'
                          ? 'Yes'
                          : 'No'}
                    </p>
                  )}
                  {notes && <p><strong>Notes:</strong> {notes}</p>}
                  <p className={styles.updateMeta}>
                    Submitted by {update.submittedByName || update.submittedByEmail} on {new Date(update.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
