-- FoodXMobile Event Crawler Intake MVP
-- Adds admin-managed event sources plus a staging/review queue for records
-- imported by an external worker such as a Google Cloud Run Job.

CREATE TABLE IF NOT EXISTS public.event_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_type text NOT NULL DEFAULT 'webpage',
  city text NOT NULL DEFAULT 'Green Bay',
  region text NOT NULL DEFAULT 'Brown County',
  category text,
  crawl_frequency text NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  crawl_status text NOT NULL DEFAULT 'never_run',
  last_error text,
  notes text,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_sources_source_url_unique UNIQUE (source_url),
  CONSTRAINT event_sources_source_type_check CHECK (source_type IN ('webpage','json_ld','rss','ics','api','manual')),
  CONSTRAINT event_sources_crawl_frequency_check CHECK (crawl_frequency IN ('hourly','daily','weekly','monthly','manual')),
  CONSTRAINT event_sources_crawl_status_check CHECK (crawl_status IN ('never_run','queued','running','success','no_events','failed','paused'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sources TO authenticated;
GRANT ALL ON public.event_sources TO service_role;

ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read event_sources"
  ON public.event_sources FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "admins insert event_sources"
  ON public.event_sources FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins update event_sources"
  ON public.event_sources FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins delete event_sources"
  ON public.event_sources FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_event_sources_touch ON public.event_sources;
CREATE TRIGGER trg_event_sources_touch
  BEFORE UPDATE ON public.event_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_event_sources_active ON public.event_sources(active, crawl_frequency);
CREATE INDEX IF NOT EXISTS idx_event_sources_status ON public.event_sources(crawl_status);

CREATE TABLE IF NOT EXISTS public.event_import_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.event_sources(id) ON DELETE SET NULL,
  source_name text NOT NULL,
  source_url text NOT NULL,
  source_event_url text,
  external_id text,
  title text NOT NULL,
  start_date date,
  start_time time,
  end_date date,
  end_time time,
  start_at timestamptz,
  end_at timestamptz,
  venue text,
  address text,
  city text NOT NULL DEFAULT 'Green Bay',
  region text NOT NULL DEFAULT 'Brown County',
  description text,
  image_url text,
  ticket_url text,
  organizer text,
  category text,
  confidence_score numeric(5,2) NOT NULL DEFAULT 0,
  duplicate_status text NOT NULL DEFAULT 'new',
  review_status text NOT NULL DEFAULT 'pending_review',
  event_fingerprint text NOT NULL,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  published_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_import_queue_duplicate_status_check CHECK (duplicate_status IN ('new','possible_duplicate','exact_duplicate','ignored')),
  CONSTRAINT event_import_queue_review_status_check CHECK (review_status IN ('pending_review','needs_edit','approved','published','rejected')),
  CONSTRAINT event_import_queue_confidence_score_check CHECK (confidence_score >= 0 AND confidence_score <= 100),
  CONSTRAINT event_import_queue_source_fingerprint_unique UNIQUE (source_id, event_fingerprint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_import_queue TO authenticated;
GRANT ALL ON public.event_import_queue TO service_role;

ALTER TABLE public.event_import_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read event_import_queue"
  ON public.event_import_queue FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "admins insert event_import_queue"
  ON public.event_import_queue FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins update event_import_queue"
  ON public.event_import_queue FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins delete event_import_queue"
  ON public.event_import_queue FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_event_import_queue_touch ON public.event_import_queue;
CREATE TRIGGER trg_event_import_queue_touch
  BEFORE UPDATE ON public.event_import_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_event_import_queue_review ON public.event_import_queue(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_import_queue_duplicate ON public.event_import_queue(duplicate_status);
CREATE INDEX IF NOT EXISTS idx_event_import_queue_start_at ON public.event_import_queue(start_at);
CREATE INDEX IF NOT EXISTS idx_event_import_queue_source ON public.event_import_queue(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_import_queue_fingerprint ON public.event_import_queue(event_fingerprint);

CREATE OR REPLACE FUNCTION public.review_event_import(
  _event_import_id uuid,
  _review_status text,
  _duplicate_status text DEFAULT NULL,
  _admin_notes text DEFAULT NULL
)
RETURNS public.event_import_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.event_import_queue;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  IF _review_status NOT IN ('pending_review','needs_edit','approved','published','rejected') THEN
    RAISE EXCEPTION 'invalid review status: %', _review_status;
  END IF;

  IF _duplicate_status IS NOT NULL AND _duplicate_status NOT IN ('new','possible_duplicate','exact_duplicate','ignored') THEN
    RAISE EXCEPTION 'invalid duplicate status: %', _duplicate_status;
  END IF;

  UPDATE public.event_import_queue
     SET review_status = _review_status,
         duplicate_status = COALESCE(_duplicate_status, duplicate_status),
         admin_notes = COALESCE(_admin_notes, admin_notes),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   WHERE id = _event_import_id
   RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'event import not found';
  END IF;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.review_event_import(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_event_import(uuid, text, text, text) TO authenticated;
