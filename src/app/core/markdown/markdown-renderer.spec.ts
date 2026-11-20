import { TestBed } from '@angular/core/testing';
import { MarkdownRenderer } from './markdown-renderer';

describe('MarkdownRenderer', () => {
  let renderer: MarkdownRenderer;

  beforeEach(() => {
    renderer = TestBed.inject(MarkdownRenderer);
  });

  it('renders gfm tables and task lists', () => {
    const html = renderer.render('| a | b |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n- [ ] open');
    expect(html).toContain('<table>');
    expect(html.match(/class="task-check"/g)?.length).toBe(2);
    expect(html).toMatch(/<input[^>]*checked/);
  });

  it('removes scripts and event handlers', () => {
    const html = renderer.render('<script>alert(1)</script><img src="x" onerror="alert(1)">\n\n[x](javascript:alert(1))');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
  });

  it('highlights registered languages and escapes unknown ones', () => {
    expect(renderer.render('```ts\nconst a = 1;\n```')).toContain('<span class="hljs-keyword">const</span>');
    expect(renderer.render('```brainfuck\n<b>\n```')).toContain('&lt;b&gt;');
  });

  it('opens external links in a new tab', () => {
    expect(renderer.render('[site](https://example.com)')).toContain('target="_blank"');
  });

  it('disables checkboxes for read-only notes', () => {
    expect(renderer.render('- [ ] task', { interactiveTasks: false })).toContain('disabled');
  });
});
