const library = [
    { length: 4 }, { length: 4 }, { length: 4 }, { length: 4 }
];

const targetWords = ["fostering", "more"];
const likelihoodsByBook = [
    { probs: { fostering: 0.037, more: 0.05 } },
    { probs: { fostering: 0.007, more: 0.05 } },
    { probs: { fostering: 0.015, more: 0.05 } },
    { probs: { fostering: 0.0, more: 0.05 } },
];

let pi_current = library.map(b => 1 / library.length);
console.log("PI 0", pi_current);

for (let k = 0; k < targetWords.length; k++) {
    const word = targetWords[k];
    let matrix_k = [];
    
    if (k === 0) {
        matrix_k = likelihoodsByBook.map(book => {
            const pW = book.probs[word];
            return [pW, 1 - pW];
        });
    } else {
        const prevWord = targetWords[k - 1];
        let num_W_W = 0;
        let num_noW_W = 0;
        
        library.forEach((doc, i) => {
            const pb = 1 / library.length;
            const bookData = likelihoodsByBook[i];
            const pw_prev = bookData.probs[prevWord];
            const pno_w_prev = 1 - pw_prev;
            const pw_curr = bookData.probs[word];
            
            num_W_W += pb * pw_prev * pw_curr;
            num_noW_W += pb * pno_w_prev * pw_curr;
        });
        
        const p_W_prev = pi_current[0];
        const p_noW_prev = pi_current[1];
        
        const p_curr_given_prev = p_W_prev > 0 ? (num_W_W / p_W_prev) : 0;
        const p_curr_given_noPrev = p_noW_prev > 0 ? (num_noW_W / p_noW_prev) : 0;
        
        matrix_k = [
            [p_curr_given_prev, 1 - p_curr_given_prev],
            [p_curr_given_noPrev, 1 - p_curr_given_noPrev]
        ];
    }
    
    console.log(`MATRIX ${k+1}`, matrix_k);
    const next_pi = new Array(matrix_k[0].length).fill(0);
    for (let c = 0; c < matrix_k[0].length; c++) {
        for (let r = 0; r < matrix_k.length; r++) {
            next_pi[c] += pi_current[r] * matrix_k[r][c];
        }
    }
    pi_current = next_pi;
    console.log(`PI ${k+1}`, pi_current);
}
