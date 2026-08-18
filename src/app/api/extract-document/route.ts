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
- Identify the document type automatically (e.g. Passport, ID Card, Shahodatnoma, Diploma, Certificate, Visa, Transcript, Contact Info).
- Generate ONLY necessary structured fields that are meaningful for the identified document type. Do not perform a general OCR of every text block, and do not extract design markings, watermarks, signatures, or noisy metadata.
- If the document is a Passport or ID Card, extract ONLY these fields:
  - "FULL_NAME": Concatenation of Surname + Given Names + Father's Name (patronymic / Otasining ismi) in that exact order (e.g. "ISAKJONOV MUKHAMMADIYOR NAVRUZBEK UGLI").
  - "PASSPORT_NUMBER"
  - "DATE_OF_BIRTH"
  - "DATE_OF_ISSUE"
  - "DATE_OF_EXPIRATION"
  - "SEX" (value must be exactly "M" or "F")
- If the document is a university/college diploma or secondary school certificate (e.g. Bachelor's Diploma / Bakalavr Diplomi, Master's Diploma / Magistr Diplomi, Shahodatnoma / Certificate of General Secondary Education):
  - Document Type: Set document_type to "BACHELOR'S DIPLOMA", "MASTER'S DIPLOMA", "SHAHODATNOMA", or "DIPLOMA".
  - Extract ONLY these educational fields (Do NOT extract personal details like FULL_NAME, DATE_OF_BIRTH, or personal ID numbers):
    - "FINAL_SCHOOL_NAME": The full name of the university, college, or school (from educational institution header) TRANSLATED INTO ENGLISH and formatted in ALL UPPERCASE (e.g. "SAMARKAND STATE UNIVERSITY NAMED AFTER SHAROF RASHIDOV" or "TASHKENT STATE TECHNICAL UNIVERSITY").
    - "MAJOR": For Bachelor's/Master's diplomas, extract the awarded field of study/speciality in ALL UPPERCASE (e.g. "PHILOLOGY AND LANGUAGE TEACHING"). For Shahodatnoma, MUST be set to exactly "GENERAL SECONDARY EDUCATION".
    - "GPA": Extract ONLY if an explicit GPA score or complete grades table is printed on the scan. If GPA / grades are NOT printed on the document scan, DO NOT include the "GPA" field at all.
    - "DEGREE_NO": The diploma / certificate serial number (e.g. "B № 00644212" or "UM №03565142").
    - "DATE_OF_GRADUATION": The graduation date in YYYY-MM-DD format (from the State Attestation Commission decision date e.g. 'June 10, 2025' -> '2025-06-10', or issue date). If only the year is available, extract the 4-digit year (e.g. '2025').
    - "DATE_OF_ENTRY": Automatically calculate Date of Entry:
      - For Bachelor's Diplomas (4-year degree): (Date of Graduation year - 4 years), on September 2nd in YYYY-MM-DD format (e.g. 2025 - 4 = '2021-09-02').
      - For Master's Diplomas (2-year degree): (Date of Graduation year - 2 years), on September 2nd in YYYY-MM-DD format (e.g. 2025 - 2 = '2023-09-02').
      - For Secondary School Certificates (Shahodatnoma): (Date of Graduation year - 3 years), on September 2nd in YYYY-MM-DD format (e.g. 2025 - 3 = '2022-09-02').
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
    // For Shahodatnoma / Diplomas: FINAL_SCHOOL_NAME, MAJOR, GPA, DEGREE_NO, DATE_OF_ENTRY, DATE_OF_GRADUATION.
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
