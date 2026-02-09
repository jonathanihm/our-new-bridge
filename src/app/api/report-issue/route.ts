import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
type ReportData = {
  resourceId: string
  resourceName?: string
  resourceAddress?: string
  issueType: string
  description: string
  reporterEmail: string
  timestamp?: string | number
}

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX = 5
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getClientKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown'
  return ip
}

function isRateLimited(request: NextRequest) {
  const key = getClientKey(request)
  const now = Date.now()
  const existing = rateLimitStore.get(key)

  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  if (existing.count >= RATE_LIMIT_MAX) {
    return true
  }

  existing.count += 1
  rateLimitStore.set(key, existing)
  return false
}

export async function POST(request: NextRequest) {
  try {
    if (isRateLimited(request)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await request.json()
    
    const {
      resourceId,
      resourceName,
      resourceAddress,
      issueType,
      description,
      reporterEmail,
      timestamp,
    } = body

    // Validate required fields
    if (!resourceId || !issueType || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Format the report data
    const reportData: ReportData = {
      resourceId,
      resourceName,
      resourceAddress,
      issueType,
      description,
      reporterEmail: reporterEmail || 'Not provided',
      timestamp,
    }

    console.info('Report received:', {
      resourceId: reportData.resourceId,
      issueType: reportData.issueType,
    })

    const envKey = process.env.RESEND_API_KEY
    if (envKey) {
      const resend = new Resend(envKey)
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: process.env.ADMIN_EMAIL || 'admin@ournewbridge.org',
        subject: `Resource Report: ${issueType}${resourceName ? ` - ${resourceName}` : ''}`,
        html: formatReportEmail(reportData),
      })
    } else {
      console.warn('RESEND_API_KEY is not set; skipping email send')
    }
    // OPTION 1: Send email notification
    // Uncomment and configure when ready to use
    /*
    await sendEmailNotification({
      to: process.env.ADMIN_EMAIL || 'admin@ournewbridge.org',
      subject: `Resource Report: ${issueType} - ${resourceName}`,
      body: formatReportEmail(reportData),
    })
    */

    // OPTION 2: Save to database
    // Uncomment and configure when ready to use
    /*
    await saveReportToDatabase(reportData)
    */

    // OPTION 3: Send to webhook/Slack/Discord
    // Uncomment and configure when ready to use
    /*
    await fetch(process.env.WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 New report: ${issueType} at ${resourceName}`,
        details: reportData,
      }),
    })
    */

    // For now, just log to console
    // In production, choose one of the options above
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Report submitted successfully',
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error handling report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to format email (if using email option)
function formatReportEmail(data: ReportData): string {
  return `
New Resource Issue Report

Resource: ${data.resourceName}
Address: ${data.resourceAddress}
Resource ID: ${data.resourceId}

Issue Type: ${data.issueType}

Details:
${data.description}

Reporter Email: ${data.reporterEmail}
Submitted: ${data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Not provided'}

---
Action needed: Please verify this information and update the resource listing if needed.
  `.trim()
}

// Helper function to save to database (if using database option)
// async function saveReportToDatabase(data: any) {
//   const { createClient } = require('@supabase/supabase-js')
//   const supabase = createClient(
//     process.env.SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_KEY!
//   )
//   
//   const { error } = await supabase
//     .from('resource_reports')
//     .insert([data])
//   
//   if (error) throw error
// }