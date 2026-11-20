import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Note } from '../../core/models/note';
import { Clock } from '../../core/services/clock';
import { fullDate, relativeTimeInline } from '../../core/utils/date';
import { highlight, searchSnippet } from '../../core/utils/note-query';
import { noteMeta } from '../../core/utils/note-text';
import { RelativeTimePipe } from '../../shared/pipes/relative-time';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-note-list-item',
  imports: [RouterLink, Icon, RelativeTimePipe],
  template: `
    @let n = note();
    <a class="item" [routerLink]="['/notes', n.id]" [class.active]="active()" [attr.aria-current]="active() ? 'page' : null">
      <div class="title-row">
        <span class="title">
          @for (seg of title(); track $index) {
            @if (seg.match) {
              <mark>{{ seg.text }}</mark>
            } @else {
              <span>{{ seg.text }}</span>
            }
          }
        </span>
        @if (n.pinned && !n.deletedAt) {
          <app-icon name="pin" class="pin" aria-label="Pinned" />
        }
      </div>
      @if (excerpt().length) {
        <p class="excerpt">
          @for (seg of excerpt(); track $index) {
            @if (seg.match) {
              <mark>{{ seg.text }}</mark>
            } @else {
              <span>{{ seg.text }}</span>
            }
          }
        </p>
      }
      <div class="meta">
        @if (n.deletedAt) {
          <time [title]="'Deleted ' + full(n.deletedAt)">Deleted {{ deletedLabel(n.deletedAt, clock.now()) }}</time>
        } @else {
          <time [title]="'Edited ' + full(n.updatedAt)">{{ n.updatedAt | relativeTime: clock.now() }}</time>
        }
        @for (tag of n.tags; track tag) {
          <span class="chip" [class.hit]="terms().includes(tag) || terms().includes('#' + tag)">#{{ tag }}</span>
        }
      </div>
    </a>
  `,
  styleUrl: './note-list-item.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteListItem {
  readonly note = input.required<Note>();
  readonly terms = input<string[]>([]);
  readonly active = input(false);
  protected readonly clock = inject(Clock);

  protected readonly title = computed(() => highlight(noteMeta(this.note()).title, this.terms()));
  protected readonly excerpt = computed(() => {
    const text = searchSnippet(this.note(), this.terms());
    return text ? highlight(text, this.terms()) : [];
  });

  protected full(time: number): string {
    return fullDate(time);
  }

  protected deletedLabel(time: number, now: number): string {
    return relativeTimeInline(time, now);
  }
}
