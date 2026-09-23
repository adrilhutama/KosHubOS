-- =============================================
-- KosHubOS schema.sql
-- Postgres 15 / Supabase Free Tier optimized
-- Run in Supabase Dashboard > SQL Editor
-- Then run: alter publication supabase_realtime add table
--   public.expenses, public.expense_splits, public.chores, public.guest_logs;
-- =============================================

-- 0. Extensions
create extension if not exists "pgcrypto";

-- 1. generate_invite_code() goes FIRST: houses.invite_code uses it as
--    a column DEFAULT, so it must exist before tables are created.
--    is_house_member() / is_house_owner() are defined in section 3,
--    AFTER public.house_members exists.
-- 6-char invite code: unambiguous chars (no 0/O/1/I)
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, (random()*31)::int + 1, 1);
  end loop;
  return result;
end;
$$;

-- 2. Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  phone_number text,
  payment_bank text,
  payment_account text,
  payment_qris_note text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  address text default '',
  invite_code text unique not null default public.generate_invite_code(),
  quiet_hours_start time default '22:00',
  quiet_hours_end time default '06:00',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null,
  constraint invite_code_format check (invite_code ~ '^[A-Z2-9]{6}$')
);

create table if not exists public.house_members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'active' check (status in ('active','inactive')),
  joined_at timestamptz default now() not null,
  unique (house_id, user_id)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  paid_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  amount numeric(12,2) not null check (amount > 0),
  category text not null default 'other' check (category in ('utilities','groceries','maintenance','other')),
  receipt_url text,
  split_type text not null default 'equal' check (split_type in ('equal','custom')),
  created_at timestamptz default now() not null
);

create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  house_id uuid not null references public.houses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_owed numeric(12,2) not null check (amount_owed >= 0),
  is_settled boolean not null default false,
  settled_at timestamptz,
  unique (expense_id, user_id)
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text default '',
  frequency text not null default 'weekly' check (frequency in ('daily','weekly','custom')),
  assigned_to uuid references auth.users(id) on delete set null,
  rotation_order text[] not null default '{}',
  rotation_index int not null default 0,
  is_completed boolean not null default false,
  last_completed_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.guest_logs (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses(id) on delete cascade,
  logged_by uuid not null references auth.users(id) on delete set null,
  guest_name text not null check (char_length(guest_name) between 1 and 120),
  visit_date date not null default current_date,
  is_overnight boolean not null default false,
  notes text default '',
  created_at timestamptz default now() not null
);

-- 3. Membership helpers (SECURITY DEFINER to avoid RLS recursion).
--    Defined AFTER public.house_members exists, BEFORE indexes and
--    RLS policies that call them.
create or replace function public.is_house_member(p_house_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.house_members m
    where m.house_id = p_house_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.is_house_owner(p_house_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.house_members m
    where m.house_id = p_house_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
      and m.status = 'active'
  );
$$;

-- 4. Indexes
create unique index if not exists houses_invite_code_idx on public.houses(invite_code);
create index if not exists members_house_user_idx on public.house_members(house_id, user_id) where status='active';
create index if not exists members_user_idx on public.house_members(user_id) where status='active';
create index if not exists expenses_house_idx on public.expenses(house_id, created_at desc);
create index if not exists splits_expense_idx on public.expense_splits(expense_id);
create index if not exists splits_house_user_idx on public.expense_splits(house_id, user_id) where is_settled=false;
create index if not exists chores_house_idx on public.chores(house_id);
create index if not exists guests_house_idx on public.guest_logs(house_id, visit_date desc);

-- 5. Triggers
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create or replace function public.ensure_invite_code()
returns trigger language plpgsql as $$
begin
  if new.invite_code is null or new.invite_code = '' then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end; $$;

drop trigger if exists houses_invite_code_trg on public.houses;
create trigger houses_invite_code_trg
  before insert on public.houses
  for each row execute function public.ensure_invite_code();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.rotate_chore()
returns trigger language plpgsql as $$
declare n int;
begin
  if new.is_completed = true and old.is_completed = false then
    new.last_completed_at := now();
    n := array_length(new.rotation_order, 1);
    if n is not null and n > 0 then
      new.rotation_index := (old.rotation_index + 1) % n;
      begin
        new.assigned_to := (new.rotation_order[new.rotation_index + 1])::uuid;
      exception when others then
        new.assigned_to := old.assigned_to;
      end;
      new.is_completed := false;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists chores_rotate_trg on public.chores;
create trigger chores_rotate_trg
  before update on public.chores
  for each row execute function public.rotate_chore();

-- 6. RLS
alter table public.profiles enable row level security;
alter table public.houses enable row level security;
alter table public.house_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.chores enable row level security;
alter table public.guest_logs enable row level security;

drop policy if exists "profiles_self_all" on public.profiles;
create policy "profiles_self_all" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_housemates_read" on public.profiles;
create policy "profiles_housemates_read" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.house_members m1
      join public.house_members m2 on m1.house_id = m2.house_id
      where m1.user_id = auth.uid() and m1.status='active'
        and m2.user_id = profiles.id and m2.status='active'
    )
  );

