const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

const JAPAN_STOCKS = [
    { symbol: '7203', name: 'トヨタ自動車' },
    { symbol: '6758', name: 'ソニーグループ' },
    { symbol: '8035', name: '東京エレクトロン' },
    { symbol: '9983', name: 'ファーストリテイリング' },
    { symbol: '4063', name: '信越化学工業' }, // Revised from 6702
    { symbol: '6501', name: '日立製作所' },
    { symbol: '6861', name: 'キーエンス' },
    { symbol: '7974', name: '任天堂' },
    { symbol: '6723', name: 'ルネサスエレクトロニクス' },
    { symbol: '6146', name: 'ディスコ' },
    { symbol: '6920', name: 'レーザーテック' },
    { symbol: '6752', name: 'パナソニック' }, // Name check
    { symbol: '6981', name: '村田製作所' },
    { symbol: '6954', name: 'ファナック' },
    { symbol: '6503', name: '三菱電機' },
    { symbol: '8306', name: '三菱UFJ FG' },
    { symbol: '8316', name: '三井住友 FG' },
    { symbol: '8411', name: 'みずほ FG' },
    { symbol: '8604', name: '野村ホールディングス' },
    { symbol: '8766', name: '東京海上 HD' },
    { symbol: '8591', name: 'オリックス' },
    { symbol: '1605', name: 'INPEX' },
    { symbol: '5020', name: 'ENEOS HD' },
    { symbol: '8058', name: '三菱商事' },
    { symbol: '8001', name: '伊藤忠商事' },
    { symbol: '8031', name: '三井物産' },
    { symbol: '8053', name: '住友商事' },
    { symbol: '2768', name: '双日' },
    { symbol: '7201', name: '日産自動車' },
    { symbol: '7267', name: 'ホンダ' },
    { symbol: '7261', name: 'マツダ' },
    { symbol: '7205', name: '日野自動車' },
    { symbol: '6301', name: 'コマツ' },
    { symbol: '7011', name: '三菱重工業' },
    { symbol: '7012', name: '川崎重工業' },
    { symbol: '7013', name: 'IHI' },
    { symbol: '9984', name: 'ソフトバンクグループ' },
    { symbol: '9432', name: 'NTT' },
    { symbol: '9433', name: 'KDDI' },
    { symbol: '9434', name: 'ソフトバンク' },
    { symbol: '4689', name: 'LINEヤフー' },
    { symbol: '6098', name: 'リクルート HD' },
    { symbol: '4385', name: 'メルカリ' },
    { symbol: '2413', name: 'エムスリー' },
    { symbol: '3382', name: 'セブン&アイ' },
    { symbol: '9843', name: 'ニトリ HD' },
    { symbol: '4502', name: '武田薬品工業' },
    { symbol: '4519', name: '中外製薬' },
    { symbol: '4523', name: 'エーザイ' },
    { symbol: '4503', name: 'アステラス製薬' },
    { symbol: '4568', name: '第一三共' }, // potential mismatch?
    { symbol: '2802', name: '味の素' },
    { symbol: '2502', name: 'アサヒグループ HD' },
    { symbol: '2503', name: 'キリン HD' },
    { symbol: '2914', name: 'JT' },
];

const fs = require('fs');
const logFile = 'stock_verification_results.txt';
fs.writeFileSync(logFile, ''); // Clear file

function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
}

async function verify() {
    log('Starting verification of ' + JAPAN_STOCKS.length + ' stocks...');

    for (const stock of JAPAN_STOCKS) {
        try {
            const symbol = stock.symbol + '.T';
            const quote = await yahooFinance.quote(symbol);

            if (!quote) {
                log(`[ERROR] ${stock.name} (${stock.symbol}): Not found`);
                continue;
            }

            const yfName = quote.longName || quote.shortName || '';
            log(`[CHECK] ${stock.symbol}: Config='${stock.name}' vs API='${yfName}'`);

        } catch (e) {
            log(`[FAIL] ${stock.name} (${stock.symbol}): ${e.message}`);
        }

        await new Promise(r => setTimeout(r, 200));
    }
}

verify();
