import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
} from '@angular/core';
import { Icon } from './icon';

let nextId = 0;

@Component({
  selector: 'app-modal',
  imports: [Icon],
  template: `
    <div class="backdrop" (mousedown)="onBackdropDown($event)" (mouseup)="onBackdropUp($event)">
      <div class="modal" [class.small]="size() === 'small'" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId">
        <header class="modal-header">
          <h2 [id]="titleId">{{ heading() }}</h2>
          <button type="button" class="icon-btn" aria-label="Close" (click)="closed.emit()">
            <app-icon name="x" />
          </button>
        </header>
        <div class="modal-body">
          <ng-content />
        </div>
        <ng-content select="[modal-footer]" />
      </div>
    </div>
  `,
  styleUrl: './modal.scss',
  host: { '(document:keydown.escape)': 'onEscape()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly size = input<'small' | 'default'>('default');
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly previousFocus = inject(DOCUMENT).activeElement as HTMLElement | null;
  private pressStartedOnBackdrop = false;

  constructor() {
    afterNextRender(() => {
      const target =
        this.host.nativeElement.querySelector<HTMLElement>('[autofocus], input, textarea, select') ??
        this.host.nativeElement.querySelector<HTMLElement>('.modal-footer .btn-primary, .modal-footer .btn-danger');
      target?.focus();
    });
  }

  // only close when the whole click happened on the backdrop, not when a text selection was dragged out
  protected onBackdropDown(event: MouseEvent): void {
    this.pressStartedOnBackdrop = event.target === event.currentTarget;
  }

  protected onBackdropUp(event: MouseEvent): void {
    if (this.pressStartedOnBackdrop && event.target === event.currentTarget) this.closed.emit();
    this.pressStartedOnBackdrop = false;
  }

  protected onEscape(): void {
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.previousFocus?.focus?.();
  }
}
