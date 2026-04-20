import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { UserType } from '../../core/models/user.model';
import { PinInputComponent } from '../../shared/components/pin-input/pin-input.component';
import { scaleIn } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    PinInputComponent,
    TranslateModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  animations: [scaleIn],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  readonly loginForm = this.fb.group({
    userType: ['', Validators.required],
  });

  pin = '';

  onPinChange(pin: string): void {
    this.pin = pin;
    if (pin.length === 4) {
      this.handleLogin();
    }
  }

  handleLogin(): void {
    if (this.loginForm.invalid) {
      this.toastr.error(this.translate.instant('LOGIN.ERRORS.SELECT_USER_TYPE'));
      return;
    }
    if (this.pin.length !== 4) {
      this.toastr.error(this.translate.instant('LOGIN.ERRORS.ENTER_PIN'));
      return;
    }
    const userType = this.loginForm.value.userType as UserType;
    if (this.authService.login(userType, this.pin)) {
      this.toastr.success(this.translate.instant('LOGIN.SUCCESS.LOGIN'));
      this.router.navigate(['/dashboard']);
    } else {
      this.toastr.error(this.translate.instant('LOGIN.ERRORS.INVALID_CREDENTIALS'));
    }
  }
}
