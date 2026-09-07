import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { InstallPromptService } from '../../services/install-prompt/install-prompt.service';

/**
 * Banner "installa l'app", visibile (non un semplice pallino nella barra
 * degli indirizzi): su Android/Chrome/Edge intercetta l'evento nativo
 * 'beforeinstallprompt' e offre un bottone "Installa"; su iOS Safari, che
 * non genera quell'evento, mostra le istruzioni manuali (Condividi > Aggiungi
 * alla schermata Home). Non compare mai se l'app e' gia' installata (rilevato
 * da display-mode: standalone), e ricompare "ogni tanto" (non ad ogni
 * apertura): la prima volta solo dopo la primissima sessione, poi al massimo
 * ogni 7 giorni se l'utente non l'ha ancora installata.
 *
 * Lo stato e la logica vivono in InstallPromptService (condiviso con la
 * voce di menu "Scarica App" nella navbar): questo componente e' solo la
 * vista del banner spontaneo.
 */
@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './install-prompt.component.html',
  styleUrls: ['./install-prompt.component.scss']
})
export class InstallPromptComponent {
  installService = inject(InstallPromptService);
}
