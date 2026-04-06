import { TableView } from './tableView.js';
import { ChartView } from './chartView.js';

const resultsSection = document.getElementById('results');
const errorMsg = document.getElementById('errorMsg');

export const UIView = {
    init() {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        
        // Verificar preferencia guardada o sistema
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            themeIcon.innerText = '☀️';
        }

        themeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            themeIcon.innerText = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Re-renderizar gráfico si existe para actualizar colores
            const canvas = document.getElementById('mainChart');
            if (canvas && !canvas.parentElement.classList.contains('hidden')) {
                 // Disparar un pequeño delay para que la transición de colores se note menos brusca
                 setTimeout(() => {
                    const event = new CustomEvent('themeChanged');
                    window.dispatchEvent(event);
                 }, 100);
            }
        });
    },

    mostrarError(mensaje) {
        errorMsg.innerHTML = `<div class="flex items-center gap-3"><span class="text-2xl">⚠️</span> <div><strong class="block">Error de Validación</strong>${mensaje}</div></div>`;
        errorMsg.classList.remove('hidden');
        errorMsg.classList.add('animate-fade-in-up');
        resultsSection.classList.add('hidden');
    },

    ocultarError() {
        errorMsg.classList.add('hidden');
    },

    limpiar() {
        this.ocultarError();
        resultsSection.innerHTML = '';
        resultsSection.classList.add('hidden');
        ChartView.clearChart();
    },

    parseMarkdown(text) {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
    },

    _renderCore(titulo, configuracion) {
        this.ocultarError();
        const { concepto, formula, formulaHtml: formulaHtmlConfig, pasos, tablas, resultado, resultadoLabel, datosGrafico, numIntermedios, interpretacionHtml, operacionesGeneralesHtml } = configuracion;

        let pasosHtml = '';
        if (pasos && pasos.length > 0) {
            pasosHtml = `
                <div class="space-y-4">
                    <h4 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-8 h-[1px] bg-slate-200 dark:bg-slate-700"></span> Desarrollo paso a paso
                    </h4>
                    <ul class="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">
                        ${pasos.map((p, i) => `
                            <li class="flex gap-4 items-start group">
                                <span class="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110">${i+1}</span> 
                                <span class="text-slate-700 dark:text-slate-300 pt-1 leading-relaxed">${this.parseMarkdown(p)}</span>
                            </li>`).join('')}
                    </ul>
                </div>`;
        }
        
        let tablasHtml = '';
        if (tablas && tablas.length > 0) {
            tablasHtml = `<div class="mt-10 animate-fade-in-up" style="animation-delay: 200ms">${tablas.map(t => TableView.buildTable(t)).join('')}</div>`;
        }

        let intermediosHtml = '';
        if (numIntermedios) {
            const keys = Object.keys(numIntermedios);
            if (keys.length > 0) {
                const lis = keys.map(k => `
                    <div class="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                        <span class="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-bold block mb-1 tracking-tighter">${k}</span>
                        <span class="text-indigo-600 dark:text-indigo-400 font-bold text-lg">${numIntermedios[k]}</span>
                    </div>`).join('');
                intermediosHtml = `
                <div class="space-y-4">
                    <h4 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-8 h-[1px] bg-slate-200 dark:bg-slate-700"></span> Resultados Intermedios
                    </h4>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        ${lis}
                    </div>
                </div>`;
            }
        }

        let formulaHtml = '';
        if (formulaHtmlConfig) {
            formulaHtml = `
                <div class="space-y-4">
                    <h4 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-8 h-[1px] bg-slate-200 dark:bg-slate-700"></span> Expresión Matemática
                    </h4>
                    <div class="inline-block bg-slate-900 dark:bg-black p-8 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-800/50 relative group overflow-hidden min-w-[200px]">
                        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="relative z-10">${formulaHtmlConfig}</div>
                    </div>
                </div>`;
        } else if (formula) {
            formulaHtml = `
                <div class="space-y-4">
                    <h4 class="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-8 h-[1px] bg-slate-200 dark:bg-slate-700"></span> Expresión Matemática
                    </h4>
                    <div class="inline-block bg-slate-900 dark:bg-black text-emerald-400 font-mono text-lg px-8 py-5 rounded-2xl shadow-xl border border-slate-800 dark:border-slate-800/50 relative group overflow-hidden">
                        <div class="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span class="relative z-10">${formula.replace(/\n/g, '<br/>')}</span>
                    </div>
                </div>`;
        }

        const html = `
        <div class="glass-card overflow-hidden animate-fade-in-up dark:bg-slate-900/80">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 relative overflow-hidden">
                <div class="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <h3 class="text-3xl font-extrabold text-white flex items-center gap-4 drop-shadow-md">
                        <span class="p-3 bg-white/20 rounded-2xl backdrop-blur-md">🎯</span> 
                        ${titulo}
                    </h3>
                    ${formulaHtmlConfig ? `
                        <div class="bg-black/20 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-inner animate-fade-in">
                            ${formulaHtmlConfig}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <div class="p-6 md:p-10 space-y-12">
                <!-- Concepto -->
                <div class="bg-indigo-50/50 dark:bg-indigo-900/30 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-500/30 shadow-sm relative group">
                    <div class="absolute right-6 top-6 text-indigo-200 dark:text-indigo-800/50 text-5xl opacity-40 group-hover:scale-110 transition-transform">📖</div>
                    <h4 class="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em] mb-3">Marco Teórico</h4>
                    <p class="text-slate-800 dark:text-slate-100 leading-relaxed font-medium text-lg pr-12">${concepto}</p>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div class="space-y-10">
                        ${formulaHtml}
                        ${pasosHtml}
                    </div>
                    <div class="space-y-10">
                        ${numIntermedios ? intermediosHtml : ''}
                        ${operacionesGeneralesHtml || ''}
                        ${interpretacionHtml || ''}
                    </div>
                </div>

                ${tablasHtml}

                <!-- Gráfico Chart.js -->
                <div id="chartContainer" class="hidden w-full max-w-3xl mx-auto mt-12 mb-6 p-6 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-premium">
                    <div class="chart-container-premium">
                        <canvas id="mainChart"></canvas>
                    </div>
                </div>

                <!-- Resultado Final -->
                <div class="mt-12 p-1 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 rounded-[2.5rem] shadow-2xl animate-pulse-subtle">
                    <div class="bg-white dark:bg-slate-900 rounded-[2.4rem] p-10 text-center relative overflow-hidden group">
                        <div class="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
                        <h4 class="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] mb-6 relative z-10">Conclusión Estadística</h4>
                        <div class="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-4 relative z-10 tracking-tight">
                            ${resultado.replace(/\n/g, '<br/>')}
                        </div>
                        <div class="text-lg font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest relative z-10">${resultadoLabel}</div>
                        <div class="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-tighter">
                            <span>✨</span> Cálculo completado exitosamente
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

        resultsSection.innerHTML = html;
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Chart
        if (datosGrafico) {
            const canvas = document.getElementById('mainChart');
            ChartView.renderChart(canvas, datosGrafico);
            document.getElementById('chartContainer').classList.remove('hidden');
        } else {
            ChartView.clearChart();
        }
    },

    renderizarResultado(titulo, resObj) {
        this._renderCore(titulo, {
            concepto: resObj.concepto,
            formula: resObj.formula,
            pasos: resObj.pasos,
            tablas: resObj.tablas,
            resultado: resObj.resultado,
            resultadoLabel: resObj.resultadoLabel,
            datosGrafico: resObj.datosGrafico
        });
    },

    renderDetallado(titulo, resObj) {
        this._renderCore(titulo, {
            concepto: resObj.concepto,
            formula: resObj.formula,
            formulaHtml: resObj.formulaHtml,
            pasos: resObj.detallado.pasos,
            tablas: resObj.detallado.tablas,
            resultado: resObj.resultado,
            resultadoLabel: resObj.resultadoLabel,
            numIntermedios: resObj.resultadosIntermedios,
            interpretacionHtml: resObj.interpretacionHtml,
            operacionesGeneralesHtml: resObj.detallado.operacionesGeneralesHtml,
            datosGrafico: resObj.datosGrafico
        });
    },

    renderResumen(titulo, resObj) {
        this._renderCore(titulo, {
            concepto: resObj.concepto,
            formula: resObj.formula,
            pasos: resObj.resumen.pasos || [],
            tablas: resObj.resumen.tablas,
            resultado: resObj.resultado,
            resultadoLabel: resObj.resultadoLabel,
            interpretacionHtml: resObj.interpretacionHtml,
            operacionesGeneralesHtml: resObj.resumen.operacionesGeneralesHtml,
            datosGrafico: resObj.datosGrafico
        });
    },

    /**
     * Renderiza botones para cada columna encontrada en el Excel/CSV
     * @param {Object} columnsData Map de { colName: [values] }
     * @param {Function} onSelect Callback (colName, values)
     */
    renderizarSelectorColumnas(columnsData, onSelect) {
        const container = document.getElementById('excelColumnSelector');
        const buttonsDiv = document.getElementById('columnButtons');
        const btnVerExcel = document.getElementById('btnVerExcel');
        
        buttonsDiv.innerHTML = '';
        container.classList.remove('hidden');
        if (btnVerExcel) btnVerExcel.classList.remove('hidden');

        Object.keys(columnsData).forEach(colName => {
            const btn = document.createElement('button');
            btn.className = "px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2 group";
            
            const count = columnsData[colName].length;
            btn.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-indigo-400 group-hover:bg-indigo-600"></span>
                ${colName} 
                <span class="bg-indigo-50 dark:bg-indigo-900/40 text-[10px] px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-medium">${count} datos</span>
            `;
            
            btn.addEventListener('click', () => {
                // Desmarcar otros
                Array.from(buttonsDiv.children).forEach(b => b.classList.remove('border-indigo-600', 'ring-2', 'ring-indigo-100'));
                // Marcar este
                btn.classList.add('border-indigo-600', 'ring-2', 'ring-indigo-100');
                
                onSelect(colName, columnsData[colName]);
            });
            
            
            buttonsDiv.appendChild(btn);
        });
    },

    /**
     * Renderiza una tabla estilo Excel en el modal
     * @param {Array} rawData Arreglo de objetos (filas)
     * @param {Object} columnsData Map de { colName: [values] }
     * @param {Function} onSelect Callback (colName, values)
     */
    renderizarTablaExcel(rawData, columnsData, onSelect) {
        const container = document.getElementById('modalTableContainer');
        const columns = Object.keys(rawData[0]);
        
        let html = `
            <table class="min-w-full bg-white dark:bg-slate-900 border-collapse border border-slate-200 dark:border-slate-800 text-xs shadow-sm">
                <thead>
                    <tr class="bg-slate-100 dark:bg-slate-800">
                        <th class="border border-slate-200 dark:border-slate-700 p-2 text-slate-400 w-10">#</th>
                        ${columns.map(col => `
                            <th class="border border-slate-200 dark:border-slate-700 p-0 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer group" data-col="${col}">
                                <div class="flex flex-col p-3 gap-1">
                                    <span class="text-[10px] text-indigo-500 font-black uppercase text-center block opacity-50 group-hover:opacity-100">Cargar Columna</span>
                                    <span class="text-slate-800 dark:text-slate-100 font-bold text-center">${col}</span>
                                </div>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${rawData.slice(0, 100).map((row, i) => `
                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td class="border border-slate-200 dark:border-slate-700 p-2 text-center bg-slate-50 dark:bg-slate-800/50 font-mono text-slate-400">${i + 1}</td>
                            ${columns.map(col => `
                                <td class="border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-400">${row[col] !== undefined ? row[col] : ''}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        if (rawData.length > 100) {
            html += `<div class="p-4 text-center text-slate-500 text-[10px] italic">Mostrando las primeras 100 filas de ${rawData.length}...</div>`;
        }

        container.innerHTML = html;

        // Añadir eventos a los encabezados
        container.querySelectorAll('th[data-col]').forEach(th => {
            th.addEventListener('click', () => {
                const colName = th.getAttribute('data-col');
                if (columnsData[colName]) {
                    onSelect(colName, columnsData[colName]);
                    
                    // Efecto de feedback en el modal
                    th.classList.add('bg-indigo-100', 'dark:bg-indigo-900');
                    setTimeout(() => th.classList.remove('bg-indigo-100', 'dark:bg-indigo-900'), 500);
                }
            });
        });
    }
};
