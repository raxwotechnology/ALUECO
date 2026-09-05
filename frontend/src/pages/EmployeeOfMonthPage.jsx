import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Trophy, Star, Clock, Calendar, RefreshCw, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const RANK_STYLES = [
    { bg: 'from-yellow-400 to-amber-500',  border: 'border-yellow-300', text: 'text-yellow-900',  badge: '🥇', size: 'text-7xl' },
    { bg: 'from-gray-300 to-gray-400',      border: 'border-gray-200',  text: 'text-gray-700',    badge: '🥈', size: 'text-5xl' },
    { bg: 'from-amber-600 to-amber-700',    border: 'border-amber-400', text: 'text-amber-100',   badge: '🥉', size: 'text-4xl' },
];

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

export default function EmployeeOfMonthPage() {
    const now = new Date();
    const [month, setMonth]     = useState(now.getMonth() + 1);
    const [year,  setYear]      = useState(now.getFullYear());
    const [data,  setData]      = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: res } = await api.get(`/hr/employee-of-month?month=${month}&year=${year}`);
            setData(res.data || []);
        } catch { toast.error('Failed to load data'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, [month, year]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy size={24} className="text-yellow-500" /> Employee of the Month
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">Ranked by attendance + overtime + production efficiency</p>
                </div>
                <div className="flex items-center gap-3">
                    <select value={month} onChange={e => setMonth(+e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">
                        {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(+e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 outline-none">
                        {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <button onClick={fetchData} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Period Banner */}
            <div className="bg-gradient-to-r from-primary-600 to-violet-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-3">
                    <Calendar size={28} className="text-white/70" />
                    <div>
                        <p className="text-white/70 text-sm">Performance Period</p>
                        <p className="text-2xl font-black">{MONTHS[month-1]} {year}</p>
                    </div>
                </div>
            </div>

            {/* Podium */}
            {loading ? (
                <div className="grid grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl border border-gray-200 h-64 animate-pulse" />)}
                </div>
            ) : data.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
                    <Trophy size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-medium">No attendance records for this period</p>
                    <p className="text-gray-300 text-sm mt-1">Mark attendance to see employee rankings</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {/* Top 3 Podium cards */}
                    <div className="grid grid-cols-3 gap-4">
                        {data.map((emp, i) => {
                            const style = RANK_STYLES[i] || RANK_STYLES[2];
                            return (
                                <div key={emp.employeeId} className={`relative bg-gradient-to-b ${style.bg} rounded-2xl p-6 shadow-lg border ${style.border} overflow-hidden`}>
                                    <div className="absolute top-4 right-4 text-4xl opacity-30">🏅</div>
                                    <div className="relative z-10">
                                        <div className={`text-5xl mb-3`}>{style.badge}</div>
                                        <p className={`font-black text-xl ${i === 0 ? 'text-white' : style.text}`}>{emp.name}</p>
                                        {emp.employeeCode && (
                                            <p className={`text-xs font-mono mt-0.5 ${ i === 0 ? 'text-white/70' : 'opacity-60' } ${style.text}`}>
                                                {emp.employeeCode}
                                            </p>
                                        )}
                                        <div className="mt-4 space-y-2">
                                            <div className={`flex items-center gap-2 text-sm font-bold ${i === 0 ? 'text-white' : style.text}`}>
                                                <Star size={14} />
                                                <span>{emp.daysPresent} days present</span>
                                            </div>
                                            <div className={`flex items-center gap-2 text-sm ${i === 0 ? 'text-white/80' : style.text} opacity-80`}>
                                                <Clock size={14} />
                                                <span>{emp.totalOTHours} hrs OT</span>
                                            </div>
                                            {emp.avgBatchEfficiency != null && (
                                                <div className={`flex items-center gap-2 text-sm ${i === 0 ? 'text-white/80' : style.text} opacity-80`}>
                                                    <TrendingUp size={14} />
                                                    <span>Avg efficiency: {emp.avgBatchEfficiency}%</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Full ranking table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h4 className="font-bold text-gray-800">Full Ranking</h4>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase">Rank</th>
                                    <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase">Employee</th>
                                    <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase text-right">Days Present</th>
                                    <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase text-right">OT Hours</th>
                                    <th className="px-5 py-3 text-xs font-bold text-gray-400 uppercase text-right">Avg Efficiency</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.map((emp, i) => (
                                    <tr key={emp.employeeId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-4 text-lg">{['🥇','🥈','🥉'][i] || `#${i+1}`}</td>
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-gray-900">{emp.name}</p>
                                            {emp.employeeCode && <p className="text-xs text-gray-400 font-mono">{emp.employeeCode}</p>}
                                        </td>
                                        <td className="px-5 py-4 text-right font-bold text-gray-900">{emp.daysPresent}</td>
                                        <td className="px-5 py-4 text-right text-gray-700">{emp.totalOTHours} hrs</td>
                                        <td className="px-5 py-4 text-right text-gray-700">
                                            {emp.avgBatchEfficiency != null ? `${emp.avgBatchEfficiency}%` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
