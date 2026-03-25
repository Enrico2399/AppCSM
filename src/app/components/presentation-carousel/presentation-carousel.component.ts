import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import Swiper from 'swiper';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

@Component({
  selector: 'app-presentation-carousel',
  templateUrl: './presentation-carousel.component.html',
  styleUrls: ['./presentation-carousel.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class PresentationCarouselComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('swiperContainer') swiperContainer!: { nativeElement: HTMLElement };
  private swiper: Swiper | null = null;
  
  currentSlide = 0;
  totalSlides = 7; // Ridotto da 8 a 7 (rimossa slide business)
  
  // Dati per le slide semplificati
  featuresData = [
    { icon: 'finger-print', title: 'Accesso Facile', description: 'Entra subito in modo anonimo o crea il tuo profilo personale in totale sicurezza.' },
    { icon: 'analytics', title: 'Diario Emozioni', description: 'Traccia il tuo stato d\'animo quotidiano e visualizza i tuoi progressi nel tempo.' },
    { icon: 'person-circle', title: 'Profilo Personale', description: 'Gestisci le tue preferenze e visualizza le statistiche del tuo percorso di benessere.' },
    { icon: 'shield-half', title: 'Privacy Protetta', description: 'I tuoi dati sono al sicuro con protezione GDPR e controllo totale sulla tua privacy.' },
    { icon: 'chatbubbles', title: 'Community', description: 'Condividi esperienze in un ambiente sicuro e ricevi supporto da altri utenti.' },
    { icon: 'headphones', title: 'Audio Guidati', description: 'Ascolta meditazioni ed esercizi di respirazione per ritrovare il benessere.' }
  ];
  
  frontendTech = [
    'Angular 20',
    'Ionic 8',
    'TypeScript',
    'Chart.js'
  ];
  
  backendTech = [
    'Firebase Database',
    'Firebase Auth',
    'Firebase Hosting',
    'Cloud Functions'
  ];
  
  devopsTech = [
    'Capacitor',
    'PWA Support',
    'Lazy Loading',
    'Auto Deploy'
  ];
  
  metricsData = [
    { icon: 'cube', value: '316 KB', label: 'Dimensione App' },
    { icon: 'flash', value: '~11s', label: 'Tempo Build' },
    { icon: 'stopwatch', value: '<2s', label: 'Caricamento' },
    { icon: 'trending-up', value: '95+', label: 'Performance' }
  ];
  
  engagementData = [
    { value: '1,000+', label: 'Utenti Attivi' },
    { value: '5+ min', label: 'Sessione Media' },
    { value: '80%+', label: 'Utilizzo Funzioni' },
    { value: '60%+', label: 'Ritorno Utenti' }
  ];
  
  complianceData = [
    'Conforme al GDPR',
    'Sicurezza Firebase',
    'Controllo Dati Personali'
  ];
  
  roadmapData = [
    {
      quarter: 'Q2',
      title: 'Aprile-Giugno 2026',
      features: [
        { icon: 'notifications', name: 'Notifiche Push' },
        { icon: 'headphones', name: 'Audio Streaming' },
        { icon: 'brain', name: 'Insights Personalizzati' },
        { icon: 'language', name: 'Altre Lingue' }
      ]
    },
    {
      quarter: 'Q3',
      title: 'Luglio-Settembre 2026',
      features: [
        { icon: 'logo-apple-appstore', name: 'App Store e Play Store' },
        { icon: 'watch', name: 'Supporto Smartwatch' },
        { icon: 'mic', name: 'Comandi Vocali' },
        { icon: 'heart-pulse', name: 'Integrazione Salute' }
      ]
    },
    {
      quarter: 'Q4',
      title: 'Ottobre-Dicembre 2026',
      features: [
        { icon: 'person', name: 'Dashboard Professionisti' },
        { icon: 'videocam', name: 'Supporto Video' },
        { icon: 'link', name: 'Condivisione Dati' },
        { icon: 'sparkles', name: 'Raccomandazioni AI' }
      ]
    }
  ];
  
  competitors = [
    { name: 'App di Meditazione', color: '#ff6b6b', description: 'A pagamento • Privacy limitata' },
    { name: 'App Locali', color: '#f1c40f', description: 'Funzioni base • Nessuna community' },
    { name: '✓ CSM App', color: '#4ecdc4', description: 'Gratuita • Privacy prima di tutto • Community attiva' }
  ];
  
  uspData = [
    '🌟 Privacy Italiana',
    '🤖 Intelligenza Artificiale',
    '👥 Community Support',
    '🎓 Contenuti Verificati',
    '🧩 Open Source'
  ];
  
  ngOnInit() {
    // Forza il rendering delle slide dopo l'inizializzazione
    setTimeout(() => {
      this.forceUpdate();
    }, 200);
  }

  ngOnDestroy() {
    if (this.swiper) {
      this.swiper.destroy();
    }
  }

  forceUpdate() {
    if (this.swiper) {
      this.swiper.update();
      this.swiper.updateSize();
      this.swiper.updateSlides();
      this.swiper.updateProgress();
      this.swiper.updateSlidesClasses();
    }
  }

  ngAfterViewInit() {
    if (this.swiperContainer && this.swiperContainer.nativeElement) {
      this.swiper = new Swiper(this.swiperContainer.nativeElement, {
        modules: [Navigation, Pagination, Autoplay],
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
          delay: 5000,
          disableOnInteraction: false,
        },
        pagination: {
          el: '.swiper-pagination',
          clickable: true,
          type: 'bullets' as const,
        },
        navigation: {
          nextEl: '.next-button',
          prevEl: '.prev-button',
        },
        allowTouchMove: true,
        touchEventsTarget: 'wrapper',
        grabCursor: true,
        on: {
          slideChange: (swiper: Swiper) => {
            this.currentSlide = swiper.realIndex;
            console.log('Slide changed to:', this.currentSlide);
          },
          init: (swiper: Swiper) => {
            console.log('Swiper initialized with', swiper.slides.length, 'slides');
            // Forza il caricamento di tutte le slide
            setTimeout(() => {
              swiper.update();
            }, 100);
          }
        }
      });
    }
  }

  goToSlide(index: number) {
    if (this.swiper) {
      this.swiper.slideToLoop(index);
    }
  }

  goToPrevious() {
    if (this.swiper) {
      this.swiper.slideToLoop(this.getPreviousSlideIndex());
    }
  }

  goToNext() {
    if (this.swiper) {
      this.swiper.slideToLoop(this.getNextSlideIndex());
    }
  }

  getPreviousSlideIndex(): number {
    return (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
  }

  getNextSlideIndex(): number {
    return (this.currentSlide + 1) % this.totalSlides;
  }
}
