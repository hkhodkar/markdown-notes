import { Injectable } from '@angular/core';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import scss from 'highlight.js/lib/languages/scss';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { Marked, Tokens } from 'marked';

// only a handful of languages are registered to keep the bundle small
const LANGUAGES = { bash, css, javascript, json, markdown, python, scss, sql, typescript, xml, yaml };
for (const [name, lang] of Object.entries(LANGUAGES)) hljs.registerLanguage(name, lang);
hljs.registerAliases(['sh', 'shell', 'zsh'], { languageName: 'bash' });
hljs.registerAliases(['html', 'svg', 'angular'], { languageName: 'xml' });
hljs.registerAliases(['js', 'jsx', 'mjs'], { languageName: 'javascript' });
hljs.registerAliases(['ts', 'tsx'], { languageName: 'typescript' });
hljs.registerAliases(['py'], { languageName: 'python' });
hljs.registerAliases(['md'], { languageName: 'markdown' });
hljs.registerAliases(['yml'], { languageName: 'yaml' });

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface RenderOptions {
  /** task checkboxes are clickable unless the note is read-only */
  interactiveTasks?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MarkdownRenderer {
  private readOnly = false;

  private readonly marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      code({ text, lang }: Tokens.Code): string {
        const language = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
        if (language && hljs.getLanguage(language)) {
          const html = hljs.highlight(text, { language, ignoreIllegals: true }).value;
          return `<pre><code class="hljs language-${escapeHtml(language)}">${html}</code></pre>\n`;
        }
        return `<pre><code class="hljs">${escapeHtml(text)}</code></pre>\n`;
      },
      checkbox: ({ checked }: Tokens.Checkbox): string =>
        `<input type="checkbox" class="task-check"${checked ? ' checked' : ''}${this.readOnly ? ' disabled' : ''}> `,
    },
  });

  private readonly purify = DOMPurify();

  constructor() {
    this.purify.addHook('afterSanitizeAttributes', (node) => {
      // open external links in a new tab without giving it access to this page
      if (node.tagName === 'A' && /^https?:/i.test(node.getAttribute('href') ?? '')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  render(source: string, options: RenderOptions = {}): string {
    this.readOnly = options.interactiveTasks === false;
    const html = this.marked.parse(source, { async: false });
    return this.purify.sanitize(html, { ADD_ATTR: ['target'] });
  }
}
