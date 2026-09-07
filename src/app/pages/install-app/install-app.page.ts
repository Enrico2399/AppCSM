import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { I18nService } from '../../services/i18n/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { InstallPromptService } from '../../services/install-prompt/install-prompt.service';

/**
 * Pagina dedicata per installare l'app, al posto del pop-up/overlay
 * fluttuante usato prima: quest'ultimo non risultava visibile in modo
 * affidabile durante il download (probabile occlusione da parte del
 * dialogo nativo del browser, e/o completamento troppo rapido di
 * primeOfflineCache() per essere percepito). Una pagina intera invece
 * mostra la barra di progresso stabilmente, e il pulsante "Installa ora"
 * qui sopra garantisce comunque un gesto utente "fresco" appena prima di
 * chiamare install() (necessario perche' il browser accetti il prompt
 * nativo), esattamente come faceva il banner.
 *
 * Raggiungibile sia dal banner spontaneo (install-prompt.component) sia
 * dalla voce di menu "Scarica App" nella navbar: entrambi ora si limitano
 * a portare qui, la logica vera resta unica in InstallPromptService.
 */
@Component({
  selector: 'app-install-app-page',
  templateUrl: './install-app.page.html',
  styleUrls: ['./install-app.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule, TranslatePipe]
})
export class InstallAppPage {
  public i18n = inject(I18nService);
  public installService = inject(InstallPromptService);
  private router = inject(Router);

  /**
   * "Apri App": non esiste un'API web per far aprire dalla pagina l'icona
   * gia' installata come finestra separata (nessun browser la offre in modo
   * affidabile) - qui continuiamo semplicemente nella scheda corrente, che
   * e' gia' autenticata con lo stesso account (stessa origine, stesso
   * storage del browser: vedi install-prompt.service.ts).
   */
  openApp() {
    this.router.navigate(['/home']);
  }
}
