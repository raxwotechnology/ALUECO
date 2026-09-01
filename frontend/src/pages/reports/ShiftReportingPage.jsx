import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar, Sun, Moon, Factory, Users, Truck,
    TrendingUp, Award, DollarSign, Clock, HelpCircle
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { useShiftWiseReport } from '../../features/reports/useReports';

export default function ShiftReportingPage() {
    const navigate = useNavigate();

    // Date filters - default to current month
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
    const [shiftFilter, setShiftFilter] = useState(''); // '' (All), 'day', 'night'

    const { data: reportRes, isLoading } = useShiftWiseReport({
        startDate,
        endDate,
        shift: shiftFilter || undefined
    });

    const reportData = reportRes?.data;

    // Range pre-sets
    const setRangePreset = (type) => {
        const today = new Date();
        if (type === 'daily') {
            setStartDate(today.toISOString().slice(0, 10));
            setEndDate(today.toISOString().slice(0, 10));
        } else if (type === 'weekly') {
            const lastWeek = new Date();
            lastWeek.setDate(today.getDate() - 7);
            setStartDate(lastWeek.toISOString().slice(0, 10));
            setEndDate(today.toISOString().slice(0, 10));
        } else if (type === 'monthly') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(firstDay.toISOString().slice(0, 10));
            setEndDate(today.toISOString().slice(0, 10));
        }
    };

    const fmtLKR = (val) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(val || 0);
    };

    const renderShiftSection = (shiftName, data, icon) => {
        if (!data) return null;

        const prod = data.production || { inputKg: 0, outputKg: 0, staff: 0, woodKg: 0, efficiency: 0 };
        const hr = data.hr || { presentCount: 0, permanentCount: 0, traineeCount: 0, overtimeHours: 0, estimatedWages: 0, epfContribution: 0, etfContribution: 0 };
        const log = data.logistics || { tripsCount: 0, distanceKm: 0, fuelConsumed: 0, cost: 0, items: [] };

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    {icon}
                    <h3 className="text-lg font-bold text-gray-800 capitalize">{shiftName} Shift Overview</h3>
                </div>

                {/* Production Metrics */}
                <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-purple-700 uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Factory size={14} /> Production Yield Aggregates
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg border border-purple-100">
                            <span className="text-gray-500 text-xs block">Input Weight</span>
                            <span className="text-lg font-black text-purple-900">{prod.inputKg.toLocaleString()} kg</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-purple-100">
                            <span className="text-gray-500 text-xs block">Output Weight</span>
                            <span className="text-lg font-black text-purple-900">{prod.outputKg.toLocaleString()} kg</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-purple-100">
                            <span className="text-gray-500 text-xs block">Yield Efficiency</span>
                            <span className="text-lg font-black text-purple-900">{prod.efficiency}%</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-purple-100">
                            <span className="text-gray-500 text-xs block">Firewood Consumed</span>
                            <span className="text-lg font-black text-purple-900">{prod.woodKg.toLocaleString()} kg</span>
                        </div>
                    </div>
                </div>

                {/* HR & Wages Metrics */}
                <div className="bg-pink-50/40 border border-pink-100 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-pink-700 uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Users size={14} /> HR, Payroll & Wage Contributions
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                        <div className="bg-white p-3 rounded-lg border border-pink-100">
                            <span className="text-gray-500 text-xs block">Present Workers</span>
                            <span className="text-lg font-black text-pink-900">{hr.presentCount}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">{hr.permanentCount} Perm / {hr.traineeCount} Trainee</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-pink-100">
                            <span className="text-gray-500 text-xs block">Overtime Work</span>
                            <span className="text-lg font-black text-pink-900">{hr.overtimeHours} hrs</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">Capped by monthly cutoffs</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-pink-100">
                            <span className="text-gray-500 text-xs block">EPF Contribution (8%)</span>
                            <span className="text-lg font-black text-pink-900">{fmtLKR(hr.epfContribution)}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-pink-100">
                            <span className="text-gray-500 text-xs block">ETF Contribution (3%)</span>
                            <span className="text-lg font-black text-pink-900">{fmtLKR(hr.etfContribution)}</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-pink-100 flex justify-between items-center text-sm font-bold">
                        <span className="text-gray-700">Estimated Wages Payable</span>
                        <span className="text-base text-pink-700">{fmtLKR(hr.estimatedWages)}</span>
                    </div>
                </div>

                {/* Logistics Metrics */}
                <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-5 space-y-4">
                    <h4 className="text-xs font-extrabold text-sky-700 uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Truck size={14} /> Logistics Tracker & Trips Log
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div className="bg-white p-3 rounded-lg border border-sky-100">
                            <span className="text-gray-500 text-xs block">Logged Trips</span>
                            <span className="text-lg font-black text-sky-900">{log.tripsCount} trips</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-sky-100">
                            <span className="text-gray-500 text-xs block">Total Distance</span>
                            <span className="text-lg font-black text-sky-900">{log.distanceKm} km</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-sky-100">
                            <span className="text-gray-500 text-xs block">Fuel Consumed</span>
                            <span className="text-lg font-black text-sky-900">{log.fuelConsumed} L</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-sky-100">
                            <span className="text-gray-500 text-xs block">Fuel & Trip Cost</span>
                            <span className="text-lg font-black text-sky-900">{fmtLKR(log.cost)}</span>
                        </div>
                    </div>

                    {/* Transported Items list */}
                    <div className="bg-white rounded-lg border border-sky-100 p-4">
                        <span className="text-gray-600 text-xs font-bold block mb-2">Transported Items List</span>
                        {log.items.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No cargo logged for this shift.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {log.items.map((item, idx) => (
                                    <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-800 text-xs px-2.5 py-1 rounded-md font-semibold">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Shift-Wise Operations Report"
                description="Aggregated logs of Production, Wages, and Fleet logs isolated by Shift"
                actions={
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            {/* Filter Panel */}
            <Card className="p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {/* Date Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-40">
                            <Input
                                label="From Date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="w-40">
                            <Input
                                label="To Date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="w-44">
                            <Select
                                label="Shift filter"
                                options={[
                                    { value: '', label: 'All Shifts (Side-by-side)' },
                                    { value: 'day', label: 'Day Shift Only' },
                                    { value: 'night', label: 'Night Shift Only' }
                                ]}
                                value={shiftFilter}
                                onChange={(e) => setShiftFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Pre-sets */}
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 block">Reporting Log Ranges</label>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setRangePreset('daily')}>
                                Daily Log
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setRangePreset('weekly')}>
                                Weekly Log
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setRangePreset('monthly')}>
                                Monthly Log
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border">
                    Loading shift-wise aggregates...
                </div>
            ) : reportData ? (
                <div>
                    {!shiftFilter ? (
                        /* Side-by-side display of both shifts */
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Card className="p-6 border-t-4 border-t-amber-500 shadow-sm">
                                {renderShiftSection(
                                    'day',
                                    reportData.dayShift,
                                    <Sun className="text-amber-500 animate-spin-slow" size={24} />
                                )}
                            </Card>
                            <Card className="p-6 border-t-4 border-t-slate-800 shadow-sm">
                                {renderShiftSection(
                                    'night',
                                    reportData.nightShift,
                                    <Moon className="text-slate-800" size={24} />
                                )}
                            </Card>
                        </div>
                    ) : shiftFilter === 'day' ? (
                        /* Day shift only */
                        <Card className="p-6 border-t-4 border-t-amber-500 shadow-sm">
                            {renderShiftSection(
                                'day',
                                reportData.dayShift,
                                <Sun className="text-amber-500" size={24} />
                            )}
                        </Card>
                    ) : (
                        /* Night shift only */
                        <Card className="p-6 border-t-4 border-t-slate-800 shadow-sm">
                            {renderShiftSection(
                                'night',
                                reportData.nightShift,
                                <Moon className="text-slate-800" size={24} />
                            )}
                        </Card>
                    )}
                </div>
            ) : (
                <div className="py-12 text-center text-gray-500 bg-white rounded-xl border">
                    No operations logs found in the selected range
                </div>
            )}
        </div>
    );
}
