import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePlus, lucidePaperclip, lucideFileX } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormApiService } from '../../core/services/form-api.service';
import { VisionApiService } from '../../core/services/vision-api.service';
import { scaleIn, fadeIn } from '../../shared/animations/fade.animation';

const ACCEPTED_VISION_FILE_TYPES = ['application/pdf', 'image/'];

@Component({
  selector: 'app-create-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgIcon,
    TranslateModule,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePlus, lucidePaperclip, lucideFileX })],
  templateUrl: './create-form.component.html',
  styleUrl: './create-form.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly formApiService = inject(FormApiService);
  private readonly visionApiService = inject(VisionApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = false;
  visionLoading = false;
  selectedFile: File | null = null;

  readonly createForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
  });

  readonly visionForm = this.fb.group({
    textoClinico: ['', [Validators.required]],
  });

  handleSubmit(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }

    const name = this.createForm.value.name!;
    this.loading = true;
    this.formApiService.createForm(name).subscribe({
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

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && !ACCEPTED_VISION_FILE_TYPES.some(type => file.type.startsWith(type))) {
      this.toastr.error(this.translate.instant('CREATE_FORM.VISION.ERRORS.INVALID_FILE_TYPE'));
      input.value = '';
      return;
    }

    this.selectedFile = file;
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
  }

  handleProcessWithAI(): void {
    if (this.visionForm.invalid) {
      this.visionForm.markAllAsTouched();
      this.toastr.error(this.translate.instant('CREATE_FORM.ERRORS.FILL_REQUIRED'));
      return;
    }

    const textoClinico = this.visionForm.value.textoClinico!;
    this.visionLoading = true;
    this.visionApiService.processarClinica(textoClinico, this.selectedFile).subscribe({
      next: response => {
        this.visionLoading = false;
        this.toastr.success(
          this.translate.instant('CREATE_FORM.VISION.SUCCESS.QUEUED', { id: response.id_sessao })
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.visionLoading = false;
        this.toastr.error(this.translate.instant('CREATE_FORM.VISION.ERRORS.PROCESS_FAILED'));
        this.cdr.markForCheck();
      },
    });
  }
}
