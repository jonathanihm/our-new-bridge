import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
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
    const reportData = {
      resourceId,
      resourceName,
      resourceAddress,
      issueType,
      description,
      reporterEmail: reporterEmail || 'Not provided',
      timestamp,
    }

    console.log('Report received:', reportData)

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
function formatReportEmail(data: any): string {
  return `
New Resource Issue Report

Resource: ${data.resourceName}
Address: ${data.resourceAddress}
Resource ID: ${data.resourceId}

Issue Type: ${data.issueType}

Details:
${data.description}

Reporter Email: ${data.reporterEmail}
Submitted: ${new Date(data.timestamp).toLocaleString()}

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