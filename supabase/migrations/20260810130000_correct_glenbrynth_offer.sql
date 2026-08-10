-- Correct the Glenbrynth launch mechanic for projects that already applied the
-- original merchandising migration.
update public.homepage_banners
set title = 'Buy two Glenbrynth.',
    subtitle = 'Choose any two featured Glenbrynth bottles and receive one promotional bottle free while stock lasts.',
    badge_text = 'Buy two · Get one free',
    updated_at = now()
where id = 'b0000000-0000-4000-8000-000000000101';
