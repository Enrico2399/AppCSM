import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

/**
 * Pagina "Dona": spiega perche' chiediamo un sostegno (tenere CSM Digitale
 * gratuito, coprendo i costi che permettono di continuare a migliorare la
 * salute fisica e mentale di chi lo usa) senza ancora offrire un metodo di
 * pagamento vero. Nessun link/IBAN e' stato inventato: quando ce ne sara'
 * uno reale, questa pagina va aggiornata con il pulsante/i dati corretti al
 * posto del badge "Presto disponibile" qui sotto.
 */
@Component({
  selector: 'app-donate',
  templateUrl: './donate.page.html',
  styleUrls: ['./donate.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, TranslatePipe]
})
export class DonatePage {
  public i18n = inject(I18nService);
}
