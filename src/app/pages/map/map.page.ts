import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject, signal, effect } from '@angular/core';
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase/firebase';
import { Router } from '@angular/router';
import { AlertController, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';
import * as L from 'leaflet';

interface MapReport {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: 'urgent' | 'info' | 'success';
  description: string;
}

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
  standalone: true,
  imports: [CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, 
    IonButton, IonContent, IonFab, IonFabButton, IonIcon
  ]
})
export class MapPage implements OnDestroy {
  map!: L.Map;
  markerGroup = L.layerGroup();
  
  private alertCtrl = inject(AlertController);
  public auth = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private router = inject(Router);

  // Signals for state management
  reports = signal<MapReport[]>([]);
  
  selectedCategories = signal<string[]>(['all']);

  private unsubscribeReports: (() => void) | null = null;

  constructor() {
    addIcons({ add });

    // Reactive effect to update markers when categories change
    effect(() => {
      if (this.map) {
        this.renderMarkers();
      }
    });
  }

  ionViewDidEnter() {
    this.initMap();
    this.loadReports();
  }

  loadReports() {
    if (this.unsubscribeReports) this.unsubscribeReports();
    this.unsubscribeReports = this.firebaseService.listenToMapReports((data) => {
      if (data) {
        this.reports.set(Object.values(data));
      } else {
        this.reports.set([]);
      }
    });
  }

  initMap() {
    if (this.map) return;

    this.map = L.map('map', {
      center: [45.6661, 12.2444],
      zoom: 14,
      zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO'
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomleft' }).addTo(this.map);
    this.markerGroup.addTo(this.map);
    
    this.renderMarkers();
  }

  renderMarkers() {
    this.markerGroup.clearLayers();
    const categories = this.selectedCategories();
    
    const filteredReports = this.reports().filter(report => 
      categories.includes('all') || categories.includes(report.category)
    );

    filteredReports.forEach(report => {
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="custom-marker ${report.category}">${this.getCategoryEmoji(report.category)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([report.lat, report.lng], { icon });
      marker.bindPopup(`
        <div style="color: #333;">
          <h3 style="margin: 0 0 5px 0;">${report.title}</h3>
          <p style="margin: 0;">${report.description}</p>
        </div>
      `);
      this.markerGroup.addLayer(marker);
    });
  }

  getCategoryEmoji(category: string): string {
    switch(category) {
      case 'urgent': return '🆘';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '📍';
    }
  }

  toggleCategory(category: string) {
    this.selectedCategories.update(current => {
      if (category === 'all') return ['all'];
      
      let next = current.filter(c => c !== 'all');
      if (next.includes(category)) {
        next = next.filter(c => c !== category);
        if (next.length === 0) return ['all'];
      } else {
        next.push(category);
      }
      return next;
    });
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories().includes(category);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/home']);
  }

  // sostituire aggiungiSegnalazione():
  async aggiungiSegnalazione() {
    const alert = await this.alertCtrl.create({
      header: 'Nuova Segnalazione',
      inputs: [
        { name: 'title', type: 'text', placeholder: 'Titolo' },
        { name: 'description', type: 'text', placeholder: 'Descrizione' },
        { name: 'category', type: 'radio', label: '🆘 Urgente', value: 'urgent' },
        { name: 'category', type: 'radio', label: 'ℹ️ Info', value: 'info', checked: true },
        { name: 'category', type: 'radio', label: '✅ Successo', value: 'success' }
      ],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Aggiungi', handler: (data) => {
            const hint = document.createElement('div');
            hint.id = 'map-hint';
            hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.75);color:white;padding:10px 20px;border-radius:20px;z-index:9999;font-size:0.9rem;';
            hint.textContent = '📍 Tocca la mappa per posizionare la segnalazione';
            document.body.appendChild(hint);

            this.map.once('click', (e: L.LeafletMouseEvent) => {
              document.getElementById('map-hint')?.remove();
              const newReport = {
                lat: e.latlng.lat,
                lng: e.latlng.lng,
                title: data.title || 'Nuova segnalazione',
                category: data.category || 'info',
                description: data.description || ''
              };
              this.firebaseService.sendMapReport(newReport);
            });
          }
        }
      ]
    });
    await alert.present();
  }

  ngOnDestroy() {
    if (this.unsubscribeReports) {
      this.unsubscribeReports();
    }
    if (this.map) {
      this.map.remove();
    }
  }
}
