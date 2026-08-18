import type { TtsSegment } from "@/lib/tts/provider";

interface SpokenOption { id: string; text: string }

/** Builds the canonical TOEIC Part 2 playback order: prompt, then A/B/C. */
export function buildPart2TtsSegments(question: string, options: SpokenOption[]): TtsSegment[] {
  return [
    { text: question, speaker: "narrator", label: "question", pauseAfterMs: 450 },
    ...options.map((option) => ({
      text: `${option.id}. ${option.text}`,
      speaker: "narrator",
      label: `option-${option.id}`,
      pauseAfterMs: 350,
    })),
  ];
}
