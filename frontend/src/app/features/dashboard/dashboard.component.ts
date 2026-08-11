import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucidePlus,
  lucideLogOut,
  lucideUser,
} from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../core/services/auth.service';
import { FormApiService } from '../../core/services/form-api.service';
import { Form } from '../../core/models/form.model';
import { UserType } from '../../core/models/user.model';
import { FormCardComponent } from './components/form-card/form-card.component';
import { LanguageSelectorComponent } from '../../shared/components/language-selector/language-selector.component';
import { fadeIn, staggerFade } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NgIcon,
    FormCardComponent,
    TranslateModule,
    LanguageSelectorComponent,
  ],
  providers: [
    provideIcons({ lucideSearch, lucidePlus, lucideLogOut, lucideUser }),
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  animations: [fadeIn, staggerFade],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formApiService = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  userType: UserType | null = null;
  forms: Form[] = [];
  filteredForms: Form[] = [];
  searchQuery = '';
  loading = true;

  ngOnInit(): void {
    this.userType = this.authService.getCurrentUserType();
    this.loadForms();
  }

  private loadForms(): void {
    this.loading = true;
    this.formApiService.listForms().subscribe({
      next: forms => {
        this.forms = forms;
        this.filteredForms = forms;
        this.loading = false;
        // App é zoneless — sem isso, a view não re-renderiza após o retorno assíncrono.
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('DASHBOARD.ERRORS.LOAD_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  onSearch(): void {
    this.formApiService.searchForms(this.searchQuery).subscribe({
      next: forms => {
        this.filteredForms = forms;
        this.cdr.markForCheck();
      },
      error: () => {
        this.toastr.error(this.translate.instant('DASHBOARD.ERRORS.LOAD_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  logout(): void {
    this.authService.logout();
  }

  createForm(): void {
    this.router.navigate(['/create']);
  }
}
