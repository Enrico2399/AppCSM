import { Injectable } from '@angular/core';
import Chart from 'chart.js/auto';

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  constructor() { }

  /**
   * Crea o aggiorna un grafico Radar
   * @param canvasId ID dell'elemento canvas
   * @param labels Etichette del grafico
   * @param data Dati del grafico
   * @param label Etichetta del dataset
   * @returns L'istanza del grafico creato
   */
  createRadarChart(canvasId: string, labels: string[], data: number[], label: string = ''): Chart | null {
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!ctx) return null;

    const isLight = document.body.classList.contains('light-theme');
    const color = isLight ? '#555' : '#fff';
    const gridColor = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)';
    const bgColor = isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.2)';

    return new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: label,
          data: data,
          backgroundColor: bgColor,
          borderColor: '#3b82f6',
          pointBackgroundColor: '#3b82f6',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: gridColor },
            grid: { color: gridColor },
            pointLabels: { 
              color: color, 
              font: { size: 11, weight: 'bold' } 
            },
            ticks: { display: false, stepSize: 1 }
          }
        },
        plugins: {
          legend: { display: !!label }
        }
      }
    });
  }
}
