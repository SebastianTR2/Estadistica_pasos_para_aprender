export const TableView = {
    buildTable(tablaDatos) {
        if (!tablaDatos || !tablaDatos.filas || tablaDatos.filas.length === 0) return '';
        
        const ths = tablaDatos.encabezados
            .map(h => `<th class="px-5 py-3 bg-slate-100/80 dark:bg-slate-800/80 font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-left text-xs uppercase tracking-wider">${h}</th>`)
            .join('');
            
        const trs = tablaDatos.filas
            .map(fila => {
                const isLast = fila[0] && fila[0].toString().toUpperCase().includes('TOTAL');
                const rowClass = isLast ? 'font-bold bg-slate-50 dark:bg-slate-800/30 border-t-2 border-slate-300 dark:border-slate-600' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition duration-150';
                
                const tds = fila.map(celda => `<td class="px-5 py-3 ${isLast ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'} border-b border-slate-100 dark:border-slate-800 whitespace-nowrap">${celda}</td>`).join('');
                return `<tr class="${rowClass}">${tds}</tr>`;
            })
            .join('');

        const tituloHtml = tablaDatos.titulo 
            ? `<h4 class="font-bold text-slate-700 dark:text-slate-100 mb-4 text-base flex items-center gap-3">
                <span class="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></span> 
                ${tablaDatos.titulo}
               </h4>` 
            : '';

        return `
            <div class="mb-10 animate-fade-in-up">
                ${tituloHtml}
                <div class="overflow-x-auto bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium backdrop-blur-sm">
                    <table class="w-full text-sm text-left">
                        <thead><tr>${ths}</tr></thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">${trs}</tbody>
                    </table>
                </div>
            </div>
        `;
    }
};
