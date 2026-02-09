'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import styles from '../admin.module.css'

interface ValidationResult {
  city: string
  slug: string
  status: 'healthy' | 'warning' | 'error'
  resourceCount: number
  configIssues: string[]
  resourceIssues: string[]
}

export default function ValidatePage() {
  const [results, setResults] = useState<ValidationResult[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { status } = useSession()

  const validate = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/validate')

      if (res.status === 401) {
        router.push('/admin')
        return
      }

      const data = await res.json()
      setResults(data.results || [])
      setErrors(data.errors || [])
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin')
      return
    }
    if (status === 'authenticated') {
      validate()
    }
  }, [router, status, validate])

  if (isLoading) {
    return (
      <div className={styles.dashboard}>
        <p>Validating configuration...</p>
      </div>
    )
  }

  const healthyCount = results.filter((r) => r.status === 'healthy').length
  const warningCount = results.filter((r) => r.status === 'warning').length
  const errorCount = results.filter((r) => r.status === 'error').length

  return (
    <div className={styles.dashboard}>
      <div className={styles.breadcrumb}>
        <Link href="/admin/dashboard" className={styles.breadcrumbLink}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <h1>Configuration Validation</h1>
      <p className={styles.subtitle}>Check your cities and resources for errors</p>

      <div className={styles.statsbar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Healthy</span>
          <span className={styles.statValue} style={{ color: '#2d6a4f' }}>
            {healthyCount}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Warnings</span>
          <span className={styles.statValue} style={{ color: '#9c6d38' }}>
            {warningCount}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Errors</span>
          <span className={styles.statValue} style={{ color: '#c00' }}>
            {errorCount}
          </span>
        </div>
      </div>

      {errors.length > 0 && (
        <div className={styles.errorAlert}>
          <AlertCircle size={16} />
          <div>
            <strong>Validation errors:</strong>
            <ul style={{ marginTop: '0.5rem' }}>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.validationResults}>
        {results.map((result) => (
          <div key={result.slug} className={`${styles.validationCard} ${styles[`status-${result.status}`]}`}>
            <div className={styles.validationHeader}>
              {result.status === 'healthy' ? (
                <CheckCircle size={20} className={styles.healthyIcon} />
              ) : (
                <AlertCircle size={20} className={styles.warningIcon} />
              )}
              <h3>{result.city}</h3>
              <span className={styles.statusBadge}>{result.status}</span>
            </div>

            <p className={styles.validationInfo}>
              {result.resourceCount} resource{result.resourceCount !== 1 ? 's' : ''}
            </p>

            {result.configIssues.length > 0 && (
              <div className={styles.issuesList}>
                <strong>Config Issues:</strong>
                <ul>
                  {result.configIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.resourceIssues.length > 0 && (
              <div className={styles.issuesList}>
                <strong>Resource Issues:</strong>
                <ul>
                  {result.resourceIssues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.status === 'healthy' && (
              <p style={{ color: '#2d6a4f', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                ✓ All checks passed
              </p>
            )}
          </div>
        ))}
      </div>

      {results.length === 0 && (
        <p className={styles.emptyState}>No cities to validate. Create one first!</p>
      )}
    </div>
  )
}
