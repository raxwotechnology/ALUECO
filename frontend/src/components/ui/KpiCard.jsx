import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

export default function KpiCard({
    label, value, icon: Icon, iconColor = 'text-primary-600', iconBg = 'bg-primary-50',
    trend = null, subtext = null, onClick = null,
}) {
    const hasTrend = trend !== null && trend !== undefined;
    const trendUp = hasTrend && trend >= 0;

    return (
        <Card
            className={`p-3 sm:p-5 ${onClick ? 'cursor-pointer hover:shadow-md active:shadow-sm transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-gray-600 mb-0.5 truncate">{label}</p>
                    <p className="text-lg sm:text-2xl font-semibold text-gray-900 leading-tight">{value}</p>
                    {hasTrend && (
                        <p className={`text-xs mt-1 flex items-center gap-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(trend)}% {trendUp ? 'up' : 'down'} vs last period
                        </p>
                    )}
                    {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
                </div>
                {Icon && (
                    <div className={`${iconBg} ${iconColor} w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-2`}>
                        <Icon size={16} className="sm:hidden" />
                        <Icon size={20} className="hidden sm:block" />
                    </div>
                )}
            </div>
        </Card>
    );
}