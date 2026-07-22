import { useState, useEffect } from 'react';
import {
    Share2,
    Users,
    TrendingUp,
    MessageSquare,
    MousePointer,
    Play,
    Plus,
    Target,
    HelpCircle,
    Info
} from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function SocialMediaAnalysisPage() {
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Simulation states
    const [simPlatform, setSimPlatform] = useState('Facebook');
    const [simBudget, setSimBudget] = useState(25000);
    const [simAudience, setSimAudience] = useState('Architects & Builders');
    const [simulationResult, setSimulationResult] = useState(null);

    // Profile Link Scrape states
    const [profileUrl, setProfileUrl] = useState('');
    const [isSyncingProfile, setIsSyncingProfile] = useState(false);

    // Credentials Manager states
    const [credentials, setCredentials] = useState([]);
    const [credPlatform, setCredPlatform] = useState('Instagram');
    const [credApiKey, setCredApiKey] = useState('');
    const [credAccountId, setCredAccountId] = useState('');
    const [isSavingCred, setIsSavingCred] = useState(false);

    const fetchCredentials = async () => {
        try {
            const response = await api.get('/reports/analytics/social/credentials');
            if (response.data?.success) {
                setCredentials(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch credentials', err);
        }
    };

    const handleSaveCredential = async (e) => {
        e.preventDefault();
        if (!credApiKey.trim()) {
            toast.error('API Key / Access Token is required');
            return;
        }
        setIsSavingCred(true);
        try {
            const response = await api.post('/reports/analytics/social/credentials', {
                platform: credPlatform,
                apiKey: credApiKey,
                accountId: credAccountId
            });
            if (response.data?.success) {
                toast.success(response.data.data.message);
                setCredApiKey('');
                setCredAccountId('');
                fetchCredentials();
            }
        } catch (err) {
            console.error('Failed to save credential', err);
            toast.error('Failed to save API credentials');
        } finally {
            setIsSavingCred(false);
        }
    };

    const handleDeleteCredential = async (id) => {
        if (!window.confirm('Are you sure you want to disconnect this API integration?')) return;
        try {
            const response = await api.delete(`/reports/analytics/social/credentials/${id}`);
            if (response.data?.success) {
                toast.success(response.data.message);
                fetchCredentials();
            }
        } catch (err) {
            console.error('Failed to delete credential', err);
            toast.error('Failed to disconnect API integration');
        }
    };

    const handleSyncProfile = async () => {
        if (!profileUrl.trim()) {
            toast.error('Please enter a profile link');
            return;
        }
        setIsSyncingProfile(true);
        try {
            const response = await api.post('/reports/analytics/social/scrape', { url: profileUrl });
            if (response.data?.success) {
                const scraped = response.data.data;
                
                // Update dynamic state metrics
                setAnalyticsData(prev => {
                    const updatedPlatforms = prev.platformBreakdown.map(plat => {
                        if (plat.name === scraped.platform) {
                            return {
                                ...plat,
                                followers: scraped.followers,
                                growth: scraped.growth,
                                engagementRate: scraped.engagement
                            };
                        }
                        return plat;
                    });

                    const totalFollows = updatedPlatforms.reduce((sum, p) => sum + p.followers, 0);

                    return {
                        ...prev,
                        summary: {
                            ...prev.summary,
                            totalFollowers: totalFollows,
                            socialCtr: scraped.ctr
                        },
                        platformBreakdown: updatedPlatforms
                    };
                });

                toast.success(scraped.message);
                setProfileUrl('');
            }
        } catch (err) {
            console.error('Failed to sync profile', err);
            toast.error('Failed to parse profile link. Make sure it is a valid public profile URL.');
        } finally {
            setIsSyncingProfile(false);
        }
    };

    // Fetch data
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/reports/analytics/social');
                if (response.data?.success) {
                    setAnalyticsData(response.data.data);
                }
            } catch (err) {
                console.error('Failed to load social metrics', err);
                toast.error('Failed to load social media analytics');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        fetchCredentials();
    }, []);

    // Perform campaign simulation
    const handleSimulate = () => {
        // Platform multipliers
        let cpc = 45; // LKR per click
        let convRate = 0.05; // 5% conversion rate
        let reachMultiplier = 0.15; // reach per LKR

        if (simPlatform === 'Instagram') {
            cpc = 55;
            convRate = 0.06;
            reachMultiplier = 0.12;
        } else if (simPlatform === 'LinkedIn') {
            cpc = 120;
            convRate = 0.08;
            reachMultiplier = 0.05;
        } else if (simPlatform === 'TikTok') {
            cpc = 30;
            convRate = 0.04;
            reachMultiplier = 0.22;
        } else if (simPlatform === 'YouTube') {
            cpc = 80;
            convRate = 0.07;
            reachMultiplier = 0.08;
        }

        // Audience adjustment
        if (simAudience === 'Fabricators & Contractors') {
            convRate *= 1.2;
            cpc *= 1.1;
        } else if (simAudience === 'Individual Home Owners') {
            convRate *= 0.9;
            cpc *= 0.9;
        }

        const estReach = Math.round(simBudget * reachMultiplier);
        const estClicks = Math.round(simBudget / cpc);
        const estConversions = Math.round(estClicks * convRate);
        const estCpa = estConversions > 0 ? Math.round(simBudget / estConversions) : simBudget;
        const estRoi = estConversions > 0 ? +((estConversions * 8500 * 0.35) / simBudget).toFixed(1) : 0; // assuming avg lead value margin is 35% of 8500 LKR base price

        setSimulationResult({
            reach: estReach,
            clicks: estClicks,
            conversions: estConversions,
            cpc: +cpc.toFixed(0),
            cpa: estCpa,
            roi: estRoi
        });
        toast.success('Campaign simulation updated!');
    };

    // Run initial simulation once data is loaded or budget/platform changes
    useEffect(() => {
        handleSimulate();
    }, [simPlatform, simBudget, simAudience]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const { summary, timeline, platformBreakdown, campaigns, sentiments } = analyticsData;

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Social Media Analytics Hub"
                description="Cross-platform digital campaign reach, customer sentiments, and ad conversion forecasting"
            />

            {/* Profile Link Scraper */}
            <Card className="p-5 shadow-sm bg-white border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-950 flex items-center gap-1.5">
                            <Share2 className="text-primary-600 animate-pulse" size={16} />
                            Sync Profile by Link
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            Paste any Facebook Page, Instagram, LinkedIn, or TikTok profile link to crawl public follower base & metrics instantly.
                        </p>
                    </div>
                    <div className="flex flex-1 gap-2 max-w-xl w-full">
                        <input
                            type="text"
                            placeholder="e.g. https://instagram.com/raxwotechnology or https://facebook.com/alueco"
                            value={profileUrl}
                            onChange={(e) => setProfileUrl(e.target.value)}
                            disabled={isSyncingProfile}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                        <button
                            onClick={handleSyncProfile}
                            disabled={isSyncingProfile || !profileUrl.trim()}
                            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {isSyncingProfile ? 'Crawling...' : 'Sync Profile'}
                        </button>
                    </div>
                </div>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 flex items-center justify-between shadow-sm bg-gradient-to-br from-white to-blue-50/20">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Follower Base</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.totalFollowers.toLocaleString()}</h3>
                        <span className="text-xs font-semibold text-emerald-600 flex items-center mt-1">
                            <TrendingUp size={12} className="mr-0.5" /> +{summary.followerGrowthPct}% MoM
                        </span>
                    </div>
                    <div className="bg-blue-100/50 p-3 rounded-2xl text-blue-600">
                        <Users size={22} />
                    </div>
                </Card>

                <Card className="p-5 flex items-center justify-between shadow-sm bg-gradient-to-br from-white to-purple-50/20">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Engagement Rate</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.averageEngagementRate}%</h3>
                        <span className="text-xs text-gray-400 block mt-1">Average across profiles</span>
                    </div>
                    <div className="bg-purple-100/50 p-3 rounded-2xl text-purple-600">
                        <MessageSquare size={22} />
                    </div>
                </Card>

                <Card className="p-5 flex items-center justify-between shadow-sm bg-gradient-to-br from-white to-green-50/20">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Brand Mentions</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.totalMentions}</h3>
                        <span className="text-xs font-semibold text-emerald-600 flex items-center mt-1">
                            <TrendingUp size={12} className="mr-0.5" /> +{summary.mentionsGrowthPct}% growth
                        </span>
                    </div>
                    <div className="bg-green-100/50 p-3 rounded-2xl text-green-600">
                        <Share2 size={22} />
                    </div>
                </Card>

                <Card className="p-5 flex items-center justify-between shadow-sm bg-gradient-to-br from-white to-amber-50/20">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Ad CTR (Avg)</span>
                        <h3 className="text-2xl font-black text-gray-900 mt-1">{summary.socialCtr}%</h3>
                        <span className="text-xs text-emerald-600 font-semibold block mt-1">Industry standard: 1.5%</span>
                    </div>
                    <div className="bg-amber-100/50 p-3 rounded-2xl text-amber-600">
                        <MousePointer size={22} />
                    </div>
                </Card>
            </div>

            {/* Growth & Sentiment Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Timeline chart */}
                <Card className="p-5 lg:col-span-2 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-4">📈 Weekly Reach & Clicks Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: 'Reach', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} label={{ value: 'Clicks & Leads', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area yAxisId="left" type="monotone" dataKey="reach" fill="#3B82F6" stroke="#3B82F6" fillOpacity={0.08} name="Reach (Impressions)" />
                                <Bar yAxisId="right" dataKey="clicks" fill="#A78BFA" radius={[4, 4, 0, 0]} name="Link Clicks" barSize={25} />
                                <Bar yAxisId="right" dataKey="leads" fill="#10B981" radius={[4, 4, 0, 0]} name="Qualified Leads" barSize={15} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Sentiment Pie */}
                <Card className="p-5 shadow-sm flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">💬 Customer Sentiments</h3>
                    <p className="text-xs text-gray-500 mb-4">Analyzed from comments and direct inquiry sentiments</p>
                    <div className="h-[200px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sentiments}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {sentiments.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-4">
                        {sentiments.map((s) => (
                            <div key={s.name}>
                                <span className="text-[10px] text-gray-400 font-bold block">{s.name.split(' ')[0]}</span>
                                <span className="text-sm font-black mt-0.5 block" style={{ color: s.color }}>{s.value}%</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Platform breakdown */}
            <Card className="p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4">📱 Cross-Platform Presence</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {platformBreakdown.map((plat) => (
                        <div key={plat.name} className="p-4 rounded-2xl border border-gray-100 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plat.color }} />
                                    <span className="font-bold text-sm text-gray-800">{plat.name}</span>
                                </div>
                                <h4 className="text-xl font-black text-gray-900 mt-3">{plat.followers.toLocaleString()}</h4>
                                <p className="text-xs text-gray-400">Followers</p>
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
                                <div>
                                    <span className="text-gray-400 block">Growth</span>
                                    <span className="font-bold text-emerald-600">+{plat.growth}%</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block">Engagement</span>
                                    <span className="font-bold text-gray-700">{plat.engagementRate}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Ad Campaign Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="p-5 shadow-sm lg:col-span-1 bg-gradient-to-b from-gray-900 to-gray-950 text-white">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="text-amber-400" size={20} />
                        <h3 className="text-sm font-bold">Predictive Ad Campaign Simulator</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-6">Estimate leads and conversions before allocating budget.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Platform</label>
                            <Select
                                value={simPlatform}
                                onChange={(e) => setSimPlatform(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white text-xs w-full"
                                options={[
                                    { value: 'Facebook', label: 'Facebook Ads' },
                                    { value: 'Instagram', label: 'Instagram Ads' },
                                    { value: 'LinkedIn', label: 'LinkedIn Ads' },
                                    { value: 'TikTok', label: 'TikTok Video Ads' },
                                    { value: 'YouTube', label: 'YouTube Video Ads' }
                                ]}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Monthly Budget (LKR)</label>
                                <span className="text-xs font-bold text-amber-400">LKR {Number(simBudget).toLocaleString()}</span>
                            </div>
                            <input
                                type="range"
                                min="10000"
                                max="500000"
                                step="5000"
                                value={simBudget}
                                onChange={(e) => setSimBudget(Number(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Audience Profile</label>
                            <Select
                                value={simAudience}
                                onChange={(e) => setSimAudience(e.target.value)}
                                className="bg-gray-800 border-gray-700 text-white text-xs w-full"
                                options={[
                                    { value: 'Architects & Builders', label: 'Architects, Builders & Contractors (High Margin)' },
                                    { value: 'Individual Home Owners', label: 'Individual Home Owners (Low Margin)' },
                                    { value: 'Fabricators & Contractors', label: 'Aluminium Fabricators & Dealers (High Volume)' }
                                ]}
                            />
                        </div>
                    </div>
                </Card>

                {/* Simulation Output */}
                <Card className="p-5 shadow-sm lg:col-span-2 flex flex-col justify-between border-t-4 border-amber-400">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">🎯 Estimated Campaign ROI & Metrics</h3>
                        <p className="text-xs text-gray-400 mb-6">Generated using platform CTR benchmarks and AluEco historical margins.</p>
                        
                        {simulationResult && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Est. Reach</span>
                                    <h4 className="text-2xl font-black text-gray-900 mt-1">{simulationResult.reach.toLocaleString()}</h4>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">users viewed</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Est. Link Clicks</span>
                                    <h4 className="text-2xl font-black text-gray-900 mt-1">{simulationResult.clicks.toLocaleString()}</h4>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">at LKR {simulationResult.cpc}/click</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Est. Conversions</span>
                                    <h4 className="text-2xl font-black text-green-600 mt-1">{simulationResult.conversions.toLocaleString()}</h4>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">at LKR {simulationResult.cpa.toLocaleString()}/CPA</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Est. Conversion Rate</span>
                                    <h4 className="text-2xl font-black text-gray-900 mt-1">
                                        {simPlatform === 'LinkedIn' ? '8.0%' : simPlatform === 'Instagram' ? '6.0%' : '5.0%'}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">Average benchmark</span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl col-span-2">
                                    <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Return on Ad Spend (ROAS)</span>
                                    <h4 className="text-2xl font-black text-emerald-600 mt-1">{simulationResult.roi}x</h4>
                                    <span className="text-[10px] text-gray-400 block mt-0.5">Estimated revenue multiplier</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl flex gap-3 text-amber-800 text-xs mt-6">
                        <Info size={16} className="flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold block mb-0.5">AI Marketing Insight</span>
                            Investing **LKR {Number(simBudget).toLocaleString()}** on **{simPlatform}** targeting **{simAudience}** will yield an estimated **{simulationResult?.conversions} wholesale leads**, with a ROI ratio of **{simulationResult?.roi}x**. LinkedIn provides cleaner B2B leads, but Facebook offers the cheapest cost-per-click (CPC).
                        </div>
                    </div>
                </Card>
            </div>

            {/* Campaign Performance Table */}
            <Card className="p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900">📊 Active & Historical Campaigns</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                <th className="p-3">Campaign Name</th>
                                <th className="p-3">Platform</th>
                                <th className="p-3 text-right">Budget (LKR)</th>
                                <th className="p-3 text-right">Spent (LKR)</th>
                                <th className="p-3 text-center">CTR</th>
                                <th className="p-3 text-right">Conversions</th>
                                <th className="p-3 text-center">ROAS</th>
                                <th className="p-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((camp, idx) => (
                                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <td className="p-3 font-semibold text-gray-800">{camp.name}</td>
                                    <td className="p-3 text-gray-600">{camp.platform}</td>
                                    <td className="p-3 text-right text-gray-700">LKR {camp.budget.toLocaleString()}</td>
                                    <td className="p-3 text-right text-gray-700">LKR {camp.spent.toLocaleString()}</td>
                                    <td className="p-3 text-center text-gray-600 font-medium">{camp.ctr}%</td>
                                    <td className="p-3 text-right font-semibold text-gray-800">{camp.conversions}</td>
                                    <td className="p-3 text-center text-emerald-600 font-bold">{camp.roi}x</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            camp.status === 'Active' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                                        }`}>
                                            {camp.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* API Credentials Manager Card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connect Credential Form */}
                <Card className="p-5 shadow-sm lg:col-span-1 border-t-4 border-primary-600 bg-white">
                    <h3 className="text-sm font-bold text-gray-900 mb-2">🔑 Connect Official APIs</h3>
                    <p className="text-xs text-gray-400 mb-6">Connect your page access tokens or developer scraper keys to enable official live syncs.</p>
                    
                    <form onSubmit={handleSaveCredential} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select Integration</label>
                            <Select
                                value={credPlatform}
                                onChange={(e) => setCredPlatform(e.target.value)}
                                className="text-xs w-full"
                                options={[
                                    { value: 'Instagram', label: 'Instagram Graph API' },
                                    { value: 'Facebook', label: 'Facebook Page Graph API' },
                                    { value: 'LinkedIn', label: 'LinkedIn Marketing API' },
                                    { value: 'TikTok', label: 'TikTok Developer API' },
                                    { value: 'YouTube', label: 'YouTube Data API' },
                                    { value: 'RapidAPI', label: 'RapidAPI Scraper Secret Key' }
                                ]}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">API Key / Access Token</label>
                            <input
                                type="password"
                                placeholder="Paste your API key or oauth token here"
                                value={credApiKey}
                                onChange={(e) => setCredApiKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Page ID / Account Handle (Optional)</label>
                            <Input
                                type="text"
                                placeholder="e.g. 1048576 or alueco"
                                value={credAccountId}
                                onChange={(e) => setCredAccountId(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSavingCred || !credApiKey.trim()}
                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                            {isSavingCred ? 'Connecting...' : 'Connect API Key'}
                        </button>
                    </form>
                </Card>

                {/* Connected Integrations Grid */}
                <Card className="p-5 shadow-sm lg:col-span-2 bg-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">⚡ Active Integrations</h3>
                        <p className="text-xs text-gray-400 mb-6">Existing API credential configurations saved for this project.</p>
                        
                        {credentials.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-2xl">
                                <span className="text-xs text-gray-400">No official APIs connected. System is currently falling back to anonymous web crawling.</span>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                            <th className="p-3">Platform</th>
                                            <th className="p-3">Account ID / Handle</th>
                                            <th className="p-3">Masked Access Token</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {credentials.map((c) => (
                                            <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                                <td className="p-3 font-semibold text-gray-800">{c.platform}</td>
                                                <td className="p-3 text-gray-600">{c.accountId || 'General Account'}</td>
                                                <td className="p-3 text-gray-500 font-mono">{c.apiKeyMasked}</td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold">
                                                        CONNECTED
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        onClick={() => handleDeleteCredential(c._id)}
                                                        className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200 transition-colors"
                                                    >
                                                        Disconnect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
