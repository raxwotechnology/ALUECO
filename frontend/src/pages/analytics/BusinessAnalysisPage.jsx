import { useState, useEffect } from 'react';
import {
    TrendingUp,
    DollarSign,
    Calculator,
    Users,
    Activity,
    Info,
    ChevronRight,
    HelpCircle
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    Cell
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function BusinessAnalysisPage() {
    const [bizData, setBizData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Break-even states
    const [fixedCosts, setFixedCosts] = useState(450000);
    const [pricePerUnit, setPricePerUnit] = useState(8500);
    const [varCostPerUnit, setVarCostPerUnit] = useState(5500);

    // CAC Input state
    const [cacInput, setCacInput] = useState(12500);

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/reports/analytics/business');
                if (response.data?.success) {
                    const data = response.data.data;
                    setBizData(data);
                    setFixedCosts(data.breakEvenDefaults.fixedCosts);
                    setPricePerUnit(data.breakEvenDefaults.pricePerUnit || 8500);
                    setVarCostPerUnit(data.breakEvenDefaults.variableCostPerUnit || 5500);
                    setCacInput(data.clvCac.cacEstimate || 12500);
                }
            } catch (err) {
                console.error('Failed to load business intelligence metrics', err);
                toast.error('Failed to load business intelligence data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Calculations for Break-Even
    const unitContributionMargin = pricePerUnit - varCostPerUnit;
    const breakEvenUnits = unitContributionMargin > 0 ? Math.ceil(fixedCosts / unitContributionMargin) : 0;
    const breakEvenRevenue = breakEvenUnits * pricePerUnit;

    // Generate chart data for Break-Even
    const breakEvenChartData = [];
    const maxUnits = breakEvenUnits > 0 ? breakEvenUnits * 2 : 200;
    const step = Math.ceil(maxUnits / 10) || 10;

    for (let u = 0; u <= maxUnits; u += step) {
        const rev = u * pricePerUnit;
        const cost = fixedCosts + (u * varCostPerUnit);
        breakEvenChartData.push({
            units: u,
            Revenue: rev,
            TotalCost: cost,
            FixedCost: fixedCosts
        });
    }

    // CLV CAC recalculations
    const clv = bizData.clvCac.avgOrderValue * bizData.clvCac.purchaseFrequency * bizData.clvCac.customerLifespan;
    const clvCacRatio = cacInput > 0 ? +(clv / cacInput).toFixed(1) : 0;

    const getRatioColor = (ratio) => {
        if (ratio >= 3.0) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (ratio >= 1.5) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };

    const getCohortColor = (pct) => {
        if (!pct) return 'bg-gray-50 text-gray-300';
        if (pct >= 80) return 'bg-blue-600 text-white';
        if (pct >= 70) return 'bg-blue-500 text-white';
        if (pct >= 60) return 'bg-blue-400 text-white';
        if (pct >= 50) return 'bg-blue-300 text-gray-900';
        return 'bg-blue-100 text-gray-800';
    };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Business Intelligence Dashboard"
                description="Interactive calculators, break-even charts, customer cohort retention metrics, and product margin grids"
            />

            {/* Break-Even Calculator Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Calculator className="text-primary-600" size={20} />
                            <h3 className="text-sm font-bold text-gray-900">Break-Even Calculator</h3>
                        </div>
                        <p className="text-xs text-gray-400 mb-6">Adjust fixed and variable inputs to simulate target break-even parameters.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Monthly Fixed Costs (LKR)</label>
                                <Input
                                    type="number"
                                    value={fixedCosts}
                                    onChange={(e) => setFixedCosts(Number(e.target.value))}
                                    className="text-xs"
                                    placeholder="Payroll + overheads"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Average Price Per Unit (LKR)</label>
                                <Input
                                    type="number"
                                    value={pricePerUnit}
                                    onChange={(e) => setPricePerUnit(Number(e.target.value))}
                                    className="text-xs"
                                    placeholder="Wholesale invoice rate"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Variable Cost Per Unit (LKR)</label>
                                <Input
                                    type="number"
                                    value={varCostPerUnit}
                                    onChange={(e) => setVarCostPerUnit(Number(e.target.value))}
                                    className="text-xs"
                                    placeholder="Material cost + smelting energy"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Break-Even Units</span>
                            <span className="text-lg font-black text-gray-900 block mt-0.5">{breakEvenUnits.toLocaleString()}</span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">items sold</span>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                            <span className="text-[9px] text-gray-400 font-bold uppercase block">Break-Even Revenue</span>
                            <span className="text-lg font-black text-emerald-600 block mt-0.5">LKR {breakEvenRevenue.toLocaleString()}</span>
                            <span className="text-[9px] text-gray-400 block mt-0.5">invoice target</span>
                        </div>
                    </div>
                </Card>

                {/* Break-Even Recharts AreaChart */}
                <Card className="p-5 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-900">📊 Break-Even Revenue vs Total Costs</h3>
                        {unitContributionMargin <= 0 && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                Warning: Selling price must exceed variable costs!
                              </span>
                        )}
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={breakEvenChartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="units" label={{ value: 'Units Sold', position: 'insideBottom', offset: -5, style: { fontSize: 11 } }} tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} label={{ value: 'LKR (Value)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                                <Tooltip formatter={(value) => `LKR ${value.toLocaleString()}`} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="Revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.05} name="Total Revenue" />
                                <Area type="monotone" dataKey="TotalCost" stroke="#EF4444" fill="#EF4444" fillOpacity={0.05} name="Total Operational Cost" />
                                <Area type="monotone" dataKey="FixedCost" stroke="#9CA3AF" fill="transparent" strokeDasharray="5 5" name="Fixed Cost Base" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* CLV vs CAC Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 shadow-sm lg:col-span-1 border-t-4 border-primary-600">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">👥 Customer Acquisition Costs</h3>
                    <p className="text-xs text-gray-500 mb-6">Enter digital acquisition or marketing spending to analyze payback periods</p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Average CAC (LKR)</label>
                            <Input
                                type="number"
                                value={cacInput}
                                onChange={(e) => setCacInput(Number(e.target.value))}
                                className="text-xs"
                                placeholder="Marketing spend per customer"
                            />
                        </div>

                        <div className="p-4 rounded-xl border flex flex-col justify-between h-32 mt-4 bg-gray-50/50">
                            <div>
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CLV : CAC Ratio</span>
                                <h4 className="text-2xl font-black text-gray-900 mt-1">{clvCacRatio} : 1</h4>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border text-center block ${getRatioColor(clvCacRatio)}`}>
                                {clvCacRatio >= 3.0 ? '✅ Healthy Ratio (> 3:1)' : clvCacRatio >= 1.5 ? '⚠️ Warning Margin' : '❌ Unhealthy Margin'}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* CLV Metric display */}
                <Card className="p-5 shadow-sm lg:col-span-2 flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">💎 Customer Lifetime Value Parameters</h3>
                        <p className="text-xs text-gray-500 mb-6">Lifetime values computed dynamically from AluEco paid invoices.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Avg Order Value</span>
                                <h4 className="text-xl font-black text-gray-900 mt-1">LKR {bizData.clvCac.avgOrderValue.toLocaleString()}</h4>
                                <span className="text-[9px] text-gray-400 block mt-0.5">per commercial invoice</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Purchase Frequency</span>
                                <h4 className="text-xl font-black text-gray-900 mt-1">{bizData.clvCac.purchaseFrequency}x / year</h4>
                                <span className="text-[9px] text-gray-400 block mt-0.5">average order returns</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Customer Lifespan</span>
                                <h4 className="text-xl font-black text-gray-900 mt-1">{bizData.clvCac.customerLifespan} Years</h4>
                                <span className="text-[9px] text-gray-400 block mt-0.5">average business retention</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-2xl flex justify-between items-center mt-6">
                        <div>
                            <span className="text-[10px] text-primary-200 font-bold uppercase tracking-wider">Estimated Customer Lifetime Value (CLV)</span>
                            <h4 className="text-2xl font-black mt-1">LKR {clv.toLocaleString()}</h4>
                        </div>
                        <Activity className="text-primary-200 animate-pulse" size={24} />
                    </div>
                </Card>
            </div>

            {/* Retention Cohorts Grid */}
            <Card className="p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-2">📊 Customer Retention Cohorts</h3>
                <p className="text-xs text-gray-500 mb-4">Percentage of customers placing returning orders within subsequent months</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold">
                                <th className="p-3 text-left">Cohort Month</th>
                                <th className="p-3">Cohort Size</th>
                                <th className="p-3">Month 1</th>
                                <th className="p-3">Month 2</th>
                                <th className="p-3">Month 3</th>
                                <th className="p-3">Month 4</th>
                                <th className="p-3">Month 5</th>
                                <th className="p-3">Month 6</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bizData.cohorts.map((cohort, idx) => (
                                <tr key={idx} className="border-b border-gray-50">
                                    <td className="p-3 font-semibold text-left text-gray-800">{cohort.cohort}</td>
                                    <td className="p-3 text-gray-600 font-medium">{cohort.size} customers</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m1)}`}>{cohort.m1}%</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m2)}`}>{cohort.m2 ? `${cohort.m2}%` : '-'}</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m3)}`}>{cohort.m3 ? `${cohort.m3}%` : '-'}</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m4)}`}>{cohort.m4 ? `${cohort.m4}%` : '-'}</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m5)}`}>{cohort.m5 ? `${cohort.m5}%` : '-'}</td>
                                    <td className={`p-3 font-bold ${getCohortColor(cohort.m6)}`}>{cohort.m6 ? `${cohort.m6}%` : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Product Profit Margin Chart */}
            <Card className="p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">📊 Profit Margins & Sales Volumes Matrix</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bizData.margins}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value, name) => name === 'marginPercent' ? `${value}%` : `LKR ${value.toLocaleString()}`} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="price" fill="#6B7280" name="Unit Price (LKR)" />
                            <Bar dataKey="cost" fill="#9CA3AF" name="Est Cost (LKR)" />
                            <Bar dataKey="marginPercent" fill="#10B981" name="Profit Margin (%)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
