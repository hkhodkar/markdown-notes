import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme';
import { ConfirmDialog } from './shared/ui/confirm-dialog';
import { ToastContainer } from './shared/ui/toast-container';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, ConfirmDialog],
  template: `
    <router-outlet />
    <app-toast-container />
    <app-confirm-dialog />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  constructor() {
    // applies the theme on startup
    inject(ThemeService);
  }
}
