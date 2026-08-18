const labels: Record<string, string> = {
  preposition:"介系詞", verb_tense:"動詞時態", passive_voice:"被動語態", conjunction:"連接詞", relative_pronoun:"關係代名詞", word_form:"詞性變化", vocabulary:"單字", noun:"名詞", adjective:"形容詞", adverb:"副詞", comparison:"比較級",
  part_1_action:"Part 1 動作", part_1_object:"Part 1 物件", part_1_position:"Part 1 位置", part_1_scene_description:"Part 1 場景描述",
  part_2_wh_question:"Part 2 Wh 問句", part_2_yes_no_question:"Part 2 Yes/No 問句", part_2_choice_question:"Part 2 選擇問句", part_2_indirect_response:"Part 2 間接回答", part_2_request:"Part 2 請求", part_2_suggestion:"Part 2 建議",
  part_6_vocabulary:"Part 6 單字", part_6_grammar:"Part 6 文法", part_6_sentence_insertion:"Part 6 句子插入", part_6_context:"Part 6 上下文",
  part_7_detail:"Part 7 細節", part_7_purpose:"Part 7 主旨目的", part_7_paraphrase:"Part 7 同義改寫", part_7_inference:"Part 7 推論", part_7_vocabulary_in_context:"Part 7 文意字彙", part_7_cross_document:"Part 7 跨文件整合",
  part3_detail:"Part 3 細節", part3_purpose:"Part 3 目的", part3_inference:"Part 3 推論", part4_detail:"Part 4 細節", part4_inference:"Part 4 推論", part4_main_idea:"Part 4 主旨",
};
export function skillLabel(skill: string) { return labels[skill] ?? labels[skill.replace(/^part([1-7])_/,"part_$1_")] ?? skill.replaceAll("_", " "); }
