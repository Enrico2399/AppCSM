import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, LoadingController } from '@ionic/angular';
import { Geolocation, Position } from '@capacitor/geolocation';
import { FirebaseService } from '../../services/firebase/firebase';

export interface Resource {
  id: string;
  name: string;
  type: 'hotline' | 'center' | 'website' | 'app';
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  services: string[];
  hours: string;
  region: string;
  description?: string;
  distance?: number; // calculated dynamically
}

@Component({
  selector: 'app-resources',
  templateUrl: './resources.page.html',
  styleUrls: ['./resources.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ResourcesPage implements OnInit, OnDestroy {
  resources = signal<Resource[]>([]);
  filteredResources = signal<Resource[]>([]);
  userPosition = signal<Position | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filters
  selectedType = signal<string>('all');
  selectedRegion = signal<string>('all');
  searchTerm = signal<string>('');

  // Italian mental health resources
  private defaultResources: Resource[] = [
    {
      id: '1',
      name: 'Telefono Amico Italia',
      type: 'hotline',
      phone: '199 284 284',
      website: 'https://www.telefonoamico.it',
      services: ['Ascolto', 'Supporto emotivo', 'Prevenzione suicidio'],
      hours: '24/7',
      region: 'Nazionale',
      description: 'Servizio gratuito di ascolto e supporto psicologico'
    },
    {
      id: '2',
      name: 'Servizio Sanitario Nazionale - Numero Unico Emergenze',
      type: 'hotline',
      phone: '112',
      services: ['Emergenze mediche', 'Supporto psicologico urgente'],
      hours: '24/7',
      region: 'Nazionale',
      description: 'Numero unico per emergenze sanitarie e psicologiche'
    },
    {
      id: '3',
      name: 'CSM Treviso - Centro di Salute Mentale',
      type: 'center',
      phone: '0422 3111',
      address: 'Via Piazzola, 41 - 31100 Treviso',
      coordinates: { lat: 45.6679, lng: 12.2423 },
      services: ['Psichiatria', 'Psicoterapia', 'Consulenza'],
      hours: 'Lun-Ven 8:30-17:30',
      region: 'Veneto',
      description: 'Centro di salute mentale dell\'ULSS 2 Marca Trevigiana'
    },
    {
      id: '4',
      name: 'Ministero della Salute - Salute Mentale',
      type: 'website',
      website: 'https://www.salute.gov.it/saluteMentale',
      services: ['Informazioni', 'Risorse', 'Linee guida'],
      hours: '24/7',
      region: 'Nazionale',
      description: 'Portale nazionale con informazioni e risorse sulla salute mentale'
    },
    {
      id: '5',
      name: 'Unione Nazionale Consumatori - Supporto Psicologico',
      type: 'hotline',
      phone: '02 6961 922',
      services: ['Consulenza psicologica', 'Supporto legale'],
      hours: 'Lun-Ven 9:00-18:00',
      region: 'Nazionale',
      description: 'Supporto psicologico per consumatori e cittadini'
    },
    {
      id: '6',
      name: 'CSM Venezia - Centro di Salute Mentale',
      type: 'center',
      phone: '041 2747 111',
      address: 'Via G. D\'Annunzio, 18 - 30174 Mestre VE',
      coordinates: { lat: 45.4955, lng: 12.2366 },
      services: ['Psichiatria', 'Psicoterapia', 'Urgenze'],
      hours: '24/7 urgenze, Lun-Ven 8:30-17:30 ambulatorio',
      region: 'Veneto',
      description: 'Centro di salute mentale per l\'area di Venezia'
    }
  ];

  constructor(
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.loadResources();
    this.getUserLocation();
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  private async loadResources() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load from Firebase first, fallback to default resources
      const firebaseResources = await this.loadFirebaseResources();
      const allResources = firebaseResources.length > 0 ? firebaseResources : this.defaultResources;
      
      this.resources.set(allResources);
      this.applyFilters();
    } catch (error) {
      console.error('Error loading resources:', error);
      this.resources.set(this.defaultResources);
      this.applyFilters();
    } finally {
      this.loading.set(false);
    }
  }

  private async loadFirebaseResources(): Promise<Resource[]> {
    // For now, return empty array to use default resources
    // In a real implementation, this would load from Firebase
    return new Promise((resolve) => {
      setTimeout(() => resolve([]), 100);
    });
  }

  private async getUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      });
      
      this.userPosition.set(position);
      this.calculateDistances();
    } catch (error) {
      console.log('Geolocation not available or denied:', error);
      // Continue without location
    }
  }

  private calculateDistances() {
    const position = this.userPosition();
    if (!position) return;

    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    const resourcesWithDistance = this.resources().map(resource => {
      if (resource.coordinates) {
        const distance = this.calculateDistance(
          userLat, userLng,
          resource.coordinates.lat, resource.coordinates.lng
        );
        return { ...resource, distance };
      }
      return resource;
    });

    this.resources.set(resourcesWithDistance);
    this.applyFilters();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  async refreshLocation() {
    const loading = await this.loadingCtrl.create({
      message: 'Aggiornamento posizione...'
    });
    await loading.present();

    try {
      await this.getUserLocation();
      await loading.dismiss();
    } catch (error) {
      await loading.dismiss();
      this.showError('Impossibile ottenere la posizione');
    }
  }

  applyFilters() {
    let filtered = [...this.resources()];

    // Filter by type
    if (this.selectedType() !== 'all') {
      filtered = filtered.filter(r => r.type === this.selectedType());
    }

    // Filter by region
    if (this.selectedRegion() !== 'all') {
      filtered = filtered.filter(r => r.region === this.selectedRegion());
    }

    // Filter by search term
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(search) ||
        r.services.some(s => s.toLowerCase().includes(search)) ||
        r.description?.toLowerCase().includes(search)
      );
    }

    // Sort by distance if available
    if (this.userPosition()) {
      filtered.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });
    }

    this.filteredResources.set(filtered);
  }

  onTypeChange(event: any) {
    this.selectedType.set(event.detail.value);
    this.applyFilters();
  }

  onRegionChange(event: any) {
    this.selectedRegion.set(event.detail.value);
    this.applyFilters();
  }

  onSearchChange(event: any) {
    this.searchTerm.set(event.target.value);
    this.applyFilters();
  }

  async callPhone(phone: string) {
    const alert = await this.alertCtrl.create({
      header: 'Chiama Numero',
      message: `Vuoi chiamare ${phone}?`,
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Chiama',
          handler: () => {
            window.open(`tel:${phone}`, '_system');
          }
        }
      ]
    });
    await alert.present();
  }

  openWebsite(url: string) {
    window.open(url, '_system');
  }

  openEmail(email: string) {
    window.open(`mailto:${email}`, '_system');
  }

  openMaps(resource: Resource) {
    if (resource.coordinates) {
      const url = `https://www.google.com/maps/search/?api=1&query=${resource.coordinates.lat},${resource.coordinates.lng}`;
      window.open(url, '_system');
    } else if (resource.address) {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`;
      window.open(url, '_system');
    }
  }

  getUniqueRegions(): string[] {
    const regions = [...new Set(this.resources().map(r => r.region))];
    return ['all', ...regions.sort()];
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      hotline: 'call-outline',
      center: 'location-outline',
      website: 'globe-outline',
      app: 'phone-portrait-outline'
    };
    return icons[type] || 'help-outline';
  }

  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      hotline: 'danger',
      center: 'primary',
      website: 'secondary',
      app: 'tertiary'
    };
    return colors[type] || 'medium';
  }

  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }

  private async showError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Errore',
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  goBack() {
    this.navCtrl.back();
  }
}
