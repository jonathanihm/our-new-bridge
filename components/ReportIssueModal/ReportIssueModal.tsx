'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { MapResource } from '@/types'
import styles from './ReportIssueModal.module.css'

interface ReportIssueModalProps {
  resource: MapResource
  onClose: () => void
}

type IssueType = 'closed' | 'hours' | 'phone' | 'address' | 'requirements' | 'other'
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error' | 'rate-limited'

const COOLDOWN_MINUTES = 2 // User can submit every 5 minutes
const STORAGE_KEY = 'last_report_timestamp'

export default function ReportIssueModal({ resource, onClose }: ReportIssueModalProps) {
  const [issueType, setIssueType] = useState<IssueType>('hours')
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Check cooldown on mount
  useEffect(() => {
    const checkCooldown = () => {
      const lastReportTime = localStorage.getItem(STORAGE_KEY)
      if (lastReportTime) {
        const elapsed = Date.now() - parseInt(lastReportTime)
        const cooldownMs = COOLDOWN_MINUTES * 60 * 1000
        
        if (elapsed < cooldownMs) {
          const remaining = Math.ceil((cooldownMs - elapsed) / 1000 / 60)
          setCooldownRemaining(remaining)
          setStatus('rate-limited')
        }
      }
    }

    checkCooldown()
    
    // Update countdown every minute
    const interval = setInterval(checkCooldown, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Check cooldown
    const lastReportTime = localStorage.getItem(STORAGE_KEY)
    if (lastReportTime) {
      const elapsed = Date.now() - parseInt(lastReportTime)
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000
      
      if (elapsed < cooldownMs) {
        const remaining = Math.ceil((cooldownMs - elapsed) / 1000 / 60)
        setCooldownRemaining(remaining)
        setStatus('rate-limited')
        setErrorMessage(`Please wait ${remaining} minute${remaining > 1 ? 's' : ''} before submitting another report`)
        return
      }
    }

    if (!description.trim()) {
      setErrorMessage('Please provide details about the issue')
      return
    }

    setStatus('submitting')
    setErrorMessage('')

    try {
      const response = await fetch('/api/report-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: resource.id,
          resourceName: resource.name,
          resourceAddress: resource.address,
          issueType,
          description,
          reporterEmail: email || undefined,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      // Set cooldown timestamp
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      
      setStatus('success')
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error submitting report:', error)
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit report. Please try again.')
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className={styles.title}>Report an Issue</h2>
        <p className={styles.subtitle}>{resource.name}</p>

        {status === 'success' ? (
          <div className={styles.successMessage}>
            <CheckCircle size={48} />
            <h3>Thank you!</h3>
            <p>Your report has been submitted. We'll verify this information.</p>
          </div>
        ) : status === 'rate-limited' ? (
          <div className={styles.rateLimitMessage}>
            <Clock size={48} />
            <h3>Please wait</h3>
            <p>You can submit another report in {cooldownRemaining} minute{cooldownRemaining > 1 ? 's' : ''}.</p>
            <p className={styles.rateLimitHint}>This helps us prevent spam and ensure quality reports.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="issueType" className={styles.label}>
                What's the issue?
              </label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
                className={styles.select}
                disabled={status === 'submitting'}
              >
                <option value="hours">Hours have changed</option>
                <option value="closed">This location is closed</option>
                <option value="phone">Phone number is wrong</option>
                <option value="address">Address is wrong</option>
                <option value="requirements">Requirements have changed</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Details <span className={styles.required}>*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide specific details (e.g., 'Called on 2/6/26, now closes at 3pm instead of 4pm')"
                className={styles.textarea}
                rows={4}
                required
                disabled={status === 'submitting'}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.label}>
                Your email (optional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="If you'd like us to follow up"
                className={styles.input}
                disabled={status === 'submitting'}
              />
            </div>

            {errorMessage && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={status === 'submitting'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={status === 'submitting'}
              >
                {status === 'submitting' ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}