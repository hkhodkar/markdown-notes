/** Text of the editor plus the current selection. All transforms are pure so they are easy to test. */
export interface TextState {
  value: string;
  start: number;
  end: number;
}

export type FormatAction = 'bold' | 'italic' | 'heading' | 'link' | 'bullet' | 'task' | 'code' | 'quote';

const INDENT = '  ';
const LIST_MARKER = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/;

export function applyFormat(state: TextState, action: FormatAction): TextState {
  switch (action) {
    case 'bold':
      return toggleInline(state, '**', 'bold text');
    case 'italic':
      return toggleInline(state, '_', 'italic text', ['*']);
    case 'code':
      return insertCode(state);
    case 'link':
      return insertLink(state);
    case 'heading':
      return cycleHeading(state);
    case 'bullet':
    case 'task':
    case 'quote':
      return toggleLinePrefix(state, action);
  }
}

function splice(value: string, from: number, to: number, insert: string): string {
  return value.slice(0, from) + insert + value.slice(to);
}

/** Wraps the selection in a marker, or removes the marker if it is already there. */
export function toggleInline(state: TextState, marker: string, placeholder: string, alternates: string[] = []): TextState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);

  for (const m of [marker, ...alternates]) {
    const len = m.length;
    // markers inside the selection: "**text**"
    if (selected.length > 2 * len && selected.startsWith(m) && selected.endsWith(m)) {
      const inner = selected.slice(len, -len);
      return { value: splice(value, start, end, inner), start, end: start + inner.length };
    }
    // markers around the selection, but don't treat "**" as two italic "*"
    const before = value.slice(start - len, start);
    const after = value.slice(end, end + len);
    const doubled = len === 1 && (value[start - len - 1] === m || value[end + len] === m);
    if (start >= len && before === m && after === m && !doubled) {
      return {
        value: value.slice(0, start - len) + selected + value.slice(end + len),
        start: start - len,
        end: end - len,
      };
    }
  }

  // don't wrap surrounding whitespace: "**word **" is not bold in markdown
  const from = start + (selected.length - selected.trimStart().length);
  const to = end - (selected.length - selected.trimEnd().length);
  if (from >= to) {
    const text = marker + placeholder + marker;
    return {
      value: splice(value, start, end, text),
      start: start + marker.length,
      end: start + marker.length + placeholder.length,
    };
  }
  return {
    value: value.slice(0, from) + marker + value.slice(from, to) + marker + value.slice(to),
    start: from + marker.length,
    end: to + marker.length,
  };
}

function insertCode(state: TextState): TextState {
  const { value, start, end } = state;
  const selected = value.slice(start, end);
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = indexOrEnd(value, '\n', end);
  const emptyLine = start === end && value.slice(lineStart, lineEnd).trim() === '';
  if (!selected.includes('\n') && !emptyLine) return toggleInline(state, '`', 'code');

  // fenced block on its own lines
  const pre = start > 0 && value[start - 1] !== '\n' ? '\n' : '';
  const post = end < value.length && value[end] !== '\n' ? '\n' : '';
  const inner = selected.replace(/\n$/, '');
  const block = `${pre}\`\`\`\n${inner}\n\`\`\`${post}`;
  const innerStart = start + pre.length + 4;
  return { value: splice(value, start, end, block), start: innerStart, end: innerStart + inner.length };
}

function insertLink(state: TextState): TextState {
  const { value, start, end } = state;
  const selected = value.slice(start, end).trim();
  if (/^(https?:\/\/|mailto:)\S+$/i.test(selected)) {
    const text = `[link text](${selected})`;
    return { value: splice(value, start, end, text), start: start + 1, end: start + 10 };
  }
  if (selected) {
    const text = `[${selected}](url)`;
    const urlStart = start + selected.length + 3;
    return { value: splice(value, start, end, text), start: urlStart, end: urlStart + 3 };
  }
  return { value: splice(value, start, end, '[link text](url)'), start: start + 1, end: start + 10 };
}

interface LineBlock {
  from: number;
  to: number;
  lines: string[];
}

function selectedLines({ value, start, end }: TextState): LineBlock {
  // a selection ending right after a newline doesn't include the next line
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const from = value.lastIndexOf('\n', start - 1) + 1;
  const to = indexOrEnd(value, '\n', last);
  return { from, to, lines: value.slice(from, to).split('\n') };
}

