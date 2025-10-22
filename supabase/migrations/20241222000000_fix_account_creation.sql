-- 1) Table
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  onboarding_completed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep timestamps fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- 2) Trigger to auto-provision profile when a new auth user is created
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 3) RLS: secure but usable
alter table public.users enable row level security;

-- Allow a logged-in user to select their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='users' and policyname='Users can select self'
  ) then
    create policy "Users can select self"
      on public.users for select
      using (auth.uid() = id);
  end if;
end$$;

-- Allow a logged-in user to update their own row
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='users' and policyname='Users can update self'
  ) then
    create policy "Users can update self"
      on public.users for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end$$;

-- Optional: allow self-insert (not required because trigger provisions rows),
-- but keep it safe if some flows still do client inserts.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='users' and policyname='Users can insert self'
  ) then
    create policy "Users can insert self"
      on public.users for insert
      with check (auth.uid() = id);
  end if;
end$$;
