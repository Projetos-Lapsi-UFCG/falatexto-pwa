import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucidePlus,
  lucideMic,
  lucideImage,
  lucideCamera,
} from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormService } from '../../core/services/form.service';
import { Form } from '../../core/models/form.model';
import { scaleIn, fadeIn } from '../../shared/animations/fade.animation';

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    NgIcon,
    TranslateModule,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus, lucideMic, lucideImage, lucideCamera })],
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formService = inject(FormService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    entity: ['', Validators.required],
    questions: [
      null as number | null,
      [Validators.required, Validators.min(1)],
    ],
    type: ['manual' as Form['type']],
    inputMethod: ['dictate' as Form['inputMethod']],
  });

  handleSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }
    const v = this.createForm.value;
    const isManual = v.type === 'manual';
    this.formService.addForm({
      name: v.name!,
      entity: v.entity!,
      questions: v.questions!,
      type: v.type ?? 'manual',
      ...(isManual && { inputMethod: v.inputMethod ?? 'dictate' }),
    });
    this.toastr.success(this.translate.instant('CREATE_FORM.SUCCESS.CREATED'));
    this.router.navigate(['/dashboard']);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
