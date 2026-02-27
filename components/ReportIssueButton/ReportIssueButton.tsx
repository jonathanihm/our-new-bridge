'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import ReportIssueModal from '../ReportIssueModal/ReportIssueModal'
import type { MapResource } from '@/types'

interface ReportIssueButtonProps {
  resource: MapResource
  compact?: boolean
}

export default function ReportIssueButton({ resource, compact = false }: ReportIssueButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={
          compact
            ? 'flex items-center justify-center bg-transparent border border-[var(--border)] text-[var(--text-light)] p-2 rounded-md cursor-pointer transition-all hover:bg-[var(--surface)] hover:border-[var(--accent)] hover:text-[var(--primary)] w-10 h-10'
            : 'flex items-center gap-2 bg-transparent border border-[var(--border)] text-[var(--text-light)] px-4 py-2 rounded-md text-sm cursor-pointer transition-all hover:bg-[var(--surface)] hover:border-[var(--accent)] hover:text-[var(--primary)]'
        }
        aria-label="Report an issue with this location"
      >
        <Flag size={compact ? 16 : 18} />
        {!compact && <span>Report Issue</span>}
      </button>

      {isModalOpen && (
        <ReportIssueModal
          resource={resource}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}