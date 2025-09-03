import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'Jan', revenue: 4000000, target: 4500000 },
  { month: 'Feb', revenue: 3800000, target: 4500000 },
  { month: 'Mar', revenue: 5200000, target: 4500000 },
  { month: 'Apr', revenue: 4800000, target: 4500000 },
  { month: 'May', revenue: 6100000, target: 4500000 },
  { month: 'Jun', revenue: 5900000, target: 4500000 },
];

export function RevenueChart() {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
            formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, '']}
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="hsl(var(--secondary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#targetGradient)"
            name="Target"
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGradient)"
            name="Revenue" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}