import { TextState, applyFormat, continueList, indentLines } from './markdown-format';

/** "|" marks a caret, "[" and "]" mark a selection */
function state(text: string): TextState {
  if (text.includes('|')) {
    const pos = text.indexOf('|');
    return { value: text.replace('|', ''), start: pos, end: pos };
  }
  const start = text.indexOf('[');
  const end = text.indexOf(']') - 1;
  return { value: text.replace('[', '').replace(']', ''), start, end };
}

function show({ value, start, end }: TextState): string {
  if (start === end) return value.slice(0, start) + '|' + value.slice(start);
  return value.slice(0, start) + '[' + value.slice(start, end) + ']' + value.slice(end);
}

describe('markdown toolbar transforms', () => {
  it('wraps the selection in bold and unwraps it again', () => {
    const bold = applyFormat(state('make [this] bold'), 'bold');
    expect(show(bold)).toBe('make **[this]** bold');
    expect(show(applyFormat(bold, 'bold'))).toBe('make [this] bold');
    expect(show(applyFormat(state('make [**this**] bold'), 'bold'))).toBe('make [this] bold');
  });

  it('inserts a placeholder when nothing is selected', () => {
    expect(show(applyFormat(state('a |b'), 'italic'))).toBe('a _[italic text]_b');
    expect(show(applyFormat(state('|'), 'bold'))).toBe('**[bold text]**');
  });

  it('keeps surrounding spaces outside of the markers', () => {
    expect(show(applyFormat(state('say[ hi ]now'), 'bold'))).toBe('say **[hi]** now');
  });

  it('unwraps italic written with asterisks but not bold', () => {
    expect(show(applyFormat(state('*[word]*'), 'italic'))).toBe('[word]');
    expect(show(applyFormat(state('**[word]**'), 'italic'))).toBe('**_[word]_**');
  });

  it('cycles heading levels on the current line', () => {
    let s = state('Ti|tle');
    s = applyFormat(s, 'heading');
    expect(show(s)).toBe('# Ti|tle');
    s = applyFormat(s, 'heading');
    expect(show(s)).toBe('## Ti|tle');
    s = applyFormat(applyFormat(s, 'heading'), 'heading');
    expect(show(s)).toBe('Ti|tle');
  });

  it('creates links from text or from a url', () => {
    expect(show(applyFormat(state('see [docs] here'), 'link'))).toBe('see [docs]([url]) here');
    expect(show(applyFormat(state('[https://angular.dev]'), 'link'))).toBe('[[link text]](https://angular.dev)');
    expect(show(applyFormat(state('|'), 'link'))).toBe('[[link text]](url)');
  });

  it('toggles bullet, task and quote prefixes on all selected lines', () => {
    const list = applyFormat(state('[one\ntwo]'), 'bullet');
    expect(list.value).toBe('- one\n- two');
    expect(applyFormat(list, 'bullet').value).toBe('one\ntwo');
    // switching list type replaces the marker
    expect(applyFormat(list, 'task').value).toBe('- [ ] one\n- [ ] two');
    expect(applyFormat(state('[a\n\nb]'), 'quote').value).toBe('> a\n\n> b');
    expect(show(applyFormat(state('do |it'), 'task'))).toBe('- [ ] do |it');
  });

  it('uses inline code for a word and a fenced block for several lines', () => {
    expect(show(applyFormat(state('run [npm i] now'), 'code'))).toBe('run `[npm i]` now');
    expect(applyFormat(state('[a\nb]'), 'code').value).toBe('```\na\nb\n```');
  });

  it('indents and outdents list items with tab', () => {
    expect(show(indentLines(state('- it|em')))).toBe('  - it|em');
    expect(show(indentLines(state('  - it|em'), true))).toBe('- it|em');
    expect(show(indentLines(state('plain|')))).toBe('plain  |');
    expect(indentLines(state('[a\nb]')).value).toBe('  a\n  b');
  });

  it('continues lists on enter and ends them on an empty item', () => {
    expect(show(continueList(state('- milk|'))!)).toBe('- milk\n- |');
    expect(show(continueList(state('- [x] done|'))!)).toBe('- [x] done\n- [ ] |');
    expect(show(continueList(state('9. nine|'))!)).toBe('9. nine\n10. |');
    expect(show(continueList(state('> quote|'))!)).toBe('> quote\n> |');
    expect(show(continueList(state('- one\n- |'))!)).toBe('- one\n\n|');
    expect(continueList(state('plain text|'))).toBeNull();
  });
});
