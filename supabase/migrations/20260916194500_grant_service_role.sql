-- Ensure the service_role has explicit full access to the tables
GRANT ALL PRIVILEGES ON public.study_sessions TO service_role;
GRANT ALL PRIVILEGES ON public.study_records TO service_role;
