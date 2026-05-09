-- ============================================================
-- PADELBOOK — Schéma SQL Supabase
-- Exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- PROFILES utilisateurs (liés à auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text check (role in ('user','coach','admin')) default 'user',
  nom text,
  prenom text,
  email text,
  avatar_color text,
  coach_id uuid,
  created_at timestamptz default now()
);

-- COACHES
create table coaches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  validated boolean default false,
  nom text,
  initiales text,
  avatar_color text,
  ville text,
  code_postal text,
  lat float,
  lng float,
  specialite text default '',
  bio text default '',
  diplomes jsonb default '[]',
  experience int default 0,
  niveaux jsonb default '["Débutant"]',
  langues jsonb default '["Français"]',
  tarifs jsonb default '{"solo":60,"duo":40,"trio":35,"collectif":25}',
  rating float default 0,
  nb_avis int default 0,
  nb_eleves int default 0,
  disponibilites jsonb default '{}',
  plan text default 'decouverte',
  plan_expiry timestamptz,
  plan_active boolean default true,
  reservations_count int default 0,
  revenue float default 0,
  admin_notes text default '',
  created_at timestamptz default now()
);

-- BOOKINGS
create table bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  coach_id uuid references coaches(id) on delete cascade,
  coach_nom text,
  coach_ville text,
  user_nom text,
  service text,
  service_label text,
  date text,
  heure text,
  prix float,
  statut text default 'en_attente',
  created_at timestamptz default now()
);

-- REVIEWS
create table reviews (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid references coaches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  auteur text,
  note int check (note between 1 and 5),
  commentaire text,
  modere boolean default false,
  created_at timestamptz default now()
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────
alter table profiles  enable row level security;
alter table coaches   enable row level security;
alter table bookings  enable row level security;
alter table reviews   enable row level security;

-- Coaches : lecture publique si validé, écriture si propriétaire
create policy "coaches_public"     on coaches  for select using (validated = true);
create policy "coaches_own"        on coaches  for all    using (user_id = auth.uid());

-- Profiles : accès uniquement à son propre profil
create policy "profiles_own"       on profiles for all    using (id = auth.uid());

-- Bookings : élève voit/gère ses propres réservations
create policy "bookings_user"      on bookings for all    using (user_id = auth.uid());
-- Coach peut voir ses réservations
create policy "bookings_coach"     on bookings for select using (
  coach_id in (select id from coaches where user_id = auth.uid())
);
-- Coach peut mettre à jour le statut de ses réservations
create policy "bookings_coach_upd" on bookings for update using (
  coach_id in (select id from coaches where user_id = auth.uid())
);

-- Reviews : lecture publique si modéré, écriture si propriétaire
create policy "reviews_public"     on reviews  for select using (modere = true);
create policy "reviews_own"        on reviews  for all    using (user_id = auth.uid());

-- ── POLICY ADMIN (service role bypasse RLS) ─────────────────
-- L'admin utilise le service_role_key côté Netlify Functions,
-- pas besoin de policy supplémentaire.

-- ── TRIGGER : mettre à jour updated_at automatiquement ──────
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
