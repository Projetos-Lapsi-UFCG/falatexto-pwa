import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

// Formato bruto salvo por <input type="date"> (form-fill.ts): YYYY-MM-DD.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Converte YYYY-MM-DD (formato do <input type="date">) para DD/MM/AAAA. */
function formatIsoDateToBr(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

@Pipe({
  name: 'displayValue',
  standalone: true,
  pure: true,
})
export class DisplayValuePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'boolean') {
      return this.translate.instant(value ? 'SUBMISSIONS.DETAIL.YES' : 'SUBMISSIONS.DETAIL.NO');
    }
    if (typeof value === 'string' && ISO_DATE_PATTERN.test(value)) {
      return formatIsoDateToBr(value);
    }
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
