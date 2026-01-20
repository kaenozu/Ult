import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { TrendingUp, Activity, DollarSign, Percent } from 'lucide-react';

interface AnalyticsData {
    current_equity: number;
    daily_returns: number[];
    equity_curve: { date: string; total_equity: number }[];
    win_rate?: number; // Placeholder until backend fully supports it
    profit_factor?: number; // Placeholder
    sharpe_ratio?: number; // Placeholder
}

export const AnalyticsDashboard: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/v1/replay/analytics');
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    if (loading) return <div className="p-4 text-center">Loading Analytics...</div>;
    if (!data) return <div className="p-4 text-center">No Data Available</div>;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Total Equity"
                    value={`¥${data.current_equity.toLocaleString()}`}
                    icon={<DollarSign className="h-4 w-4 text-green-500" />}
                />
                <StatCard
                    title="Win Rate"
                    value="53.4%" // Mock until backend aggregations are ready
                    icon={<Percent className="h-4 w-4 text-blue-500" />}
                />
                <StatCard
                    title="Profit Factor"
                    value="1.45" // Mock
                    icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
                />
                <StatCard
                    title="Sharpe Ratio"
                    value="1.2" // Mock
                    icon={<Activity className="h-4 w-4 text-orange-500" />}
                />
            </div>

            <Card className="bg-black/40 border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-400">Equity Curve</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.equity_curve}>
                            <defs>
                                <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#666" fontSize={12} tickFormatter={(str) => str.split(' ')[0]} />
                            <YAxis stroke="#666" fontSize={12} domain={['auto', 'auto']} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="total_equity"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorEquity)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const StatCard = ({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) => (
    <Card className="bg-black/40 border-white/10 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-white">{value}</div>
        </CardContent>
    </Card>
);
