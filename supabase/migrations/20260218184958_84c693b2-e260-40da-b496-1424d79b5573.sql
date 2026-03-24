
-- Fix: Remove permissive INSERT policy since only the SECURITY DEFINER trigger should insert
DROP POLICY "System inserts notifications" ON public.notifications;

-- Only allow service role / trigger inserts (no direct user INSERT)
-- The trigger function runs as SECURITY DEFINER and bypasses RLS
