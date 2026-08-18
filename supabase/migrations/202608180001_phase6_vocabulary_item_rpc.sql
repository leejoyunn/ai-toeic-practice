-- Phase 6: safely create/reuse shared vocabulary entries without granting
-- authenticated users direct write access to the shared reference table.
begin;

create or replace function public.ensure_vocabulary_item(
  p_word text,
  p_chinese_meaning text,
  p_part_of_speech text,
  p_simple_example text default null,
  p_example_translation text default null,
  p_common_collocations text[] default '{}',
  p_toeic_context text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(trim(p_word)) = 0 or length(trim(p_part_of_speech)) = 0 then
    raise exception 'word and part of speech are required';
  end if;

  select id into result_id
  from public.vocabulary_items
  where lower(word) = lower(trim(p_word)) and part_of_speech = trim(p_part_of_speech)
  limit 1;

  if result_id is null then
    insert into public.vocabulary_items(
      word, chinese_meaning, part_of_speech, simple_example,
      example_translation, common_collocations, toeic_context
    ) values (
      trim(p_word), trim(p_chinese_meaning), trim(p_part_of_speech),
      nullif(trim(p_simple_example), ''), nullif(trim(p_example_translation), ''),
      coalesce(p_common_collocations, '{}'), nullif(trim(p_toeic_context), '')
    )
    returning id into result_id;
  end if;

  return result_id;
end;
$$;

revoke all on function public.ensure_vocabulary_item(text,text,text,text,text,text[],text) from public;
grant execute on function public.ensure_vocabulary_item(text,text,text,text,text,text[],text) to authenticated;

commit;
