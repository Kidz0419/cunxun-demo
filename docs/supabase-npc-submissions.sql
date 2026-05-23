-- 村寻 MVP 数据表：新村民提交与审核状态
-- 使用方式：在 Supabase SQL Editor 执行。前端不直接读写此表，当前由 Node 后端使用 service role 访问。

create table if not exists public.npc_submissions (
  id text primary key,
  schema_version integer not null default 1,
  review_status text not null default 'pending'
    check (review_status in ('draft', 'pending', 'approved')),
  npc_payload jsonb not null,
  villager_submission jsonb not null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists npc_submissions_review_status_idx
  on public.npc_submissions (review_status);

create index if not exists npc_submissions_updated_at_idx
  on public.npc_submissions (updated_at desc);

comment on table public.npc_submissions is
  '村寻新村民资料提交表。由 Node 后端使用 service role 读写，游客端只通过 /api/npcs 读取 approved NPC。';

create or replace function public.set_npc_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists npc_submissions_set_updated_at on public.npc_submissions;
create trigger npc_submissions_set_updated_at
  before update on public.npc_submissions
  for each row
  execute function public.set_npc_submissions_updated_at();

alter table public.npc_submissions enable row level security;

revoke all on table public.npc_submissions from anon, authenticated;
grant select, insert, update, delete on table public.npc_submissions to service_role;
