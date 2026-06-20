import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json()

    if (!provider || !apiKey) {
      return NextResponse.json({ error: 'Missing provider or apiKey' }, { status: 400 })
    }

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      })
      const data = await response.json()
      if (response.ok) {
        return NextResponse.json({ success: true, message: 'OpenAI API Key is valid! ✓' })
      } else {
        return NextResponse.json({ 
          error: data.error?.message || 'Invalid key' 
        }, { status: response.status })
      }
    } else if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
      const data = await response.json()
      if (response.ok) {
        return NextResponse.json({ success: true, message: 'Gemini API Key is valid! ✓' })
      } else {
        return NextResponse.json({ 
          error: data.error?.message || 'Invalid key' 
        }, { status: response.status })
      }
    } else {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Validation error on server:', error)
    return NextResponse.json({ error: error.message || 'Internal server validation error' }, { status: 500 })
  }
}
