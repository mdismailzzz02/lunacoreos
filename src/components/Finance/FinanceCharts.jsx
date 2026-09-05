import { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#4ade80', '#f43f5e'];

export function TrendBarChart({ transactions }) {
    const data = useMemo(() => {
        const monthly = {};
        transactions.forEach(tx => {
            const date = new Date(tx.date);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthly[month]) monthly[month] = { name: month, income: 0, expense: 0 };
            
            if (tx.type === 'income') monthly[month].income += parseFloat(tx.amount);
            else if (tx.type === 'expense') monthly[month].expense += parseFloat(tx.amount);
        });
        
        return Object.values(monthly).sort((a, b) => a.name.localeCompare(b.name));
    }, [transactions]);

    if (data.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No data for chart</div>;

    return (
        <div style={{ height: 350, width: '100%' }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <Tooltip 
                        cursor={false}
                        contentStyle={{ backgroundColor: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Bar dataKey="income" name="Income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

export function CategoryDonutChart({ transactions }) {
    const data = useMemo(() => {
        const categories = {};
        transactions.filter(tx => tx.type === 'expense').forEach(tx => {
            categories[tx.category] = (categories[tx.category] || 0) + parseFloat(tx.amount);
        });
        
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    if (data.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No expenses yet</div>;

    return (
        <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => `$${value.toFixed(2)}`}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function NetWorthLineChart({ history }) {
    if (!history || history.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No net worth history</div>;

    return (
        <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorNw" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="snapshot_date" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12 }} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="net_worth" stroke="#3b82f6" fillOpacity={1} fill="url(#colorNw)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
