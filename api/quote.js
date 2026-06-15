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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1wk&range=2y&includePrePost=false`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=900, stale-while-revalidate'
      }
    });
  } catch (e) {
    // ลอง query2 ถ้า query1 ไม่ตอบ
    try {
      const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1wk&range=2y&includePrePost=false`;
      const res2 = await fetch(url2, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });
      if (!res2.ok) throw new Error('query2 failed');
      const data2 = await res2.json();
      return new Response(JSON.stringify(data2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=900, stale-while-revalidate'
        }
      });
    } catch(e2) {
      return new Response(JSON.stringify({ error: e2.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
}
