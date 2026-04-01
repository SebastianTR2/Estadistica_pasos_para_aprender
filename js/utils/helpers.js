/**
 * Funciones puras utilitarias para la aplicación de estadística
 */

export const parseData = (str) => {
    if (!str || !str.trim()) return null;
    const arr = str.split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(Number);
    if (arr.length === 0 || arr.some(isNaN)) return null;
    return arr;
};

export const formatDecimals = (n) => isNaN(n) ? 'N/A' : Number(n).toFixed(2);

export const sortAsc = (arr) => [...arr].sort((a, b) => a - b);

export const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const variance = (arr) => {
    if (arr.length === 0) return 0;
    const xbar = mean(arr);
    return arr.reduce((acc, x) => acc + (x - xbar) ** 2, 0) / arr.length;
};

export const stdDev = (arr) => Math.sqrt(variance(arr));

export const interpolate = (sorted, pos) => {
    const n = sorted.length;
    const lower = Math.floor(pos) - 1;
    const frac  = pos - Math.floor(pos);
    if (lower < 0) return sorted[0];
    if (lower >= n - 1) return sorted[n - 1];
    return sorted[lower] + frac * (sorted[lower + 1] - sorted[lower]);
};

export const interpretarCV = (cv) => {
    if (cv < 10) return "Baja variabilidad (datos homogéneos)";
    if (cv >= 10 && cv < 30) return "Variabilidad moderada";
    return "Alta variabilidad (datos dispersos)";
};

export const interpretarDesviacion = (desviacion, media) => {
    if (media === 0) return "Indeterminada (Media es 0)";
    const pct = (desviacion / Math.abs(media)) * 100;
    if (pct < 10) return "Baja dispersión";
    if (pct >= 10 && pct <= 30) return "Dispersión moderada";
    return "Alta dispersión";
};
