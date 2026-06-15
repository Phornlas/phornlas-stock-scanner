export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return new Response(JSON.stringify({ error: 'ticker required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const sym = ticker.includes('.') ? ticker : ticker + '.BK';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1wk&range=2y&includePrePost=false`;
  const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${sym}?modules=summaryDetail,defaultKeyStatistics`;

  try {
    // ดึงพร้อมกัน 2 endpoint
    const [chartRes, summaryRes] = await Promise.all([
      fetch(chartUrl, { headers }),
      fetch(summaryUrl, { headers })
    ]);

    if (!chartRes.ok) throw new Error(`chart: ${chartRes.status}`);
    const chartData = await chartRes.json();

    // ดึงปันผลจาก summaryDetail
    let divYield = 0;
    let divRate = 0;
    if (summaryRes.ok) {
      try {
        const summaryData = await summaryRes.json();
        const detail = summaryData?.quoteSummary?.result?.[0]?.summaryDetail;
        divYield = detail?.dividendYield?.raw ? detail.dividendYield.raw * 100 : 0;
        divRate = detail?.dividendRate?.raw || 0;
      } catch(e) {}
    }

    // แปะข้อมูลปันผลเข้าไปใน response
    if (chartData?.chart?.result?.[0]?.meta) {
      chartData.chart.result[0].meta.dividendYieldExtra = divYield;
      chartData.chart.result[0].meta.dividendRateExtra = divRate;
    }

    return new Response(JSON.stringify(chartData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=900, stale-while-revalidate'
      }
    });
  } catch(e) {
    // Fallback query2
    try {
      const res2 = await fetch(
        `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1wk&range=2y`,
        { headers }
      );
      if (!res2.ok) throw new Error('query2 failed');
      const data2 = await res2.json();
      return new Response(JSON.stringify(data2), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    } catch(e2) {
      return new Response(JSON.stringify({ error: e2.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
