import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <p className="text-[15.5px] font-medium text-[var(--foreground-muted)]">Loading student details...</p>
      </div>
    </div>
  )
}
