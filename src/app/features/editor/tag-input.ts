import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { normalizeTag } from '../../core/utils/tags';
import { Icon } from '../../shared/ui/icon';

interface TagOption {
  tag: string;
  create: boolean;
}

@Component({
  selector: 'app-tag-input',
  imports: [Icon],
  templateUrl: './tag-input.html',
  styleUrl: './tag-input.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagInput {
  readonly tags = input.required<string[]>();
  readonly suggestions = input<string[]>([]);
  readonly tagsChange = output<string[]>();

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  protected readonly text = signal('');
  protected readonly open = signal(false);
  protected readonly active = signal(-1);

  private readonly query = computed(() => normalizeTag(this.text()));

  protected readonly options = computed<TagOption[]>(() => {
    const q = this.query();
    const taken = this.tags();
    const matches = this.suggestions()
      .filter((t) => !taken.includes(t) && (!q || t.includes(q)))
      .sort((a, b) => Number(b.startsWith(q)) - Number(a.startsWith(q)) || a.localeCompare(b))
      .slice(0, 7)
      .map((tag) => ({ tag, create: false }));
    const canCreate = q && !taken.includes(q) && !this.suggestions().includes(q);
    return canCreate ? [...matches, { tag: q, create: true }] : matches;
  });

  protected readonly showList = computed(() => this.open() && this.options().length > 0);

  protected focusField(): void {
    this.field().nativeElement.focus();
  }

  protected onInput(value: string): void {
    // typing or pasting "a, b, c" adds the finished tags right away
    if (value.includes(',')) {
      const parts = value.split(',');
      const rest = parts.pop() ?? '';
      this.addMany(parts);
      this.field().nativeElement.value = rest;
      value = rest;
    }
    this.text.set(value);
    this.open.set(true);
    this.active.set(-1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();
    switch (event.key) {
      case 'Enter': {
        const option = options[this.active()];
        if (option || this.text().trim()) {
          event.preventDefault();
          this.add(option ? option.tag : this.text());
        }
        break;
      }
      case 'Tab':
        if (this.text().trim()) {
          event.preventDefault();
          this.add(options[this.active()]?.tag ?? this.text());
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        this.active.set(Math.min(options.length - 1, this.active() + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.active.set(Math.max(-1, this.active() - 1));
        break;
      case 'Escape':
        if (this.showList()) {
          event.stopPropagation();
          this.open.set(false);
        }
        break;
      case 'Backspace':
        if (!this.text() && this.tags().length) this.remove(this.tags()[this.tags().length - 1]);
        break;
    }
  }

  protected onFocus(): void {
    this.open.set(true);
  }

  protected onBlur(): void {
    this.open.set(false);
    this.active.set(-1);
  }

  protected pick(option: TagOption): void {
    this.add(option.tag);
    this.focusField();
  }

  protected add(value: string): void {
    this.addMany([value]);
    this.text.set('');
    this.field().nativeElement.value = '';
    this.active.set(-1);
  }

  protected remove(tag: string): void {
    this.tagsChange.emit(this.tags().filter((t) => t !== tag));
  }

  private addMany(values: string[]): void {
    const next = [...this.tags()];
    for (const value of values) {
      const tag = normalizeTag(value);
      if (tag && !next.includes(tag)) next.push(tag);
    }
    if (next.length !== this.tags().length) this.tagsChange.emit(next);
  }
}
