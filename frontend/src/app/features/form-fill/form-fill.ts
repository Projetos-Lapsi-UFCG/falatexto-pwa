import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucideLoaderCircle,
  lucideMic,
  lucideMicOff,
  lucideSparkles,
} from '@ng-icons/lucide';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { SubmissionService } from '../../core/services/submission';
import {
  DictationServerError,
  DictationStream,
  StreamingDictationService,
} from '../../core/services/streaming-dictation.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { Form, QuestionField, Section } from '../../core/models/form.model';

export type AiDictationStatus = 'idle' | 'connecting' | 'listening' | 'stopped';

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
    provideIcons({
      lucideArrowLeft,
      lucideSparkles,
      lucideMic,
      lucideMicOff,
      lucideLoaderCircle,
    }),
  ],
  templateUrl: './form-fill.html',
  styleUrl: './form-fill.css',
})
export class FormFillComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formApiService = inject(FormApiService);
  private readonly submissionService = inject(SubmissionService);
  private readonly streamingDictation = inject(StreamingDictationService);
  private readonly visionApiService = inject(VisionApiService);
  private readonly toastr = inject(ToastrService);
  private readonly cdr = inject(ChangeDetectorRef);

  form: Form | null = null;
  currentStep = 0;
  loading = true;
  enviando = false;

  answers: Record<string, string> = {};
  checkboxAnswers: Record<string, boolean> = {};

  closingData = {
    date: '',
    responsible: '',
  };

  // Estado do modo de preenchimento por voz com IA
  isAiMode = false;
  aiStatus: AiDictationStatus = 'idle';
  liveTranscript = '';
  isExtracting = false;
  autoAdvance = true;
  aiFilledKeys = new Set<string>();

  private stream: DictationStream | null = null;
  private partialSub: Subscription | null = null;
  private extractSub: Subscription | null = null;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastExtractionAt = 0;
  private lastExtractedText = '';
  private pendingTranscript: string | null = null;

  get totalSteps(): number {
    return 1 + (this.form?.sections?.length ?? 0);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    this.isAiMode = this.route.snapshot.queryParamMap.get('mode') === 'ai';

    if (!id) {
      this.loading = false;
      return;
    }

    this.formApiService.getFormById(id).subscribe({
      next: form => {
        this.form = form;
        this.loading = false;
        this.cdr.markForCheck();

        if (this.isAiMode) {
          void this.startAiDictation();
        }
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Não foi possível carregar este formulário. Tente novamente.');
        this.router.navigate(['/forms', id]);
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.partialSub?.unsubscribe();
    this.extractSub?.unsubscribe();
    this.stream?.cancel();
  }

  async startAiDictation(): Promise<void> {
    if (this.aiStatus === 'connecting' || this.aiStatus === 'listening') {
      return;
    }

    this.aiStatus = 'connecting';
    this.cdr.markForCheck();

    try {
      const contexto = this.buildWhisperContext();
      this.stream = await this.streamingDictation.start(contexto);
      this.aiStatus = 'listening';
      this.lastExtractionAt = Date.now();
      this.cdr.markForCheck();

      this.partialSub?.unsubscribe();
      this.partialSub = this.stream.partial$.subscribe(text => {
        this.onTranscriptChunk(text);
      });
    } catch {
      this.stream = null;
      this.aiStatus = 'stopped';
      this.toastr.error('Não foi possível iniciar a escuta por voz. Verifique o microfone.');
      this.cdr.markForCheck();
    }
  }

  async stopAiDictation(): Promise<void> {
    if (!this.stream) {
      this.aiStatus = 'stopped';
      this.cdr.markForCheck();
      return;
    }

    this.clearTimers();
    const activeStream = this.stream;
    this.stream = null;
    this.aiStatus = 'stopped';
    this.cdr.markForCheck();

    try {
      const finalText = await activeStream.stop();
      if (finalText.trim()) {
        this.liveTranscript = finalText.trim();
        this.triggerExtraction(this.liveTranscript);
      }
    } catch (error) {
      if (error instanceof DictationServerError) {
        this.toastr.error(error.message);
      }
      if (this.liveTranscript.trim()) {
        this.triggerExtraction(this.liveTranscript);
      }
    } finally {
      this.cdr.markForCheck();
    }
  }

  toggleAutoAdvance(): void {
    this.autoAdvance = !this.autoAdvance;
    if (!this.autoAdvance && this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    this.cdr.markForCheck();
  }

  setAnswer(questionId: string, value: string): void {
    this.answers[questionId] = value;
  }

  onCheckboxChange(optionId: string, checked: boolean): void {
    this.checkboxAnswers[optionId] = checked;
  }

  nextStep(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goBack(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
    if (this.currentStep === 0) {
      this.router.navigate(['/forms', this.form?.id]);
    } else {
      this.autoAdvance = false;
      this.currentStep--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  finalizar(): void {
    if (!this.form || this.enviando) return;

    if (this.stream) {
      this.stream.cancel();
      this.stream = null;
      this.aiStatus = 'stopped';
    }

    const dados = {
      formId: this.form.id,
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

  private buildWhisperContext(): string {
    if (!this.form) return '';
    const terms: string[] = [this.form.name];
    for (const sec of this.form.sections ?? []) {
      terms.push(sec.name);
      for (const q of sec.questions ?? []) {
        terms.push(q.label);
        for (const opt of q.options ?? []) {
          terms.push(opt.label);
        }
      }
    }
    return terms.join(', ').slice(0, 400);
  }

  private onTranscriptChunk(text: string): void {
    const clean = text.trim();
    if (!clean || clean === this.liveTranscript) {
      return;
    }

    this.liveTranscript = clean;
    this.cdr.markForCheck();

    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
    }

    const now = Date.now();
    const deltaChars = clean.length - this.lastExtractedText.length;
    if (now - this.lastExtractionAt >= 4500 && deltaChars >= 15) {
      this.triggerExtraction(clean);
      return;
    }

    this.pauseTimer = setTimeout(() => {
      if (this.liveTranscript && this.liveTranscript !== this.lastExtractedText) {
        this.triggerExtraction(this.liveTranscript);
      }
    }, 1500);
  }

  private triggerExtraction(transcript: string): void {
    if (!this.form || !transcript.trim()) return;

    if (this.isExtracting) {
      this.pendingTranscript = transcript;
      return;
    }

    this.isExtracting = true;
    this.lastExtractionAt = Date.now();
    this.lastExtractedText = transcript;
    this.cdr.markForCheck();

    const todayIso = new Date().toISOString().slice(0, 10);

    this.extractSub = this.visionApiService
      .preencherFormulario({
        transcricao: transcript,
        formulario_nome: this.form.name,
        secoes: this.form.sections ?? [],
        respostas_atuais: this.answers,
        checkbox_atuais: this.checkboxAnswers,
        etapa_atual: this.currentStep,
        data_atual: todayIso,
      })
      .subscribe({
        next: res => {
          this.applyExtractedResponses(res.answers ?? {}, res.checkboxAnswers ?? {}, res.closingData ?? {});
          this.finishExtractionCycle();
        },
        error: () => {
          this.finishExtractionCycle();
        },
      });
  }

  private finishExtractionCycle(): void {
    this.isExtracting = false;
    this.cdr.markForCheck();

    if (this.pendingTranscript && this.pendingTranscript !== this.lastExtractedText) {
      const nextText = this.pendingTranscript;
      this.pendingTranscript = null;
      this.triggerExtraction(nextText);
    } else {
      this.pendingTranscript = null;
    }
  }

  private applyExtractedResponses(
    extractedAnswers: Record<string, string>,
    extractedCheckboxes: Record<string, boolean>,
    extractedClosing: { date?: string; responsible?: string }
  ): void {
    let anyChanged = false;

    for (const [key, value] of Object.entries(extractedAnswers)) {
      if (value && this.answers[key] !== value) {
        this.answers[key] = value;
        this.aiFilledKeys.add(key);
        anyChanged = true;
      }
    }

    for (const [optId, checked] of Object.entries(extractedCheckboxes)) {
      if (checked && !this.checkboxAnswers[optId]) {
        this.checkboxAnswers[optId] = true;
        this.aiFilledKeys.add(optId);
        anyChanged = true;
      }
    }

    if (extractedClosing.date && this.closingData.date !== extractedClosing.date) {
      this.closingData.date = extractedClosing.date;
      this.aiFilledKeys.add('closing_date');
      anyChanged = true;
    }

    if (extractedClosing.responsible && this.closingData.responsible !== extractedClosing.responsible) {
      this.closingData.responsible = extractedClosing.responsible;
      this.aiFilledKeys.add('closing_responsible');
      anyChanged = true;
    }

    if (anyChanged) {
      this.cdr.markForCheck();
      this.evaluateAutoAdvance();
    }
  }

  private evaluateAutoAdvance(): void {
    if (!this.autoAdvance || !this.form?.sections) return;
    if (this.currentStep >= this.form.sections.length) return;

    const currentSection = this.form.sections[this.currentStep];
    if (!this.isSectionComplete(currentSection)) return;

    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }

    this.autoAdvanceTimer = setTimeout(() => {
      if (
        this.autoAdvance &&
        this.form?.sections &&
        this.currentStep < this.form.sections.length &&
        this.isSectionComplete(this.form.sections[this.currentStep])
      ) {
        this.nextStep();
        this.cdr.markForCheck();
      }
    }, 1200);
  }

  private isSectionComplete(section: Section): boolean {
    const questions = (section.questions ?? []).filter(q => q.type !== 'divider');
    if (questions.length === 0) return false;
    return questions.every(q => this.isQuestionAnswered(q));
  }

  private isQuestionAnswered(q: QuestionField): boolean {
    switch (q.type) {
      case 'boolean':
      case 'boolean_na':
      case 'text':
      case 'date':
      case 'number':
      case 'radio_group':
        return Boolean(this.answers[q.id]?.trim());

      case 'checkbox_group':
        return (q.options ?? []).some(opt => Boolean(this.checkboxAnswers[opt.id]));

      case 'radio_with_fields': {
        const hasChoice = Boolean(this.answers[q.id]?.trim());
        const hasField = (q.options ?? []).some(
          opt => opt.hasComplement && Boolean(this.answers[opt.id]?.trim())
        );
        return hasChoice || hasField;
      }

      case 'text_group': {
        const opts = q.options ?? [];
        if (opts.length === 0) return true;
        return opts.every(opt => Boolean(this.answers[opt.id]?.trim()));
      }

      default:
        return true;
    }
  }

  private clearTimers(): void {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }
}
