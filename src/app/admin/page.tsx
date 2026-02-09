'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, AlertCircle } from 'lucide-react'
import styles from './admin.module.css'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Store password in sessionStorage (not ideal but simple for MVP)
    if (password) {
      sessionStorage.setItem('adminToken', password)
      router.push('/admin/dashboard')
    } else {
      setError('Please enter a password')
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <Lock size={32} />
          <h1>Admin Dashboard</h1>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className={styles.hint}>
          Set <code>ADMIN_PASSWORD</code> in your environment to enable admin access.
        </p>
      </div>
    </div>
  )
}
