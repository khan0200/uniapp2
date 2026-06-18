'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import logo from '@/logo.png'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/students')
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Card */}
      <div
        className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center">
            <Image
              src={logo}
              alt="UniApp logo"
              width={64}
              height={64}
              className="rounded-[var(--radius-lg)] object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            UniApp
          </h1>
          <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
            Sign in to your workspace
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-5 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 dark:bg-red-950/40"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--danger)]" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4" id="login-form">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={cn(
                  'w-full rounded-[var(--radius-md)] border border-[var(--border)]',
                  'bg-[var(--background)] pl-10 pr-4 py-2.5 text-sm',
                  'text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                  'transition-all duration-150'
                )}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--foreground)]"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={cn(
                  'w-full rounded-[var(--radius-md)] border border-[var(--border)]',
                  'bg-[var(--background)] pl-10 pr-11 py-2.5 text-sm',
                  'text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent',
                  'transition-all duration-150'
                )}
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className={cn(
              'w-full flex items-center justify-center gap-2',
              'rounded-[var(--radius-md)] py-2.5 px-4 text-sm font-semibold',
              'bg-[var(--accent)] text-white',
              'hover:bg-[var(--accent-hover)] active:scale-[0.98]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'transition-all duration-150 mt-2'
            )}
            style={{ boxShadow: '0 4px 14px rgba(59, 127, 245, 0.35)' }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[var(--foreground-muted)]">
          Contact your administrator to create an account.
        </p>
      </div>
    </motion.div>
  )
}
