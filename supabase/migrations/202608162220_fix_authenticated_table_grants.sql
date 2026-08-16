-- Restore Data API privileges when "Automatically expose new tables" is disabled.
-- RLS remains the row-authorization boundary; anon receives no table privileges here.
begin;

grant usage on schema public to authenticated;
grant usage on type public.question_difficulty to authenticated;
grant usage on type public.session_status to authenticated;
grant usage on type public.mastery_level to authenticated;

-- User-owned application data. RLS restricts every operation to auth.uid().
grant select, insert, update, delete on table
  public.profiles,
  public.user_settings,
  public.questions,
  public.practice_sessions,
  public.practice_session_questions,
  public.attempts,
  public.wrong_answers,
  public.skill_mastery,
  public.user_vocabulary,
  public.vocabulary_reviews,
  public.study_stats,
  public.mock_tests,
  public.mock_test_answers,
  public.daily_recommendations
to authenticated;

-- Shared reference content is readable but not writable by ordinary users.
grant select on table
  public.part1_images,
  public.vocabulary_items
to authenticated;

-- The current schema uses UUID defaults, not serial/identity columns. This keeps
-- any existing application-owned sequences usable without granting table access.
grant usage, select on all sequences in schema public to authenticated;

-- Keep RLS explicit and idempotent in this repair migration.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.part1_images enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_session_questions enable row level security;
alter table public.attempts enable row level security;
alter table public.wrong_answers enable row level security;
alter table public.skill_mastery enable row level security;
alter table public.vocabulary_items enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.vocabulary_reviews enable row level security;
alter table public.study_stats enable row level security;
alter table public.mock_tests enable row level security;
alter table public.mock_test_answers enable row level security;
alter table public.daily_recommendations enable row level security;

-- A session may contain only questions owned by the same authenticated user.
drop policy if exists "session questions through owner" on public.practice_session_questions;
create policy "session questions through owner"
on public.practice_session_questions for all to authenticated
using (
  exists (
    select 1 from public.practice_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.practice_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
);

-- Attempts must point only to the user's question and, when present, session.
drop policy if exists "attempts own rows" on public.attempts;
create policy "attempts own rows"
on public.attempts for all to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
  and (
    session_id is null
    or exists (
      select 1 from public.practice_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
);

-- Wrong-answer rows cannot reference another user's generated question.
drop policy if exists "wrong answers own rows" on public.wrong_answers;
create policy "wrong answers own rows"
on public.wrong_answers for all to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
  and (
    first_attempt_id is null
    or exists (
      select 1 from public.attempts a
      where a.id = first_attempt_id and a.user_id = auth.uid()
    )
  )
);

-- Mock-test answers must link an owned test to an owned generated question.
drop policy if exists "mock answers through owner" on public.mock_test_answers;
create policy "mock answers through owner"
on public.mock_test_answers for all to authenticated
using (
  exists (
    select 1 from public.mock_tests m
    where m.id = mock_test_id and m.user_id = auth.uid()
  )
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.mock_tests m
    where m.id = mock_test_id and m.user_id = auth.uid()
  )
  and exists (
    select 1 from public.questions q
    where q.id = question_id and q.user_id = auth.uid()
  )
);

commit;
