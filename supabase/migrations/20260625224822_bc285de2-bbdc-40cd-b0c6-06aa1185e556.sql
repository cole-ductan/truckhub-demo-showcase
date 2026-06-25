
-- =====================================================================
-- event_sources: catalog of crawl targets
-- =====================================================================
CREATE TABLE public.event_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_url text NOT NULL UNIQUE,
  source_type text NOT NULL DEFAULT 'webpage',
  city text DEFAULT 'Green Bay',
  region text DEFAULT 'Brown County',
  category text,
  crawl_frequency text NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  crawl_status text NOT NULL DEFAULT 'never_run',
  last_error text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_sources_crawl_status_chk CHECK (
    crawl_status IN ('never_run','queued','running','success','no_events','failed','paused')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_sources TO authenticated;
GRANT ALL ON public.event_sources TO service_role;

ALTER TABLE public.event_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage event_sources"
  ON public.event_sources
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER event_sources_touch_updated_at
  BEFORE UPDATE ON public.event_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX event_sources_active_idx ON public.event_sources (active, crawl_status);

-- =====================================================================
-- event_import_queue: staging for crawler results pending admin review
-- =====================================================================
CREATE TABLE public.event_import_queue (
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
  city text DEFAULT 'Green Bay',
  region text DEFAULT 'Brown County',
  description text,
  image_url text,
  ticket_url text,
  organizer text,
  category text,
  confidence_score numeric NOT NULL DEFAULT 0,
  duplicate_status text NOT NULL DEFAULT 'new',
  review_status text NOT NULL DEFAULT 'pending_review',
  event_fingerprint text NOT NULL,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  published_at timestamptz,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_import_queue_review_status_chk CHECK (
    review_status IN ('pending_review','needs_edit','approved','published','rejected')
  ),
  CONSTRAINT event_import_queue_duplicate_status_chk CHECK (
    duplicate_status IN ('new','possible_duplicate','exact_duplicate','ignored')
  ),
  CONSTRAINT event_import_queue_source_fingerprint_uq UNIQUE (source_id, event_fingerprint)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_import_queue TO authenticated;
GRANT ALL ON public.event_import_queue TO service_role;

ALTER TABLE public.event_import_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage event_import_queue"
  ON public.event_import_queue
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER event_import_queue_touch_updated_at
  BEFORE UPDATE ON public.event_import_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX event_import_queue_review_status_idx ON public.event_import_queue (review_status, created_at DESC);
CREATE INDEX event_import_queue_source_idx ON public.event_import_queue (source_id);
CREATE INDEX event_import_queue_start_at_idx ON public.event_import_queue (start_at);
