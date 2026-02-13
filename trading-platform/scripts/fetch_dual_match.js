const http = require('http');

const url = 'http://localhost:3000/api/performance-screener?mode=dual-scan&minTrades=3&market=all&topN=20&lookbackDays=730&minConfidence=30';

console.log(`Fetching Dual Match results from ${url}...`);
console.log('This may take a minute due to 1000-day data buffer...');

http.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('JSON Keys:', Object.keys(json));
            if (json.data) console.log('JSON.data Keys:', Object.keys(json.data));
            if (json.data && json.data.matches) console.log('JSON.data.matches length:', json.data.matches.length);

            let matches = [];
            if (json.data && json.data.dualMatches) {
                matches = json.data.dualMatches;
            } else if (json.dualMatches) {
                matches = json.dualMatches;
            } else if (json.data && json.data.matches) {
                matches = json.data.matches;
            } else if (json.matches) {
                matches = json.matches;
            }

            if (matches.length > 0) {
                console.log('\n=== DUAL MATCH RESULTS ===');
                console.log(String('Symbol').padEnd(8) + String('Score').padEnd(8) + String('Trades').padEnd(8) + String('Win%').padEnd(8) + String('PF').padEnd(8) + String('AI Conf').padEnd(10));
                console.log('-'.repeat(60));

                matches.forEach(m => {
                    const perf = m.performance;
                    const ai = m.aiSignal;
                    const score = m.dualScore.toFixed(1);
                    const trades = perf.totalTrades.toString();
                    const winRate = perf.winRate.toFixed(1) + '%';
                    const pf = (perf.profitFactor !== null && perf.profitFactor !== undefined) ? perf.profitFactor.toFixed(2) : 'Inf';
                    const conf = ai.confidence.toFixed(1) + '%';

                    console.log(
                        m.symbol.padEnd(8) +
                        score.padEnd(8) +
                        trades.padEnd(8) +
                        winRate.padEnd(8) +
                        pf.padEnd(8) +
                        conf.padEnd(10)
                    );
                });
                console.log(`\nTotal Matches: ${matches.length}`);
            } else {
                console.log('No matches found.');
                if (json.message) console.log('Message:', json.message);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw data snippet:', data.substring(0, 200));
        }
    });

}).on('error', (err) => {
    console.error('Error fetching data:', err.message);
});
