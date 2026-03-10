import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonIcon } from '@ionic/angular/standalone';
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
export class MapPage implements OnInit, OnDestroy {
  map!: L.Map;
  markerGroup = L.layerGroup();
  
  public auth = inject(AuthService);
  private router = inject(Router);

  // Signals for state management
  reports = signal<MapReport[]>([
    { id: '1', lat: 45.6661, lng: 12.2444, title: 'Sede CSM', category: 'info', description: 'Centro di ascolto principale' },
    { id: '2', lat: 45.6680, lng: 12.2500, title: 'Segnalazione Critica', category: 'urgent', description: 'Richiesto intervento immediato' },
    { id: '3', lat: 45.6640, lng: 12.2400, title: 'Supporto Completato', category: 'success', description: 'Caso risolto con successo' }
  ]);
  
  selectedCategories = signal<string[]>(['all']);

  constructor() {
    addIcons({ add });

    // Reactive effect to update markers when categories change
    effect(() => {
      if (this.map) {
        this.renderMarkers();
      }
    });
  }

  ngOnInit() {}

  ionViewDidEnter() {
    this.initMap();
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

  aggiungiSegnalazione() {
    console.log("Funzione per aggiungere segnalazione attivata");
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}