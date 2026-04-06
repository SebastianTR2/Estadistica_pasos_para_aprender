/**
 * excelService.js - Servicio para manejar la lectura de archivos Excel/CSV
 * Utiliza la librería SheetJS (XLSX)
 */

export const ExcelService = {
    /**
     * Lee un archivo y devuelve un mapa de columnas con sus respectivos datos numéricos
     * @param {File} file 
     * @returns {Promise<Object>} Mapeo de { nombreColumna: [datos] }
     */
    async parseExcel(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Trabajamos con la primera hoja por defecto
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertir a JSON (formato de objetos)
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    
                    if (jsonData.length === 0) {
                        return reject(new Error('El archivo está vacío o no tiene un formato válido.'));
                    }

                    // Obtener nombres de todas las columnas
                    const columns = Object.keys(jsonData[0]);
                    const columnData = {};

                    columns.forEach(col => {
                        // Extraer datos de la columna, filtrando solo valores numéricos
                        const values = jsonData
                            .map(row => row[col])
                            .filter(val => val !== undefined && val !== null && !isNaN(parseFloat(val)))
                            .map(val => parseFloat(val));
                        
                        if (values.length > 0) {
                            columnData[col] = values;
                        }
                    });

                    if (Object.keys(columnData).length === 0) {
                        return reject(new Error('No se encontraron columnas de datos numéricos en el archivo.'));
                    }

                    resolve({
                        columns: columnData,
                        rawData: jsonData
                    });
                } catch (err) {
                    reject(new Error('Error al procesar el archivo Excel: ' + err.message));
                }
            };

            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Genera un reporte Excel multi-hoja con todos los cálculos
     */
    exportarReporteCompleto(data, results, samplingInfo, procedures, variableName = 'Valores') {
        const wb = XLSX.utils.book_new();

        // 1. REPORTE PRINCIPAL (DASHBOARD SECUENCIAL)
        const wsMain = XLSX.utils.aoa_to_sheet([]); 
        
        // -- SECCIÓN 1: DATOS (Columna A)
        XLSX.utils.sheet_add_aoa(wsMain, [[variableName]], { origin: "A1" });
        XLSX.utils.sheet_add_aoa(wsMain, data.map(v => [v]), { origin: "A2" });

        // -- SECCIÓN 2: TIPO DE VARIABLE (Columna C-E)
        if (results.tipoVariable) {
            const varRows = [
                ["2. TIPO DE VARIABLE", "", ""],
                ["Identificación", "Característica", "Clasificación"],
                [results.tipoVariable.nombre, results.tipoVariable.regla, results.tipoVariable.valor]
            ];
            XLSX.utils.sheet_add_aoa(wsMain, varRows, { origin: "C1" });
        }

        // -- SECCIÓN 3: TENDENCIA CENTRAL (Columna G-I)
        if (results.tendencia) {
            const tendenciaRows = [
                ["3. TENDENCIA CENTRAL", "", ""],
                ["Medida", "Fórmula", "Valor"],
                ["Media (x̄)", "Σx / n", results.tendencia?.media || ""],
                ["Mediana (Me)", "Pos (n+1)/2", results.tendencia?.mediana || ""],
                ["Moda (Mo)", "Frec Máx", results.tendencia?.moda || ""],
                ["", "", ""],
                ["Cantidad de valores", "n", results.tendencia?.n || ""]
            ];
            XLSX.utils.sheet_add_aoa(wsMain, tendenciaRows, { origin: "G1" });
        }

        // -- SECCIÓN 4: DISPERSIÓN (Columna K-M)
        if (results.dispersion) {
            const dispersionRows = [
                ["4. DISPERSIÓN", "", ""],
                ["Medida", "Fórmula", "Valor"],
                ["Rango", "Max - Min", results.dispersion?.rango || results.frecuenciasAgrupadas?.R || ""],
                ["Varianza (σ²)", "Σ(x-x̄)² / n", results.dispersion?.varianza || ""],
                ["Desv. Estándar (σ)", "√σ²", results.dispersion?.desviacion || ""],
                ["Coef. Variación (CV)", "(σ/x̄)*100", results.dispersion?.cv || ""],
                ["", "", ""],
                ["DETALLES DE RANGO", "", ""],
                ["Mínimo (Xmin):", results.dispersion?.min || "", ""],
                ["Máximo (Xmax):", results.dispersion?.max || "", ""],
                ["Rango (R):", results.dispersion?.rango || "", ""],
                ["", "", ""],
                ["VARIANZA (Cálculo Paso a Paso)", "", "", "", "", ""],
                ["I", "XI", "X̄", "XI - X̄", "(XI - X̄)²", "ACUMULADO"]
            ];

            if (results.dispersion?.tablaVarianza) {
                results.dispersion.tablaVarianza.forEach(vRow => {
                    if (vRow[0] === 'TOTAL') {
                        dispersionRows.push(["TOTAL", "", "", vRow[3], vRow[4], ""]);
                    } else {
                        dispersionRows.push(vRow);
                    }
                });
            }

            XLSX.utils.sheet_add_aoa(wsMain, dispersionRows, { origin: "K1" });
        }

        // -- SECCIÓN 5: MEDIAS ESPECIALES (Columna S-V)
        if (results.especiales) {
            const mgObj = results.especiales?.geometricaObj;
            const mhObj = results.especiales?.armonicaObj;
            const toNum = s => parseFloat(String(s || '0').replace(',', '.')) || 0;
            
            const especialesData = [
                ["5. MEDIAS ESPECIALES", "", "", ""]
            ];
            
            especialesData.push(["", "", "", ""]);

            // Media Geometrica
            if (mgObj) {
                const resIntMG = mgObj.resultadosIntermedios || {};
                const mgVal = toNum(mgObj.resultado);
                
                especialesData.push(
                    ["", "Fórmula", "Valor", ""],
                    ["Media Geométrica", "exp(Σln(xᵢ)/n)", mgVal, ""],
                    ["Σ ln(xᵢ)", "", toNum(resIntMG.logSum), ""],
                    ["n", "", resIntMG.raiz_n || data.length, ""],
                    ["MG = exp(Σln/n)", "Resultado", mgVal, ""]
                );
            }
            
            especialesData.push(["", "", "", ""]);

            // Media Armonica
            if (mhObj) {
                especialesData.push(["", "Media Armónica", "", ""]);
                especialesData.push(["1/xᵢ", "Valor", "Σ(1/xᵢ)", "n / Σ(1/xᵢ)"]);
                
                const filas = mhObj.filasTablaExcel || [];
                const MAX_MH = 500;
                const filasLimitadas = filas.slice(0, MAX_MH);

                if (filasLimitadas.length > 0) {
                    especialesData.push([
                        filasLimitadas[0][0], 
                        toNum(filasLimitadas[0][1]), 
                        toNum(mhObj.resultadosIntermedios?.sumReciprocos), 
                        toNum(mhObj.resultado)
                    ]);
                    
                    for (let i = 1; i < filasLimitadas.length; i++) {
                        especialesData.push([filasLimitadas[i][0], toNum(filasLimitadas[i][1]), "", ""]);
                    }
                }
                if (filas.length > MAX_MH) {
                    especialesData.push(["...", `(${filas.length - MAX_MH} filas omitidas)`, "", ""]);
                }
            }

            especialesData.push(["", "", "", ""]);
            especialesData.push(["Medias Moviles", "", "", ""]);
            especialesData.push(["MM3", "MM4,1", "MM4,2", ""]);

            // Tabla Detallada de Medias Móviles
            if (results.especiales?.seriesMM) {
                const mmData = results.especiales.seriesMM;
                const numDatos = mmData.mm3.length;
                for (let i = 0; i < numDatos; i++) {
                    especialesData.push([
                        mmData.mm3[i] ? toNum(mmData.mm3[i]) : "", 
                        mmData.mm4_1[i] ? toNum(mmData.mm4_1[i]) : "", 
                        mmData.mm4_2[i] ? toNum(mmData.mm4_2[i]) : "",
                        ""
                    ]);
                }
            }
            
            XLSX.utils.sheet_add_aoa(wsMain, especialesData, { origin: "S1" });
        }

        // -- SECCIÓN 6: POSICIÓN (Columna Y-AB)
        if (results.posicion) {
            const posicionRows = [
                ["6. MEDIDAS DE POSICIÓN", "", "", ""],
                ["Cuartiles", "Fórmula", "Valor", ""],
                ["Q1 (25%)", "i(n+1)/4", results.posicion?.q1 || "", ""],
                ["Q2 (50%)", "i(n+1)/4", results.posicion?.q2 || "", ""],
                ["Q3 (75%)", "i(n+1)/4", results.posicion?.q3 || "", ""],
                ["", "", "", ""]
            ];
            
            // Deciles
            posicionRows.push(["Deciles", "i(n+1)/10", "", ""]);
            posicionRows.push(["DECIL", "PORCENTAJE", "POSICIÓN", "VALOR"]);
            if (results.posicion?.fullDeciles) {
                results.posicion.fullDeciles.forEach((d) => {
                    posicionRows.push([d[0], d[1], d[2], d[3]]);
                });
            }
            
            posicionRows.push(["", "", "", ""]);
            
            // Percentiles
            posicionRows.push(["Percentiles (P1-P99)", "i(n+1)/100", "", ""]);
            posicionRows.push(["PERCENTIL", "PORCENTAJE", "POSICIÓN", "VALOR"]);
            if (results.posicion?.fullPercentiles) {
                results.posicion.fullPercentiles.forEach(p => {
                    posicionRows.push([p[0], p[1], p[2], p[3]]);
                });
            }
            XLSX.utils.sheet_add_aoa(wsMain, posicionRows, { origin: "Y1" });
        }

        // -- SECCIÓN 7: DISTRIBUCIÓN DE FRECUENCIAS (Columna AD...)
        if (results.frecuenciasAgrupadas) {
            const fa = results.frecuenciasAgrupadas;

            const seccion7 = [
                ["7. DISTRIBUCIÓN DE FRECUENCIAS", "", ""],
                ["", "FÓRMULA", "VALOR"],
                ["Número de clases", "k = 1+3.322 × log₁₀(n)", fa.k || ""],
                ["Amplitud",         "A = R / k",              fa.A || ""],
                ["", "", ""],
                ["Clase", "Límite inferior", "Límite superior", "INTERVALO", "fi", "fri", "FI", "FRI", "%", "% Acum"]
            ];

            // Columnas: Clase, Li, Ls, INTERVALO, fi, fri, FI, FRI, %, % Acum
            fa.filas.forEach(row => {
                seccion7.push([row[0], row[1], row[2], row[10], row[3], row[5], row[6], row[7], row[8], row[9]]);
            });

            XLSX.utils.sheet_add_aoa(wsMain, seccion7, { origin: "AD1" });
        }

        // -- SECCIÓN 8: FORMA (Al final, Columna AP...)
        if (results.forma) {
            const asVal    = parseFloat(String(results.forma?.sesgo   || '0').replace(',', '.')) || 0;
            const kuVal    = parseFloat(String(results.forma?.curtosis || '0').replace(',', '.')) || 0;
            const kuObj    = results.forma.kuObj;
            const asObj    = results.forma.asObj;
            
            const formaRows = [
                ["8. MEDIDAS DE FORMA", "", "", "", ""],
                ["", "", "", "", ""]
            ];

            // ── ASIMETRÍA (SESGO) ──────────────────────────────────────────
            if (asObj) {
                const resIntAs = asObj.resultadosIntermedios;

                // Helper: string con coma → número
                const toNum = s => parseFloat(String(s || '0').replace(',', '.')) || 0;
                
                const sumaCubos      = toNum(resIntAs?.sumaCubos);
                const sigmaVal       = toNum(resIntAs?.sigma);
                const sigma3Val      = toNum(resIntAs?.sigma3);
                const g1Val          = toNum(asObj.resultado);
                const pearsonVal     = toNum(resIntAs?.pearson);
                const mediaVal       = toNum(resIntAs?.media);
                const medianaVal     = toNum(resIntAs?.mediana);
                const denomFisher    = toNum(resIntAs?.denominador) || (data.length * Math.pow(sigmaVal, 3));

                formaRows.push(
                    ["ASIMETRÍA (SESGO) — Cálculo Detallado", "", "", "", ""],
                    ["Fórmula Fisher", "g₁ = Σ(xᵢ-x̄)³ / (n · σ³)", "", "", ""],
                    ["Fórmula Pearson", "AS = 3(x̄ - Me) / σ", "", "", ""],
                    ["", "", "", "", ""],
                    ["I", "XI", "X̄", "XI - X̄", "(XI - X̄)³"]
                );

                // Tabla de datos — limitar a 500 filas para no saturar Excel con 1000+ datos
                const filas = asObj.filasTablaExcel || [];
                const MAX_ROWS = 500;
                filas.slice(0, MAX_ROWS).forEach(row => {
                    // Asegurar que los valores son numéricos donde corresponde
                    formaRows.push([
                        row[0],                                            // i
                        parseFloat(String(row[1]).replace(',', '.')) || row[1], // Xi
                        parseFloat(String(row[2]).replace(',', '.')) || row[2], // x̄
                        parseFloat(String(row[3]).replace(',', '.')) || row[3], // Xi - x̄
                        parseFloat(String(row[4]).replace(',', '.')) || row[4]  // (Xi - x̄)³
                    ]);
                });
                if (filas.length > MAX_ROWS) {
                    formaRows.push(["...", `(${filas.length - MAX_ROWS} filas omitidas)`, "", "", ""]);
                }

                // ── Resultados Fisher directamente debajo de la tabla ──
                formaRows.push(
                    ["", "", "", "", ""],
                    ["RESULTADO FISHER (g₁)", "", "", "", ""],
                    ["Σ(xᵢ - x̄)³",       "Suma de cubos",  sumaCubos,   "", ""],
                    ["n",                   "Cantidad datos", data.length, "", ""],
                    ["σ³",                  "Desv.³",         sigma3Val,   "", ""],
                    ["n · σ³",              "Denominador",    denomFisher, "", ""],
                    ["g₁  =  Σ / (n·σ³)",  "FISHER FINAL",   g1Val,       "", ""],
                    ["", "", "", "", ""],
                    // ── Pearson debajo de Fisher ──
                    ["RESULTADO PEARSON (AS)", "", "", "", ""],
                    ["Media (x̄)",          "", mediaVal,    "", ""],
                    ["Mediana (Me)",         "", medianaVal,  "", ""],
                    ["σ",                    "", sigmaVal,    "", ""],
                    ["3(x̄ - Me)",           "", 3 * (mediaVal - medianaVal), "", ""],
                    ["AS  =  3(x̄-Me) / σ", "PEARSON FINAL", pearsonVal, "", ""],
                    ["", "", "", "", ""],
                    // ── Clasificación al final ──
                    ["TIPO DE DISTRIBUCIÓN", "Criterio", "¿Cumple?", "", ""],
                    ["g₁ > 0", "Asimetría Positiva (derecha)",   g1Val >  0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["g₁ = 0", "Simétrica",                       Math.abs(g1Val) <= 0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["g₁ < 0", "Asimetría Negativa (izquierda)", g1Val < -0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["", "", "", "", ""]
                );

            } else {
                formaRows.push(
                    ["Asimetria (Sesgo)", "Fisher g₁", results.forma?.sesgo || "", "", ""],
                    ["Sesgo > 0", "Positiva",  asVal >  0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["Sesgo = 0", "Simétrica", Math.abs(asVal) <= 0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["Sesgo < 0", "Negativa",  asVal < -0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["", "", "", "", ""]
                );
            }

            // ── CURTOSIS ───────────────────────────────────────────────────
            if (kuObj) {
                const toNum2 = s => parseFloat(String(s || '0').replace(',', '.')) || 0;
                const resInt = kuObj.resultadosIntermedios;

                formaRows.push(
                    ["CURTOSIS — Cálculo Detallado", "", "", "", ""],
                    ["Fórmula", "K = [Σ(xᵢ - x̄)⁴ / (n · σ⁴)] - 3", "", "", ""],
                    ["", "", "", "", ""],
                    ["I", "XI", "X̄", "XI - X̄", "(XI - X̄)⁴"]
                );

                const filasKu = kuObj.filasTablaExcel || [];
                const MAX_KU  = 500;
                filasKu.slice(0, MAX_KU).forEach(row => {
                    formaRows.push([
                        row[0],
                        parseFloat(String(row[1]).replace(',', '.')) || row[1],
                        parseFloat(String(row[2]).replace(',', '.')) || row[2],
                        parseFloat(String(row[3]).replace(',', '.')) || row[3],
                        parseFloat(String(row[4]).replace(',', '.')) || row[4]
                    ]);
                });
                if (filasKu.length > MAX_KU) {
                    formaRows.push(["...", `(${filasKu.length - MAX_KU} filas omitidas)`, "", "", ""]);
                }

                formaRows.push(
                    ["", "", "", "", ""],
                    ["RESULTADO CURTOSIS (K)", "", "", "", ""],
                    ["Σ(xᵢ - x̄)⁴",        "Suma potencias⁴", toNum2(resInt?.sumaCuarta),   "", ""],
                    ["n · σ⁴",              "Denominador",      toNum2(resInt?.denominador),  "", ""],
                    ["Cociente Σ / (n·σ⁴)", "",                 toNum2(resInt?.coeficiente),  "", ""],
                    ["K  =  Cociente - 3",  "CURTOSIS FINAL",   toNum2(kuObj?.resultado),     "", ""],
                    ["", "", "", "", ""],
                    ["TIPO DE DISTRIBUCIÓN", "Criterio", "¿Cumple?", "", ""],
                    ["K > 0", "Leptocúrtica", kuVal >  0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["K = 0", "Mesocúrtica",  Math.abs(kuVal) <= 0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["K < 0", "Platicúrtica", kuVal < -0.01 ? "VERDADERO" : "FALSO", "", ""]
                );
            } else {
                formaRows.push(
                    ["Curtosis (K)", "K = [Σ(xᵢ - x̄)⁴ / (n · σ⁴)] - 3", results.forma?.curtosis || "", "", ""],
                    ["K > 0", "Leptocúrtica", kuVal >  0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["K = 0", "Mesocúrtica",  Math.abs(kuVal) <= 0.01 ? "VERDADERO" : "FALSO", "", ""],
                    ["K < 0", "Platicúrtica", kuVal < -0.01 ? "VERDADERO" : "FALSO", "", ""]
                );
            }

            XLSX.utils.sheet_add_aoa(wsMain, formaRows, { origin: "AP1" });
        }

        // Configuración de anchos
        wsMain['!cols'] = [
            { wch: 15 }, { wch: 5 },              // A, B
            { wch: 20 }, { wch: 20 }, { wch: 15 }, // C, D, E (Sección 2)
            { wch: 5 },                           // F
            { wch: 20 }, { wch: 20 }, { wch: 15 }, // G, H, I (Sección 3)
            { wch: 5 },                           // J
            // Sección 4 (K-P): 6 columnas para la Varianza Detallada
            { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 5 }, { wch: 5 },               // Q, R (Spacers)
            // Sección 5 (S-V)
            { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
            { wch: 5 }, { wch: 5 },               // W, X (Spacers)
            // Sección 6 (Y-AB)
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
            { wch: 5 },                           // AC (Spacer)
            // Sección 7 (AD-AM): 10 columnas limpias
            { wch: 8 },  // AD – Clase
            { wch: 14 }, // AE – Límite inferior
            { wch: 14 }, // AF – Límite superior
            { wch: 8 },  // AG – fi
            { wch: 10 }, // AH – fri
            { wch: 8 },  // AI – FI
            { wch: 10 }, // AJ – FRI
            { wch: 8 },  // AK – %
            { wch: 10 }, // AL – % Acum
            { wch: 16 }, // AM – INTERVALO
            { wch: 5 }, { wch: 5 }, { wch: 5 },   // AN, AO, AP (Spacers entre s7 y s8)
            // Sección 8 (AP-AR)
            { wch: 20 }, { wch: 20 }, { wch: 15 }
        ];

        XLSX.utils.book_append_sheet(wb, wsMain, "Reporte Principal");

        // 2. OTROS (Hojas individuales de respaldo)
        if (procedures && procedures.length > 0) {
            const procData = [["MÓDULO", "PASO / PROCEDIMIENTO DETALLADO"]];
            procedures.forEach(p => {
                p.steps.forEach((step, idx) => {
                    procData.push([idx === 0 ? p.module : "", step.replace(/\*\*/g, "")]);
                });
                procData.push(["", ""]);
            });
            const wsProc = XLSX.utils.aoa_to_sheet(procData);
            XLSX.utils.book_append_sheet(wb, wsProc, "Procedimientos (Pasos)");
        }

        const fileName = `Reporte_Unidad1_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
};

