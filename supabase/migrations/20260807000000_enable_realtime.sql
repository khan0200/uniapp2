-- ============================================================================
-- Enable Supabase Realtime for live cross-device sync
--
-- Without this, every browser only sees the snapshot it fetched on mount, so a
-- change made on one computer stays invisible on another until a manual reload.
-- Adding these tables to the supabase_realtime publication makes Postgres stream
-- INSERT/UPDATE/DELETE to subscribed clients.
--
-- Realtime still runs each change through the table's RLS policies before
-- delivering it, so tenant/role isolation is preserved on the stream exactly as
-- it is on a normal SELECT.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. REPLICA IDENTITY FULL
--
-- The default (REPLICA IDENTITY DEFAULT) only puts the primary key in the WAL
-- record for UPDATE/DELETE. Realtime needs the full OLD row to (a) evaluate RLS
-- on DELETE events and (b) populate payload.old. Without FULL, deletes arrive
-- with only the id and RLS-filtered streams can silently drop events.
-- ----------------------------------------------------------------------------
ALTER TABLE public.students  REPLICA IDENTITY FULL;
ALTER TABLE public.payments  REPLICA IDENTITY FULL;

-- ----------------------------------------------------------------------------
-- 2. Add tables to the supabase_realtime publication
--
-- Guarded: adding a table that is already a publication member raises
-- 42710 duplicate_object, which would abort the whole migration on re-run.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  -- The publication is created by the Supabase platform, but a bare local
  -- `supabase start` / fresh project may not have it yet.
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH t IN ARRAY ARRAY['students', 'payments'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
