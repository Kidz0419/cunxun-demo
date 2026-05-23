-- 村寻 v2 小店目录表
-- 使用方式：在 Supabase SQL Editor 执行。前端不直接读写此表，Node 后端使用 service role 访问。

create table if not exists public.shop_profiles (
  id text primary key,
  schema_version integer not null default 1,
  shop_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shop_profiles_updated_at_idx
  on public.shop_profiles (updated_at desc);

create index if not exists shop_profiles_village_idx
  on public.shop_profiles ((shop_payload ->> 'village'));

create index if not exists shop_profiles_category_idx
  on public.shop_profiles ((shop_payload ->> 'category'));

comment on table public.shop_profiles is
  '村寻 v2 主理人小店目录。由 Node 后端使用 service role 读写，游客端只通过 /api/shops 读取。';

create or replace function public.set_shop_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shop_profiles_set_updated_at on public.shop_profiles;
create trigger shop_profiles_set_updated_at
  before update on public.shop_profiles
  for each row
  execute function public.set_shop_profiles_updated_at();

alter table public.shop_profiles enable row level security;

revoke all on table public.shop_profiles from anon, authenticated;
grant select, insert, update, delete on table public.shop_profiles to service_role;
