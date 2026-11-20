import { normalizeTags } from './tags';

export interface ParsedMarkdown {
  body: string;
  tags: string[];
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/** Reads `tags` from a YAML front matter block (the common subset: inline or dash lists). */
export function parseFrontMatter(text: string): ParsedMarkdown {
  const source = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const match = FRONT_MATTER.exec(source);
  if (!match) return { body: source, tags: [] };

  const yaml = match[1];
  const tags: string[] = [];
  const inline = /^tags:[ \t]*\[(.*)\][ \t]*$/m.exec(yaml) ?? /^tags:[ \t]*(\S.*)$/m.exec(yaml);
  if (inline) {
    tags.push(...inline[1].split(',').map(unquote));
  } else {
    const block = /^tags:[ \t]*\n((?:[ \t]+-[ \t]*.+\n?)+)/m.exec(yaml);
    if (block) tags.push(...block[1].split('\n').map((l) => unquote(l.replace(/^\s*-\s*/, ''))));
  }
  return { body: source.slice(match[0].length).replace(/^\n+/, ''), tags: normalizeTags(tags.filter(Boolean)) };
}

export function withFrontMatter(body: string, tags: string[]): string {
  if (!tags.length) return body;
  return `---\ntags: [${tags.join(', ')}]\n---\n\n${body}`;
}

function unquote(value: string): string {
  return value.trim().replace(/^["']|["']$/g, '');
}
