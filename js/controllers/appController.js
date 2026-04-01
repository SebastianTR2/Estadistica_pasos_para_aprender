import { EstadisticaModel } from '../models/estadisticaModel.js';
import { UIView } from '../views/uiView.js';
import { parseData, mean, stdDev, variance } from '../utils/helpers.js';

const MODULES_NO_DATA = [
    'muestreo_simple', 'muestreo_sistematico',
    'muestreo_estratificado', 'muestreo_conglomerados',
    'var_discreta', 'var_continua'
];

export const AppController = {
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
        } else if (['varianza', 'coef_var', 'desv_std', 'media_geometrica'].includes(v) && modoVistaContainer) {
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

