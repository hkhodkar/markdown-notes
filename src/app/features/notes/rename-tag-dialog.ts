import { ChangeDetectionStrategy, Component, OnInit, computed, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { normalizeTag } from '../../core/utils/tags';
import { Modal } from '../../shared/ui/modal';

@Component({
  selector: 'app-rename-tag-dialog',
  imports: [Modal, ReactiveFormsModule],
  template: `
    <app-modal heading="Rename tag" size="small" (closed)="closed.emit()">
      <form id="rename-tag-form" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label for="tag-name">Tag name</label>
          <input
            id="tag-name"
            class="input"
            [class.invalid]="name.invalid && name.touched"
            formControlName="name"
            autocomplete="off"
            spellcheck="false"
          />
          @if (name.invalid && name.touched) {
            <span class="field-error">Use letters, numbers or dashes.</span>
          } @else if (mergeTarget()) {
            <span class="field-hint">#{{ mergeTarget() }} already exists. Notes will be merged into it.</span>
          } @else {
            <span class="field-hint">Will be saved as #{{ preview() || '…' }}</span>
          }
        </div>
      </form>
      <div modal-footer class="modal-footer">
        <button type="button" class="btn" (click)="closed.emit()">Cancel</button>
        <button type="submit" form="rename-tag-form" class="btn btn-primary">
          {{ mergeTarget() ? 'Merge tags' : 'Rename' }}
        </button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenameTagDialog implements OnInit {
  readonly tag = input.required<string>();
  readonly existing = input<string[]>([]);
  readonly renamed = output<string>();
  readonly closed = output<void>();

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, (c) => (normalizeTag(c.value ?? '') ? null : { tag: true })],
    }),
  });
  protected readonly name = this.form.controls.name;
  private readonly value = toSignal(this.name.valueChanges, { initialValue: '' });
  protected readonly preview = computed(() => normalizeTag(this.value()));
  protected readonly mergeTarget = computed(() => {
    const next = this.preview();
    return next && next !== this.tag() && this.existing().includes(next) ? next : null;
  });

  ngOnInit(): void {
    this.name.setValue(this.tag());
  }

  protected submit(): void {
    this.name.markAsTouched();
    if (this.name.invalid) return;
    if (this.preview() === this.tag()) {
      this.closed.emit();
      return;
    }
    this.renamed.emit(this.preview());
  }
}