drop policy if exists "houses_member_read" on public.houses;
create policy "houses_member_read" on public.houses
  for select to authenticated using (public.is_house_member(id));

drop policy if exists "houses_create" on public.houses;
create policy "houses_create" on public.houses
  for insert to authenticated with check (true);

drop policy if exists "houses_owner_update" on public.houses;
create policy "houses_owner_update" on public.houses
  for update to authenticated
  using (public.is_house_owner(id)) with check (public.is_house_owner(id));

drop policy if exists "houses_owner_delete" on public.houses;
create policy "houses_owner_delete" on public.houses
  for delete to authenticated using (public.is_house_owner(id));

drop policy if exists "members_read" on public.house_members;
create policy "members_read" on public.house_members
  for select to authenticated
  using (public.is_house_member(house_id) or user_id = auth.uid());

drop policy if exists "members_self_join" on public.house_members;
create policy "members_self_join" on public.house_members
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "members_owner_update" on public.house_members;
create policy "members_owner_update" on public.house_members
  for update to authenticated
  using (public.is_house_owner(house_id) or user_id = auth.uid())
  with check (public.is_house_owner(house_id) or user_id = auth.uid());

drop policy if exists "members_owner_delete" on public.house_members;
create policy "members_owner_delete" on public.house_members
  for delete to authenticated
  using (public.is_house_owner(house_id) or user_id = auth.uid());

drop policy if exists "expenses_member_read" on public.expenses;
create policy "expenses_member_read" on public.expenses
  for select to authenticated using (public.is_house_member(house_id));

drop policy if exists "expenses_member_insert" on public.expenses;
create policy "expenses_member_insert" on public.expenses
  for insert to authenticated
  with check (public.is_house_member(house_id) and paid_by = auth.uid());

drop policy if exists "expenses_member_update" on public.expenses;
create policy "expenses_member_update" on public.expenses
  for update to authenticated
  using (public.is_house_member(house_id))
  with check (public.is_house_member(house_id));

drop policy if exists "expenses_member_delete" on public.expenses;
create policy "expenses_member_delete" on public.expenses
  for delete to authenticated using (public.is_house_member(house_id));

drop policy if exists "splits_member_read" on public.expense_splits;
create policy "splits_member_read" on public.expense_splits
  for select to authenticated using (public.is_house_member(house_id));

drop policy if exists "splits_member_insert" on public.expense_splits;
create policy "splits_member_insert" on public.expense_splits
  for insert to authenticated with check (public.is_house_member(house_id));

drop policy if exists "splits_member_update" on public.expense_splits;
create policy "splits_member_update" on public.expense_splits
  for update to authenticated
  using (public.is_house_member(house_id))
  with check (public.is_house_member(house_id));

drop policy if exists "splits_member_delete" on public.expense_splits;
create policy "splits_member_delete" on public.expense_splits
  for delete to authenticated using (public.is_house_member(house_id));

drop policy if exists "chores_member_all" on public.chores;
create policy "chores_member_all" on public.chores
  for all to authenticated
  using (public.is_house_member(house_id))
  with check (public.is_house_member(house_id));

drop policy if exists "guests_member_all" on public.guest_logs;
create policy "guests_member_all" on public.guest_logs
  for all to authenticated
  using (public.is_house_member(house_id))
  with check (public.is_house_member(house_id));

-- 7. Storage: receipts bucket (private, 5MB, images only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts','receipts', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit=5242880;

drop policy if exists "receipts_member_read" on storage.objects;
create policy "receipts_member_read" on storage.objects
  for select to authenticated
  using (bucket_id='receipts' and public.is_house_member((storage.foldername(name))[1]::uuid));

drop policy if exists "receipts_member_insert" on storage.objects;
create policy "receipts_member_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id='receipts' and public.is_house_member((storage.foldername(name))[1]::uuid));

drop policy if exists "receipts_member_delete" on storage.objects;
create policy "receipts_member_delete" on storage.objects
  for delete to authenticated
  using (bucket_id='receipts' and public.is_house_member((storage.foldername(name))[1]::uuid));
