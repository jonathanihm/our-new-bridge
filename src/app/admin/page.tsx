'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Lock, AlertCircle } from 'lucide-react'
import styles from './admin.module.css'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!session) return

    if (isAdmin) {
      router.replace('/admin/dashboard')
      return
    }

    signOut({ callbackUrl: '/admin' })
  }, [isAdmin, router, session, status])

  const authError =
    status === 'authenticated' && session && !isAdmin
      ? 'You are signed in but do not have admin access.'
      : ''
  const errorMessage = error || authError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!password) {
      setError('Please enter a password')
      setIsLoading(false)
      return
    }

    const result = await signIn('credentials', {
      password,
      redirect: true,
      callbackUrl: '/admin/dashboard',
    })

    if (result?.error || result?.ok === false) {
      setError('Invalid password')
      setIsLoading(false)
      return
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

          {errorMessage && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
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
