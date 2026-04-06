import { EstadisticaModel } from '../models/estadisticaModel.js';
import { UIView } from '../views/uiView.js';
import { parseData, mean, stdDev, variance } from '../utils/helpers.js';
import { ExcelService } from '../utils/excelService.js';

const MODULES_NO_DATA = [
    'muestreo_simple', 'muestreo_sistematico',
    'muestreo_estratificado', 'muestreo_conglomerados',
    'var_discreta', 'var_continua'
];

export const AppController = {
    excelData: null, // Guardar datos actuales del archivo
    currentColumnName: 'Valores', // Nombre de la columna seleccionada

    init() {
        UIView.init();
        this.bindEvents();
        
        // Listener para refrescar gráficos al cambiar de tema
        window.addEventListener('themeChanged', () => {
            if (document.getElementById('moduleSelect').value) {
                this.calcular();
            }
        });
    },

    bindEvents() {
        document.getElementById('moduleSelect').addEventListener('change', this.handleModuleChange.bind(this));
        document.getElementById('btnCalcular').addEventListener('click', this.calcular.bind(this));
        document.getElementById('btnLimpiar').addEventListener('click', this.limpiar.bind(this));

        // Eventos para Excel
        document.getElementById('btnImportarExcel').addEventListener('click', () => document.getElementById('excelInput').click());
        document.getElementById('excelInput').addEventListener('change', this.handleImportExcel.bind(this));
        document.getElementById('btnVerExcel').addEventListener('click', this.abrirModalExcel.bind(this));
        document.getElementById('btnCloseModal').addEventListener('click', this.cerrarModalExcel.bind(this));
        document.getElementById('btnCloseModalFooter').addEventListener('click', this.cerrarModalExcel.bind(this));
        document.getElementById('closeModalBg').addEventListener('click', this.cerrarModalExcel.bind(this));

        // Eventos para Reporte
        document.getElementById('btnAbrirReporte').addEventListener('click', this.abrirModalReporte.bind(this));
        document.getElementById('btnCloseReporte').addEventListener('click', this.cerrarModalReporte.bind(this));
        document.getElementById('btnCancelReport').addEventListener('click', this.cerrarModalReporte.bind(this));
        document.getElementById('closeModalReporteBg').addEventListener('click', this.cerrarModalReporte.bind(this));
        document.getElementById('reportSampleType').addEventListener('change', this.actualizarCamposMuestreo.bind(this));
        document.getElementById('btnExportExcel').addEventListener('click', this.iniciarExportacion.bind(this));
        document.getElementById('btnGenerarPreview').addEventListener('click', this.generarPreview.bind(this));
        
        // Selector 'Seleccionar Todos'
        const selectAll = document.getElementById('selectAllModules');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checked = e.target.checked;
                document.querySelectorAll('.module-check').forEach(cb => cb.checked = checked);
            });
        }

        // Eventos para Navegación de Unidades
        document.querySelectorAll('.unit-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.handleUnitChange(e));
        });
    },

    handleUnitChange(e) {
        const btn = e.currentTarget;
        const unit = btn.getAttribute('data-unit');

        // UI Tabs
        document.querySelectorAll('.unit-tab').forEach(t => {
            t.classList.remove('active');
            t.classList.add('opacity-60');
        });
        btn.classList.add('active');
        btn.classList.remove('opacity-60');

        // UI Views
        document.querySelectorAll('.unit-view').forEach(v => {
            v.classList.add('hidden');
        });
        document.getElementById(`view-unidad-${unit}`).classList.remove('hidden');

        // Si cambiamos a una unidad que no sea la 1, ocultamos el selector de Excel por si acaso
        if (unit !== '1') {
            document.getElementById('excelColumnSelector').classList.add('hidden');
        }
    },

    async handleImportExcel(e) {
        const file = e.target.files[0];
        if (!file) return;

        UIView.ocultarError();
        try {
            const result = await ExcelService.parseExcel(file);
            this.excelData = result; // Guardamos columnas y rawData
            UIView.renderizarSelectorColumnas(result.columns, this.handleColumnSelection.bind(this));
        } catch (err) {
            UIView.mostrarError(err.message);
        }
    },

    abrirModalExcel() {
        if (!this.excelData) return;
        UIView.renderizarTablaExcel(this.excelData.rawData, this.excelData.columns, this.handleColumnSelection.bind(this));
        document.getElementById('modalExcel').classList.remove('hidden');
        document.body.classList.add('overflow-hidden'); // Evitar scroll en fondo
    },

    cerrarModalExcel() {
        document.getElementById('modalExcel').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    },

    abrirModalReporte() {
        document.getElementById('modalReporte').classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    },

    cerrarModalReporte() {
        document.getElementById('modalReporte').classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PRE-VISUALIZACIÓN
    // ─────────────────────────────────────────────────────────────────────────
    async generarPreview() {
        const dataStr = document.getElementById('dataInput').value;
        const data = parseData(dataStr);

        if (data.length === 0) {
            alert('Ingresa datos válidos antes de previsualizar.');
            return;
        }

        // Mostrar loading
        const btnPreview = document.getElementById('btnGenerarPreview');
        const loading = document.getElementById('previewLoading');
        const container = document.getElementById('previewContainer');
        const empty = document.getElementById('previewEmpty');

        btnPreview.disabled = true;
        btnPreview.innerHTML = '<span class="text-sm">⏳</span> Calculando...';
        if (loading) loading.classList.remove('hidden');

        // Pequeño delay para mostrar el spinner
        await new Promise(r => setTimeout(r, 80));

        try {
            const sampleType = document.getElementById('reportSampleType').value;
            const paramValue = parseInt(document.getElementById('reportParamValue').value) || 5;

            const modules = {
                variables:       document.querySelector('[data-module="variables"]').checked,
                tendencia:       document.querySelector('[data-module="tendencia"]').checked,
                dispersion:      document.querySelector('[data-module="dispersion"]').checked,
                posicion:        document.querySelector('[data-module="posicion"]').checked,
                forma:           document.querySelector('[data-module="forma"]').checked,
                medias_especiales: document.querySelector('[data-module="medias_especiales"]').checked,
                frecuencias:     document.querySelector('[data-module="frecuencias"]').checked
            };

            // Aplicar muestreo si corresponde
            let dataToProcess = [...data];
            if (sampleType !== 'none') {
                const s = this.aplicarMuestreoBatch(data, sampleType, paramValue);
                dataToProcess = s.sample;
            }

            // Construir filas de la vista previa — cada sección con sus valores clave
            const sections = [];

            // === DATOS ===
            sections.push({
                title: '1. Datos de Entrada',
                color: 'section',
                rows: [
                    ['#', 'Valor'],
                    ...dataToProcess.slice(0, 12).map((v, i) => [i + 1, v]),
                    ...(dataToProcess.length > 12 ? [['...', `(${dataToProcess.length - 12} más)`]] : [])
                ]
            });

            // === TIPO DE VARIABLE ===
            if (modules.variables) {
                try {
                    const isContinuous = dataToProcess.some(d => !Number.isInteger(d));
                    sections.push({
                        title: '2. Tipo de Variable',
                        color: 'section',
                        rows: [
                            ['Identificación', 'Regla', 'Clasificación'],
                            [isContinuous ? 'Variable Continua' : 'Variable Discreta',
                             isContinuous ? 'Contiene decimales' : 'Solo enteros (Conteo)',
                             isContinuous ? 'Continua ✓' : 'Discreta ✓']
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === TENDENCIA CENTRAL ===
            if (modules.tendencia) {
                try {
                    const m  = EstadisticaModel.calcMedia(dataToProcess);
                    const me = EstadisticaModel.calcMediana(dataToProcess);
                    const mo = EstadisticaModel.calcModa(dataToProcess);
                    sections.push({
                        title: '3. Tendencia Central',
                        color: 'section',
                        rows: [
                            ['Medida', 'Fórmula', 'Valor'],
                            ['Media (ẋ̄)', 'Σx / n', m.resultado],
                            ['Mediana (Me)', 'Pos (n+1)/2', me.resultado],
                            ['Moda (Mo)', 'Frec Máx', mo.resultado],
                            ['Cantidad (n)', '', dataToProcess.length]
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === DISPERSIÓN ===
            if (modules.dispersion) {
                try {
                    const v  = EstadisticaModel.calcVarianza(dataToProcess);
                    const r  = EstadisticaModel.calcRango(dataToProcess);
                    const varVal  = parseFloat(String(v.resultado).replace(',', '.'));
                    const medVal  = parseFloat(String(v.resultadosIntermedios.media).replace(',', '.'));
                    const sd = EstadisticaModel.calcDesvStd(varVal, medVal);
                    const cv = EstadisticaModel.calcCoefVar(medVal, parseFloat(String(sd.resultado).replace(',', '.')));
                    sections.push({
                        title: '4. Dispersión',
                        color: 'section',
                        rows: [
                            ['Medida', 'Fórmula', 'Valor'],
                            ['Rango',            'Max - Min',         r.resultado],
                            ['Varianza (σ²)',     'Σ(x-ẋ̄)² / n',      v.resultado],
                            ['Desv. Estándar (σ)', '√σ²',              sd.resultado],
                            ['Coef. Variación', '(σ/ẋ̄)*100',          cv.resultado],
                            ['Mínimo',          '',                  r.min],
                            ['Máximo',          '',                  r.max]
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === MEDIAS ESPECIALES ===
            if (modules.medias_especiales) {
                try {
                    const g = EstadisticaModel.calcMediaGeometrica(dataToProcess);
                    const h = EstadisticaModel.calcMediaArmonica(dataToProcess);
                    sections.push({
                        title: '5. Medias Especiales',
                        color: 'section',
                        rows: [
                            ['Medida', 'Fórmula', 'Valor'],
                            ['Media Geométrica', 'exp(Σln(xᵢ)/n)', g.resultado],
                            ['Media Armónica',   'n / Σ(1/xᵢ)',     h.resultado]
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === POSICIÓN ===
            if (modules.posicion) {
                try {
                    const q = EstadisticaModel.calcCuartiles(dataToProcess);
                    const d = EstadisticaModel.calcDeciles(dataToProcess);
                    sections.push({
                        title: '6. Medidas de Posición',
                        color: 'section',
                        rows: [
                            ['Medida', 'Fórmula', 'Valor'],
                            ['Q1 (25%)', 'i(n+1)/4', q.q1Val || 'N/A'],
                            ['Q2 (50%)', 'i(n+1)/4', q.q2Val || 'N/A'],
                            ['Q3 (75%)', 'i(n+1)/4', q.q3Val || 'N/A'],
                            ['', '', ''],
                            ['Decil', 'Pos.', 'Valor'],
                            ...(d.tablas[0].filas || []).slice(0, 5).map(row => [row[0], row[2], row[3]]),
                            ...(d.tablas[0].filas.length > 5 ? [['...', '', '(ver Excel completo)']] : [])
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === FRECUENCIAS ===
            if (modules.frecuencias) {
                try {
                    const fa = EstadisticaModel.calcFrecuenciasAgrupadas(dataToProcess);
                    sections.push({
                        title: '7. Distribución de Frecuencias',
                        color: 'section',
                        rows: [
                            ['Clase', 'L. Inf', 'L. Sup', 'fi', 'fri', 'FI'],
                            ...(fa.filas || []).slice(0, 8).map(row => [row[0], row[1], row[2], row[3], row[5], row[6]]),
                            ...(fa.filas.length > 8 ? [['...', '', '', '', '', '']] : [])
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // === FORMA ===
            if (modules.forma) {
                try {
                    const as = EstadisticaModel.calcAsimetria(dataToProcess);
                    const ku = EstadisticaModel.calcCurtosis(dataToProcess);
                    sections.push({
                        title: '8. Medidas de Forma',
                        color: 'section',
                        rows: [
                            ['Medida', 'Valor', 'Tipo'],
                            ['Asimetría (g₁)', as.resultado, as.resultadoLabel || ''],
                            ['Curtosis (K)',    ku.resultado, ku.resultadoLabel || '']
                        ]
                    });
                } catch (e) { /* skip */ }
            }

            // Renderizar la tabla
            this.renderPreviewTable(sections, dataToProcess.length);

            // Mostrar contenedor
            container.classList.remove('hidden');
            empty.classList.add('hidden');

        } catch (err) {
            console.error('Error generando preview:', err);
            alert('Error al generar la vista previa: ' + err.message);
        } finally {
            if (loading) loading.classList.add('hidden');
            btnPreview.disabled = false;
            btnPreview.innerHTML = '<span class="text-sm">👁️</span> Actualizar Vista Previa';
        }
    },

    renderPreviewTable(sections, totalRows) {
        const thead = document.getElementById('previewTableHead');
        const tbody = document.getElementById('previewTableBody');
        const rowCountEl = document.getElementById('previewRowCount');
        const colCountEl = document.getElementById('previewColCount');

        thead.innerHTML = '';
        tbody.innerHTML = '';

        // Calcular cuantas columnas tiene la sección más ancha
        let maxCols = 0;
        let totalTableRows = 0;
        sections.forEach(s => {
            s.rows.forEach(r => { if (r.length > maxCols) maxCols = r.length; });
            totalTableRows += s.rows.length + 1; // +1 para el título de sección
        });

        // Encabezado fijo con números de columnas
        const headerRow = document.createElement('tr');
        // Primera celda: número de fila
        const thRowNum = document.createElement('th');
        thRowNum.className = 'excel-row-header sticky left-0';
        thRowNum.textContent = '';
        headerRow.appendChild(thRowNum);
        for (let c = 0; c < maxCols; c++) {
            const th = document.createElement('th');
            th.className = 'excel-col-header';
            th.textContent = String.fromCharCode(65 + c); // A, B, C...
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);

        // Cuerpo
        let globalRow = 1;
        sections.forEach(section => {
            // Fila de título de sección
            const titleTr = document.createElement('tr');
            const tdNum = document.createElement('td');
            tdNum.className = 'excel-row-header sticky left-0';
            tdNum.textContent = globalRow++;
            titleTr.appendChild(tdNum);

            const tdTitle = document.createElement('td');
            tdTitle.colSpan = maxCols;
            tdTitle.className = 'excel-section-header';
            tdTitle.textContent = section.title;
            titleTr.appendChild(tdTitle);
            tbody.appendChild(titleTr);

            // Filas de datos
            section.rows.forEach((row, rowIdx) => {
                const tr = document.createElement('tr');
                const tdRowNum = document.createElement('td');
                tdRowNum.className = 'excel-row-header sticky left-0';
                tdRowNum.textContent = globalRow++;
                tr.appendChild(tdRowNum);

                // Detectar si es encabezado de columnas (primera fila del grupo)
                const isColHeader = rowIdx === 0;

                for (let c = 0; c < maxCols; c++) {
                    const td = document.createElement('td');
                    const val = row[c] !== undefined ? row[c] : '';
                    td.textContent = val === '' ? '' : String(val);

                    if (isColHeader) {
                        td.className = 'excel-col-label';
                    } else if (val !== '' && c === 0 && maxCols > 1) {
                        td.className = 'excel-label-cell';
                    } else if (val !== '' && typeof val === 'number') {
                        td.className = 'excel-value-cell';
                    } else {
                        td.className = 'excel-data-cell';
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            });
        });

        rowCountEl.textContent = totalRows;
        colCountEl.textContent = maxCols;
    },

    actualizarCamposMuestreo(e) {
        const type = e.target.value;
        const container = document.getElementById('reportSampleParams');
        const label = document.getElementById('reportParamLabel');
        
        if (type === 'none') {
            container.classList.add('hidden');
        } else {
            container.classList.remove('hidden');
            if (type === 'sistematico') {
                label.innerText = 'Intervalo (k)';
            } else {
                label.innerText = 'Tamaño (n)';
            }
        }
    },

    async iniciarExportacion() {
        const dataStr = document.getElementById('dataInput').value;
        let data = parseData(dataStr);
        
        if (data.length === 0) {
            UIView.mostrarError('Ingresa datos válidos antes de exportar.');
            return;
        }

        const sampleType = document.getElementById('reportSampleType').value;
        const paramValue = parseInt(document.getElementById('reportParamValue').value);
        
        // Checklist de módulos
        const modules = {
            variables: document.querySelector('[data-module="variables"]').checked,
            tendencia: document.querySelector('[data-module="tendencia"]').checked,
            dispersion: document.querySelector('[data-module="dispersion"]').checked,
            posicion: document.querySelector('[data-module="posicion"]').checked,
            forma: document.querySelector('[data-module="forma"]').checked,
            frecuencias: document.querySelector('[data-module="frecuencias"]').checked
        };

        // Verificar que al menos un módulo esté seleccionado
        const alMenosUno = Object.values(modules).some(v => v);
        if (!alMenosUno) {
            UIView.mostrarError('Selecciona al menos un módulo para exportar.');
            return;
        }

        // 1. Aplicar Muestreo si se requiere
        let dataToProcess = [...data];
        let samplingInfo = null;

        if (sampleType !== 'none') {
            const samplingResult = this.aplicarMuestreoBatch(data, sampleType, paramValue);
            dataToProcess = samplingResult.sample;
            samplingInfo = samplingResult.info;
        }

        // 2. Ejecución Batch — cada módulo en su propio try-catch
        const reportResults = {};
        const procedures = [];
        const errores = [];
        
        // Helper para extraer pasos de forma segura
        const getSteps = (res) => {
            if (!res) return [];
            if (Array.isArray(res.pasos)) return res.pasos;
            if (res.detallado && Array.isArray(res.detallado.pasos)) return res.detallado.pasos;
            return [];
        };

        if (modules.variables) {
            try {
                const disc = EstadisticaModel.calcVarDiscreta(dataToProcess);
                const cont = EstadisticaModel.calcVarContinua(dataToProcess);
                const isContinuous = dataToProcess.some(d => !Number.isInteger(d));
                
                reportResults.tipoVariable = {
                    nombre: isContinuous ? "Variable Continua" : "Variable Discreta",
                    regla: isContinuous ? "Contiene decimales (Medición)" : "Sólo números enteros (Conteo)",
                    valor: isContinuous ? "Continua ✓" : "Discreta ✓"
                };
                procedures.push({ module: 'Tipo de Variable', steps: [...disc.pasos, ...cont.pasos] });
            } catch (e) { errores.push('Variables: ' + e.message); }
        }

        if (modules.tendencia) {
            try {
                const m = EstadisticaModel.calcMedia(dataToProcess);
                const me = EstadisticaModel.calcMediana(dataToProcess);
                const mo = EstadisticaModel.calcModa(dataToProcess);
                
                reportResults.tendencia = {
                    media: m.resultado,
                    mediana: me.resultado,
                    moda: mo.resultado,
                    n: dataToProcess.length
                };
                procedures.push({ module: 'Tendencia Central', steps: [...getSteps(m), ...getSteps(me), ...getSteps(mo)] });
            } catch (e) { errores.push('Tendencia: ' + e.message); }
        }

        if (modules.dispersion) {
            try {
                const v = EstadisticaModel.calcVarianza(dataToProcess);
                const r = EstadisticaModel.calcRango(dataToProcess);
                const varVal = parseFloat(String(v.resultado).replace(',', '.'));
                const mediaVal = parseFloat(String(v.resultadosIntermedios.media).replace(',', '.'));
                
                const sd = EstadisticaModel.calcDesvStd(varVal, mediaVal);
                const cv = EstadisticaModel.calcCoefVar(mediaVal, parseFloat(String(sd.resultado).replace(',', '.')));
                
                reportResults.dispersion = {
                    varianza: v.resultado,
                    desviacion: sd.resultado,
                    cv: cv.resultado,
                    rango: r.resultado,
                    min: r.min,
                    max: r.max,
                    tablaVarianza: v.detallado.tablas[0].filas
                };
                const steps = [...getSteps(r), ...getSteps(v), ...getSteps(sd), ...getSteps(cv)];
                procedures.push({ module: 'Medidas de Dispersión', steps });
            } catch (e) { errores.push('Dispersión: ' + e.message); }
        }

        if (modules.posicion) {
            try {
                const q = EstadisticaModel.calcCuartiles(dataToProcess);
                const p = EstadisticaModel.calcPercentiles(dataToProcess);
                const d = EstadisticaModel.calcDeciles(dataToProcess);
                
                reportResults.posicion = {
                    q1: q.q1Val || 'N/A',
                    q2: q.q2Val || 'N/A',
                    q3: q.q3Val || 'N/A',
                    p50: p.resultado,
                    fullPercentiles: p.tablas[0].filas,
                    fullDeciles: d.tablas[0].filas
                };
                procedures.push({ module: 'Medidas de Posición', steps: [...getSteps(q), ...getSteps(p).slice(0, 5), '... (Ver tabla completa en hoja Percentiles)'] });
            } catch (e) { errores.push('Posición: ' + e.message); }
        }

        if (modules.forma) {
            try {
                const as = EstadisticaModel.calcAsimetria(dataToProcess);
                const ku = EstadisticaModel.calcCurtosis(dataToProcess);
                
                reportResults.forma = {
                    sesgo: as.resultado,
                    curtosis: ku.resultado,
                    tipoAs: as.resultadoLabel,
                    tipoKu: ku.resultadoLabel,
                    kuObj: ku,
                    asObj: as
                };
                procedures.push({ module: 'Medidas de Forma', steps: [...getSteps(as), ...getSteps(ku)] });
            } catch (e) { errores.push('Forma: ' + e.message); }
        }

        if (modules.medias_especiales) {
            try {
                const g = EstadisticaModel.calcMediaGeometrica(dataToProcess);
                const h = EstadisticaModel.calcMediaArmonica(dataToProcess);
                const seriesMM = EstadisticaModel.calcSerieMediasMoviles(dataToProcess);
                
                reportResults.especiales = {
                    geometrica: g.resultado,
                    geometricaObj: g,
                    armonica: h.resultado,
                    armonicaObj: h,
                    seriesMM: seriesMM
                };
                procedures.push({ module: 'Medidas Especiales', steps: [...getSteps(g), ...getSteps(h), "Ver tabla detallada en hoja principal"] });
            } catch (e) { errores.push('Medias Especiales: ' + e.message); }
        }

        if (modules.frecuencias) {
            try {
                const f = EstadisticaModel.calcFrecuencias(dataToProcess);
                const fAg = EstadisticaModel.calcFrecuenciasAgrupadas(dataToProcess);
                reportResults.frecuencias = f.resumen.tablas[0];
                reportResults.frecuenciasAgrupadas = fAg;
                procedures.push({ module: 'Distribución de Frecuencias', steps: getSteps(f) });
            } catch (e) { errores.push('Frecuencias: ' + e.message); }
        }



        // 3. Exportar (solo si hay al menos un resultado)
        try {
            if (Object.keys(reportResults).length === 0) {
                UIView.mostrarError('No se pudo calcular ningún módulo. ' + (errores.length > 0 ? errores.join(' | ') : ''));
                return;
            }
            ExcelService.exportarReporteCompleto(dataToProcess, reportResults, samplingInfo, procedures, this.currentColumnName);
            this.cerrarModalReporte();

            // Notificar si hubo errores parciales
            if (errores.length > 0) {
                console.warn('Módulos con error:', errores);
            }
        } catch (err) {
            UIView.mostrarError('Error al generar el reporte: ' + err.message);
        }
    },

    aplicarMuestreoBatch(data, type, param) {
        let sample = [];
        let info = "";
        
        if (type === 'simple') {
            const n = Math.min(param, data.length);
            sample = [...data].sort(() => 0.5 - Math.random()).slice(0, n);
            info = `Muestreo Aleatorio Simple (n=${n})`;
        } else if (type === 'sistematico') {
            const k = param || 2;
            for (let i = 0; i < data.length; i += k) {
                sample.push(data[i]);
            }
            info = `Muestreo Sistemático (k=${k})`;
        } else if (type === 'conglomerados') {
            const m = param || 2;
            const res = EstadisticaModel.calcMuestreoConglomerados(data, m);
            // Extraer ids si el resultado es una cadena con "id:"
            sample = data.filter((_, i) => res.resultado.includes(`Conglomerado ${i+1}`)); 
            if (sample.length === 0) sample = data.slice(0, Math.ceil(data.length/m)); 
            info = `Muestreo por Conglomerados (m=${m})`;
        } else {
            sample = [...data];
            info = "Sin Muestreo (Población Total)";
        }
        
        return { sample, info };
    },

    handleColumnSelection(colName, values) {
        const input = document.getElementById('dataInput');
        input.value = values.join('; ');
        this.currentColumnName = colName;
        
        // Efecto visual de que se cargó algo
        input.classList.add('bg-green-50', 'dark:bg-green-900/10');
        setTimeout(() => input.classList.remove('bg-green-50', 'dark:bg-green-900/10'), 1000);
    },

    handleModuleChange(e) {
        const v = e.target.value;
        const extraParams = document.getElementById('extraParams');
        const paramMuestreo       = document.getElementById('paramMuestreo');
        const paramMuestreoE      = document.getElementById('paramMuestreoE');
        const paramMM             = document.getElementById('paramMM');
        const paramGrafico        = document.getElementById('paramGrafico');
        const modoVistaContainer = document.getElementById('modoVistaContainer');

        // Reset state
        extraParams.classList.add('hidden');
        paramMuestreo.classList.add('hidden');
        if (paramMuestreoE) paramMuestreoE.classList.add('hidden');
        if (paramMM) paramMM.classList.add('hidden');
        if (paramGrafico) paramGrafico.classList.add('hidden');
        if (modoVistaContainer) modoVistaContainer.classList.add('hidden');

        if (['muestreo_simple', 'muestreo_sistematico', 'muestreo_conglomerados'].includes(v)) {
            extraParams.classList.remove('hidden');
            paramMuestreo.classList.remove('hidden');
        } else if (v === 'muestreo_estratificado') {
            extraParams.classList.remove('hidden');
            paramMuestreoE.classList.remove('hidden');
        } else if (v === 'media_movil') {
            extraParams.classList.remove('hidden');
            if (paramMM) paramMM.classList.remove('hidden');
            if (modoVistaContainer) modoVistaContainer.classList.remove('hidden');
        } else if (v === 'frecuencias') {
            extraParams.classList.remove('hidden');
            if (paramGrafico) paramGrafico.classList.remove('hidden');
            if (modoVistaContainer) modoVistaContainer.classList.remove('hidden');
        } else if (v === 'moda') {
            extraParams.classList.remove('hidden');
            if (paramGrafico) paramGrafico.classList.remove('hidden');
        } else if (['varianza', 'coef_var', 'desv_std', 'media_geometrica', 'curtosis', 'asimetria'].includes(v) && modoVistaContainer) {
            modoVistaContainer.classList.remove('hidden');
        }
    },

    limpiar() {
        document.getElementById('dataInput').value = '';
        document.getElementById('moduleSelect').value = '';
        document.getElementById('paramN').value = '';
        document.getElementById('paramEstratos').value = '';
        document.getElementById('paramNE').value = '';
        
        UIView.limpiar();
        this.handleModuleChange({ target: { value: '' } });
        
        // Reset Excel selector
        document.getElementById('excelColumnSelector').classList.add('hidden');
        document.getElementById('btnVerExcel').classList.add('hidden');
        document.getElementById('excelInput').value = '';
        this.excelData = null;
    },

    calcular() {
        UIView.ocultarError();
        const raw = document.getElementById('dataInput').value;
        const mod = document.getElementById('moduleSelect').value;

        if (!mod) return UIView.mostrarError('Por favor selecciona un módulo de cálculo.');

        let data = null;
        if (!MODULES_NO_DATA.includes(mod)) {
            data = parseData(raw);
            if (!data || data.length === 0) {
                return UIView.mostrarError('Ingresa datos numéricos válidos separados por comas. Ejemplo: 4, 7, 13, 2');
            }
            if (data.length < 2 && !['media', 'moda', 'rango'].includes(mod)) {
                return UIView.mostrarError('Este cálculo general requiere al menos 2 datos.');
            }
        }

        try {
            let resObj = null;
            let titulo = document.querySelector(`#moduleSelect option[value="${mod}"]`).textContent;

            switch (mod) {
                // Muestreo
                case 'muestreo_simple':
                    resObj = EstadisticaModel.calcMuestreoSimple(parseData(raw) || [1,2,3,4,5,6,7,8,9,10], parseInt(document.getElementById('paramN').value) || 0);
                    break;
                case 'muestreo_sistematico':
                    resObj = EstadisticaModel.calcMuestreoSistematico(parseData(raw) || [1,2,3,4,5,6,7,8,9,10], parseInt(document.getElementById('paramN').value) || 0);
                    break;
                case 'muestreo_estratificado':
                    const estratosStr = document.getElementById('paramEstratos').value.trim();
                    const nEstratos = parseInt(document.getElementById('paramNE').value) || 0;
                    let estratos = [];
                    if (estratosStr) {
                        estratos = estratosStr.split('|').map(s => {
                            const [nombre, N] = s.split(':');
                            return { nombre: nombre.trim(), N: parseInt(N) || 0 };
                        }).filter(e => e.nombre && e.N > 0);
                    }
                    resObj = EstadisticaModel.calcMuestreoEstratificado(estratos, nEstratos);
                    break;
                case 'muestreo_conglomerados':
                    resObj = EstadisticaModel.calcMuestreoConglomerados(parseData(raw) || [1,2,3,4,5,6,7,8,9,10], parseInt(document.getElementById('paramN').value) || 2);
                    break;
                
                // Variables
                case 'var_discreta': resObj = EstadisticaModel.calcVarDiscreta(parseData(raw) || []); break;
                case 'var_continua': resObj = EstadisticaModel.calcVarContinua(parseData(raw) || []); break;

                // Central
                case 'media': resObj = EstadisticaModel.calcMedia(data); break;
                case 'mediana': resObj = EstadisticaModel.calcMediana(data); break;
                case 'moda': 
                    const tipoModa = document.getElementById('tipoGraficoDinamico') ? document.getElementById('tipoGraficoDinamico').value : 'barras';
                    resObj = EstadisticaModel.calcModa(data, tipoModa); 
                    break;

                // Dispersión
                case 'rango': resObj = EstadisticaModel.calcRango(data); break;
                case 'varianza': resObj = EstadisticaModel.calcVarianza(data); break;
                case 'desv_std': 
                    const v_val = variance(data);
                    const m_val = mean(data);
                    resObj = EstadisticaModel.calcDesvStd(v_val, m_val); 
                    break;
                case 'coef_var': 
                    const m = mean(data);
                    const sDev = stdDev(data);
                    resObj = EstadisticaModel.calcCoefVar(m, sDev); 
                    break;

                // Medias especiales
                case 'media_movil': 
                    const paramK = parseInt(document.getElementById('paramOrdenMM').value) || 3;
                    resObj = EstadisticaModel.calcMediaMovil(data, paramK); 
                    break;
                case 'media_geometrica': resObj = EstadisticaModel.calcMediaGeometrica(data); break;
                case 'media_armonica': resObj = EstadisticaModel.calcMediaArmonica(data); break;

                // Posición
                case 'cuartiles': resObj = EstadisticaModel.calcCuartiles(data); break;
                case 'deciles': resObj = EstadisticaModel.calcDeciles(data); break;
                case 'percentiles': resObj = EstadisticaModel.calcPercentiles(data); break;

                // Frecuencias
                case 'frecuencias': 
                    const tipoFrec = document.getElementById('tipoGraficoDinamico') ? document.getElementById('tipoGraficoDinamico').value : 'barras';
                    resObj = EstadisticaModel.calcFrecuencias(data, tipoFrec); 
                    break;

                // Forma
                case 'curtosis': resObj = EstadisticaModel.calcCurtosis(data); break;
                case 'asimetria': resObj = EstadisticaModel.calcAsimetria(data); break;

                default:
                    return UIView.mostrarError('Módulo no reconocido.');
            }

            if (resObj) {
                if (resObj.detallado && resObj.resumen) {
                    const modo = document.getElementById('viewMode').value;
                    if (modo === 'detallado') {
                        UIView.renderDetallado(titulo, resObj);
                    } else if (modo === 'resumen') {
                        UIView.renderResumen(titulo, resObj);
                    }
                } else {
                    UIView.renderizarResultado(titulo, resObj);
                }
            }
        } catch (error) {
            UIView.mostrarError(error.message || 'Ocurrió un error (verifica que los parámetros sean correctos).');
            console.error(error);
        }
    }
};

