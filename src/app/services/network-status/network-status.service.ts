import { Injectable, signal } from '@angular/core';

/**
 * Stato online/offline del browser, come signal reattivo (navigator.onLine
 * da solo non notifica i cambiamenti: va combinato con gli eventi 'online'
 * e 'offline' della finestra). Usato dall'indicatore globale "Sei offline"
 * (offline-indicator.component, montato in app.component.html) cosi' come
 * da qualunque altro punto dell'app che debba reagire in tempo reale al
 * cambio di connessione, invece di limitarsi a leggere navigator.onLine
 * una tantum al momento del click (come fanno le guardie in roadmap.page.ts
 * e profile.page.ts, dove basta un controllo puntuale).
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  isOnline = signal(navigator.onLine);

  private onOnline = () => this.isOnline.set(true);
  private onOffline = () => this.isOnline.set(false);

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }
}
