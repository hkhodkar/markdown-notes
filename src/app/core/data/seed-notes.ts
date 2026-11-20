import { Note } from '../models/note';
import { createId } from '../utils/id';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

interface SeedNote {
  body: string;
  tags: string[];
  pinned?: boolean;
  /** how long ago the note was created / last edited */
  created: number;
  updated: number;
  deleted?: number;
}

const FENCE = '```';

const SEED: SeedNote[] = [
  {
    pinned: true,
    tags: ['guide'],
    created: 9 * DAY,
    updated: 12 * MIN,
    body: `# Welcome to Markdown Notes

A small, fast notebook that lives in your browser. Everything you write is saved automatically to **local storage**, so it stays on this device and works offline.

## Getting around

- Pick a note on the left, write on one side and see the preview on the other
- Switch between **Edit**, **Split** and **Preview** in the editor header
- Pin important notes so they stay on top of the list
- Add tags below the note title and filter by them in the sidebar

## Handy shortcuts

| Action | Shortcut |
| --- | --- |
| New note | Alt + N |
| Search notes | / |
| Bold / italic / link | Ctrl/⌘ + B / I / K |
| Indent list item | Tab / Shift + Tab |
| All shortcuts | ? |

> Tip: drop \`.md\` files anywhere on the page to import them.
`,
  },
  {
    pinned: true,
    tags: ['guide', 'reference'],
    created: 9 * DAY,
    updated: 3 * DAY,
    body: `# Markdown cheatsheet

## Text

**Bold**, *italic*, ~~strikethrough~~ and \`inline code\`. Combine them: ***bold italic***.

## Headings

${FENCE}markdown
# Heading 1
## Heading 2
### Heading 3
${FENCE}

## Lists

- Unordered item
- Another item
  - Nested item (press Tab)

1. First
2. Second
3. Third

## Task lists

- [x] Write the cheatsheet
- [ ] Click a checkbox in the preview, it updates the source

## Links and quotes

[Markdown guide](https://www.markdownguide.org) and an autolink: https://angular.dev

> Quotes are great for callouts and citations.

## Code blocks

${FENCE}ts
const greet = (name: string) => \`Hello, \${name}!\`;
${FENCE}

## Tables

| Syntax | Result |
| :--- | :---: |
| \`**text**\` | **text** |
| \`*text*\` | *text* |
| \`~~text~~\` | ~~text~~ |

---

Horizontal rules use three dashes.
`,
  },
  {
    tags: ['meetings', 'work'],
    created: 2 * DAY,
    updated: 2 * HOUR,
    body: `# Weekly sync: checkout redesign

**Date:** Tuesday · **Attendees:** Sara, Tom, Priya, me

## Agenda

1. Status of the new checkout flow
2. Payment provider migration
3. Release plan

## Notes

- Checkout v2 is feature complete behind the \`checkout_v2\` flag
- Conversion on the beta group is up **4.2%** compared to the old flow
- Payment migration is blocked by the webhook signature change
- QA found two issues on Safari (address autocomplete, sticky footer)

## Decisions

> Ship to 25% of users next Monday, full rollout after one week without regressions.

## Action items

- [ ] Fix Safari address autocomplete (Tom)
- [ ] Update webhook verification for the new provider (Priya)
- [x] Share beta metrics with the product team (me)
- [ ] Prepare rollout checklist and rollback plan (Sara)
`,
  },
  {
    tags: ['todo', 'work'],
    created: 5 * DAY,
    updated: 35 * MIN,
    body: `# Sprint 24 todo

## In progress
- [ ] Migrate the settings page to signals
- [ ] Add skeleton loaders to the dashboard cards
  - [x] Revenue card
  - [ ] Orders card

## Up next
- [ ] Lazy load the reports module
- [ ] Write unit tests for the date range picker
- [ ] Review the accessibility audit findings

## Done
- [x] Upgrade to Angular 21
- [x] Replace moment.js with date-fns
- [x] Fix flaky e2e test on the login page
`,
  },
  {
    tags: ['code', 'angular'],
    created: 14 * DAY,
    updated: 1 * DAY,
    body: `# Angular snippets

Small patterns I keep reaching for.

## Signal store in a service

${FENCE}ts
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly items = signal<CartItem[]>([]);
  readonly count = computed(() => this.items().length);
  readonly total = computed(() =>
    this.items().reduce((sum, item) => sum + item.price * item.qty, 0),
  );

  add(item: CartItem): void {
    this.items.update((items) => [...items, item]);
  }
}
${FENCE}

## Control flow

${FENCE}html
@for (item of items(); track item.id) {
  <app-cart-row [item]="item" />
} @empty {
  <p class="empty">Your cart is empty</p>
}
${FENCE}

## Debounced search with RxJS

${FENCE}ts
this.results$ = this.search.valueChanges.pipe(
  debounceTime(250),
  distinctUntilChanged(),
  switchMap((term) => this.api.search(term)),
);
${FENCE}

## Useful commands

${FENCE}bash
ng generate component features/cart/cart-row
ng test --watch=false
ng build --base-href /my-app/
${FENCE}
`,
  },
  {
    tags: ['code', 'reference'],
    created: 20 * DAY,
    updated: 6 * DAY,
    body: `# REST API conventions

Notes for the internal orders API.

## Status codes

| Code | Meaning | When |
| --- | --- | --- |
| 200 | OK | Successful read or update |
| 201 | Created | A resource was created, \`Location\` header set |
| 204 | No Content | Successful delete |
| 400 | Bad Request | Validation failed |
| 404 | Not Found | Unknown id |
| 409 | Conflict | Version mismatch on update |

## Error format

${FENCE}json
{
  "status": 400,
  "title": "Validation failed",
  "errors": [
    { "field": "email", "message": "Must be a valid email" }
  ]
}
${FENCE}

## Pagination

Use \`?page=2&pageSize=20\` and return \`total\` in the response body. Sorting with \`?sort=-createdAt\`.

${FENCE}python
@router.get("/orders")
def list_orders(page: int = 1, page_size: int = 20):
    query = select(Order).offset((page - 1) * page_size).limit(page_size)
    return {"items": session.exec(query).all(), "total": count_orders()}
${FENCE}
`,
  },
  {
    tags: ['personal', 'reading'],
    created: 30 * DAY,
    updated: 4 * DAY,
    body: `# Reading list 2026

| Book | Author | Status | Rating |
| --- | --- | --- | :---: |
| The Pragmatic Programmer | Hunt & Thomas | Finished | ★★★★★ |
| Designing Data-Intensive Applications | Martin Kleppmann | Reading | ★★★★★ |
| Refactoring UI | Wathan & Schoger | Finished | ★★★★☆ |
| Atomic Habits | James Clear | Finished | ★★★★☆ |
| A Philosophy of Software Design | John Ousterhout | Next | |

## Quotes worth keeping

> The purpose of abstraction is not to be vague, but to create a new semantic level in which one can be absolutely precise.
> *Edsger W. Dijkstra*

## Up next

- [ ] Finish chapter 9 of DDIA
- [ ] Pick a novel for the holidays
`,
  },
  {
    tags: ['personal', 'travel'],
    created: 3 * DAY,
    updated: 20 * HOUR,
    body: `# Weekend in Lisbon

## Plan

- **Friday:** arrive 18:40, check in near Baixa, dinner in Alfama
- **Saturday:** Belém (tower + pastéis), LX Factory, sunset at Miradouro da Senhora do Monte
- **Sunday:** Sintra day trip, train back by 18:00

## Packing

- [x] Passport and boarding passes
- [x] Charger and power bank
- [ ] Comfortable walking shoes
- [ ] Light jacket for the evenings
- [ ] Sunglasses

## Budget

| Item | Cost |
| --- | ---: |
| Flights | €180 |
| Hotel (2 nights) | €210 |
| Food and transport | €150 |
| **Total** | **€540** |
`,
  },
  {
    tags: ['ideas'],
    created: 12 * DAY,
    updated: 8 * DAY,
    deleted: 2 * DAY,
    body: `# Old blog post ideas

- Why I stopped using NgModules
- A week with zoneless change detection
- Writing tests that don't break on every refactor
`,
  },
];

export function createSeedNotes(now = Date.now()): Note[] {
  return SEED.map((seed) => ({
    id: createId(),
    body: seed.body,
    tags: seed.tags,
    pinned: !!seed.pinned,
    createdAt: now - seed.created,
    updatedAt: now - seed.updated,
    deletedAt: seed.deleted ? now - seed.deleted : null,
  }));
}
