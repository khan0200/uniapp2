import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Each tenant notifies its own Telegram chat(s). The env var per tenant holds
// a chat ID, or a comma-separated list of them. Tenants are resolved from the
// caller's session server-side — never from the request body, which a client
// could forge to read another company's notifications.
const TENANT_CHAT_ENV: Record<string, string> = {
  unibridge: 'CHAT_ID',
  sodiq: 'SODIQ_CHAT_ID',
}

function removeUnavailableVisaCertificateLink(message: string) {
  return message
    .split(/\r?\n/)
    .filter((line) => {
      return !line.includes('Visa sertifikatini yuklash') &&
        !line.includes('selectElectronicVisaPrint3.do')
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(request: Request) {
  try {
    // Resolve the caller's tenant from their session so notifications only
    // ever reach that tenant's chat. An unauthenticated caller gets nothing.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    const rawTenantId = (profile as { tenant_id?: string | null } | null)?.tenant_id
    const tenantId = (rawTenantId || 'unibridge').toLowerCase().trim()

    const { message } = await request.json()

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'A non-empty message is required' }, { status: 400 })
    }

    const sanitizedMessage = removeUnavailableVisaCertificateLink(message)

    const botToken = process.env.BOT_TOKEN
    const chatEnvKey = TENANT_CHAT_ENV[tenantId] || 'CHAT_ID'
    const chatId = (chatEnvKey ? process.env[chatEnvKey] : undefined) || process.env.CHAT_ID

    if (!botToken) {
      return NextResponse.json(
        { error: 'Server configuration error: Telegram bot token not set' },
        { status: 500 }
      )
    }

    if (!chatId) {
      console.warn(`No Telegram chat configured for tenant "${tenantId}"`)
      return NextResponse.json({ success: true, message: 'No chat configured for tenant', results: [] })
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    // Support comma-separated list of Chat IDs
    const chatIds = chatId.split(',').map(id => id.trim()).filter(Boolean)

    if (chatIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid chat IDs found in configuration' },
        { status: 500 }
      )
    }

    // Send the notification to all Chat IDs in parallel
    const sendPromises = chatIds.map(async (id) => {
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: id,
          text: sanitizedMessage,
          parse_mode: 'HTML'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error(`Failed to send Telegram message to ${id}:`, data.description)
        return { success: false, id, error: data.description }
      }
      return { success: true, id, data }
    })

    const results = await Promise.all(sendPromises)
    const failures = results.filter(r => !r.success)

    if (failures.length === chatIds.length && chatIds.length > 0) {
      throw new Error(`Failed to send to any chat IDs. First error: ${failures[0].error}`)
    }

    return NextResponse.json({
      success: true,
      message: `Sent to ${chatIds.length - failures.length} of ${chatIds.length} chats`,
      results
    })
  } catch (error: any) {
    console.error('Telegram API error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
