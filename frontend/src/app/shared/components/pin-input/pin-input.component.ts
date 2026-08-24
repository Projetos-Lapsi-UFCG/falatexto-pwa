import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-pin-input',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './pin-input.component.html',
  styleUrl: './pin-input.component.css',
})
export class PinInputComponent {
  @Output() pinChange = new EventEmitter<string>();

  @ViewChildren('pinField') pinFields!: QueryList<ElementRef<HTMLInputElement>>;

  readonly pinArray = new FormArray(
    Array.from({ length: 4 }, () =>
      new FormControl('', [Validators.maxLength(1), Validators.pattern(/[0-9]/)])
    )
  );

  get pinControls(): FormControl[] {
    return this.pinArray.controls as FormControl[];
  }

  onInput(index: number): void {
    const value = this.pinControls[index].value as string;
    if (value && value.length > 0) {
      // Advance to next field
      if (index < 3) {
        const fields = this.pinFields.toArray();
        fields[index + 1].nativeElement.focus();
      }
    }
    this.emitPin();
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace') {
      const current = this.pinControls[index].value as string;
      if (!current && index > 0) {
        const fields = this.pinFields.toArray();
        fields[index - 1].nativeElement.focus();
        this.pinControls[index - 1].setValue('');
        this.emitPin();
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, 4).split('');
    digits.forEach((digit, i) => {
      if (i < 4) this.pinControls[i].setValue(digit);
    });
    const fields = this.pinFields.toArray();
    const focusIndex = Math.min(digits.length, 3);
    fields[focusIndex].nativeElement.focus();
    this.emitPin();
  }

  private emitPin(): void {
    const pin = this.pinControls.map(c => c.value as string).join('');
    this.pinChange.emit(pin);
  }
}
