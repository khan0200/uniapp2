import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { UserProvider } from '@/contexts/UserContext'
import { UploadProvider } from '@/contexts/UploadContext'
import { GlobalUploadProgress } from '@/components/ui/GlobalUploadProgress'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'UniApp — Educational Consulting',
    template: '%s | UniApp',
  },
  description:
    'A premium CRM for managing student recruitment, university applications, and documents.',
  keywords: ['educational consulting', 'student CRM', 'university admissions'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakartaSans.className}>
        <ThemeProvider>
          <UserProvider>
            <UploadProvider>
              <GlobalUploadProgress />
              {children}
            </UploadProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
