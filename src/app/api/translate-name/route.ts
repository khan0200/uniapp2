import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { names, provider, apiKey, model } = await req.json()

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ error: 'Missing names array' }, { status: 400 })
    }

    const finalProvider = provider || 'openai'
    const isGemini = finalProvider === 'gemini'

    const finalApiKey = apiKey || (isGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)
    if (!finalApiKey) {
      return NextResponse.json({
        error: `${isGemini ? 'Gemini' : 'OpenAI'} API Key is not configured. Please configure it in AI Settings.`
      }, { status: 400 })
    }

    const finalModel = model || (isGemini ? 'gemini-2.5-flash' : 'gpt-4o')

    const promptText = `You transliterate foreign personal names into Korean Hangul, the way Korean university and visa application forms expect (a phonetic approximation of how the name sounds, not a translation of its meaning).

Names to transliterate (JSON array of strings): ${JSON.stringify(names)}

Rules:
- Output ONLY Hangul characters for each name (plus spaces between words if the original name has multiple words). No Latin letters, no romanization, no explanations.
- Preserve word order and spacing exactly as in the input.
- If an input string is empty, return an empty string for it.

Return JSON only, in this exact format, with one entry per input name in the same order:
{
  "results": ["...", "...", ...]
}`

    let resultText = ''

    if (isGemini) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${finalApiKey}`
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            // This is a trivial transliteration task — skip Gemini's extended
            // "thinking" pass, which otherwise adds multi-second latency for
            // no quality benefit here.
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      })

      const data = await response.json()
      if (!response.ok) {
        console.error('Gemini API response error:', data)
        return NextResponse.json({ error: data.error?.message || 'Error communicating with Gemini API' }, { status: response.status })
      }

      const candidates = data.candidates || []
      if (candidates.length === 0 || !candidates[0].content?.parts?.[0]?.text) {
        return NextResponse.json({ error: 'No content returned from Gemini' }, { status: 500 })
      }
      resultText = candidates[0].content.parts[0].text
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`
        },
        body: JSON.stringify({
          model: finalModel,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: promptText }]
        })
      })

      const data = await response.json()
      if (!response.ok) {
        console.error('OpenAI API response error:', data)
        return NextResponse.json({ error: data.error?.message || 'Error communicating with OpenAI API' }, { status: response.status })
      }
      resultText = data.choices?.[0]?.message?.content || '{"results":[]}'
    }

    const parsed = JSON.parse(resultText)
    const results = Array.isArray(parsed.results) ? parsed.results : []

    return NextResponse.json({ results })
  } catch (err: any) {
    console.error('translate-name error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
