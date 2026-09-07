import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { NetworkStatusService } from '../../services/network-status/network-status.service';

/**
 * Piccola barra fissa in cima allo schermo, visibile solo quando il
 * dispositivo e' offline: dice subito quali funzioni non sono disponibili
 * (login, registrazione, voto roadmap - richiedono di leggere prima lo
 * stato attuale da Firebase) e rassicura sul resto (diario, community,
 * mappa, consensi, grounding), che invece viene salvato sul dispositivo e
 * sincronizzato in automatico da OfflineQueueService appena la connessione
 * torna disponibile, senza bisogno di rifare nulla manualmente.
 */
@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss']
})
export class OfflineIndicatorComponent {
  networkStatus = inject(NetworkStatusService);
}
