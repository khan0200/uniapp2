import { NextResponse } from 'next/server'

/**
 * Returns which AI providers have server-side API keys configured.
 * Never exposes the actual key values – only boolean flags.
 */
export async function GET() {
  return NextResponse.json({
    gemini: !!process.env.GEMINI_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  })
}
