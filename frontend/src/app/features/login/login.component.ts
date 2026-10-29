import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { PinInputComponent } from '../../shared/components/pin-input/pin-input.component';
import { scaleIn } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    PinInputComponent,
    TranslateModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  animations: [scaleIn],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  showPin = false;
  pin = '';

  loginAsGuest(): void {
    this.authService.login('guest');
    this.onLoginSuccess();
  }

  selectAdmin(): void {
    this.showPin = true;
  }

  onPinChange(pin: string): void {
    this.pin = pin;
    if (pin.length === 4) {
      this.handleLogin();
    }
  }

  handleLogin(): void {
    if (this.pin.length !== 4) {
      this.toastr.error(this.translate.instant('LOGIN.ERRORS.ENTER_PIN'));
      return;
    }
    if (this.authService.login('admin', this.pin)) {
      this.onLoginSuccess();
    } else {
      this.toastr.error(this.translate.instant('LOGIN.ERRORS.INVALID_CREDENTIALS'));
    }
  }

  private onLoginSuccess(): void {
    this.toastr.success(this.translate.instant('LOGIN.SUCCESS.LOGIN'));
    this.router.navigate(['/dashboard']);
  }
}
