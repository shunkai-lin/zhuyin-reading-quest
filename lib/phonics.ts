import type { Item } from './curriculum';

export type ReadingStep = {
  kind: 'initial' | 'final' | 'compound' | 'word';
  label: string;
  symbols: string;
  text?: string;
};

/** Component sounds are toneless; only the final whole syllable carries tone.
 * This prepares teaching steps, not acoustic pronunciation scores.
 */
export function readingSteps(item: Item): ReadingStep[] {
  const whole: ReadingStep = {
    kind: 'word', label: '合起來讀', symbols: item.zhuyin.join(' '), text: item.text,
  };
  if (Array.from(item.text).length !== 1) return [{ ...whole, label: '直接讀' }];
  const symbols = item.zhuyin[0].replace(/[ˊˇˋ˙]/g, '');
  const initial = /^[ㄅ-ㄙ]/.test(symbols) ? symbols[0] : '';
  const rhyme = symbols.slice(initial.length);
  const steps: ReadingStep[] = [];
  if (initial) steps.push({ kind: 'initial', label: '聲符', symbols: initial });
  for (const symbol of rhyme) {
    steps.push({ kind: 'final', label: '韻符', symbols: symbol });
  }
  if (rhyme.length > 1) steps.push({ kind: 'compound', label: '結合韻', symbols: rhyme });
  steps.push(whole);
  return steps;
}
