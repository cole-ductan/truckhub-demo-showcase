GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

GRANT INSERT, SELECT ON public.lead_messages TO authenticated;
GRANT ALL ON public.lead_messages TO service_role;