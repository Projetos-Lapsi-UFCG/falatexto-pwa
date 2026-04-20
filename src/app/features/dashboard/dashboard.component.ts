import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
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
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { FormService } from '../../core/services/form.service';
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
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly formService = inject(FormService);
  private readonly router = inject(Router);

  userType: UserType | null = null;
  forms: Form[] = [];
  filteredForms: Form[] = [];
  searchQuery = '';

  private subscription?: Subscription;

  ngOnInit(): void {
    this.userType = this.authService.getCurrentUserType();
    this.subscription = this.formService.forms$.subscribe(forms => {
      this.forms = forms;
      this.filteredForms = forms;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onSearch(): void {
    this.filteredForms = this.formService.searchForms(this.searchQuery);
  }

  logout(): void {
    this.authService.logout();
  }

  createForm(): void {
    this.router.navigate(['/create']);
  }
}
