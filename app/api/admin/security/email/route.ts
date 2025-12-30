import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { emailService } from '@/lib/emailService'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

// GET /api/admin/security/email - Get email settings
export async function GET() {
  try {
    console.log('📧 API: Getting email settings...')

    const settingsResult = await client.execute(`
      SELECT email_notifications, email_recipient, email_threat_threshold,
             email_smtp_host, email_smtp_port, email_smtp_user, email_from_address
      FROM security_settings WHERE id = 1
    `)

    const settings = settingsResult.rows[0] || {}

    const response = {
      enabled: settings.email_notifications || false,
      recipient: settings.email_recipient || '',
      threatThreshold: settings.email_threat_threshold || 50,
      smtpHost: settings.email_smtp_host || '',
      smtpPort: settings.email_smtp_port || 587,
      smtpUser: settings.email_smtp_user || '',
      fromAddress: settings.email_from_address || '',
      smtpConfigured: !!(settings.email_smtp_host && settings.email_smtp_user),
    }

    console.log('✅ API: Email settings retrieved')
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ API: Error fetching email settings:', error)
    return NextResponse.json({
      enabled: false,
      recipient: '',
      threatThreshold: 50,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      fromAddress: '',
      smtpConfigured: false,
    }, { status: 500 })
  }
}

// POST /api/admin/security/email - Update email settings
export async function POST(request: NextRequest) {
  try {
    const {
      enabled,
      recipient,
      threatThreshold,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromAddress
    } = await request.json()

    console.log('📧 API: Updating email settings...')

    // Update email settings
    await client.execute(`
      UPDATE security_settings SET
        email_notifications = ?,
        email_recipient = ?,
        email_threat_threshold = ?,
        email_smtp_host = ?,
        email_smtp_port = ?,
        email_smtp_user = ?,
        email_smtp_pass = ?,
        email_from_address = ?,
        updated_at = ?
      WHERE id = 1
    `, [
      enabled || false,
      recipient || null,
      threatThreshold || 50,
      smtpHost || null,
      smtpPort || 587,
      smtpUser || null,
      smtpPass || null,
      fromAddress || null,
      new Date().toISOString()
    ])

    // Reconfigure email service if enabled
    if (enabled && smtpHost && smtpUser && smtpPass) {
      emailService.configure({
        host: smtpHost,
        port: smtpPort || 587,
        secure: (smtpPort || 587) === 465,
        user: smtpUser,
        pass: smtpPass,
        from: fromAddress || smtpUser,
      })
      console.log('📧 Email service reconfigured')
    }

    // Log the action
    await client.execute(`
      INSERT INTO security_logs (action, type, user, details)
      VALUES (?, ?, ?, ?)
    `, [
      'Email Settings Updated',
      'admin',
      'admin',
      `Email notifications ${enabled ? 'enabled' : 'disabled'} for ${recipient || 'no recipient'}`
    ])

    console.log('✅ API: Email settings updated')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ API: Error updating email settings:', error)
    return NextResponse.json({ error: 'Failed to update email settings' }, { status: 500 })
  }
}

// PUT /api/admin/security/email/test - Send test email
export async function PUT(request: NextRequest) {
  try {
    const { recipient } = await request.json()

    if (!recipient) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    console.log('📧 API: Sending test email...')

    // Get current email settings
    const settingsResult = await client.execute(`
      SELECT email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_pass, email_from_address
      FROM security_settings WHERE id = 1
    `)

    const settings = settingsResult.rows[0]

    if (!settings || !settings.email_smtp_host || !settings.email_smtp_user) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 400 })
    }

    // Configure email service
    emailService.configure({
      host: String(settings.email_smtp_host),
      port: Number(settings.email_smtp_port) || 587,
      secure: (Number(settings.email_smtp_port) || 587) === 465,
      user: String(settings.email_smtp_user),
      pass: String(settings.email_smtp_pass || ''),
      from: String(settings.email_from_address || settings.email_smtp_user),
    })

    // Send test email
    const success = await emailService.sendTestEmail(recipient)

    // Log the test
    await client.execute(`
      INSERT INTO security_logs (action, type, user, details)
      VALUES (?, ?, ?, ?)
    `, [
      'Test Email Sent',
      'admin',
      'admin',
      `Test email ${success ? 'sent successfully' : 'failed'} to ${recipient}`
    ])

    console.log(`✅ API: Test email ${success ? 'sent' : 'failed'}`)
    return NextResponse.json({
      success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email'
    })
  } catch (error) {
    console.error('❌ API: Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}