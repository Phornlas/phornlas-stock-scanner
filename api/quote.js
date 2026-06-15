export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');
  const sheet = searchParams.get('sheet');

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 's-maxage=900, stale-while-revalidate'
  };

  // ดึงข้อมูลจาก Google Sheets
  if (sheet) {
    try {
      const sheetUrl = 'https://docs.google.com/spreadsheets/d/' + sheet + '/gviz/tq?tqx=out:json&sheet=Sheet1';
      const res = await fetch(sheetUrl, { headers });
      if (!res.ok) throw new Error('sheet error ' + res.status);
      const text = await res.text();
      return new Response(text, { status: 200, headers: corsHeaders });
    } catch(e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // ดึงข้อมูลหุ้นจาก Yahoo Finance
  if (!ticker) {
    return new Response(JSON.stringify({ error: 'ticker or sheet required' }), { status: 400, headers: corsHeaders });
  }

  const sym = ticker.includes('.') ? ticker : ticker + '.BK';
  const chartUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1wk&range=2y&includePrePost=false';
  const chartUrl2 = 'https://query2.finance.yahoo.com/v8/finance/chart/' + sym + '?interval=1wk&range=2y&includePrePost=false';
  const summaryUrl = 'https://query1.finance.yahoo.com/v10/finance/quoteSummary/' + sym + '?modules=summaryDetail';

  try {
    const [chartRes, summaryRes] = await Promise.all([
      fetch(chartUrl, { headers }),
      fetch(summaryUrl, { headers })
    ]);

    if (!chartRes.ok) throw new Error('chart ' + chartRes.status);
    const chartData = await chartRes.json();

    let divYield = 0;
    if (summaryRes.ok) {
      try {
        const s = await summaryRes.json();
        const detail = s && s.quoteSummary && s.quoteSummary.result && s.quoteSummary.result[0] && s.quoteSummary.result[0].summaryDetail;
        if (detail && detail.dividendYield && detail.dividendYield.raw) {
          divYield = detail.dividendYield.raw * 100;
        }
      } catch(e) {}
    }

    if (chartData && chartData.chart && chartData.chart.result && chartData.chart.result[0]) {
      chartData.chart.result[0].meta.dividendYieldExtra = divYield;
    }

    return new Response(JSON.stringify(chartData), { status: 200, headers: corsHeaders });
  } catch(e) {
    try {
      const res2 = await fetch(chartUrl2, { headers });
      if (!res2.ok) throw new Error('query2 ' + res2.status);
      const data2 = await res2.json();
      return new Response(JSON.stringify(data2), { status: 200, headers: corsHeaders });
    } catch(e2) {
      return new Response(JSON.stringify({ error: e2.message }), { status: 500, headers: corsHeaders });
    }
  }
}
