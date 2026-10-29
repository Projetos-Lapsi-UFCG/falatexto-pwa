import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../../core/services/form-api.service';
import { Form, QuestionField, Section } from '../../../core/models/form.model';
import { scaleIn, fadeIn } from '../../../shared/animations/fade.animation';
import { VoiceInputComponent } from '../../../shared/components/voice-input/voice-input.component';

/** Tipos de pergunta oferecidos no construtor (v1) — o modelo local
 *  (QuestionField.type) suporta mais tipos, usados por outros formulários já
 *  existentes, mas que ainda não têm UI de montagem aqui (radio_with_fields,
 *  text_group, divider). */
type BuilderQuestionType =
  | 'text'
  | 'date'
  | 'number'
  | 'boolean'
  | 'boolean_na'
  | 'radio_group'
  | 'checkbox_group';

interface QuestionTypeChoice {
  value: BuilderQuestionType;
  labelKey: string;
}

/** checkbox_group (múltiplas marcáveis) e radio_group (só uma marcável)
 *  usam a mesma UI de lista de opções no construtor. */
const OPTION_BASED_TYPES: ReadonlySet<BuilderQuestionType> = new Set(['checkbox_group', 'radio_group']);

const QUESTION_TYPE_CHOICES: QuestionTypeChoice[] = [
  { value: 'text', labelKey: 'CREATE_FORM.BUILDER.TYPES.TEXT' },
  { value: 'date', labelKey: 'CREATE_FORM.BUILDER.TYPES.DATE' },
  { value: 'number', labelKey: 'CREATE_FORM.BUILDER.TYPES.NUMBER' },
  { value: 'boolean', labelKey: 'CREATE_FORM.BUILDER.TYPES.BOOLEAN' },
  { value: 'boolean_na', labelKey: 'CREATE_FORM.BUILDER.TYPES.BOOLEAN_NA' },
  { value: 'radio_group', labelKey: 'CREATE_FORM.BUILDER.TYPES.RADIO_GROUP' },
  { value: 'checkbox_group', labelKey: 'CREATE_FORM.BUILDER.TYPES.CHECKBOX_GROUP' },
];

@Component({
  selector: 'app-create-manual',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    NgIcon,
    TranslateModule,
    VoiceInputComponent,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus, lucideTrash2 })],
  templateUrl: './create-manual.component.html',
  styleUrl: './create-manual.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateManualComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formApiService = inject(FormApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly questionTypeChoices = QUESTION_TYPE_CHOICES;

  /** Seções montadas pelo usuário no construtor de perguntas. Os `id` aqui
   *  dentro (section.id/question.id/option.id) são só placeholders estáveis
   *  pro tracking do Angular — os ids reais enviados ao backend são
   *  derivados dos rótulos em FormApiService.createFormWithSections(). */
  sections: Section[] = [];

  private localIdSequence = 0;

  private nextLocalId(prefix: string): string {
    this.localIdSequence += 1;
    return `${prefix}-${this.localIdSequence}`;
  }

  addSection(): void {
    this.sections.push({ id: this.nextLocalId('section'), name: '', questions: [] });
  }

  removeSection(index: number): void {
    this.sections.splice(index, 1);
  }

  addQuestion(section: Section): void {
    section.questions.push({ id: this.nextLocalId('question'), label: '', type: 'text' });
  }

  removeQuestion(section: Section, index: number): void {
    section.questions.splice(index, 1);
  }

  /** Ao trocar pra um tipo baseado em opções (checkbox_group/radio_group),
   *  garante que já exista pelo menos 1 opção pra editar; ao sair desses
   *  tipos, descarta opções que não fazem sentido pros demais (text/date/
   *  number/boolean/boolean_na não usam options). */
  onQuestionTypeChange(question: QuestionField): void {
    if (OPTION_BASED_TYPES.has(question.type as BuilderQuestionType)) {
      if (!question.options || question.options.length === 0) {
        question.options = [];
        this.addOption(question);
      }
    } else {
      delete question.options;
    }
  }

  addOption(question: QuestionField): void {
    question.options = question.options ?? [];
    question.options.push({ id: this.nextLocalId('option'), label: '' });
  }

  removeOption(question: QuestionField, index: number): void {
    question.options?.splice(index, 1);
  }

  handleSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }

    const validationErrorKey = this.validateSections();
    if (validationErrorKey) {
      this.toastr.error(this.translate.instant(validationErrorKey));
      return;
    }

    const name = this.createForm.value.name!;
    const form: Form = {
      id: '',
      name,
      questions: 0,
      entity: '',
      createdAt: new Date().toISOString(),
      sections: this.sections,
    };

    this.loading = true;
    this.formApiService.createFormWithSections(form).subscribe({
      next: () => {
        this.loading = false;
        this.toastr.success(this.translate.instant('CREATE_FORM.SUCCESS.CREATED'));
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.loading = false;
        this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.CREATE_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }

  /** Valida as seções montadas no construtor antes de enviar — espelha as
   *  regras que o backend já exige (title/label com pelo menos 3 caracteres,
   *  ESTIMULADA/MULTIPLA com pelo menos 1 option), pra dar um erro específico
   *  em vez de deixar o POST falhar lá na frente. Seções não são obrigatórias
   *  (um form sem nenhuma pode ser criado, como já era possível antes). */
  private validateSections(): string | null {
    for (const section of this.sections) {
      if (section.name.trim().length < 3) {
        return 'CREATE_FORM.BUILDER.ERRORS.SECTION_NAME_REQUIRED';
      }
      if (section.questions.length === 0) {
        return 'CREATE_FORM.BUILDER.ERRORS.SECTION_EMPTY';
      }
      for (const question of section.questions) {
        if (question.label.trim().length < 3) {
          return 'CREATE_FORM.BUILDER.ERRORS.QUESTION_LABEL_REQUIRED';
        }
        if (OPTION_BASED_TYPES.has(question.type as BuilderQuestionType)) {
          const validOptions = (question.options ?? []).filter(o => o.label.trim().length > 0);
          if (validOptions.length === 0) {
            return 'CREATE_FORM.BUILDER.ERRORS.OPTION_REQUIRED';
          }
        }
      }
    }
    return null;
  }

  /** Ditado: acrescenta o texto transcrito ao nome (permite ditar em partes). */
  appendToName(text: string): void {
    const control = this.createForm.controls.name;
    const current = control.value?.trim();
    control.setValue(current ? `${current} ${text}` : text);
    control.markAsDirty();
    control.markAsTouched();
    this.cdr.markForCheck();
  }

  goBack(): void {
    this.router.navigate(['/create']);
  }
}
