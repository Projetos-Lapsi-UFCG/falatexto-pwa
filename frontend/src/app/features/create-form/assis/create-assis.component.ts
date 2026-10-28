import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucidePaperclip, lucideFileX } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { VisionApiService } from '../../../core/services/vision-api.service';
import { scaleIn, fadeIn } from '../../../shared/animations/fade.animation';

const ACCEPTED_VISION_FILE_TYPES = ['application/pdf', 'image/'];

@Component({
  selector: 'app-create-assis',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    NgIcon,
    TranslateModule,
  ],
  providers: [provideIcons({ lucideArrowLeft, lucidePaperclip, lucideFileX })],
  templateUrl: './create-assis.component.html',
  styleUrl: './create-assis.component.css',
  animations: [scaleIn, fadeIn],
})
export class CreateAssisComponent {
  private readonly fb = inject(FormBuilder);
  private readonly visionApiService = inject(VisionApiService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);

  visionLoading = false;
  selectedFile: File | null = null;

  readonly visionForm = this.fb.group({
    textoClinico: ['', [Validators.required]],
  });

  goBack(): void {
    this.router.navigate(['/create']);
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
