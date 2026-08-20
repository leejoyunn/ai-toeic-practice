-- Phase 7: make submit-side learning updates safely resumable per question.
begin;

alter table public.attempts
  add column if not exists mock_processing_stage smallint not null default 0
  check (mock_processing_stage between 0 and 2);

commit;
