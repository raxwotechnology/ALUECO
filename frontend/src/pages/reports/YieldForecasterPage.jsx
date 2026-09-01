import { useState, useEffect } from 'react';
import { Sparkles, Flame, Zap, TrendingUp, Scale, RefreshCw, BarChart2 } from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function YieldForecasterPage() {
    const [products, setProducts] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [forecastingData, setForecastingData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [proposedInput, setProposedInput] = useState(100);

    // Load available products for selection
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Fetch products (filter by finished_goods or raw_materials that go into production)
                const response = await api.get('/products', { params: { limit: 500 } });
                const rawOrSemis = (response.data?.data || []).filter(p => 
                    ['raw_material', 'semi_finished', 'finished_good'].includes(p.productType)
                );
                setProducts(rawOrSemis);
            } catch (err) {
                console.error('Failed to load products list', err);
                toast.error('Failed to load products list');
            }
        };
        fetchProducts();
    }, []);

    // Fetch forecasting analytics when product selection changes
    useEffect(() => {
        if (!selectedProductId) {
            setForecastingData(null);
            return;
        }

        const fetchForecasting = async () => {
            setIsLoading(true);
            try {
                const response = await api.get(`/products/${selectedProductId}/forecasting`);
                if (response.data?.success) {
                    setForecastingData(response.data.data);
                }
            } catch (err) {
                console.error('Failed to load forecasting metrics', err);
                toast.error('Failed to load forecasting metrics');
            } finally {
                setIsLoading(false);
            }
        };

        fetchForecasting();
    }, [selectedProductId]);

    const productOptions = products.map(p => ({
        value: p._id,
        label: `${p.name} (${p.productCode})`
    }));

    // Perform real-time projections based on the user-defined proposedInput
    const getProjections = () => {
        if (!forecastingData || !forecastingData.statistics) return null;
        
        const stats = forecastingData.statistics;
        const totalRuns = stats.count;
        
        // 1. Expected Yield Rate (%)
        // Linear Trend Projection: y = mx + c (where x is the next index)
        const nextIndex = totalRuns; 
        let trendEfficiency = stats.slope * nextIndex + stats.intercept;
        // Keep efficiency in realistic bounds [5%, 100%]
        trendEfficiency = Math.max(5, Math.min(100, trendEfficiency));
        
        const movingAvgEfficiency = stats.movingAverageRatio;

        // 2. Expected Outputs (Kg)
        const trendOutput = (proposedInput * trendEfficiency) / 100;
        const movingAvgOutput = (proposedInput * movingAvgEfficiency) / 100;

        // 3. Expected Wastage (Kg)
        const trendWastage = proposedInput - trendOutput;
        const movingAvgWastage = proposedInput - movingAvgOutput;

        // 4. Expected Resource Utility Consumption
        const predictedFirewood = proposedInput * stats.avgFirewoodRate;
        const predictedElectricity = proposedInput * stats.avgElectricityRate;

        return {
            trendEfficiency: +trendEfficiency.toFixed(2),
            movingAvgEfficiency: +movingAvgEfficiency.toFixed(2),
            trendOutput: +trendOutput.toFixed(2),
            movingAvgOutput: +movingAvgOutput.toFixed(2),
            trendWastage: +trendWastage.toFixed(2),
            movingAvgWastage: +movingAvgWastage.toFixed(2),
            firewood: +predictedFirewood.toFixed(2),
            electricity: +predictedElectricity.toFixed(2)
        };
    };

    const projections = getProjections();

    // Prepare chart data (combine historical values with trendline points)
    const getChartData = () => {
        if (!forecastingData || !forecastingData.history) return [];
        const stats = forecastingData.statistics;

        return forecastingData.history.map((h, index) => {
            const trendValue = stats.slope * index + stats.intercept;
            const dateStr = new Date(h.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });

            return {
                name: `${h.batchNo || 'B'}-${dateStr}`,
                'Actual Efficiency': h.efficiency,
                'Trend Projections': +Math.max(0, Math.min(100, trendValue)).toFixed(2)
            };
        });
    };

    const chartData = getChartData();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Yield & Resource Forecaster"
                description="Predict manufacturing output, wastage, and resource consumption based on historical batch data"
            />

            <Card className="p-6">
                <div className="max-w-md">
                    <Select
                        label="Select Product / Raw Material to Analyze"
                        placeholder="Choose a product..."
                        options={productOptions}
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                    />
                </div>
            </Card>

            {isLoading && (
                <div className="py-20 text-center text-gray-500 flex flex-col items-center gap-2">
                    <RefreshCw className="animate-spin text-primary-600" size={32} />
                    <span>Analyzing historical batch records...</span>
                </div>
            )}

            {!isLoading && !selectedProductId && (
                <div className="py-20 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <BarChart2 size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No Product Selected</p>
                    <p className="text-sm text-gray-400 mt-1">Select a raw material or product from the dropdown above to run analytics</p>
                </div>
            )}

            {!isLoading && forecastingData && forecastingData.history.length === 0 && (
                <div className="py-20 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <BarChart2 size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No Historical Data Found</p>
                    <p className="text-sm text-gray-400 mt-1">There are no completed production batches recorded for this product yet.</p>
                </div>
            )}

            {!isLoading && forecastingData && forecastingData.history.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts Panel */}
                    <div className="col-span-2 space-y-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-1.5">
                                <TrendingUp size={16} className="text-indigo-600" />
                                Historical Yield Efficiency Trend
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} />
                                        <Tooltip />
                                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                                        <Area
                                            type="monotone"
                                            dataKey="Actual Efficiency"
                                            fill="#e0e7ff"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            name="Actual Yield %"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="Trend Projections"
                                            stroke="#ec4899"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            name="Linear Trend Forecast"
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        {/* Batch Stats Panel */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <Card className="p-4 bg-slate-50 border border-slate-100">
                                <span className="text-gray-500 text-xs block font-medium">Batches Tracked</span>
                                <span className="text-2xl font-bold text-slate-800">{forecastingData.statistics.count} Runs</span>
                            </Card>
                            <Card className="p-4 bg-indigo-50 border border-indigo-100">
                                <span className="text-indigo-600 text-xs block font-medium">Avg Yield Efficiency</span>
                                <span className="text-2xl font-bold text-indigo-900">{forecastingData.statistics.averageEfficiency}%</span>
                            </Card>
                            <Card className="p-4 bg-pink-50 border border-pink-100">
                                <span className="text-pink-600 text-xs block font-medium">Recent Moving Avg</span>
                                <span className="text-2xl font-bold text-pink-900">{forecastingData.statistics.movingAverageRatio}%</span>
                            </Card>
                        </div>
                    </div>

                    {/* Projections Input & Output Forecast */}
                    <div className="space-y-6">
                        <Card className="p-6 border-indigo-500 border-2 relative overflow-hidden bg-white">
                            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-bl-lg font-semibold tracking-wide flex items-center gap-1">
                                <Sparkles size={10} /> Live Predictive Modeler
                            </div>
                            
                            <h3 className="text-sm font-semibold text-gray-800 mb-4">Input Quantities</h3>
                            
                            <Input
                                label="Proposed Raw Material Input (Kg)"
                                type="number"
                                step="0.1"
                                min="1"
                                value={proposedInput}
                                onChange={(e) => setProposedInput(Number(e.target.value) || 0)}
                                required
                            />

                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Output Yield Forecasts</h4>
                                
                                {/* Linear Trend Calculation */}
                                <div className="p-3 bg-indigo-50 rounded-lg">
                                    <div className="flex justify-between text-xs text-indigo-700 font-semibold mb-1">
                                        <span>Trend-line Forecast</span>
                                        <span>{projections?.trendEfficiency}% Efficiency</span>
                                    </div>
                                    <div className="text-lg font-bold text-indigo-900 flex justify-between">
                                        <span>Expected Output:</span>
                                        <span>{projections?.trendOutput} Kg</span>
                                    </div>
                                    <span className="text-[10px] text-indigo-500 block mt-0.5">Est. Wastage: {projections?.trendWastage} Kg</span>
                                </div>

                                {/* Moving Average Calculation */}
                                <div className="p-3 bg-pink-50 rounded-lg">
                                    <div className="flex justify-between text-xs text-pink-700 font-semibold mb-1">
                                        <span>Moving Average Forecast</span>
                                        <span>{projections?.movingAvgEfficiency}% Efficiency</span>
                                    </div>
                                    <div className="text-lg font-bold text-pink-900 flex justify-between">
                                        <span>Expected Output:</span>
                                        <span>{projections?.movingAvgOutput} Kg</span>
                                    </div>
                                    <span className="text-[10px] text-pink-500 block mt-0.5">Est. Wastage: {projections?.movingAvgWastage} Kg</span>
                                </div>
                            </div>

                            {/* Resource Consumption Forecast */}
                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utility Resource Requirements</h4>
                                
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Flame size={16} className="text-orange-500" /> Firewood Needed
                                    </span>
                                    <span className="font-bold text-gray-800">{projections?.firewood} Kg</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <Zap size={16} className="text-yellow-500" /> Electricity Load
                                    </span>
                                    <span className="font-bold text-gray-800">{projections?.electricity} kWh</span>
                                </div>
                                
                                <p className="text-[10px] text-gray-400 mt-2 italic leading-normal">
                                    *Utility usage estimates are correlated with historical firewood and power loads used per Kg of raw material output.
                                </p>
                            </div>
                        </Card>

                        {/* Data Quality Indicator */}
                        <Card className="p-4 bg-slate-50 border border-slate-100 flex items-start gap-3">
                            <Scale size={20} className="text-slate-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-slate-600 leading-normal">
                                <p className="font-semibold text-slate-800 mb-0.5">Statistical Data Quality</p>
                                {forecastingData.hasEnoughData ? (
                                    <span className="text-green-600 font-medium">Strong Confidence: Product has sufficient completed batch records (3+) to yield reliable regression models.</span>
                                ) : (
                                    <span className="text-yellow-600 font-medium">Caution: Low sample size. Linear regression trends may fluctuate drastically until 3+ production batches are logged.</span>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
