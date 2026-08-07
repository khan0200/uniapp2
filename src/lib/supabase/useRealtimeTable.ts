'use client'

import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface RealtimeHandlers<T extends Record<string, any>> {
  onInsert?: (row: T) => void
  onUpdate?: (row: T) => void
  onDelete?: (row: Partial<T>) => void
}

/**
 * Subscribes to Postgres INSERT/UPDATE/DELETE on a table and invokes the
 * matching handler for each change made by *any* client — this browser, another
 * tab, or another computer.
 *
 * Realtime evaluates the table's RLS policies per subscriber, so a client only
 * receives rows it could have SELECTed itself; tenant isolation carries over to
 * the stream without extra filtering here.
 *
 * Handlers are held in a ref so callers can pass inline closures without
 * tearing down and re-establishing the websocket subscription on every render.
 */
export function useRealtimeTable<T extends Record<string, any>>(
  table: string,
  handlers: RealtimeHandlers<T>,
  { enabled = true }: { enabled?: boolean } = {}
) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    // Unique channel name per subscription so multiple hooks (or a remounting
    // component in React strict mode) never collide on one topic.
    const channel = supabase
      .channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload: RealtimePostgresChangesPayload<T>) => {
          const { onInsert, onUpdate, onDelete } = handlersRef.current
          if (payload.eventType === 'INSERT') onInsert?.(payload.new as T)
          else if (payload.eventType === 'UPDATE') onUpdate?.(payload.new as T)
          else if (payload.eventType === 'DELETE') onDelete?.(payload.old as Partial<T>)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, enabled])
}
