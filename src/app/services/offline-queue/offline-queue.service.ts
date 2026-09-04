import { Injectable } from '@angular/core';
import { Database, ref, set } from 'firebase/database';

export interface QueuedWrite {
  id: string;
  path: string;
  data: unknown;
  queuedAt: string;
}

const STORAGE_KEY = 'csm-offline-write-queue';

/**
 * Coda di scritture "cieche" (set su un percorso gia' risolto, senza bisogno
 * di leggere prima lo stato esistente: es. salvare una nuova voce del diario
 * dell'umore) verso Firebase Realtime Database.
 *
 * Se il dispositivo e' offline, o la scrittura fallisce per un motivo di
 * rete, il dato non viene perso: viene salvato in questa coda su
 * localStorage (sopravvive a chiusura app/riavvio) e rispedito
 * automaticamente non appena il browser segnala la riconnessione
 * (evento 'online'), oppure al prossimo avvio dell'app se era offline
 * quando e' stata chiusa.
 *
 * Non e' pensata per operazioni di lettura-modifica-scrittura (es. aggiornare
 * un contatore, fare merge con un profilo esistente): quelle richiedono i
 * dati aggiornati dal server e non possono essere semplicemente riprovate
 * alla cieca senza rischiare di sovrascrivere modifiche fatte nel frattempo
 * da un altro dispositivo.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private db: Database | null = null;
  private flushing = false;

  constructor() {
    window.addEventListener('online', () => this.flushQueue());
  }

  /**
   * Collega l'istanza Database da usare per le sincronizzazioni. Va chiamato
   * una volta, subito dopo l'inizializzazione di Firebase (FirebaseService).
   */
  registerDatabase(db: Database): void {
    this.db = db;
    if (navigator.onLine) {
      // L'app potrebbe essere stata chiusa offline con scritture in coda:
      // appena Firebase e' pronto e siamo online, proviamo a sincronizzarle.
      // Il piccolo ritardo lascia il tempo all'autenticazione di stabilizzarsi
      // prima di scrivere sul database.
      setTimeout(() => this.flushQueue(), 1500);
    }
  }

  /**
   * Scrive subito se il dispositivo e' online; altrimenti (o se la scrittura
   * fallisce per un errore di rete) accoda il dato e ritorna comunque senza
   * lanciare errore, cosi' la UI puo' mostrare "salvato" da subito.
   */
  async writeOrQueue(db: Database, path: string, data: unknown): Promise<void> {
    if (!navigator.onLine) {
      this.enqueue(path, data);
      return;
    }
    try {
      await set(ref(db, path), data);
    } catch (err) {
      console.warn(`Scrittura Firebase fallita per "${path}", la accodo per riprovare online:`, err);
      this.enqueue(path, data);
    }
  }

  /** Quante scritture sono in attesa di essere sincronizzate. */
  pendingCount(): number {
    return this.readQueue().length;
  }

  /** Riprova, in ordine, tutte le scritture accodate. */
  async flushQueue(): Promise<void> {
    if (this.flushing || !this.db || !navigator.onLine) {
      return;
    }
    const queue = this.readQueue();
    if (queue.length === 0) {
      return;
    }

    this.flushing = true;
    const remaining: QueuedWrite[] = [];
    for (const item of queue) {
      try {
        await set(ref(this.db, item.path), item.data);
      } catch (err) {
        console.warn(`Sync differita ancora fallita per "${item.path}":`, err);
        remaining.push(item);
      }
    }
    this.writeQueueToStorage(remaining);
    this.flushing = false;
  }

  private enqueue(path: string, data: unknown): void {
    const queue = this.readQueue();
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      path,
      data,
      queuedAt: new Date().toISOString()
    });
    this.writeQueueToStorage(queue);
  }

  private readQueue(): QueuedWrite[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private writeQueueToStorage(queue: QueuedWrite[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Impossibile salvare la coda di scritture offline:', err);
    }
  }
}
