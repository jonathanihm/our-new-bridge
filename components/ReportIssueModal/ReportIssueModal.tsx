'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { MapResource } from '@/types'

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[10000] animate-[fadeIn_0.2s_ease]" onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-[slideUp_0.3s_ease] relative">
        <button
          className="absolute top-4 right-4 bg-[var(--surface)] rounded-full w-8 h-8 flex items-center justify-center hover:bg-[var(--border)] transition-all text-[var(--primary)]"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl md:text-3xl text-[var(--primary)] mb-2 pr-8">Report an Issue</h2>
        <p className="text-[var(--text-light)] text-sm mb-6 pr-8">{resource.name}</p>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center text-[var(--success-text)]">
            <CheckCircle size={48} className="text-[var(--success-text)]" />
            <h3 className="text-2xl m-0">Thank you!</h3>
            <p className="text-[var(--text-light)] m-0">Your report has been submitted. We&apos;ll verify this information.</p>
          </div>
        ) : status === 'rate-limited' ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center text-[var(--warning-text)]">
            <Clock size={48} className="text-[var(--warning-text)]" />
            <h3 className="text-2xl m-0">Please wait</h3>
            <p className="text-[var(--text-light)] m-0">You can submit another report in {cooldownRemaining} minute{cooldownRemaining > 1 ? 's' : ''}.</p>
            <p className="text-xs text-[#999] m-0">This helps us prevent spam and ensure quality reports.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="issueType" className="font-semibold text-[var(--text)] text-sm">
                What&apos;s the issue?
              </label>
              <select
                id="issueType"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as IssueType)}
                className="p-3 border border-[var(--border)] rounded-md text-base transition-all focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 disabled:bg-[var(--surface)] disabled:cursor-not-allowed"
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

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="font-semibold text-[var(--text)] text-sm">
                Details <span className="text-[#e63946]">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide specific details (e.g., 'Called on 2/6/26, now closes at 3pm instead of 4pm')"
                className="p-3 border border-[var(--border)] rounded-md text-base transition-all resize-y min-h-[100px] focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 disabled:bg-[var(--surface)] disabled:cursor-not-allowed"
                rows={4}
                required
                disabled={status === 'submitting'}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-semibold text-[var(--text)] text-sm">
                Your email (optional)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="If you&apos;d like us to follow up"
                className="p-3 border border-[var(--border)] rounded-md text-base transition-all focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 disabled:bg-[var(--surface)] disabled:cursor-not-allowed"
                disabled={status === 'submitting'}
              />
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-[#fee] border border-[#fcc] rounded-md text-[#c00] text-sm">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 px-6 rounded-md text-base cursor-pointer transition-all bg-transparent border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)] disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={status === 'submitting'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 px-6 rounded-md text-base cursor-pointer transition-all bg-[var(--primary)] text-white border-none hover:bg-[#344e41] disabled:opacity-60 disabled:cursor-not-allowed"
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