import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { FormService } from '../../core/services/form.service';
import { Form } from '../../core/models/form.model';

@Component({
  selector: 'app-form-fill',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    NgIcon,
  ],
  providers: [
    provideIcons({ lucideArrowLeft }),
  ],
  templateUrl: './form-fill.html',
  styleUrl: './form-fill.css',
})
export class FormFillComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formService = inject(FormService);

  form: Form | null = null;
  currentStep = 0;

  get totalSteps(): number {
    return 1 + (this.form?.sections?.length ?? 0);
  }

  patientData = {
    name: '',
    birthDate: '',
    record: '',
    room: '',
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.form = this.formService.getFormById(id) ?? null;
    }
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    }
  }

  goBack(): void {
    if (this.currentStep === 0) {
      this.router.navigate(['/forms', this.form?.id]);
    } else {
      this.currentStep--;
    }
  }
}