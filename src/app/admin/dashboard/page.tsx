'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Eye, Download, LogOut, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import styles from '../admin.module.css'

interface City {
  slug: string
  name: string
  resourceCount: number
  hasResourceFile: boolean
}

export default function AdminDashboard() {
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [cityToDelete, setCityToDelete] = useState<City | null>(null)
  const [isDeletingCity, setIsDeletingCity] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const fetchCities = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cities')

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      const data = await res.json()
      setCities(data)
    } catch (error) {
      console.error(error)
      setError('Failed to load cities')
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
      fetchCities()
    }
  }, [fetchCities, isAdmin, router, status])

  const handleLogout = () => {
    signOut({ callbackUrl: '/admin' })
  }

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/export')

      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
      }
    } catch (error) {
      console.error(error)
      setError('Failed to export data')
    }
  }

  const handleDeleteCity = async () => {
    if (!cityToDelete) return

    setIsDeletingCity(true)
    setError('')

    try {
      const res = await fetch('/api/admin/cities', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: cityToDelete.slug }),
      })

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete city')
      }

      setCityToDelete(null)
      await fetchCities()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete city')
    } finally {
      setIsDeletingCity(false)
    }
  }

  if (isLoading) {
    return <div className={styles.dashboard}><p>Loading...</p></div>
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1>Admin Dashboard</h1>
          <p className={styles.subtitle}>Manage cities and resources</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleExport} className={styles.exportButton} title="Export all cities and resources as backup">
            <Download size={18} /> Export
          </button>
          <button onClick={handleLogout} className={styles.logoutButton}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className={styles.statsbar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Cities</span>
          <span className={styles.statValue}>{cities.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Resources</span>
          <span className={styles.statValue}>{cities.reduce((sum, c) => sum + c.resourceCount, 0)}</span>
        </div>
        <Link href="/admin/cities/new" className={styles.addButton}>
          <Plus size={18} /> Add City
        </Link>
      </div>

      {error && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.citiesList}>
        <h2>Cities</h2>
        {cities.length === 0 ? (
          <p className={styles.emptyState}>
            No cities yet. <Link href="/admin/cities/new">Create your first city</Link>
          </p>
        ) : (
          <div className={styles.cityGrid}>
            {cities.map((city) => (
              <div key={city.slug} className={styles.cityCard}>
                <div className={styles.cityCardHeader}>
                  <h3>{city.name}</h3>
                  {city.hasResourceFile ? (
                    <CheckCircle size={16} className={styles.healthyIcon} />
                  ) : (
                    <AlertCircle size={16} className={styles.warningIcon} />
                  )}
                </div>

                <div className={styles.cityCardBody}>
                  <p>Resources: <strong>{city.resourceCount}</strong></p>
                  <p className={styles.slug}>slug: <code>{city.slug}</code></p>
                </div>

                <div className={styles.cityCardActions}>
                  <Link href={`/admin/cities/${city.slug}`} className={styles.linkButton}>
                    <Eye size={16} /> Manage
                  </Link>
                  <Link href={`/${city.slug}/food`} target="_blank" className={styles.linkButton}>
                    View Live
                  </Link>
                  <button
                    type="button"
                    className={styles.dangerLinkButton}
                    onClick={() => setCityToDelete(city)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cityToDelete && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Delete city?</h3>
            <p className={styles.modalBody}>
              This will permanently delete <strong>{cityToDelete.name}</strong> (<code>{cityToDelete.slug}</code>) and all of its resources.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setCityToDelete(null)}
                disabled={isDeletingCity}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDeleteCity}
                disabled={isDeletingCity}
              >
                {isDeletingCity ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h2>Tools</h2>
        <div className={styles.toolsList}>
          <Link href="/admin/resource-updates" className={styles.toolButton}>
            <CheckCircle size={18} />
            <div>
              <h3>Review Updates</h3>
              <p>Approve or reject contributor submissions</p>
            </div>
          </Link>
          <Link href="/admin/validate" className={styles.toolButton}>
            <CheckCircle size={18} />
            <div>
              <h3>Validate Configuration</h3>
              <p>Check all cities and resources for errors</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
