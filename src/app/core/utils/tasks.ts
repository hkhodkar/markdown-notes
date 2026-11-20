const FENCE = /^\s{0,3}(```|~~~)/;
// "- [ ] item", "  * [x] item", "1. [ ] item", "> - [ ] quoted item"
const TASK = /^(\s*(?:>\s*)*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\])(?=\s)/;

/** Line numbers of all task list items, in document order (code blocks are skipped). */
export function findTaskLines(source: string): number[] {
  const lines = source.split('\n');
  const result: number[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (FENCE.test(line)) inFence = !inFence;
    else if (!inFence && TASK.test(line)) result.push(i);
  });
  return result;
}

/** Flips the checkbox of the n-th task item in the markdown source. */
export function toggleTask(source: string, index: number, checked?: boolean): string {
  const lineNo = findTaskLines(source)[index];
  if (lineNo === undefined) return source;
  const lines = source.split('\n');
  lines[lineNo] = lines[lineNo].replace(TASK, (_m, open: string, mark: string, close: string) => {
    const done = checked ?? mark === ' ';
    return `${open}${done ? 'x' : ' '}${close}`;
  });
  return lines.join('\n');
}
