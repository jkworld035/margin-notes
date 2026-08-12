export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadTimeClient(text: string, wpm = 200): string {
  const words = wordCount(text);
  return `${Math.max(1, Math.round(words / wpm))} min`;
}
