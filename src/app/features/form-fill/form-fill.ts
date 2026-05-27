import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
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
    MatCheckboxModule,
    MatRadioModule,
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

  // Respostas para campos de texto, boolean e radio
  answers: Record<string, string> = {};

  // Respostas para checkboxes — valor booleano por opção
  checkboxAnswers: Record<string, boolean> = {};

  // Dados do paciente preenchidos na etapa 0
  patientData = {
    name: '',
    birthDate: '',
    record: '',
    room: '',
  };
  // Dados finais — data e responsável
  closingData = {
    date: '',
    responsible: '',
  };
  
  get totalSteps(): number {
    return 2 + (this.form?.sections?.length ?? 0);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.form = this.formService.getFormById(id) ?? null;
    }
  }

  setAnswer(questionId: string, value: string): void {
    this.answers[questionId] = value;
  }

  onCheckboxChange(optionId: string, checked: boolean): void {
    this.checkboxAnswers[optionId] = checked;
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

  finalizar(): void {
    this.router.navigate(['/dashboard']);
  }
}