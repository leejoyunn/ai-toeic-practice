-- Phase 7: resumable mock tests, section timers and idempotent submission.
begin;

alter table public.mock_tests
  add column if not exists mode text not null default 'mixed',
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists elapsed_seconds integer not null default 0,
  add column if not exists timer_started_at timestamptz,
  add column if not exists current_section text not null default 'listening',
  add column if not exists current_question integer not null default 1,
  add column if not exists listening_correct integer not null default 0,
  add column if not exists reading_correct integer not null default 0,
  add column if not exists total_correct integer not null default 0,
  add column if not exists result_processed boolean not null default false,
  add column if not exists generation_metadata jsonb not null default '{}'::jsonb;

alter table public.mock_tests drop constraint if exists mock_tests_mode_check;
alter table public.mock_tests add constraint mock_tests_mode_check
  check (mode in ('mixed','reading','listening'));

alter table public.mock_test_answers
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;
update public.mock_test_answers a set user_id=m.user_id
from public.mock_tests m where m.id=a.mock_test_id and a.user_id is null;
alter table public.mock_test_answers alter column user_id set not null;

alter table public.attempts
  add column if not exists mock_test_id uuid references public.mock_tests(id) on delete set null;

create unique index if not exists attempts_mock_question_unique
  on public.attempts(mock_test_id,question_id) where mock_test_id is not null;
create unique index if not exists one_active_mock_per_user
  on public.mock_tests(user_id) where status in ('generating','active');
create index if not exists mock_tests_user_started_idx
  on public.mock_tests(user_id,started_at desc);

drop policy if exists "mock answers through owner" on public.mock_test_answers;
create policy "mock answers through owner"
on public.mock_test_answers for all to authenticated
using (
  auth.uid()=user_id and exists(
    select 1 from public.mock_tests m
    where m.id=mock_test_id and m.user_id=auth.uid()
  )
)
with check (
  auth.uid()=user_id and exists(
    select 1 from public.mock_tests m
    where m.id=mock_test_id and m.user_id=auth.uid()
  )
);

commit;
