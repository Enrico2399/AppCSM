import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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

  /**
   * URL per il pulsante "Apri App": un <a href> vero e proprio (non
   * routerLink, che farebbe solo un cambio di vista Angular senza una
   * navigazione reale del browser). Chrome 139+ su desktop e le versioni
   * recenti su Android possono intercettare una navigazione autentica come
   * questa e aprirla nella finestra dell'app gia' installata invece che
   * nella scheda del browser, quando l'URL rientra nello scope del
   * manifest (vedi "launch_handler" in manifest.json) - ma e' una
   * decisione del browser, non qualcosa che questa pagina possa forzare:
   * sui browser che non lo supportano ancora, il link ricarica semplicemente
   * la pagina in questa stessa scheda (comunque gia' autenticata con lo
   * stesso account, vedi installApp.openAppHint qui sotto).
   */
  get appHomeUrl(): string {
    return new URL('home', document.baseURI).href;
  }
}
