-- NBA 2K26 Build Tracker cloud sync schema.
-- Run this in Supabase SQL Editor, then copy your Project URL and anon public key
-- into the app's Data Backup > Cloud Sync panel.

create table if not exists public.nba2k26_cloud_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  record_key text not null,
  record_value jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, record_key)
);

alter table public.nba2k26_cloud_records enable row level security;

grant select, insert, update, delete on public.nba2k26_cloud_records to authenticated;

drop policy if exists "nba2k26 records are readable by owner" on public.nba2k26_cloud_records;
drop policy if exists "nba2k26 records are insertable by owner" on public.nba2k26_cloud_records;
drop policy if exists "nba2k26 records are updateable by owner" on public.nba2k26_cloud_records;
drop policy if exists "nba2k26 records are deleteable by owner" on public.nba2k26_cloud_records;

create policy "nba2k26 records are readable by owner"
on public.nba2k26_cloud_records
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "nba2k26 records are insertable by owner"
on public.nba2k26_cloud_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "nba2k26 records are updateable by owner"
on public.nba2k26_cloud_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "nba2k26 records are deleteable by owner"
on public.nba2k26_cloud_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists nba2k26_cloud_records_user_updated_idx
on public.nba2k26_cloud_records (user_id, updated_at desc);
