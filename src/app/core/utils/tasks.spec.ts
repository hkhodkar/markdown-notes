import { findTaskLines, toggleTask } from './tasks';

describe('task list toggling', () => {
  const source = ['# Todo', '- [ ] one', '  - [x] nested', '```', '- [ ] in code', '```', '1. [ ] numbered', '> - [ ] quoted'].join('\n');

  it('finds task items in document order and skips code blocks', () => {
    expect(findTaskLines(source)).toEqual([1, 2, 6, 7]);
  });

  it('toggles the n-th task in the source', () => {
    expect(toggleTask(source, 0).split('\n')[1]).toBe('- [x] one');
    expect(toggleTask(source, 1).split('\n')[2]).toBe('  - [ ] nested');
    expect(toggleTask(source, 3, true).split('\n')[7]).toBe('> - [x] quoted');
    expect(toggleTask(source, 9)).toBe(source);
  });
});
