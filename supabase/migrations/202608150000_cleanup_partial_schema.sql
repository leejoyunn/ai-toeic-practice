-- Safe recovery for a partially executed AI TOEIC initial migration.
-- This intentionally removes only this application's named objects.
-- It does not drop or recreate auth, storage, extensions, or any Supabase system schema.
begin;

-- This trigger is owned by this project, even though it is attached to auth.users.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop dependent application tables first. CASCADE is intentionally avoided.
drop table if exists public.mock_test_answers;
drop table if exists public.practice_session_questions;
drop table if exists public.vocabulary_reviews;
drop table if exists public.user_vocabulary;
drop table if exists public.wrong_answers;
drop table if exists public.attempts;
drop table if exists public.daily_recommendations;
drop table if exists public.study_stats;
drop table if exists public.skill_mastery;
drop table if exists public.mock_tests;
drop table if exists public.practice_sessions;
drop table if exists public.questions;
drop table if exists public.vocabulary_items;
drop table if exists public.part1_images;
drop table if exists public.user_settings;
drop table if exists public.profiles;

drop type if exists public.mastery_level;
drop type if exists public.session_status;
drop type if exists public.question_difficulty;

commit;