/** Replaces whole lines and keeps a sensible selection afterwards. */
function replaceLines(state: TextState, block: LineBlock, lines: string[]): TextState {
  const text = lines.join('\n');
  const value = splice(state.value, block.from, block.to, text);
  if (block.lines.length === 1) {
    // keep the caret at the same spot in the text, shifted by what was added or removed in front
    const delta = text.length - block.lines[0].length;
    const clamp = (pos: number) => Math.min(block.from + text.length, Math.max(block.from, pos + delta));
    return { value, start: clamp(state.start), end: clamp(state.end) };
  }
  return { value, start: block.from, end: block.from + text.length };
}

export function toggleLinePrefix(state: TextState, kind: 'bullet' | 'task' | 'quote'): TextState {
  const block = selectedLines(state);
  const targets = block.lines.filter((l) => l.trim() !== '');
  const has: Record<typeof kind, RegExp> = {
    quote: /^\s*>\s?/,
    task: /^\s*[-*+]\s+\[[ xX]\]\s+/,
    bullet: /^\s*[-*+]\s+(?!\[[ xX]\]\s)/,
  };
  const all = targets.length > 0 && targets.every((l) => has[kind].test(l));

  const lines = block.lines.map((line) => {
    if (line.trim() === '' && block.lines.length > 1) return line;
    if (kind === 'quote') return all ? line.replace(/^(\s*)>\s?/, '$1') : `> ${line}`;
    if (all) return line.replace(LIST_MARKER, '$1');
    const marker = kind === 'task' ? '- [ ] ' : '- ';
    return line.replace(LIST_MARKER, '$1').replace(/^(\s*)/, `$1${marker}`);
  });
  return replaceLines(state, block, lines);
}

export function cycleHeading(state: TextState): TextState {
  const block = selectedLines(state);
  const first = /^(#{1,6})\s+/.exec(block.lines[0]);
  const level = first ? first[1].length : 0;
  const next = level >= 3 ? 0 : level + 1;
  const lines = block.lines.map((line) => {
    if (line.trim() === '' && block.lines.length > 1) return line;
    const text = line.replace(/^#{1,6}\s+/, '');
    return next ? `${'#'.repeat(next)} ${text}` : text;
  });
  return replaceLines(state, block, lines);
}

/** Tab / Shift+Tab: indents list items and selected lines, otherwise inserts spaces. */
export function indentLines(state: TextState, outdent = false): TextState {
  const { value, start, end } = state;
  const block = selectedLines(state);
  const singleLine = block.lines.length === 1;
  if (!outdent && start === end && singleLine && !LIST_MARKER.test(block.lines[0])) {
    return { value: splice(value, start, end, INDENT), start: start + INDENT.length, end: start + INDENT.length };
  }
  const lines = block.lines.map((line) => {
    if (outdent) return line.replace(/^( {1,2}|\t)/, '');
    return line.trim() === '' && !singleLine ? line : INDENT + line;
  });
  return replaceLines(state, block, lines);
}

/** Enter inside a list continues it; Enter on an empty item ends the list. Returns null to keep the default. */
export function continueList(state: TextState): TextState | null {
  const { value, start, end } = state;
  if (start !== end) return null;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = indexOrEnd(value, '\n', start);
  const line = value.slice(lineStart, lineEnd);
  const match = /^(\s*(?:>\s?)*)(?:([-*+])|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?/.exec(line);
  const quote = !match ? /^(\s*>\s?)/.exec(line) : null;
  const prefixLength = match?.[0].length ?? quote?.[0].length ?? 0;
  if ((!match && !quote) || start - lineStart < prefixLength) return null;

  if (line.slice(prefixLength).trim() === '') {
    // empty item: end the list, with a blank line so the next paragraph isn't part of it
    return { value: splice(value, lineStart, lineEnd, '\n'), start: lineStart + 1, end: lineStart + 1 };
  }

  let next: string;
  if (match) {
    const [, lead, bullet, num, delim, space, task] = match;
    next = lead + (bullet ?? `${Number(num) + 1}${delim}`) + space + (task ? '[ ] ' : '');
  } else {
    next = quote![1];
  }
  const insert = '\n' + next;
  return { value: splice(value, start, end, insert), start: start + insert.length, end: start + insert.length };
}

function indexOrEnd(value: string, search: string, from: number): number {
  const i = value.indexOf(search, from);
  return i === -1 ? value.length : i;
}
