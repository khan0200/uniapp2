import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'

const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || ''
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || ''
const redirectUri = 'http://localhost:3000/oauth2callback'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is missing' }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    const refreshToken = tokens.refresh_token

    if (!refreshToken) {
      return new NextResponse(
        `<html><body><h1 style="color:red">Warning: No refresh token returned.</h1><p>Please revoke access to this app at https://myaccount.google.com/permissions and try again.</p></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Write to .env.local automatically
    const envPath = path.resolve('.env.local')
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

    envContent = envContent
      .split('\n')
      .filter(l => !l.startsWith('GOOGLE_CLIENT_ID') && !l.startsWith('GOOGLE_CLIENT_SECRET') && !l.startsWith('GOOGLE_REFRESH_TOKEN'))
      .join('\n')

    const updatedEnv = `${envContent.trim()}\n\nGOOGLE_CLIENT_ID="${clientId}"\nGOOGLE_CLIENT_SECRET="${clientSecret}"\nGOOGLE_REFRESH_TOKEN="${refreshToken}"\n`
    fs.writeFileSync(envPath, updatedEnv, 'utf8')

    console.log('\n======================================================')
    console.log('✅ GOOGLE OAUTH 2.0 REFRESH TOKEN GENERATED SUCCESSFULLY!')
    console.log(`GOOGLE_CLIENT_ID="${clientId}"`)
    console.log(`GOOGLE_CLIENT_SECRET="${clientSecret}"`)
    console.log(`GOOGLE_REFRESH_TOKEN="${refreshToken}"`)
    console.log('======================================================\n')

    return new NextResponse(
      `<html>
        <body style="font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #09090b; color: #ffffff;">
          <div style="max-w: 500px; margin: 0 auto; background: #18181b; padding: 32px; border-radius: 16px; border: 1px solid #27272a;">
            <h1 style="color: #10b981; margin-bottom: 8px;">✅ Google Drive Authorized!</h1>
            <p style="color: #a1a1aa; font-size: 14px;">Your <code>.env.local</code> has been updated automatically with your OAuth credentials.</p>
            <div style="background: #27272a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; margin: 20px 0; text-align: left; word-break: break-all;">
              GOOGLE_REFRESH_TOKEN="${refreshToken.substring(0, 15)}..."
            </div>
            <p style="color: #71717a; font-size: 13px;">You can close this window now.</p>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: any) {
    console.error('OAuth Callback Error:', err)
    return new NextResponse(`<html><body><h1>Error: ${err.message}</h1></body></html>`, {
      headers: { 'Content-Type': 'text/html' },
      status: 500,
    })
  }
}
