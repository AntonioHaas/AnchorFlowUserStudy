create table public.study_sessions (
    id uuid primary key default gen_random_uuid(),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    schema text not null,
    note text
);

create table public.study_records (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references public.study_sessions on delete cascade not null,
    mode text not null,
    task_id text not null,
    benchmark_ordinal integer,
    sample_id text,
    method text not null,
    method_key text not null,
    method_code text not null,
    completion_state text not null,
    source_svg_sha256 text,
    input_sha256 text,
    source_path text,
    attempt integer,
    submitted_at timestamp with time zone,
    elapsed_seconds numeric,
    stop_reason text,
    success boolean,
    original_anchor_count integer,
    final_anchor_count integer,
    initial_path text,
    edited_path text,
    target_path text,
    operations jsonb
);

-- Enable RLS
alter table public.study_sessions enable row level security;
alter table public.study_records enable row level security;

-- Create policies allowing insert from authenticated/anon roles
create policy "Allow inserts for sessions" on public.study_sessions for insert with check (true);
create policy "Allow inserts for records" on public.study_records for insert with check (true);
