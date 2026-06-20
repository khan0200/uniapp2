import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { message } = await request.json()

    // Read BOT_TOKEN and CHAT_ID from environment variables
    const botToken = process.env.BOT_TOKEN
    const chatId = process.env.CHAT_ID

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'Server configuration error: Telegram credentials not set' },
        { status: 500 }
      )
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
          text: message,
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
