import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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
    if (Array.isArray(value)) {
      return value.length ? value.join(', ') : '—';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}
