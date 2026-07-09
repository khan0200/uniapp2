import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { image, mimeType, provider, apiKey, model, settings } = await req.json()

    if (!image || !mimeType) {
      return NextResponse.json({ error: 'Missing image data or mimeType' }, { status: 400 })
    }

    const finalProvider = provider || 'gemini'
    const isGemini = finalProvider === 'gemini'

    const finalApiKey = apiKey || (isGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)
    if (!finalApiKey) {
      return NextResponse.json({ 
        error: `${isGemini ? 'Gemini' : 'OpenAI'} API Key is not configured. Please configure it in AI Settings.` 
      }, { status: 400 })
    }

    // Default models if not specified
    const finalModel = model || (isGemini ? 'gemini-1.5-flash' : 'gpt-4o-mini')

    // Construct prompt extra instructions
    let extraInstructions = ""
    if (settings) {
      if (settings.normalizeDates) {
        extraInstructions += "- Normalize all extracted dates to YYYY-MM-DD format (e.g. '12 April 2006' -> '2006-04-12').\n"
      }
      if (settings.mergeNames) {
        extraInstructions += "- Merge names (first name, given name, family name) into a single FULL NAME field where applicable.\n"
      }
    }

    const promptText = `You are an OCR and document extraction assistant.
Analyze the uploaded document.

Specific instructions:
${extraInstructions}
- Identify the document type automatically (e.g. Passport, ID Card, Diploma, Certificate, Visa, Transcript, Contact Info).
- Generate ONLY necessary structured fields that are meaningful for the identified document type. Do not perform a general OCR of every text block, and do not extract design markings, watermarks, signatures, or noisy metadata.
- If the document is a Passport or ID Card, extract ONLY these fields:
  - "FULL_NAME": Concatenation of Surname + Given Names + Father's Name (patronymic / Otasining ismi) in that exact order (e.g. "ISAKJONOV MUKHAMMADIYOR NAVRUZBEK UGLI").
  - "PASSPORT_NUMBER"
  - "DATE_OF_BIRTH"
  - "DATE_OF_ISSUE"
  - "DATE_OF_EXPIRATION"
  - "SEX" (value must be exactly "M" or "F")
- If the document is a graduation/educational document (e.g. Shahodatnoma, Diploma, Certificate, Transcript):
  - Generate ONLY the primary educational fields available on the document, such as: "GRADUATION_DATE", "YEAR_OF_ISSUE", "NAME_OF_SCHOOL_OR_EDUCATIONAL_INSTITUTION", "MAJOR_OR_SPECIALTY", "DEPARTMENT".
  - The "NAME_OF_SCHOOL_OR_EDUCATIONAL_INSTITUTION" field MUST be translated into English and formatted in all UPPERCASE (e.g. "SPECIALIZED SCHOOL NO. 72 OF MARHAMAT DISTRICT" or "TASHKENT STATE UNIVERSITY").
- If the document contains contact information (e.g. a screenshot of a chat, message, or Telegram conversation showing an email, phone numbers, or address):
  - Set document_type to "CONTACT INFO".
  - Extract ONLY these fields if present:
    - "EMAIL": The email address exactly as written (preserve original case).
    - "PHONE_NUMBER_1": The first phone number found.
    - "PHONE_NUMBER_2": The second phone number found (if any).
    - "ADDRESS": The physical/home address. MUST be translated into English and formatted in ALL UPPERCASE (e.g. "SURKHANDARYA REGION, QIZIRIQ DISTRICT, QORASUV MAHALLA").
  - Only include fields that are actually present in the document. Do not hallucinate fields.
- If the document is of another type:
  - Automatically detect and generate ONLY the key fields (maximum 5-6 core identifiers or dates) necessary to describe that document. Do not perform a general OCR of every text block.
- Ignore watermarks, decorative branding, or irrelevant numbers.
- Provide a full raw OCR text in the "ocr_text" property. Ensure that all double quotes, backslashes, and newlines inside the raw OCR text are properly escaped so the response is valid JSON.

Return JSON only. Do not explain anything. Output must be exactly in this JSON format:
{
  "document_type": "...",
  "fields": {
    // Generate appropriate fields here dynamically depending on document type.
    // For Passports: FULL_NAME, PASSPORT_NUMBER, DATE_OF_BIRTH, DATE_OF_ISSUE, DATE_OF_EXPIRATION, SEX.
    // For Diplomas/Certificates: NAME_OF_SCHOOL_OR_EDUCATIONAL_INSTITUTION, GRADUATION_DATE, YEAR_OF_ISSUE, MAJOR_OR_SPECIALTY, DEPARTMENT.
    // For Contact Info: EMAIL, PHONE_NUMBER_1, PHONE_NUMBER_2, ADDRESS.
  },
  "ocr_text": "..."
}`

    let resultJson: any = null

    if (isGemini) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${finalModel}:generateContent?key=${finalApiKey}`
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Gemini API response error:', data)
        const errMsg = data.error?.message || 'Error communicating with Gemini API'
        return NextResponse.json({ error: errMsg }, { status: response.status })
      }

      const candidates = data.candidates || []
      if (candidates.length === 0 || !candidates[0].content?.parts?.[0]?.text) {
        return NextResponse.json({ error: 'No content returned from Gemini' }, { status: 500 })
      }

      const resultText = candidates[0].content.parts[0].text
      try {
        resultJson = JSON.parse(resultText)
      } catch (jsonErr: any) {
        console.error('Failed to parse Gemini JSON output:', resultText)
        return NextResponse.json({ 
          error: `Gemini JSON parsing failed: ${jsonErr.message}. Raw output: ${resultText}` 
        }, { status: 422 })
      }
    } else {
      // OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalApiKey}`
        },
        body: JSON.stringify({
          model: finalModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${image}`,
                    detail: "high"
                  }
                }
              ]
            }
          ]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('OpenAI API response error:', data)
        const errMsg = data.error?.message || 'Error communicating with OpenAI API'
        return NextResponse.json({ error: errMsg }, { status: response.status })
      }

      const resultText = data.choices?.[0]?.message?.content || "{}"
      try {
        resultJson = JSON.parse(resultText)
      } catch (jsonErr: any) {
        console.error('Failed to parse OpenAI JSON output:', resultText)
        return NextResponse.json({ 
          error: `OpenAI JSON parsing failed: ${jsonErr.message}. Raw output: ${resultText}` 
        }, { status: 422 })
      }
    }

    return NextResponse.json(resultJson)

  } catch (err: any) {
    console.error('Serverless function error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
