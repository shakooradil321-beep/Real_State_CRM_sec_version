create table public.deal_activities (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (
    type in (
      'note',
      'stage_changed',
      'deal_created',
      'followup_set',
      'called',
      'whatsapped'
    )
  ),
  content text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.deal_activities enable row level security;

create policy "Users can manage own activities"
on public.deal_activities
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Index for fast lookup per deal
create index deal_activities_deal_id_idx
on public.deal_activities(deal_id, created_at desc);