import React, { useEffect, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface DailyData {
  date: string;
  high: number;
  low: number;
  volatility: number;
}

interface Metrics {
  current: number;
  avg7d: number;
  avg30d: number;
  max7d: number;
  max30d: number;
  avg100d: number;
  min7d: number;
  min30d: number;
}

type TimeRange = '7d' | '30d' | '100d';

const MetricCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
    <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-semibold text-gray-900">{value.toFixed(0)}</p>
  </div>
);

const RangeButton = ({ 
  range, 
  active, 
  onClick 
}: { 
  range: string; 
  active: boolean; 
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
      ${active 
        ? 'bg-indigo-600 text-white' 
        : 'bg-white text-gray-600 hover:bg-gray-50'}`}
  >
    {range}
  </button>
);

const Dashboard = () => {
  const [data, setData] = useState<DailyData[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [nextUpdateTime, setNextUpdateTime] = useState<Date>(new Date());
  const [metrics, setMetrics] = useState<Metrics>({
    current: 0,
    avg7d: 0,
    avg30d: 0,
    max7d: 0,
    max30d: 0,
    avg100d: 0,
    min7d: 0,
    min30d: 0
  });

  const calculateMetrics = useCallback((stockData: DailyData[]) => {
    if (!stockData.length) return;
    
    const volatilities = stockData.map(day => day.volatility);
    const last7 = volatilities.slice(-7);
    const last30 = volatilities.slice(-30);
    const last100 = volatilities.slice(-100);

    setMetrics({
      current: volatilities[volatilities.length - 1],
      avg7d: last7.reduce((a, b) => a + b, 0) / 7,
      avg30d: last30.reduce((a, b) => a + b, 0) / 30,
      max7d: Math.max(...last7),
      max30d: Math.max(...last30),
      avg100d: last100.reduce((a, b) => a + b, 0) / last100.length,
      min7d: Math.min(...last7),
      min30d: Math.min(...last30)
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/volatility');
      const result = await response.json();
      setData(result.data);
      calculateMetrics(result.data);
      setLastUpdateTime(new Date());
      
      const next5am = new Date();
      next5am.setHours(5,0,0,0);
      if (new Date().getHours() >= 5) {
        next5am.setDate(next5am.getDate() + 1);
      }
      setNextUpdateTime(next5am);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [calculateMetrics]);

  useEffect(() => {
    fetchData();
    
    const now = new Date();
    const next5am = new Date();
    next5am.setHours(5,0,0,0);
    if (now.getHours() >= 5) {
      next5am.setDate(next5am.getDate() + 1);
    }
    const msUntil5am = next5am.getTime() - now.getTime();

    const timer = setTimeout(fetchData, msUntil5am);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const getChartData = useCallback(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 100;
    return data.slice(-days);
  }, [data, timeRange]);

  const formatUpdateTime = (date: Date) => {
    return format(date, 'yyyy/MM/dd HH:mm:ss');
  };

  return (
    <div className="p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">NASDAQ-100 波動指標</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard title="當日震幅" value={metrics.current} />
          <MetricCard title="7日平均" value={metrics.avg7d} />
          <MetricCard title="30日平均" value={metrics.avg30d} />
          <MetricCard title="100日平均" value={metrics.avg100d} />
          <MetricCard title="7日最大" value={metrics.max7d} />
          <MetricCard title="30日最大" value={metrics.max30d} />
          <MetricCard title="7日最小" value={metrics.min7d} />
          <MetricCard title="30日最小" value={metrics.min30d} />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">振幅趨勢</h2>
            <div className="flex space-x-2">
              <RangeButton 
                range="7日" 
                active={timeRange === '7d'} 
                onClick={() => setTimeRange('7d')} 
              />
              <RangeButton 
                range="30日" 
                active={timeRange === '30d'} 
                onClick={() => setTimeRange('30d')} 
              />
              <RangeButton 
                range="100日" 
                active={timeRange === '100d'} 
                onClick={() => setTimeRange('100d')} 
              />
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer>
              <LineChart data={getChartData()}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MM/dd')}
                  stroke="#9CA3AF"
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(0), '點數']}
                  labelFormatter={(date) => format(new Date(date), 'MM/dd')}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="volatility"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          <div>上次更新：{formatUpdateTime(lastUpdateTime)}</div>
          <div>下次更新：{formatUpdateTime(nextUpdateTime)}</div>
          <div>For more information, feel free to contact us at: justforlance04@gmail.com</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;