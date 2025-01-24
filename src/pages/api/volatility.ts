import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface YahooFinanceResponse {
  chart: {
    result: [{
      timestamp: number[];
      indicators: {
        quote: [{
          high: number[];
          low: number[];
        }]
      }
    }]
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 100);

    const response = await axios.get<YahooFinanceResponse>(
      `https://query1.finance.yahoo.com/v8/finance/chart/^NDX`,
      {
        params: {
          period1: Math.floor(startDate.getTime() / 1000),
          period2: Math.floor(endDate.getTime() / 1000),
          interval: '1d'
        }
      }
    );

    const timestamps = response.data.chart.result[0].timestamp;
    const quotes = response.data.chart.result[0].indicators.quote[0];

    const data = timestamps.map((timestamp: number, index: number) => {
      const high = quotes.high[index];
      const low = quotes.low[index];
      
      return {
        date: new Date(timestamp * 1000).toISOString(),
        volatility: high - low,
        high,
        low
      };
    });

    res.status(200).json({ data });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
}