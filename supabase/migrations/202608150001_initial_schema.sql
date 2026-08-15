-- AI TOEIC Practice System: complete forward-compatible schema for Phases 1-8.
-- Run 202608150000_cleanup_partial_schema.sql first if an earlier attempt failed partway.
begin;

create extension if not exists pgcrypto;

create type public.question_difficulty as enum ('easy','medium','hard');
create type public.session_status as enum ('generating','active','completed','abandoned');
create type public.mastery_level as enum ('learning','improving','familiar','mastered');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, avatar_url text, current_estimated_level integer not null default 400 check (current_estimated_level between 10 and 990),
  target_score integer not null default 550 check (target_score between 10 and 990), learning_stage text not null default '400_to_550',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade, preferred_mode text not null default 'reading',
  listening_available boolean not null default true, daily_question_goal integer not null default 20, locale text not null default 'zh-TW', ui_preferences jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.part1_images (
  id uuid primary key default gen_random_uuid(), image_url text not null, description text not null, tags text[] not null default '{}',
  scene text not null, objects text[] not null default '{}', actions text[] not null default '{}', is_active boolean not null default true, created_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  part smallint not null check (part between 1 and 7), question_type text not null, question text not null, options jsonb not null,
  correct_answer text not null, explanation text not null, translation text not null, vocabulary jsonb not null default '[]'::jsonb,
  grammar_point text, difficulty public.question_difficulty not null, target_score integer not null, topic text not null, scenario text not null,
  keywords text[] not null default '{}', vocabulary_domain text, sentence_pattern text, transcript text, speakers jsonb,
  passage text, passage_type text, image_id uuid references public.part1_images(id), question_hash text not null,
  provider text, generation_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  unique(user_id, question_hash)
);
create index questions_recent_user_idx on public.questions(user_id, created_at desc);
create index questions_distribution_idx on public.questions(user_id, grammar_point, scenario, created_at desc);
create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null, status public.session_status not null default 'generating', part smallint check (part between 1 and 7), requested_count integer not null,
  completed_count integer not null default 0, difficulty public.question_difficulty, target_score integer, settings jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(), completed_at timestamptz
);
create table public.practice_session_questions (
  session_id uuid references public.practice_sessions(id) on delete cascade, question_id uuid references public.questions(id) on delete cascade,
  position integer not null, primary key(session_id,question_id), unique(session_id,position)
);
create table public.attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade, session_id uuid references public.practice_sessions(id) on delete set null,
  selected_answer text not null, correct_answer text not null, is_correct boolean not null, part smallint not null check(part between 1 and 7),
  grammar_point text, topic text, difficulty public.question_difficulty not null, answered_at timestamptz not null default now()
);
create index attempts_user_recent_idx on public.attempts(user_id, answered_at desc);
create table public.wrong_answers (
  user_id uuid references public.profiles(id) on delete cascade, question_id uuid references public.questions(id) on delete cascade,
  first_attempt_id uuid references public.attempts(id) on delete set null, wrong_count integer not null default 1, retry_count integer not null default 0,
  resolved boolean not null default false, last_wrong_at timestamptz not null default now(), next_review_at timestamptz, notes text,
  primary key(user_id,question_id)
);
create table public.skill_mastery (
  user_id uuid references public.profiles(id) on delete cascade, skill_id text not null, attempts integer not null default 0,
  correct_count integer not null default 0, recent_accuracy numeric(5,2) not null default 0, mastery_level public.mastery_level not null default 'learning',
  last_practiced_at timestamptz, consecutive_correct integer not null default 0, consecutive_wrong integer not null default 0,
  recent_results boolean[] not null default '{}', next_review_at timestamptz, primary key(user_id,skill_id)
);
create table public.vocabulary_items (
  id uuid primary key default gen_random_uuid(), word text not null, chinese_meaning text not null, part_of_speech text not null,
  simple_example text, example_translation text, common_collocations text[] not null default '{}', toeic_context text,
  created_at timestamptz not null default now()
);
create unique index vocabulary_items_word_pos_unique on public.vocabulary_items (lower(word), part_of_speech);
create table public.user_vocabulary (
  user_id uuid references public.profiles(id) on delete cascade, vocabulary_id uuid references public.vocabulary_items(id) on delete cascade,
  source text not null, familiarity public.mastery_level not null default 'learning', seen_count integer not null default 0, correct_count integer not null default 0,
  last_reviewed_at timestamptz, next_review_at timestamptz, added_at timestamptz not null default now(), primary key(user_id,vocabulary_id)
);
create table public.vocabulary_reviews (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  vocabulary_id uuid not null references public.vocabulary_items(id) on delete cascade, result smallint not null check(result between 0 and 3),
  reviewed_at timestamptz not null default now(), next_review_at timestamptz not null
);
create table public.study_stats (
  user_id uuid references public.profiles(id) on delete cascade, study_date date not null default current_date,
  total_questions integer not null default 0, correct_questions integer not null default 0, minutes_studied integer not null default 0,
  listening_correct integer not null default 0, listening_total integer not null default 0, reading_correct integer not null default 0, reading_total integer not null default 0,
  part_stats jsonb not null default '{}'::jsonb, primary key(user_id,study_date)
);
create table public.mock_tests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('mini','full')), status text not null default 'active', question_count integer not null,
  started_at timestamptz not null default now(), submitted_at timestamptz, listening_score_estimate integer, reading_score_estimate integer,
  total_score_estimate integer, remaining_seconds integer, disclaimer_acknowledged boolean not null default false
);
create table public.mock_test_answers (
  mock_test_id uuid references public.mock_tests(id) on delete cascade, question_id uuid references public.questions(id) on delete cascade,
  position integer not null, selected_answer text, is_correct boolean, answered_at timestamptz, primary key(mock_test_id,question_id), unique(mock_test_id,position)
);
create table public.daily_recommendations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  recommendation_date date not null default current_date, plan jsonb not null, rationale text not null, created_at timestamptz not null default now(), unique(user_id,recommendation_date)
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,display_name,avatar_url) values(new.id,new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'avatar_url') on conflict(id) do nothing;
insert into public.user_settings(user_id) values(new.id) on conflict(user_id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security; alter table public.user_settings enable row level security; alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security; alter table public.practice_session_questions enable row level security; alter table public.attempts enable row level security;
alter table public.wrong_answers enable row level security; alter table public.skill_mastery enable row level security; alter table public.user_vocabulary enable row level security;
alter table public.vocabulary_reviews enable row level security; alter table public.study_stats enable row level security; alter table public.mock_tests enable row level security;
alter table public.mock_test_answers enable row level security; alter table public.daily_recommendations enable row level security;
alter table public.part1_images enable row level security; alter table public.vocabulary_items enable row level security;

create policy "profiles own rows" on public.profiles for all using(auth.uid()=id) with check(auth.uid()=id);
create policy "settings own rows" on public.user_settings for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "questions own rows" on public.questions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "sessions own rows" on public.practice_sessions for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "session questions through owner" on public.practice_session_questions for all using(exists(select 1 from public.practice_sessions s where s.id=session_id and s.user_id=auth.uid())) with check(exists(select 1 from public.practice_sessions s where s.id=session_id and s.user_id=auth.uid()));
create policy "attempts own rows" on public.attempts for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "wrong answers own rows" on public.wrong_answers for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "mastery own rows" on public.skill_mastery for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "user vocabulary own rows" on public.user_vocabulary for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "reviews own rows" on public.vocabulary_reviews for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "stats own rows" on public.study_stats for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "mock tests own rows" on public.mock_tests for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "mock answers through owner" on public.mock_test_answers for all using(exists(select 1 from public.mock_tests m where m.id=mock_test_id and m.user_id=auth.uid())) with check(exists(select 1 from public.mock_tests m where m.id=mock_test_id and m.user_id=auth.uid()));
create policy "recommendations own rows" on public.daily_recommendations for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy "authenticated images read" on public.part1_images for select to authenticated using(is_active);
create policy "authenticated vocabulary read" on public.vocabulary_items for select to authenticated using(true);

commit;
