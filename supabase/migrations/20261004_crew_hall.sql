create table if not exists public.shoot_events (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references public.users(id) on delete cascade,
    schedule_id uuid references public.schedules(id) on delete set null,
    plan_id text,
    title text not null,
    shoot_date date not null,
    time text,
    location text,
    plan_summary jsonb,
    status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (owner_id, schedule_id)
);

create table if not exists public.shoot_event_members (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.shoot_events(id) on delete cascade,
    user_id uuid references public.users(id) on delete set null,
    invitee_email text not null,
    role text not null check (role in ('model', 'assistant')),
    status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
    invited_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '14 days'),
    invite_token_hash text,
    accepted_at timestamptz,
    unique (event_id, invitee_email)
);

create table if not exists public.shoot_event_messages (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.shoot_events(id) on delete cascade,
    sender_id uuid references public.users(id) on delete set null,
    body text not null check (length(body) between 1 and 2000),
    created_at timestamptz not null default now()
);

create table if not exists public.shoot_event_activity (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.shoot_events(id) on delete cascade,
    actor_id uuid references public.users(id) on delete set null,
    kind text not null,
    summary text not null,
    created_at timestamptz not null default now()
);

create index if not exists shoot_events_owner_date_idx on public.shoot_events (owner_id, shoot_date);
create index if not exists shoot_event_members_user_status_idx on public.shoot_event_members (user_id, status);
create index if not exists shoot_event_members_email_idx on public.shoot_event_members (invitee_email, status);
create index if not exists shoot_event_messages_event_created_idx on public.shoot_event_messages (event_id, created_at);
create index if not exists shoot_event_activity_event_created_idx on public.shoot_event_activity (event_id, created_at desc);

alter table public.messages add column if not exists name text;
alter table public.messages add column if not exists email text;
alter table public.messages add column if not exists phone text;
alter table public.messages add column if not exists service_type text;
alter table public.messages add column if not exists message text;
alter table public.messages add column if not exists status text not null default 'new';
create index if not exists messages_owner_created_idx on public.messages (user_id, created_at desc);

alter table public.shoot_events enable row level security;
alter table public.shoot_event_members enable row level security;
alter table public.shoot_event_messages enable row level security;
alter table public.shoot_event_activity enable row level security;

revoke all on public.shoot_events, public.shoot_event_members, public.shoot_event_messages, public.shoot_event_activity from anon, authenticated;
grant all on public.shoot_events, public.shoot_event_members, public.shoot_event_messages, public.shoot_event_activity to service_role;
