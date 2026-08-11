import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { SubmissionService } from '../../core/services/submission';
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
  private readonly formApiService = inject(FormApiService);

  // Injeta o service de submissão para enviar respostas ao backend
  private readonly submissionService = inject(SubmissionService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: Form | null = null;
  currentStep = 0;
  loading = true;

  // Controla se o app está aguardando resposta do backend
  enviando = false;

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
    if (!id) {
      this.loading = false;
      return;
    }

    this.formApiService.getFormById(id).subscribe({
      next: form => {
        this.form = form;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar este formulário. Tente novamente.');
        this.router.navigate(['/forms', id]);
        this.cdr.markForCheck();
      },
    });
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

  /**
   * Coleta todos os dados preenchidos e envia para o backend.
   * Enquanto aguarda a resposta, bloqueia o botão para evitar envio duplo.
   * Quando o backend confirmar, navega para o dashboard.
   */
  finalizar(): void {
    if (!this.form || this.enviando) return;

    // Monta o objeto com todos os dados do preenchimento
    const dados = {
      formId: this.form.id,
      patientData: this.patientData,
      answers: this.answers,
      checkboxAnswers: this.checkboxAnswers,
      closingData: this.closingData,
    };

    // Marca que está enviando para bloquear o botão
    this.enviando = true;

    // Chama o service que faz o POST para o backend
    this.submissionService.salvarRespostas(dados).subscribe({
      next: () => {
        // Backend respondeu com sucesso — navega para o dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // Algo deu errado — desbloqueia o botão e avisa o usuário
        console.error('Erro ao salvar respostas:', err);
        this.enviando = false;
        this.toastr.error('Erro ao salvar as respostas. Tente novamente.');
        this.cdr.markForCheck();
      },
    });
  }
}