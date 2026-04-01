/**
 * chartView.js — Integración con Chart.js
 */

let currentChart = null;

export const ChartView = {
    /**
     * Renderiza un gráfico configurado en un canvas específico
     * @param {HTMLCanvasElement} canvas - Referencia al elemento canvas
     * @param {Object} config - Configuración { type, labels, data, label }
     */
    renderChart(canvas, config) {
        if (!canvas) return;

        // Destruir el gráfico anterior si existe para evitar superposición
        if (currentChart) {
            currentChart.destroy();
        }

        const hasData = config && config.data && config.data.length > 0;
        const hasDatasets = config && config.datasets && config.datasets.length > 0;

        if (!hasData && !hasDatasets) {
            canvas.parentElement.classList.add('hidden');
            return;
        }

        canvas.parentElement.classList.remove('hidden');

        const isDark = document.body.classList.contains('dark') || document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

        // Determinar colores basados en el tipo
        const bgColors = config.type === 'pie' || config.type === 'doughnut'
            ? config.labels.map((_, i) => `hsla(${(i * 360) / config.labels.length}, 70%, 60%, 0.8)`)
            : 'rgba(99, 102, 241, 0.7)'; // Indigo-500 optimized

        const borderColors = config.type === 'pie' || config.type === 'doughnut'
            ? '#ffffff'
            : 'rgba(99, 102, 241, 1)';

        currentChart = new Chart(canvas, {
            type: config.type,
            plugins: [ChartDataLabels], // Registrar plugin de etiquetas
            data: {
                labels: config.labels,
                datasets: config.datasets ? config.datasets.map(ds => ({
                    ...ds,
                    borderRadius: 8,
                    borderWidth: 2,
                    tension: 0.4
                })) : [{
                    label: config.label || 'Valor',
                    data: config.data,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 2,
                    borderRadius: 8,
                    tension: config.type === 'line' ? 0.4 : 0,
                    fill: config.type === 'line' ? 'start' : false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: config.type === 'pie' || config.type === 'doughnut',
                        position: 'bottom',
                        labels: { color: textColor, font: { family: "'Outfit', sans-serif", size: 12 } }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#ffffff',
                        titleColor: isDark ? '#f1f5f9' : '#1e293b',
                        bodyColor: isDark ? '#94a3b8' : '#64748b',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: true
                    },
                    datalabels: {
                        display: config.type === 'pie' || config.type === 'doughnut',
                        color: '#fff',
                        font: {
                            family: "'Outfit', sans-serif",
                            weight: 'bold',
                            size: 14
                        },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        },
                        textShadowColor: 'rgba(0, 0, 0, 0.5)',
                        textShadowBlur: 4
                    }
                },
                scales: (config.type !== 'pie' && config.type !== 'doughnut') ? {
                    y: { 
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { family: "'Outfit', sans-serif" } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: "'Outfit', sans-serif" } }
                    }
                } : {}
            }
        });
    },

    clearChart() {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
    }
};
