import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n/i18n.service';

// Pipe impura: deve rivalutarsi quando cambia la lingua anche se la chiave
// passata al template resta la stessa stringa letterale (un pipe puro non
// si aggiornerebbe in quel caso). Costo accettabile per un'app di queste
// dimensioni, coerente col resto dei controlli di change detection Ionic.
@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
