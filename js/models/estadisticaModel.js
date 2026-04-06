import { formatDecimals, sortAsc, mean, variance, stdDev, interpolate, interpretarCV, interpretarDesviacion } from '../utils/helpers.js';

/**
 * Modelos de Estadística Descriptiva (Lógica Pura sin DOM)
 */

export const EstadisticaModel = {
    // ── MUESTREO ──────────────────────────────────────────
    calcMuestreoSimple(poblacion, n) {
        const N = poblacion.length;
        if (!n || n <= 0 || n > N) throw new Error('Tamaño de muestra n inválido o ausente');
        const prob = n / N;
        const shuffled = [...poblacion].sort(() => Math.random() - 0.5).slice(0, n).sort((a, b) => a - b);
        
        return {
            concepto: 'Cada elemento de la población tiene exactamente la misma probabilidad de ser seleccionado.',
            formula: `P(selección) = n / N = ${n} / ${N}`,
            pasos: [
                `Población N = ${N}: {${poblacion.join(', ')}}`,
                `Tamaño de muestra: n = ${n}`,
                `Probabilidad de selección de cada elemento: P = n/N = ${n}/${N} = **${formatDecimals(prob)}** (${formatDecimals(prob * 100)}%)`,
                `Seleccionar ${n} de forma completamente aleatoria (sin reemplazo)`,
                `Muestra seleccionada: {${shuffled.join(', ')}}`
            ],
            tablas: [],
            resultado: shuffled.join(', '),
            resultadoLabel: `Muestra aleatoria de ${n} elemento(s) de ${N}`
        };
    },

    calcMuestreoSistematico(poblacion, n) {
        const N = poblacion.length;
        if (!n || n <= 0 || n > N) throw new Error('Parámetro n inválido');
        const k = Math.floor(N / n);
        const inicio = Math.floor(Math.random() * k) + 1;
        const muestra = [];
        for (let i = 0; i < n; i++) {
            const idx = inicio - 1 + i * k;
            if (idx < N) muestra.push(poblacion[idx]);
        }
        const posiciones = muestra.map((_, i) => inicio + i * k).join(', ');
        return {
            concepto: 'Se selecciona cada k-ésimo elemento de la lista tras elegir un punto de inicio aleatorio entre 1 y k.',
            formula: 'k = ⌊N / n⌋ → seleccionar r, r+k, r+2k, ...',
            pasos: [
                `Población N = ${N}: {${poblacion.join(', ')}}`,
                `Muestra n = ${n}`,
                `Intervalo de salto: k = ⌊N/n⌋ = ⌊${N}/${n}⌋ = **${k}**`,
                `Punto de arranque aleatorio: r = **${inicio}** (elegido al azar entre 1 y ${k})`,
                `Seleccionar los elementos en posiciones: ${posiciones}`,
                `Muestra: {${muestra.join(', ')}}`
            ],
            tablas: [],
            resultado: muestra.join(', '),
            resultadoLabel: `Selección sistemática con k = ${k}`
        };
    },

    calcMuestreoEstratificado(estratos, n) {
        if (!estratos || estratos.length === 0 || !n || n <= 0) throw new Error('Parámetros incompletos');
        const N = estratos.reduce((s, e) => s + e.N, 0);
        let total = 0;
        const rows = estratos.map(e => {
            const prop = e.N / N;
            const ni = Math.round(prop * n);
            total += ni;
            return [e.nombre, e.N.toString(), formatDecimals(prop), `${formatDecimals(prop * 100)}%`, ni.toString()];
        });
        rows.push(['TOTAL', N.toString(), '1.00', '100%', total.toString()]);
        
        return {
            concepto: 'La población se divide en subgrupos (estratos) y la muestra se distribuye proporcionalmente.',
            formula: 'n_i = (N_i / N) × n',
            pasos: [
                `Población total N = ${N} dividida en ${estratos.length} estratos`,
                `Muestra total n = ${n}`,
                `Para cada estrato: n_i = (N_i / ${N}) × ${n}`,
                `Redondear n_i al entero más cercano`,
                `Suma de n_i = ${total} ${total !== n ? '(ajuste por redondeo)' : '= n ✓'}`
            ],
            tablas: [{
                titulo: 'Asignación proporcional por estrato',
                encabezados: ['Estrato', 'N_i', 'Proporción', '%', 'n_i'],
                filas: rows
            }],
            resultado: total.toString(),
            resultadoLabel: `Muestra distribuida en ${estratos.length} estratos`
        };
    },

    calcMuestreoConglomerados(poblacion, m) {
        const M = poblacion.length;
        if (!m || m <= 0 || m > M) m = Math.min(2, M);
        const idx = [];
        while (idx.length < m) {
            const r = Math.floor(Math.random() * M);
            if (!idx.includes(r)) idx.push(r);
        }
        idx.sort((a, b) => a - b);
        const seleccionados = idx.map(i => `Conglomerado ${i + 1} (id: ${poblacion[i]})`);
        
        return {
            concepto: 'La población se divide en grupos naturales (conglomerados) y se seleccionan grupos completos al azar.',
            formula: 'Seleccionar m conglomerados de M totales → incluir TODOS sus elementos',
            pasos: [
                `Población de M = ${M} conglomerados: {${poblacion.join(', ')}}`,
                `Número de conglomerados a seleccionar: m = ${m}`,
                `Probabilidad de selección: P = ${m}/${M} = **${formatDecimals(m / M)}**`,
                `Conglomerados seleccionados al azar (posiciones): ${idx.map(i => i + 1).join(', ')}`,
                `Se incluyen TODOS los elementos pertenecientes a esos conglomerados`
            ],
            tablas: [],
            resultado: seleccionados.join(' | '),
            resultadoLabel: `${m} conglomerado(s) de ${M}`
        };
    },

    // ── VARIABLES ─────────────────────────────────────────
    calcVarDiscreta(datos = []) {
        const sonEnteros = datos.length > 0 && datos.every(d => Number.isInteger(d));
        return {
            concepto: 'Una variable discreta toma valores contables y separados. No toma valores intermedios.',
            formula: 'Conjunto: {0, 1, 2, 3, ...} — infinito numerable o finito',
            pasos: [
                'Una variable es discreta si sus valores son contables',
                `Datos ingresados: {${datos.join(', ')}}`,
                `¿Son enteros? → **${sonEnteros ? '✅ Sí, podrían representar una variable discreta' : '⚠️ No, contienen decimales'}**`
            ],
            tablas: [],
            resultado: sonEnteros && datos.length > 0 ? 'Discreta ✓' : 'Indeterminado / Continua',
            resultadoLabel: `${datos.length} dato(s) analizados`
        };
    },

    calcVarContinua(datos = []) {
        const tieneDecimales = datos.some(d => !Number.isInteger(d));
        return {
            concepto: 'Una variable continua puede tomar cualquier valor real dentro de un intervalo. Se obtienen por medición.',
            formula: 'x ∈ [a, b] — infinitos valores posibles',
            pasos: [
                'Una variable es continua si puede tomar cualquier valor real',
                `Datos ingresados: {${datos.join(', ')}}`,
                `¿Tienen decimales? → **${tieneDecimales ? '✅ Sí, típico de mediciones' : 'ℹ️ Solo enteros, pero podrían ser redondeadas'}**`
            ],
            tablas: [],
            resultado: tieneDecimales && datos.length > 0 ? 'Continua ✓' : 'Revisar datos',
            resultadoLabel: datos.length > 0 ? `Rango: [${Math.min(...datos)}, ${Math.max(...datos)}]` : 'Analizado'
        };
    },

    // ── TENDENCIA CENTRAL ─────────────────────────────────
    calcMedia(data) {
        const n = data.length;
        const suma = data.reduce((a, b) => a + b, 0);
        const m = suma / n;
        return {
            concepto: 'La media es la suma de todos los valores dividida entre el número de observaciones.',
            formula: 'x̄ = (Σxᵢ) / n',
            pasos: [
                `Datos: {${data.join(', ')}} → n = ${n}`,
                `Suma todos los valores: ${data.join(' + ')} = **${formatDecimals(suma)}**`,
                `Divide entre n: ${formatDecimals(suma)} / ${n} = **${formatDecimals(m)}**`
            ],
            tablas: [],
            resultado: formatDecimals(m),
            resultadoLabel: `Media de ${n} datos`
        };
    },

    calcMediana(data) {
        const s = sortAsc(data);
        const n = s.length;
        let med, paso;
        if (n % 2 === 1) {
            const pos = Math.floor(n / 2);
            med = s[pos];
            paso = `n es impar → posición central = (${n}+1)/2 = ${pos + 1} → valor = **${med}**`;
        } else {
            const p1 = n / 2 - 1, p2 = n / 2;
            med = (s[p1] + s[p2]) / 2;
            paso = `n es par → promedio de posiciones ${p1 + 1} y ${p2 + 1} = (${s[p1]} + ${s[p2]}) / 2 = **${formatDecimals(med)}**`;
        }
        return {
            concepto: 'El valor que divide al conjunto ordenado en dos mitades iguales.',
            formula: 'Mₑ = valor central (impar) ó promedio de los 2 centrales (par)',
            pasos: [
                `Datos ordenados: {${s.join(', ')}} → n = ${n}`,
                paso
            ],
            tablas: [],
            resultado: formatDecimals(med),
            resultadoLabel: `Mediana de ${n} datos`
        };
    },

    calcModa(data, tipoGrafico = 'barras') {
        const freq = {};
        data.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
        const maxFreq = Math.max(...Object.values(freq));
        const modas = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number).sort((a,b)=>a-b);
        const tipo = modas.length === data.length ? 'Amodal' : modas.length === 1 ? 'Unimodal' : `Multimodal (${modas.length} modas)`;
        
        const freqRows = Object.entries(freq).sort((a,b) => a[0]-b[0]).map(([v, f]) => [v, f.toString(), f === maxFreq ? 'Moda' : '']);
        
        let chartType = 'bar';
        if (tipoGrafico === 'linea') chartType = 'line';
        if (tipoGrafico === 'pastel') chartType = 'pie';

        return {
            concepto: 'La moda es el valor que aparece con mayor frecuencia.',
            formula: 'Mo = valor(es) con máxima frecuencia (fi)',
            pasos: [
                `Datos: {${data.join(', ')}}`,
                `Frecuencia máxima encontrada: **${maxFreq}**`,
                `Valor(es) con esa frecuencia: **{${modas.join(', ')}}**`,
                `Tipo: **${tipo}**`
            ],
            tablas: [{
                titulo: 'Tabla de frecuencias',
                encabezados: ['Valor', 'Frecuencia', 'Marca'],
                filas: freqRows
            }],
            resultado: modas.join(', '),
            resultadoLabel: `${tipo} | Máxima = ${maxFreq}`,
            datosGrafico: { type: chartType, labels: Object.keys(freq), data: Object.values(freq), label: 'Frecuencia Absoluta' }
        };
    },

    // ── DISPERSIÓN ────────────────────────────────────────
    calcRango(data) {
        const s = sortAsc(data);
        const min = s[0];
        const max = s[s.length - 1];
        const r = max - min;
        return {
            concepto: 'El rango es la diferencia entre el valor máximo y el mínimo.',
            formula: 'R = Xₘₐₓ − Xₘᵢₙ',
            pasos: [
                `Datos ordenados: {${s.join(', ')}}`,
                `Mínimo: Xₘᵢₙ = **${min}** | Máximo: Xₘₐₓ = **${max}**`,
                `Rango = ${max} − ${min} = **${formatDecimals(r)}**`
            ],
            tablas: [],
            resultado: formatDecimals(r),
            resultadoLabel: `Rango de ${data.length} datos`,
            min: min,
            max: max
        };
    },

    calcVarianza(data) {
        const n = data.length;
        const sumaTotal = data.reduce((acc, val) => acc + val, 0);
        const xbar = sumaTotal / n;
        
        let sumSq = 0;
        const rowsDetallado = data.map((xi, i) => {
            const dif = xi - xbar;
            const difSq = dif ** 2;
            sumSq += difSq;
            return [
                (i + 1).toString(),
                formatDecimals(xi),
                formatDecimals(xbar),
                formatDecimals(dif),
                formatDecimals(difSq),
                formatDecimals(sumSq)
            ];
        });
        
        rowsDetallado.push([
            'TOTAL',
            '',
            '',
            '0.00',
            formatDecimals(sumSq),
            ''
        ]);

        const v = sumSq / n;

        // MODO RESUMEN (Frecuencias)
        const freq = {};
        data.forEach(d => { freq[d] = (freq[d] || 0) + 1; });
        const vals = Object.keys(freq).map(Number).sort((a,b)=>a-b);
        let sumSqResumen = 0;
        const rowsResumen = vals.map(xi => {
            const fi = freq[xi];
            const dif = xi - xbar;
            const fiDifSq = fi * (dif ** 2);
            sumSqResumen += fiDifSq;
            return [
                formatDecimals(xi),
                fi.toString(),
                formatDecimals(fiDifSq)
            ];
        });
        
        rowsResumen.push([
            'TOTAL',
            n.toString(),
            formatDecimals(sumSqResumen)
        ]);

        return {
            concepto: 'La varianza representa qué tan dispersos están los datos respecto a su media. Un valor alto indica mayor variabilidad.',
            formula: 'σ² = Σ(xi - x̄)² / n',
            
            detallado: {
                pasos: [
                    `Paso 1: Se calcula la media sumando los datos y dividiéndolos entre n (${n}) → x̄ = **${formatDecimals(xbar)}**`,
                    `Paso 2: Se resta cada dato con la media (Xi - x̄)`,
                    `Paso 3: Se elevan al cuadrado las diferencias (Xi - x̄)²`,
                    `Paso 4: Se suman los resultados obtenidos → Σ = **${formatDecimals(sumSq)}**`,
                    `Paso 5: Se divide la suma entre n (${n}) → **${formatDecimals(v)}**`
                ],
                tablas: [{
                    titulo: 'Cálculo Paso a Paso (Tipo Excel)',
                    encabezados: ['i', 'Xi', 'x̄', 'Xi - x̄', '(Xi - x̄)²', 'Acumulado'],
                    filas: rowsDetallado
                }]
            },
            
            resumen: {
                tablas: [{
                    titulo: 'Cálculo Compacto (Agrupado por Frecuencia)',
                    encabezados: ['xi', 'fi', 'fi·(xi - x̄)²'],
                    filas: rowsResumen
                }]
            },

            resultado: formatDecimals(v),
            resultadoLabel: 'Varianza Poblacional (σ²)',
            
            resultadosIntermedios: {
                media: formatDecimals(xbar),
                sumaCuadrados: formatDecimals(sumSq),
                varianza: formatDecimals(v)
            }
        };
    },

    calcDesvStd(varPop, media) {
        if (varPop == null) throw new Error('Parámetro varianza requerido.');
        const sd = Math.sqrt(varPop);
        
        let interpTexto = '';
        let colorClase = "text-slate-700 bg-slate-50 border-slate-200";
        if (media != null && media !== 0) {
            interpTexto = interpretarDesviacion(sd, media);
            const pct = (sd / Math.abs(media)) * 100;
            if (pct < 10) colorClase = "text-green-700 bg-green-50 border-green-200";
            else if (pct <= 30) colorClase = "text-yellow-700 bg-yellow-50 border-yellow-200";
            else colorClase = "text-red-700 bg-red-50 border-red-200";
        }

        return {
            concepto: 'La desviación estándar indica cuánto se alejan los datos de la media en promedio. Mide la dispersión en las mismas unidades que los datos originales.',
            formula: 'σ = √σ²',
            
            detallado: {
                pasos: [
                    `Se toma la varianza previamente calculada (σ² = ${formatDecimals(varPop)})`,
                    `Se aplica la raíz cuadrada matemática a la varianza`,
                    `Se obtiene la desviación estándar (σ)`
                ],
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-sm space-y-2">
                        <div>σ = √σ²</div>
                        <div>σ = √${formatDecimals(varPop)}</div>
                        <div class="font-bold text-blue-700 text-base">σ = ${formatDecimals(sd)}</div>
                    </div>
                `
            },
            
            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-center">
                        σ = √${formatDecimals(varPop)} = <strong class="text-blue-700">${formatDecimals(sd)}</strong>
                    </div>
                `
            },

            resultado: formatDecimals(sd),
            resultadoLabel: 'Desviación Estándar (σ)',
            
            resultadosIntermedios: {
                varianza: formatDecimals(varPop),
                desviacion: formatDecimals(sd)
            },

            interpretacionHtml: interpTexto ? `
                <div class="${colorClase} rounded-xl p-6 shadow-sm mt-8 border">
                    <h4 class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">💡 Interpretación del resultado</h4>
                    <p class="font-medium text-lg mb-1">${interpTexto}</p>
                    <p class="opacity-90 text-sm">La desviación estándar indica que, en promedio, los datos se alejan aproximadamente <strong>${formatDecimals(sd)}</strong> unidades de la media.</p>
                </div>
            ` : ''
        };
    },

    calcCoefVar(media, desviacion) {
        if (media == null || desviacion == null) throw new Error('Parámetros media y desviación requeridos.');
        if (media === 0) throw new Error('La media no puede ser cero para calcular el CV.');
        
        const cv = (desviacion / Math.abs(media)) * 100;
        const interpTexto = interpretarCV(cv);
        
        let colorClase = "text-red-700 bg-red-50 border-red-200";
        if (cv < 10) colorClase = "text-green-700 bg-green-50 border-green-200";
        else if (cv < 30) colorClase = "text-yellow-700 bg-yellow-50 border-yellow-200";

        return {
            concepto: 'El coeficiente de variación mide la dispersión relativa de los datos respecto a la media.',
            formula: 'CV = (σ / |x̄|) × 100',
            
            detallado: {
                pasos: [
                    `Se toma la desviación estándar previamente calculada (σ = ${formatDecimals(desviacion)})`,
                    `Se toma la media previamente calculada (x̄ = ${formatDecimals(media)})`,
                    `Se divide σ entre el valor absoluto de la media (|x̄|)`,
                    `Se multiplica el resultado por 100 para expresarlo numéricamente en porcentaje (%)`
                ],
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-sm space-y-2">
                        <div>CV = (σ / |x̄|) × 100</div>
                        <div>CV = (${formatDecimals(desviacion)} / |${formatDecimals(media)}|) × 100</div>
                        <div class="font-bold text-blue-700 text-base">CV = ${formatDecimals(cv)}%</div>
                    </div>
                `
            },
            
            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-center">
                        CV = (${formatDecimals(desviacion)} / |${formatDecimals(media)}|) × 100 = <strong class="text-blue-700">${formatDecimals(cv)}%</strong>
                    </div>
                `
            },

            resultado: `${formatDecimals(cv)}%`,
            resultadoLabel: 'Coeficiente de Variación (CV)',
            
            resultadosIntermedios: {
                media: formatDecimals(media),
                desviacion: formatDecimals(desviacion),
                cv: formatDecimals(cv)
            },

            interpretacionHtml: `
                <div class="${colorClase} rounded-xl p-6 shadow-sm mt-8 border">
                    <h4 class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">💡 Interpretación del resultado</h4>
                    <p class="font-medium text-lg mb-1">${interpTexto}</p>
                    <p class="opacity-90 text-sm">El coeficiente de variación indica que los datos presentan ${interpTexto.toLowerCase()}, lo que significa que ${
                        cv < 10 ? 'están agrupados de forma muy compacta cerca de la media.' :
                        cv < 30 ? 'existe una dispersión considerable respecto a la media.' :
                        'existe una alta separación entre los datos y una baja representatividad de la media.'
                    }</p>
                </div>
            `
        };
    },

    // ── MEDIAS ESPECIALES ─────────────────────────────────
    calcMediaMovil(data, k) {
        if (!k || k < 2) k = 3;
        if (data.length < k) throw new Error(`Se necesitan al menos ${k} datos para evaluar este orden.`);
        
        const mm = [];
        const mmValues = [];
        const n = data.length;

        for (let i = 0; i <= n - k; i++) {
            const sumData = data.slice(i, i + k);
            const sum = sumData.reduce((a, b) => a + b, 0);
            const val = sum / k;
            
            // detailed format: i, (18, 20, 20), suma, media
            mm.push([
                (i + 1).toString(),
                `(${sumData.join(', ')})`,
                formatDecimals(sum),
                formatDecimals(val)
            ]);
            mmValues.push(val);
        }

        const resumenRows = mm.map((row) => [row[0], row[3]]);

        const labels = Array.from({length: n}, (_, i) => String(i + 1));
        const chartDataMM = Array(k - 1).fill(null).concat(mmValues);

        return {
            concepto: 'La media móvil permite observar la tendencia general de los datos suavizando las variaciones. Se obtiene calculando promedios sobre subconjuntos consecutivos.',
            formula: `MM (orden ${k}) = (Xᵢ + Xᵢ₊₁ + ... + Xᵢ₊ₖ₋₁) / ${k}`,
            
            detallado: {
                pasos: [
                    `Se seleccionan subconjuntos consecutivos de tamaño k = ${k}`,
                    `Se suman los valores del subconjunto actual`,
                    `Se divide entre k (${k})`,
                    `Se repite el proceso iterando para toda la serie`
                ],
                tablas: [
                    { titulo: `Cálculo Paso a Paso (Orden ${k})`, encabezados: ['i', 'Subconjunto', 'Suma', 'Media Móvil'], filas: mm }
                ]
            },
            
            resumen: {
                tablas: [
                    { titulo: `Resumen de Media Móvil (Orden ${k})`, encabezados: ['Índice', 'Media Móvil'], filas: resumenRows }
                ]
            },

            resultado: `${mm.length} promedios`,
            resultadoLabel: `MM obtenidas de Orden ${k}`,
            
            resultadosIntermedios: {
                ordenEvaluar: k,
                promediosExtrapolados: mm.length
            },

            datosGrafico: {
                type: 'line',
                labels: labels,
                datasets: [
                    {
                        label: 'Datos Originales',
                        data: data,
                        borderColor: 'rgba(156, 163, 175, 1)',
                        backgroundColor: 'rgba(156, 163, 175, 0.2)',
                        borderWidth: 1,
                        tension: 0.3
                    },
                    {
                        label: `Media Móvil (Tendencia k=${k})`,
                        data: chartDataMM,
                        borderColor: 'rgba(37, 99, 235, 1)',
                        backgroundColor: 'rgba(37, 99, 235, 0.2)',
                        borderWidth: 3,
                        tension: 0.3
                    }
                ]
            },

            interpretacionHtml: `
                <div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-6 shadow-sm mt-8">
                    <h4 class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">💡 Interpretación del resultado</h4>
                    <p class="font-medium text-sm text-blue-900 leading-relaxed">La media móvil permite observar la tendencia general de los datos suavizando las variaciones a corto plazo. Permite visualizar con mayor claridad si los valores reales tienden a subir o bajar globalmente a lo largo del periodo, atenuando picos atípicos.</p>
                </div>
            `
        };
    },

    calcSerieMediasMoviles(data) {
        const n = data.length;
        const mm3 = Array(n).fill(null);
        const mm4_1 = Array(n).fill(null);
        const mm4_2 = Array(n).fill(null);

        // MM3: Empieza en i=2 (el 3er dato)
        for (let i = 2; i < n; i++) {
            mm3[i] = (data[i] + data[i-1] + data[i-2]) / 3;
        }

        // MM4,1: Empieza en i=3 (el 4to dato)
        for (let i = 3; i < n; i++) {
            mm4_1[i] = (data[i] + data[i-1] + data[i-2] + data[i-3]) / 4;
        }

        // MM4,2: Empieza en i=4 (promedio de dos MM4,1 consecutivos)
        for (let i = 4; i < n; i++) {
            if (mm4_1[i] !== null && mm4_1[i-1] !== null) {
                mm4_2[i] = (mm4_1[i] + mm4_1[i-1]) / 2;
            }
        }

        return {
            mm3: mm3.map(v => v !== null ? formatDecimals(v) : null),
            mm4_1: mm4_1.map(v => v !== null ? formatDecimals(v) : null),
            mm4_2: mm4_2.map(v => v !== null ? formatDecimals(v) : null)
        };
    },

    calcMediaGeometrica(data) {
        if (data.some(d => d <= 0)) throw new Error('La media geométrica no admite valores negativos ni cero');
        
        const n = data.length;

        // Usar logaritmos para evitar desbordamiento (Infinity) con datasets grandes
        // MG = exp( Σ ln(xi) / n )  — matemáticamente equivalente a ⁿ√(Π xi)
        const logSum = data.reduce((acc, x) => acc + Math.log(x), 0);
        const mg = Math.exp(logSum / n);

        // El producto directo solo se muestra si n ≤ 50 (sino daría Infinity)
        const prodMostrar = n <= 50
            ? formatDecimals(data.reduce((a, b) => a * b, 1))
            : 'muy grande (se usa método logarítmico)';

        const rowsDetallado = data.slice(0, 500).map((d, i) => [
            (i + 1).toString(),
            formatDecimals(d),
            formatDecimals(Math.log(d))
        ]);
        if (n > 500) rowsDetallado.push(['...', `(${n - 500} filas omitidas)`, '']);

        return {
            concepto: 'La media geométrica se utiliza para promediar datos multiplicativos o tasas de crecimiento.',
            formula: 'MG = ⁿ√(x₁ · x₂ · ... · xₙ) = exp(Σln(xᵢ)/n)',
            
            detallado: {
                pasos: [
                    `Se calcula el logaritmo natural de cada dato`,
                    `Σ ln(xᵢ) = **${formatDecimals(logSum)}**`,
                    `Se divide entre n (${n}): ${formatDecimals(logSum)} / ${n} = **${formatDecimals(logSum / n)}**`,
                    `Se aplica la exponencial: exp(${formatDecimals(logSum / n)}) = **${formatDecimals(mg)}**`
                ],
                tablas: [{
                    titulo: 'Datos y Logaritmos Naturales',
                    encabezados: ['i', 'Xi', 'ln(Xi)'],
                    filas: rowsDetallado
                }],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-sm space-y-2">
                        <div>MG = exp(Σ ln(xᵢ) / n)</div>
                        <div>Σ ln(xᵢ) = ${formatDecimals(logSum)} | n = ${n}</div>
                        <div>exp(${formatDecimals(logSum / n)})</div>
                        <div class="font-bold text-blue-700 text-base">MG = ${formatDecimals(mg)}</div>
                    </div>
                `
            },

            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-center">
                        MG = exp(${formatDecimals(logSum / n)}) = <strong class="text-blue-700">${formatDecimals(mg)}</strong>
                    </div>
                `
            },

            resultado: formatDecimals(mg),
            resultadoLabel: 'Media Geométrica (MG)',

            resultadosIntermedios: {
                productoTotal: prodMostrar,
                logSum: formatDecimals(logSum),
                raiz_n: n
            },

            interpretacionHtml: `
                <div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-6 shadow-sm mt-8">
                    <h4 class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">💡 Interpretación del resultado</h4>
                    <p class="font-medium text-sm text-blue-900 leading-relaxed">La media geométrica representa el crecimiento promedio proporcional de los datos. Es útil cuando los valores tienen comportamiento multiplicativo o provienen de tasas y porcentajes.</p>
                </div>
            `
        };
    },

    calcMediaArmonica(data) {
        if (data.some(d => d === 0)) throw new Error('Ningún valor puede ser cero');
        const n = data.length;
        let sumRecip = 0;
        
        const filasTabla = data.map((xi, index) => {
            const recip = 1 / xi;
            sumRecip += recip;
            return [`1/${formatDecimals(xi)}`, formatDecimals(recip)];
        });
        
        // Clonar las filas para la web y agregar totales
        const filasWeb = [...filasTabla, ['TOTAL', formatDecimals(sumRecip)]];

        const mh = n / sumRecip;
        return {
            concepto: 'n dividido entre la suma de los recíprocos de los valores.',
            formula: 'MH = n / Σ(1/xᵢ)',
            detallado: {
                pasos: [
                    `Se calculan los recíprocos (1/xᵢ) de cada observación`,
                    `Se suman los recíprocos parciales: Σ(1/xᵢ) = **${formatDecimals(sumRecip)}**`,
                    `Se divide la cantidad de valores (n) entre la sumatoria de recíprocos`,
                    `MH = ${n} / ${formatDecimals(sumRecip)} = **${formatDecimals(mh)}**`
                ],
                tablas: [{
                    titulo: 'Cálculo de Recíprocos',
                    encabezados: ['1/xᵢ', 'Valor'],
                    filas: filasWeb
                }],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-sm space-y-2">
                        <div>MH = n / Σ(1/xᵢ)</div>
                        <div>MH = ${n} / ${formatDecimals(sumRecip)}</div>
                        <div class="font-bold text-blue-700 text-base">MH = ${formatDecimals(mh)}</div>
                    </div>
                `
            },
            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-center">
                        MH = ${n} / ${formatDecimals(sumRecip)} = <strong class="text-blue-700">${formatDecimals(mh)}</strong>
                    </div>
                `
            },
            resultado: formatDecimals(mh),
            resultadoLabel: `Media Armónica (MH)`,
            resultadosIntermedios: {
                sumReciprocos: formatDecimals(sumRecip),
                n: n
            },
            filasTablaExcel: filasTabla
        };
    },

    // ── POSICIÓN ──────────────────────────────────────────
    calcCuartiles(data) {
        const s = sortAsc(data);
        const n = s.length;
        const q1 = interpolate(s, 1 * (n + 1) / 4);
        const q2 = interpolate(s, 2 * (n + 1) / 4);
        const q3 = interpolate(s, 3 * (n + 1) / 4);
        const iqr = q3 - q1;
        return {
            concepto: 'Dividen los datos en cuatro partes iguales (25% cada una).',
            formula: 'Qₖ = valor en posición k(n+1)/4',
            pasos: [
                `Posición Q1 = 1 × (${n}+1)/4 → **Q1 = ${formatDecimals(q1)}**`,
                `Posición Q2 = 2 × (${n}+1)/4 → **Q2 = ${formatDecimals(q2)}** (mediana)`,
                `Posición Q3 = 3 × (${n}+1)/4 → **Q3 = ${formatDecimals(q3)}**`,
                `IQR = Q3 − Q1 = **${formatDecimals(iqr)}**`
            ],
            tablas: [{
                titulo: 'Cuartiles',
                encabezados: ['Cuartil', 'Fórmula', 'Valor'],
                filas: [
                    ['Q1 (25%)', 'i(n+1)/4', formatDecimals(q1)],
                    ['Q2 (50%)', 'i(n+1)/4', `${formatDecimals(q2)} (mediana)`],
                    ['Q3 (75%)', 'i(n+1)/4', formatDecimals(q3)],
                    ['IQR', 'Q3 − Q1', formatDecimals(iqr)]
                ]
            }],
            resultado: `Q1=${formatDecimals(q1)} Q2=${formatDecimals(q2)} Q3=${formatDecimals(q3)}`,
            resultadoLabel: `IQR = ${formatDecimals(iqr)}`,
            q1Val: formatDecimals(q1),
            q2Val: formatDecimals(q2),
            q3Val: formatDecimals(q3),
            iqrVal: formatDecimals(iqr)
        };
    },

    calcDeciles(data) {
        const s = sortAsc(data);
        const n = s.length;
        const ds = [];
        for (let k = 1; k <= 9; k++) {
            const pos = k * (n + 1) / 10;
            ds.push([`D${k}`, `${k*10}%`, formatDecimals(pos), formatDecimals(interpolate(s, pos))]);
        }
        return {
            concepto: 'Los deciles D1–D9 dividen los datos en 10 partes iguales.',
            formula: 'Dₖ = valor en posición k(n+1)/10',
            pasos: [
                `Posición para Dₖ: k × (${n}+1) / 10`,
                `D5 coincide con la mediana`
            ],
            tablas: [{
                titulo: 'Deciles',
                encabezados: ['Decil', 'Porcentaje', 'Posición', 'Valor'],
                filas: ds
            }],
            resultado: ds[4][3],
            resultadoLabel: 'D5 (Mediana)'
        };
    },

    calcPercentiles(data) {
        const s = sortAsc(data);
        const n = s.length;
        const ps = Array.from({ length: 99 }, (_, i) => i + 1);
        const rows = ps.map(p => {
            const pos = p * (n + 1) / 100;
            return [`P${p}`, `${p}%`, formatDecimals(pos), formatDecimals(interpolate(s, pos))];
        });
        return {
            concepto: 'Los percentiles P1–P99 dividen los datos en 100 partes iguales.',
            formula: 'Pₖ = valor en posición k(n+1)/100',
            pasos: [
                `Posición para Pₖ: k × (${n}+1) / 100`,
                `Se calculan los 99 percentiles.`,
                `P25 = Q1, P50 = Mediana, P75 = Q3`
            ],
            tablas: [{
                titulo: 'Percentiles (P1 - P99)',
                encabezados: ['Percentil', 'Porcentaje', 'Posición', 'Valor'],
                filas: rows
            }],
            resultado: formatDecimals(interpolate(s, 50 * (n + 1) / 100)),
            resultadoLabel: 'P50 (Mediana)'
        };
    },

    // ── FRECUENCIAS ───────────────────────────────────────
    calcFrecuencias(data, tipoGrafico = 'barras') {
        const s = sortAsc(data);
        const n = s.length;
        const counts = {};
        s.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        
        const Xis = Object.keys(counts).map(Number).sort((a,b)=>a-b);
        let Fi_acum = 0;
        let Fri_acum = 0;
        
        const rows = [];
        const labels = [];
        const data_fi = [];
        const data_porcentajes = [];

        Xis.forEach((x, index) => {
           const fi = counts[x];
           Fi_acum += fi;
           const fri = fi / n;
           Fri_acum += fri;
           const pct = fri * 100;
           
           rows.push([
               (index + 1).toString(),
               formatDecimals(x),
               fi.toString(),
               Fi_acum.toString(),
               formatDecimals(fri),
               formatDecimals(Fri_acum),
               formatDecimals(pct) + '%'
           ]);

           labels.push(x.toString());
           data_fi.push(fi);
           data_porcentajes.push(pct);
        });

        const sumFi = Fi_acum;
        const sumFri = Math.min(Fri_acum, 1);
        const sumPct = sumFri * 100;

        rows.push([
            '',
            '**Totales**',
            `**${sumFi}**`,
            '',
            `**${formatDecimals(sumFri)}**`,
            '',
            `**${formatDecimals(sumPct)}%**`
        ]);

        let chartType = 'bar';
        let chartData = data_fi;
        let chartLabel = 'Frecuencia Absoluta (fi)';

        if (tipoGrafico === 'linea') {
            chartType = 'line';
            chartData = data_fi;
            chartLabel = 'Polígono de Frecuencias (fi)';
        } else if (tipoGrafico === 'pastel') {
            chartType = 'pie';
            chartData = data_porcentajes;
            chartLabel = 'Porcentaje (%)';
        }

        // Frecuencias Agrupadas (Sturges)
        const agrupada = this.calcFrecuenciasAgrupadas(data);
        const filasAgrupadas = agrupada.filas.map(row => [
            row[0], row[1], row[2], row[10], row[3], row[5], row[6], row[7], row[8], row[9]
        ]);

        // Formateador limpio: muestra enteros sin decimales, decimales sin ceros extra, coma decimal
        const cln = v => parseFloat(Number(v).toFixed(2)).toString().replace('.', ',');
        const R_str  = cln(agrupada.R);
        const k_str  = agrupada.k.toString();
        const A_str  = cln(agrupada.A);
        const min_str = cln(agrupada.min);

        return {
            concepto: 'La distribución de frecuencias agrupa los datos en clases para analizar su comportamiento mediante frecuencias absolutas, relativas y porcentuales.',
            formula: `k = REDONDEAR.MAS(1 + 3.322 × log₁₀(n), 0)\nA = REDONDEAR(R / k, 2)\nLi₁ = Xmín  |  Li(i+1) = Ls(i)\nLs = Li + A`,

            detallado: {
                pasos: [
                    `**Rango:** R = Xmáx − Xmín = ${cln(agrupada.max)} − ${min_str} = **${R_str}**`,
                    `**Número de clases:** k = 1 + 3,322 × log₁₀(${n}) = **${k_str}**`,
                    `**Amplitud:** A = R / k = ${R_str} / ${k_str} = **${A_str}**`,
                    `**Límite inferior (Li):** Li₁ = Xmín = ${min_str} | Li(i+1) = Ls del intervalo anterior`,
                    `**Límite superior (Ls):** Ls = Li + A = Li + ${A_str}`
                ],
                tablas: [
                    {
                        titulo: `Distribución de Frecuencias Agrupadas — k=${k_str} clases, A=${A_str}`,
                        encabezados: ['Clase', 'Límite inferior', 'Límite superior', 'INTERVALO', 'fi', 'fri', 'FI', 'FRI', '%', '% Acum'],
                        filas: filasAgrupadas
                    }
                ]
            },

            resumen: {
                tablas: [
                    {
                        titulo: `Distribución Agrupada — k=${k_str}, A=${A_str}`,
                        encabezados: ['Clase', 'Límite inferior', 'Límite superior', 'INTERVALO', 'fi', 'fri', 'FI', 'FRI', '%', '% Acum'],
                        filas: filasAgrupadas
                    }
                ]
            },

            resultado: formatDecimals(sumFi),
            resultadoLabel: 'Datos procesados (n)',

            resultadosIntermedios: {
                'Número de datos (n)': n,
                'Rango (R)': R_str,
                'Número de clases (k)': k_str,
                'Amplitud (A)': A_str,
                'Xmín': min_str,
                'Suma fi': sumFi
            },

            datosGrafico: {
                type: chartType,
                labels: labels,
                data: chartData,
                label: chartLabel
            },

            interpretacionHtml: `
                <div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-6 shadow-sm mt-8">
                    <h4 class="text-xs font-bold uppercase tracking-wider mb-2 opacity-80">💡 Interpretación del resultado</h4>
                    <p class="font-medium text-sm text-blue-900 leading-relaxed">Se usaron <strong>k = ${k_str} clases</strong> (Sturges) con amplitud <strong>A = ${A_str}</strong> sobre un Rango R = ${R_str}. Los datos se distribuyen en intervalos uniformes de igual amplitud.</p>
                </div>
            `
        };
    },

    // ── FORMA ─────────────────────────────────────────────
    calcCurtosis(data) {
        const n = data.length;
        const xbar = mean(data);
        const s2 = variance(data);
        const sigma = Math.sqrt(s2);
        const sigma4 = s2 * s2;
        
        let sumPotencias4 = 0;
        const rowsDetallado = data.map((xi, i) => {
            const dif = xi - xbar;
            const dif4 = dif ** 4;
            sumPotencias4 += dif4;
            return [
                (i + 1).toString(),
                formatDecimals(xi),
                formatDecimals(xbar),
                formatDecimals(dif),
                formatDecimals(dif4)
            ];
        });

        // Pearson's coefficient (K)
        const K = sumPotencias4 / (n * sigma4);
        const exceso = K - 3;
        const tipo = Math.abs(exceso) < 0.1 ? 'Mesocúrtica' : exceso > 0 ? 'Leptocúrtica' : 'Platicúrtica';
        
        return {
            concepto: 'Grado de apuntamiento comparado con la normal (K=3). Una curtosis positiva (Leptocúrtica) indica mayor concentración cerca de la media.',
            formula: 'K = [Σ(xᵢ - x̄)⁴ / (n · σ⁴)] - 3',
            formulaHtml: `
                <div class="flex flex-col items-center font-mono text-emerald-400">
                    <div class="flex items-center gap-2">
                        <span>K =</span>
                        <div class="flex flex-col items-center">
                            <span class="border-b border-emerald-400/50 px-2 pb-1">Σ(xᵢ - x̄)⁴</span>
                            <span class="pt-1">n · σ⁴</span>
                        </div>
                        <span>- 3</span>
                    </div>
                </div>
            `,
            
            detallado: {
                pasos: [
                    `Paso 1: Media x̄ = **${formatDecimals(xbar)}**`,
                    `Paso 2: Se restan los datos de la media (Xi - x̄)`,
                    `Paso 3: Se elevan a la cuarta potencia (Xi - x̄)⁴`,
                    `Paso 4: Sumatoria de potencias Σ = **${formatDecimals(sumPotencias4)}**`,
                    `Paso 5: Denominador (n · σ⁴) = ${n} · ${formatDecimals(sigma4)} = **${formatDecimals(n * sigma4)}**`,
                    `Paso 6: División (Σ / denom) = **${formatDecimals(K)}**`,
                    `Paso 7: Restar 3: ${formatDecimals(K)} − 3 = **${formatDecimals(exceso)}**`
                ],
                tablas: [{
                    titulo: 'Cálculo de Desviaciones a la Cuarta',
                    encabezados: ['i', 'Xi', 'x̄', 'Xi - x̄', '(Xi - x̄)⁴'],
                    filas: rowsDetallado
                }],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-6 bg-slate-900 dark:bg-black rounded-2xl border border-slate-800 font-mono text-emerald-400 text-sm space-y-4 shadow-xl">
                        <div class="text-xs uppercase text-slate-500 font-bold tracking-widest mb-2 border-b border-slate-800 pb-2">Desglose de Operación Final</div>
                        <div class="flex justify-between"><span>Σ(xᵢ - x̄)⁴</span> <span>= ${formatDecimals(sumPotencias4)}</span></div>
                        <div class="flex justify-between"><span>n · σ⁴</span> <span>= ${n} · ${formatDecimals(sigma4)} = ${formatDecimals(n * sigma4)}</span></div>
                        <div class="flex justify-between text-indigo-400 font-bold pt-2 border-t border-slate-800">
                            <span>Cociente</span> <span>= ${formatDecimals(K)}</span>
                        </div>
                        <div class="flex justify-between text-white font-bold text-lg pt-2">
                            <span>K = ${formatDecimals(K)} - 3</span> <span>= ${formatDecimals(exceso)}</span>
                        </div>
                    </div>
                `
            },
            
            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="mt-5 p-4 bg-slate-100 rounded-lg border border-slate-200 font-mono text-slate-800 text-center">
                        K = (${formatDecimals(sumPotencias4)} / ${formatDecimals(n * sigma4)}) - 3 = <strong class="text-blue-700">${formatDecimals(exceso)}</strong>
                    </div>
                `
            },

            resultado: formatDecimals(exceso),
            resultadoLabel: tipo,
            
            resultadosIntermedios: {
                n: n,
                media: formatDecimals(xbar),
                sigma4: formatDecimals(sigma4),
                sumaCuarta: formatDecimals(sumPotencias4),
                denominador: formatDecimals(n * sigma4),
                coeficiente: formatDecimals(K)
            },
            
            filasTablaExcel: rowsDetallado
        };
    },

    calcAsimetria(data) {
        const n = data.length;
        const xbar = mean(data);
        const s2 = variance(data);
        const sigma = Math.sqrt(s2);
        const sigma3 = Math.pow(sigma, 3);
        
        let sumPotencias3 = 0;
        const rowsDetallado = data.map((xi, i) => {
            const dif = xi - xbar;
            const dif3 = Math.pow(dif, 3);
            sumPotencias3 += dif3;
            return [
                (i + 1).toString(),
                formatDecimals(xi),
                formatDecimals(xbar),
                formatDecimals(dif),
                formatDecimals(dif3)
            ];
        });

        // Fisher Coefficient (g1)
        const g1 = sumPotencias3 / (n * sigma3);
        
        // Pearson Coefficient (AS)
        const s = sortAsc(data);
        const med = interpolate(s, 2 * (n + 1) / 4);
        const pearson = 3 * (xbar - med) / sigma;
        
        const tipo = Math.abs(g1) < 0.1 ? 'Simétrica' : g1 > 0 ? 'Asimetría Positiva (derecha)' : 'Asimetría Negativa (izquierda)';

        return {
            concepto: 'Mide si la distribución se inclina hacia la izquierda o derecha en comparación con una distribución simétrica.',
            formula: 'g₁ = Σ(xᵢ-x̄)³ / (n·σ³)',
            formulaHtml: `
                <div class="flex flex-col items-center gap-4 py-2">
                    <div class="flex items-center gap-4">
                        <div class="text-[10px] font-black text-emerald-500 uppercase tracking-widest border-r border-emerald-500/30 pr-4">Fisher (g₁)</div>
                        <div class="flex items-center gap-2 font-mono text-emerald-400">
                            <span>g₁ =</span>
                            <div class="flex flex-col items-center">
                                <span class="border-b border-emerald-400/50 px-2 pb-1">Σ(xᵢ - x̄)³</span>
                                <span class="pt-1">n · σ³</span>
                            </div>
                        </div>
                    </div>
                    <div class="w-full h-[1px] bg-white/5"></div>
                    <div class="flex items-center gap-4">
                        <div class="text-[10px] font-black text-sky-500 uppercase tracking-widest border-r border-sky-500/30 pr-4">Pearson (AS)</div>
                        <div class="flex items-center gap-2 font-mono text-sky-400">
                            <span>AS =</span>
                            <div class="flex flex-col items-center">
                                <span class="border-b border-sky-400/50 px-2 pb-1">3(x̄ − Mₑ)</span>
                                <span class="pt-1">σ</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            
            detallado: {
                pasos: [
                    `Paso 1: Media x̄ = **${formatDecimals(xbar)}**`,
                    `Paso 2: Mediana Mₑ = **${formatDecimals(med)}**`,
                    `Paso 3: Desviación σ = **${formatDecimals(sigma)}**`,
                    `Paso 4: Sumatoria de potencias al cubo Σ = **${formatDecimals(sumPotencias3)}**`,
                    `Paso 5: Cálculo Fisher (g₁): ${formatDecimals(sumPotencias3)} / (${n} · ${formatDecimals(sigma3)}) = **${formatDecimals(g1)}**`,
                    `Paso 6: Cálculo Pearson (AS): 3(${formatDecimals(xbar)} − ${formatDecimals(med)}) / ${formatDecimals(sigma)} = **${formatDecimals(pearson)}**`,
                    `Clasificación: **${tipo}**`
                ],
                tablas: [{
                    titulo: 'Cálculo de Desviaciones al Cubo (Fisher)',
                    encabezados: ['i', 'Xi', 'x̄', 'Xi - x̄', '(Xi - x̄)³'],
                    filas: rowsDetallado
                }],
                operacionesGeneralesHtml: `
                    <div class="space-y-6">
                        <!-- Fisher -->
                        <div class="p-6 bg-slate-900 dark:bg-black rounded-2xl border border-slate-800 font-mono text-emerald-400 text-sm space-y-3 shadow-xl">
                            <div class="text-[10px] uppercase text-emerald-500/70 font-black tracking-widest mb-1">Fórmula de Fisher (g₁)</div>
                            <div class="flex justify-between"><span>Σ(xᵢ - x̄)³</span> <span>= ${formatDecimals(sumPotencias3)}</span></div>
                            <div class="flex justify-between"><span>n · σ³</span> <span>= ${n} · ${formatDecimals(sigma3)} = ${formatDecimals(n * sigma3)}</span></div>
                            <div class="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-800">
                                <span>g₁</span> <span>= ${formatDecimals(g1)}</span>
                            </div>
                        </div>
                        
                        <!-- Pearson -->
                        <div class="p-6 bg-slate-900 dark:bg-black rounded-2xl border border-slate-800 font-mono text-sky-400 text-sm space-y-3 shadow-xl">
                            <div class="text-[10px] uppercase text-sky-500/70 font-black tracking-widest mb-1">Fórmula de Pearson (AS)</div>
                            <div class="flex justify-between"><span>3(x̄ − Mₑ)</span> <span>= 3(${formatDecimals(xbar)} - ${formatDecimals(med)}) = ${formatDecimals(3 * (xbar - med))}</span></div>
                            <div class="flex justify-between"><span>σ</span> <span>= ${formatDecimals(sigma)}</span></div>
                            <div class="flex justify-between text-white font-bold text-lg pt-2 border-t border-slate-800">
                                <span>AS</span> <span>= ${formatDecimals(pearson)}</span>
                            </div>
                        </div>
                    </div>
                `
            },
            
            resumen: {
                tablas: [],
                operacionesGeneralesHtml: `
                    <div class="flex flex-col gap-3 mt-5">
                        <div class="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800 font-mono text-emerald-800 dark:text-emerald-300 text-center text-sm">
                            Fisher (g₁) = <strong class="text-emerald-600 dark:text-emerald-400">${formatDecimals(g1)}</strong>
                        </div>
                        <div class="p-4 bg-sky-50 dark:bg-sky-900/10 rounded-lg border border-sky-100 dark:border-sky-800 font-mono text-sky-800 dark:text-sky-300 text-center text-sm">
                            Pearson (AS) = <strong class="text-sky-600 dark:text-sky-400">${formatDecimals(pearson)}</strong>
                        </div>
                    </div>
                `
            },

            resultado: formatDecimals(g1),
            resultadoLabel: tipo,

            resultadosIntermedios: {
                media: formatDecimals(xbar),
                mediana: formatDecimals(med),
                sigma: formatDecimals(sigma),
                sigma3: formatDecimals(sigma3),
                sumaCubos: formatDecimals(sumPotencias3),
                fisher: formatDecimals(g1),
                pearson: formatDecimals(pearson)
            },

            filasTablaExcel: rowsDetallado
        };
    },

    // ── TAMAÑO DE MUESTRA ─────────────────────────────────
    calcMuestra(N = 1000, e = 0.05, p = 0.5, Z = 1.96) {
        const q = 1 - p;
        const numerador = (Z ** 2) * p * q * N;
        const denominador = (e ** 2) * (N - 1) + (Z ** 2) * p * q;
        const n = Math.ceil(numerador / denominador);
        
        return {
            concepto: 'Cálculo del tamaño de muestra necesario para estimar una proporción en una población finita.',
            formula: 'n = (Z² · p · q · N) / (E²(N-1) + Z² · p · q)',
            pasos: [
                `Nivel de confianza: 95% (Z = ${Z})`,
                `Probabilidad de éxito (p): ${p} | Fracaso (q): ${q}`,
                `Error máximo admisible (E): ${e} (${e * 100}%)`,
                `Población (N): ${N}`,
                `Cálculo: (${Z}² · ${p} · ${q} · ${N}) / (${e}²(${N}-1) + ${Z}² · ${p} · ${q})`,
                `Tamaño sugerido: **n = ${n}**`
            ],
            tablas: [],
            resultado: n.toString(),
            resultadoLabel: `n mínima para N=${N}`
        };
    },

    // ── FRECUENCIAS AGRUPADAS ─────────────────────────────
    calcFrecuenciasAgrupadas(data) {
        const s = sortAsc(data);
        const n = s.length;
        const min = s[0];
        const max = s[n - 1];
        const R = max - min;
        
        // Sturges: REDONDEAR (≥0,50 sube, <0,50 baja)
        const k = Math.round(1 + 3.322 * Math.log10(n));
        // Amplitud: REDONDEAR
        const A_rounded = Math.round(R / k) || 1;

        // Formato limpio: sin ceros innecesarios, con coma decimal
        const cln = v => parseFloat(Number(v).toFixed(2)).toString().replace('.', ',');

        let Fi_acum = 0;
        let Fri_acum = 0;
        const filas = [];
        
        for (let i = 0; i < k; i++) {
            // Límites redondeados a 2 decimales para evitar errores de flotante
            const Li = Math.round((min + i * A_rounded) * 100) / 100;
            const Ls = Math.round((Li + A_rounded) * 100) / 100;
            
            const fi = data.filter(d => (i === k - 1) ? (d >= Li && d <= Ls) : (d >= Li && d < Ls)).length;
            Fi_acum += fi;
            const fri = fi / n;
            Fri_acum += fri;

            filas.push([
                (i + 1).toString(),
                cln(Li),
                cln(Ls),
                fi.toString(),
                fi.toString(),
                formatDecimals(fri),
                Fi_acum.toString(),
                formatDecimals(Fri_acum),
                formatDecimals(fri * 100) + '%',
                formatDecimals(Fri_acum * 100) + '%',
                `${cln(Li)} - ${cln(Ls)}`,
                fi.toString()
            ]);
        }

        return {
            n, min, max, R, k, A: A_rounded,
            encabezados: ['Clase', 'Límite inferior', 'Límite superior', 'fi', 'fi', 'fri', 'FI', 'FRI', '%', '% Acum', 'INTERVALO', 'fi'],
            filas
        };
    }
};
