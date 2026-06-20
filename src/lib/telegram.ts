/**
 * Sends a Telegram notification via the secure Next.js API route.
 * @param message The HTML-formatted message to send.
 */
export async function sendTelegramNotification(message: string) {
  try {
    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('Failed to send Telegram notification:', errData.error || response.statusText)
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
  }
}
