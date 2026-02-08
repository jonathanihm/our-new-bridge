'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import ReportIssueModal from '../ReportIssueModal/ReportIssueModal'
import type { MapResource } from '@/types'
import styles from './ReportIssueButton.module.css'

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
        className={compact ? styles.compactButton : styles.button}
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