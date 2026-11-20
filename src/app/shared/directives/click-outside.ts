import { Directive, ElementRef, inject, output } from '@angular/core';

/** Emits when a pointer press happens outside the host, used to close menus and popovers. */
@Directive({
  selector: '[appClickOutside]',
  host: { '(document:pointerdown)': 'onPointerDown($event)' },
})
export class ClickOutside {
  readonly appClickOutside = output<void>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected onPointerDown(event: PointerEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.appClickOutside.emit();
  }
}
