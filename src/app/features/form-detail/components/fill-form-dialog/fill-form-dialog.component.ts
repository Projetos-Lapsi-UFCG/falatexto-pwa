import { Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { FormService } from '../../../../core/services/form.service';
import { Form } from '../../../../core/models/form.model';

@Component({
  selector: 'app-fill-form-dialog',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: './fill-form-dialog.component.html',
  styleUrl: './fill-form-dialog.component.css',
})
export class FillFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<FillFormDialogComponent>);
  readonly data: { form: Form } = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly formService = inject(FormService);
  private readonly toastr = inject(ToastrService);
  private readonly translate = inject(TranslateService);

  readonly fillForm = this.fb.group({
    patientName: ['', [Validators.required, Validators.minLength(2)]],
  });

  submit(): void {
    if (this.fillForm.invalid) {
      this.fillForm.markAllAsTouched();
      return;
    }
    this.formService.addFormInstance({
      formId: this.data.form.id,
      patientName: this.fillForm.value.patientName!,
    });
    this.toastr.success(this.translate.instant('FILL_DIALOG.SUCCESS.STARTED'));
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
