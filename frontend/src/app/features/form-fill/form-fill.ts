import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideMic, lucideCheckCircle } from '@ng-icons/lucide';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { SubmissionService } from '../../core/services/submission';
import { Form } from '../../core/models/form.model';
import { VoiceInputComponent } from '../../shared/components/voice-input/voice-input';

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
    VoiceInputComponent,
  ],
  providers: [
    provideIcons({ lucideArrowLeft, lucideMic, lucideCheckCircle }),
  ],
  templateUrl: './form-fill.html',
  styleUrl: './form-fill.css',
})
export class FormFillComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formApiService = inject(FormApiService);
  private readonly submissionService = inject(SubmissionService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: Form | null = null;
  currentStep = 0;
  loading = true;
  enviando = false;
  processandoIaSobreDitado = false;

  // Propriedades para controle do modo guiado
  isGuidedMode = false;
  activeFieldKey: string | null = null;

  answers: Record<string, string> = {};
  checkboxAnswers: Record<string, boolean> = {};

  patientData = {
    name: '',
    birthDate: '',
    record: '',
    room: '',
  };

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
        this.router.navigate(['/dashboard']);
        this.cdr.markForCheck();
      },
    });
  }

  toggleGuidedMode(): void {
    this.isGuidedMode = !this.isGuidedMode;
    if (!this.isGuidedMode) {
      this.activeFieldKey = null;
    }
  }

  setAnswer(questionId: string, value: string): void {
    this.answers[questionId] = value;
  }

  onCheckboxChange(optionId: string, checked: boolean): void {
    this.checkboxAnswers[optionId] = checked;
  }

  appendValue(targetObj: Record<string, string>, key: string, text: any): void {
    const extractedText = typeof text === 'string' ? text : (text?.toString() ?? '');
    if (!extractedText) return;

    const current = targetObj[key] || '';
    targetObj[key] = current ? `${current} ${extractedText}` : extractedText;
    this.cdr.markForCheck();
  }

  onVoiceTextReceived(texto: any): void {
    const extractedText = typeof texto === 'string' ? texto : (texto?.toString() ?? '');
    if (!extractedText.trim()) return;

    this.processarDitadoCompleto(extractedText);
  }

  processarDitadoCompleto(textoTranscrito: string): void {
    if (!this.form) return;

    this.processandoIaSobreDitado = true;
    this.toastr.info('Processando áudio completo com IA para preenchimento automático...');

    this.formApiService.processarDitadoCompleto(this.form.id, textoTranscrito).subscribe({
      next: (dadosMapeados: any) => {
        this.processandoIaSobreDitado = false;

        if (dadosMapeados?.patientData) {
          this.patientData = { ...this.patientData, ...dadosMapeados.patientData };
        }
        if (dadosMapeados?.answers) {
          this.answers = { ...this.answers, ...dadosMapeados.answers };
        }
        if (dadosMapeados?.checkboxAnswers) {
          this.checkboxAnswers = { ...this.checkboxAnswers, ...dadosMapeados.checkboxAnswers };
        }
        if (dadosMapeados?.closingData) {
          this.closingData = { ...this.closingData, ...dadosMapeados.closingData };
        }

        this.toastr.success('Formulário preenchido com sucesso pela IA!');
        this.cdr.markForCheck();
      },
      error: () => {
        this.processandoIaSobreDitado = false;
        this.toastr.error('Erro ao processar o ditado com a IA. Tente novamente.');
        this.cdr.markForCheck();
      },
    });
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
    if (!this.form || this.enviando) return;

    const dados = {
      formId: this.form.id,
      patientData: this.patientData,
      answers: this.answers,
      checkboxAnswers: this.checkboxAnswers,
      closingData: this.closingData,
    };

    this.enviando = true;

    this.submissionService.salvarRespostas(dados).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Erro ao salvar respostas:', err);
        this.enviando = false;
        this.toastr.error('Erro ao salvar as respostas. Tente novamente.');
        this.cdr.markForCheck();
      },
    });
  }
}