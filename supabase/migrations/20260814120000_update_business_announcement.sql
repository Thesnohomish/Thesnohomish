-- Replace the legacy delivery announcement while preserving any later custom copy.
update public.store_settings
set value = jsonb_set(
  coalesce(value, '{}'::jsonb),
  '{header_notice}',
  to_jsonb('Ordering for business or corporate? Call +254 726 764 759'::text),
  true
)
where key = 'site_content'
  and coalesce(value->>'header_notice', '') in ('', 'Reliable delivery across Nairobi');
