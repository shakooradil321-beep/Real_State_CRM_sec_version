alter table public.deals
add column source text check (
  source in (
    'whatsapp',
    'referral',
    'olx',
    'zameen',
    'facebook',
    'instagram',
    'walk_in',
    'cold_call',
    'other'
  )
);