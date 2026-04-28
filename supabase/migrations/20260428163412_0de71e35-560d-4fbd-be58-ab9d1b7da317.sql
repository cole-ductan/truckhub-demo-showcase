
-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'owner');
create type public.business_status as enum ('open', 'soon', 'closed');
create type public.lead_stage as enum ('new', 'contacted', 'quote_sent', 'pending', 'booked', 'completed', 'lost');
create type public.event_kind as enum ('weekly', 'one_off');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============ ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_user_id, 'admin')
$$;

-- ============ AUTO PROFILE + ROLE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  -- Default everyone to owner role
  insert into public.user_roles (user_id, role) values (new.id, 'owner');

  -- Hardcoded admin email
  if new.email = 'admin@truckhub.gb' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ BUSINESS CATEGORIES ============
create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  emoji text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.business_categories enable row level security;

-- ============ BUSINESSES ============
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text not null unique,
  tagline text,
  description text,
  cuisine text,
  emoji text,
  category_id uuid references public.business_categories(id) on delete set null,
  logo_url text,
  hero_image_url text,
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  today_location text,
  today_hours text,
  status business_status not null default 'closed',
  is_published boolean not null default false,
  is_featured boolean not null default false,
  city text default 'Green Bay',
  region text default 'WI',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.businesses enable row level security;
create index idx_businesses_published on public.businesses(is_published);
create index idx_businesses_owner on public.businesses(owner_id);

-- helper: business ownership check
create or replace function public.owns_business(_user_id uuid, _business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.businesses where id = _business_id and owner_id = _user_id)
$$;

-- ============ BUSINESS PHOTOS ============
create table public.business_photos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.business_photos enable row level security;
create index idx_photos_business on public.business_photos(business_id);

-- ============ MENU ============
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.menu_categories enable row level security;
create index idx_menu_cat_business on public.menu_categories(business_id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price text,
  dietary_tags text[],
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.menu_items enable row level security;
create index idx_items_category on public.menu_items(category_id);
create index idx_items_business on public.menu_items(business_id);

-- ============ EVENTS ============
create table public.business_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind event_kind not null default 'one_off',
  title text not null,
  location text,
  event_date date,
  weekday text,
  start_time text,
  end_time text,
  tag text,
  notes text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.business_events enable row level security;
create index idx_events_business on public.business_events(business_id);
create index idx_events_date on public.business_events(event_date);

-- ============ LEADS ============
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  event_type text,
  event_date text,
  guest_count text,
  message text,
  source text default 'public_form',
  stage lead_stage not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create index idx_leads_business on public.leads(business_id);
create index idx_leads_stage on public.leads(stage);

create table public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_role text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.lead_messages enable row level security;
create index idx_lead_msg_lead on public.lead_messages(lead_id);

-- ============ BOOKINGS (placeholder) ============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_date date,
  total_amount numeric(10,2),
  deposit_amount numeric(10,2),
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

-- ============ TIMESTAMP TRIGGER ============
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger trg_businesses_touch before update on public.businesses for each row execute function public.touch_updated_at();
create trigger trg_leads_touch before update on public.leads for each row execute function public.touch_updated_at();

-- ============ RLS POLICIES ============

-- profiles
create policy "view own profile" on public.profiles for select using (auth.uid() = id);
create policy "admins view all profiles" on public.profiles for select using (public.is_admin(auth.uid()));
create policy "update own profile" on public.profiles for update using (auth.uid() = id);
create policy "insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- user_roles
create policy "view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "admins view all roles" on public.user_roles for select using (public.is_admin(auth.uid()));
create policy "admins manage roles" on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- business_categories: public read, admin write
create policy "public read categories" on public.business_categories for select using (true);
create policy "admins manage categories" on public.business_categories for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- businesses
create policy "public read published businesses" on public.businesses for select using (is_published = true);
create policy "owners read own business" on public.businesses for select using (auth.uid() = owner_id);
create policy "admins read all businesses" on public.businesses for select using (public.is_admin(auth.uid()));
create policy "owners insert own business" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "owners update own business" on public.businesses for update using (auth.uid() = owner_id);
create policy "admins update any business" on public.businesses for update using (public.is_admin(auth.uid()));
create policy "admins delete businesses" on public.businesses for delete using (public.is_admin(auth.uid()));

-- business_photos
create policy "public read photos of published" on public.business_photos for select
  using (exists(select 1 from public.businesses b where b.id = business_id and b.is_published));
create policy "owners manage own photos" on public.business_photos for all
  using (public.owns_business(auth.uid(), business_id))
  with check (public.owns_business(auth.uid(), business_id));
create policy "admins manage all photos" on public.business_photos for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- menu_categories
create policy "public read menu cats of published" on public.menu_categories for select
  using (exists(select 1 from public.businesses b where b.id = business_id and b.is_published));
create policy "owners manage own menu cats" on public.menu_categories for all
  using (public.owns_business(auth.uid(), business_id))
  with check (public.owns_business(auth.uid(), business_id));
create policy "admins manage all menu cats" on public.menu_categories for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- menu_items
create policy "public read menu items of published" on public.menu_items for select
  using (exists(select 1 from public.businesses b where b.id = business_id and b.is_published));
create policy "owners manage own menu items" on public.menu_items for all
  using (public.owns_business(auth.uid(), business_id))
  with check (public.owns_business(auth.uid(), business_id));
create policy "admins manage all menu items" on public.menu_items for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- business_events
create policy "public read public events of published" on public.business_events for select
  using (is_public and exists(select 1 from public.businesses b where b.id = business_id and b.is_published));
create policy "owners manage own events" on public.business_events for all
  using (public.owns_business(auth.uid(), business_id))
  with check (public.owns_business(auth.uid(), business_id));
create policy "admins manage all events" on public.business_events for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- leads (anyone can submit, only owner/admin can read)
create policy "anyone can submit leads to published" on public.leads for insert
  with check (exists(select 1 from public.businesses b where b.id = business_id and b.is_published));
create policy "owners read own leads" on public.leads for select
  using (public.owns_business(auth.uid(), business_id));
create policy "owners update own leads" on public.leads for update
  using (public.owns_business(auth.uid(), business_id));
create policy "admins read all leads" on public.leads for select using (public.is_admin(auth.uid()));
create policy "admins update all leads" on public.leads for update using (public.is_admin(auth.uid()));

-- lead_messages
create policy "owners read own lead messages" on public.lead_messages for select
  using (exists(select 1 from public.leads l where l.id = lead_id and public.owns_business(auth.uid(), l.business_id)));
create policy "owners insert lead messages" on public.lead_messages for insert
  with check (exists(select 1 from public.leads l where l.id = lead_id and public.owns_business(auth.uid(), l.business_id)));
create policy "admins manage lead messages" on public.lead_messages for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- bookings
create policy "owners read own bookings" on public.bookings for select
  using (public.owns_business(auth.uid(), business_id));
create policy "owners manage own bookings" on public.bookings for all
  using (public.owns_business(auth.uid(), business_id))
  with check (public.owns_business(auth.uid(), business_id));
create policy "admins manage all bookings" on public.bookings for all
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
