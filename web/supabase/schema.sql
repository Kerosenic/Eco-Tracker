-- Eco-Tracker database schema
-- ----------------------------------------------------------------------
-- HOW TO RUN THIS:
--   1. Open your Supabase project dashboard
--   2. Left sidebar → "SQL Editor" (icon looks like </>) → "New query"
--   3. Paste this entire file
--   4. Click "Run" (bottom right, or Ctrl+Enter)
--
-- Safe to run more than once. Tables won't be re-created if they exist,
-- and seed data only inserts when each table is empty.
-- ----------------------------------------------------------------------

-- 1. STUDENTS — one row per registered student
create table if not exists students (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  class           text not null,
  face_embedding  jsonb,
  total_credits   integer not null default 0,
  created_at      timestamptz not null default now()
);

-- 2. MEALS — one row per tray scan
create table if not exists meals (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id) on delete cascade,
  weight_g            numeric,
  total_score         integer not null,
  eco_credits         integer not null,
  co2_saved_g         numeric,
  compartment_scores  jsonb,
  photo_url           text,
  created_at          timestamptz not null default now()
);

-- 3. REWARDS — catalog of prizes students can redeem
create table if not exists rewards (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  cost_credits  integer not null,
  image_url     text,
  stock         integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- 4. REDEMPTIONS — log of student-redeems-reward events
create table if not exists redemptions (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references students(id) on delete cascade,
  reward_id      uuid not null references rewards(id) on delete restrict,
  credits_spent  integer not null,
  created_at     timestamptz not null default now()
);

-- Indexes for the queries the website will run most often
create index if not exists idx_meals_student      on meals(student_id);
create index if not exists idx_meals_created      on meals(created_at desc);
create index if not exists idx_redemptions_student on redemptions(student_id);

-- Row Level Security (RLS) — required by Supabase for tables exposed to the browser.
-- For now we let anyone read; we'll tighten these when login is wired up.
alter table students    enable row level security;
alter table meals       enable row level security;
alter table rewards     enable row level security;
alter table redemptions enable row level security;

drop policy if exists "public read students"    on students;
drop policy if exists "public read meals"       on meals;
drop policy if exists "public read rewards"     on rewards;
drop policy if exists "public read redemptions" on redemptions;

create policy "public read students"    on students    for select using (true);
create policy "public read meals"       on meals       for select using (true);
create policy "public read rewards"     on rewards     for select using (true);
create policy "public read redemptions" on redemptions for select using (true);

-- Table-level grants — required in addition to RLS when using the new
-- publishable API keys. RLS says "who can read which rows"; GRANT says
-- "this role is allowed to touch the table at all". Both must pass.
grant select on students    to anon, authenticated;
grant select on meals       to anon, authenticated;
grant select on rewards     to anon, authenticated;
grant select on redemptions to anon, authenticated;

-- Seed data — only inserted on the first run (when each table is empty)
do $$
begin
  if not exists (select 1 from students) then
    insert into students (name, class, total_credits) values
      ('Emily Chen',       '10A', 120),
      ('Marcus Johnson',   '10A',  95),
      ('Sofia Rodriguez',  '11B', 145),
      ('Liam Wilson',       '9C',  80),
      ('Ava Patel',        '11B', 110);
  end if;

  if not exists (select 1 from rewards) then
    insert into rewards (name, description, cost_credits, stock) values
      ('Eco-friendly water bottle',  'Reusable stainless steel bottle',                  200,  25),
      ('Cafeteria voucher ($5)',     'Redeem at the school cafeteria',                   100,  50),
      ('School notebook',            'Recycled paper notebook with Eco-Tracker logo',     75, 100),
      ('"Zero Waste Week" badge',    'Digital achievement badge + certificate',           50, 999);
  end if;

  if not exists (select 1 from meals) then
    insert into meals (student_id, weight_g, total_score, eco_credits, co2_saved_g, created_at)
    select id, 150, 4, 75, 390, now() - interval '1 day' from students where name = 'Emily Chen'
    union all
    select id,  80, 2, 85, 444, now() - interval '2 day' from students where name = 'Emily Chen'
    union all
    select id, 220, 6, 60, 333, now() - interval '3 day' from students where name = 'Emily Chen'
    union all
    select id,   0, 0, 100, 500, now() - interval '4 day' from students where name = 'Emily Chen'
    union all
    select id, 120, 3, 80, 416, now() - interval '5 day' from students where name = 'Emily Chen';
  end if;
end $$;
