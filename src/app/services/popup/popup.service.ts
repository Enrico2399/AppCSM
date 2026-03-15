import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PopupService {
  // Stato della modale gestito tramite Signal per massima reattività
  isOpen = signal<boolean>(false);
  title = signal<string>('');
  description = signal<string>('');

  /**
   * Mostra un popup informativo
   * @param title Titolo della modale
   * @param message Messaggio descrittivo
   */
  showStatus(title: string, message: string) {
    this.title.set(title);
    this.description.set(message);
    this.isOpen.set(true);
  }

  /**
   * Chiude la modale attiva
   */
  close() {
    this.isOpen.set(false);
  }
}