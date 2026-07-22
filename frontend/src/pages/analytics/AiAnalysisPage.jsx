import { useState, useEffect, useRef } from 'react';
import {
    Sparkles,
    Send,
    Bot,
    User,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Info,
    RotateCcw,
    Gauge,
    Cpu,
    ArrowRight
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import toast from 'react-hot-toast';
import api from '../../api/axios';

export default function AiAnalysisPage() {
    const [insights, setInsights] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState([
        {
            sender: 'ai',
            text: 'Hello! I am your AluEco AI Business Advisor. I scan our inventory levels, invoices, production batch logs, and petty cash ledgers in real-time. Ask me a question about our operations, or click one of the quick commands below!'
        }
    ]);
    const [isSending, setIsSending] = useState(false);
    const chatEndRef = useRef(null);

    // Fetch AI insights
    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/reports/analytics/ai-insights');
            if (response.data?.success) {
                setInsights(response.data.data);
            }
        } catch (err) {
            console.error('Failed to load AI insights', err);
            toast.error('Failed to fetch AI Business insights');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Send chat message
    const handleSend = async (messageText) => {
        const text = messageText || chatInput;
        if (!text.trim()) return;

        setChatHistory(prev => [...prev, { sender: 'user', text }]);
        setChatInput('');
        setIsSending(true);

        try {
            const response = await api.post('/reports/analytics/ai-chat', { prompt: text });
            if (response.data?.success) {
                setChatHistory(prev => [...prev, { sender: 'ai', text: response.data.data.reply }]);
            }
        } catch (err) {
            console.error('Chat error', err);
            setChatHistory(prev => [
                ...prev,
                { sender: 'ai', text: '⚠️ Apologies, I encountered a connection issue. Please check your backend status and try again.' }
            ]);
        } finally {
            setIsSending(false);
        }
    };

    const quickPrompts = [
        'Analyze sales and revenue performance',
        'Check inventory stockout risks',
        'Show manufacturing efficiency and wastage logs',
        'Analyze cost drivers and cash outflow'
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Determine color based on health score
    const getHealthColor = (score) => {
        if (score >= 80) return 'text-emerald-500 stroke-emerald-500';
        if (score >= 50) return 'text-amber-500 stroke-amber-500';
        return 'text-red-500 stroke-red-500';
    };

    const formatAiResponse = (text) => {
        // Basic parser for markdown bullet points & bold
        return text.split('\n').map((line, idx) => {
            if (line.startsWith('###')) {
                return <h4 key={idx} className="font-bold text-sm text-gray-900 mt-3 mb-1">{line.replace('###', '')}</h4>;
            }
            if (line.startsWith('-')) {
                return <li key={idx} className="ml-4 list-disc text-xs text-gray-700 mt-1">{line.replace('-', '').trim()}</li>;
            }
            if (line.includes('**')) {
                const parts = line.split('**');
                return (
                    <p key={idx} className="text-xs text-gray-700 mt-1">
                        {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-gray-900">{p}</strong> : p)}
                    </p>
                );
            }
            return <p key={idx} className="text-xs text-gray-700 mt-1">{line}</p>;
        });
    };

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="AI Business Advisor"
                description="Deep heuristic insights scanning ERP databases, flagging anomalies, and predicting performance"
            />

            {/* Health Score & Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Dial score card */}
                <Card className="p-5 shadow-sm flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-950 text-white">
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 text-xs text-gray-400">
                        <Cpu size={14} className="text-primary-400 animate-pulse" />
                        <span>Real-Time Business Health</span>
                    </div>

                    <div className="relative flex items-center justify-center mt-6">
                        {/* Semi-circular gauge representation */}
                        <svg className="w-36 h-36 transform -rotate-90">
                            <circle
                                cx="72"
                                cy="72"
                                r="60"
                                stroke="#1F2937"
                                strokeWidth="12"
                                fill="transparent"
                            />
                            <circle
                                cx="72"
                                cy="72"
                                r="60"
                                className={getHealthColor(insights.healthScore)}
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={376.8}
                                strokeDashoffset={376.8 - (376.8 * insights.healthScore) / 100}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white">{insights.healthScore}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Health Score</span>
                        </div>
                    </div>

                    <div className="text-center mt-6 text-xs text-gray-400 px-4">
                        {insights.healthScore >= 80 
                            ? 'Operations are optimized. System shows healthy collections relative to operational expenses.' 
                            : 'Operational improvements required. Check inventory and expense warnings.'}
                    </div>
                </Card>

                {/* Key Insights Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="p-5 shadow-sm flex flex-col justify-between border-l-4 border-emerald-500">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Collections (30D)</span>
                            <h3 className="text-2xl font-black text-gray-900 mt-2">LKR {insights.metrics.revenue30Days.toLocaleString()}</h3>
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold mt-3 flex items-center">
                            <CheckCircle size={12} className="mr-1" /> Only cleared commercial invoices included
                        </span>
                    </Card>

                    <Card className="p-5 shadow-sm flex flex-col justify-between border-l-4 border-rose-500">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outflow Disbursements (30D)</span>
                            <h3 className="text-2xl font-black text-gray-900 mt-2">LKR {insights.metrics.expense30Days.toLocaleString()}</h3>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-3">
                            Petty cash expenses summary
                        </span>
                    </Card>

                    <Card className="p-5 shadow-sm flex flex-col justify-between border-l-4 border-amber-500">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Safety Stock Deficits</span>
                            <h3 className="text-2xl font-black text-gray-900 mt-2">{insights.metrics.lowStockProducts} Products</h3>
                        </div>
                        <span className="text-[10px] text-amber-600 font-bold mt-3 flex items-center">
                            <AlertTriangle size={12} className="mr-1" /> Under safety levels
                        </span>
                    </Card>

                    <Card className="p-5 shadow-sm flex flex-col justify-between border-l-4 border-purple-500">
                        <div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Factory Yield Ratio</span>
                            <h3 className="text-2xl font-black text-gray-900 mt-2">{insights.metrics.averageProductionEfficiency}%</h3>
                        </div>
                        <span className="text-[10px] text-purple-600 font-bold mt-3">
                            Average production smelting efficiency
                        </span>
                    </Card>
                </div>
            </div>

            {/* Smart Recommendations Section */}
            <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-primary-600 animate-pulse" />
                    AI Advisory Actions & Alerts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insights.recommendations.map((rec, idx) => (
                        <Card key={idx} className="p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    {rec.type === 'danger' && <AlertTriangle size={16} className="text-red-500" />}
                                    {rec.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                                    {rec.type === 'success' && <CheckCircle size={16} className="text-emerald-500" />}
                                    <h4 className="text-xs font-bold text-gray-800">{rec.title}</h4>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed mb-4">{rec.message}</p>
                            </div>
                            <a 
                                href={rec.link}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 self-start"
                            >
                                {rec.action} <ArrowRight size={12} />
                            </a>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Conversational Assistant */}
            <Card className="p-5 shadow-md flex flex-col h-[500px] border border-gray-100 relative overflow-hidden bg-gradient-to-br from-white to-gray-50/20">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Bot className="text-primary-600" size={20} />
                        <div>
                            <h3 className="text-sm font-bold text-gray-900">AluEco Chatbot Companion</h3>
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block">ONLINE • SCANNING DATABASE</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setChatHistory([chatHistory[0]])} 
                        title="Reset Chat"
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((chat, idx) => (
                        <div key={idx} className={`flex gap-3 max-w-[85%] ${chat.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                                chat.sender === 'ai' ? 'bg-primary-50 text-primary-600 border border-primary-100' : 'bg-gray-800 text-white'
                            }`}>
                                {chat.sender === 'ai' ? <Bot size={16} /> : <User size={16} />}
                            </div>
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                                chat.sender === 'ai' 
                                    ? 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-none' 
                                    : 'bg-gray-800 text-white rounded-tr-none'
                            }`}>
                                {chat.sender === 'ai' ? formatAiResponse(chat.text) : <p>{chat.text}</p>}
                            </div>
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex gap-3 max-w-[85%]">
                            <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center flex-shrink-0">
                                <Bot size={16} className="animate-spin" />
                            </div>
                            <div className="p-3.5 rounded-2xl bg-white border border-gray-100 shadow-sm text-xs text-gray-400">
                                AI Advisor is querying records...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Quick Prompts */}
                <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-gray-100/50">
                    {quickPrompts.map((p, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSend(p)}
                            disabled={isSending}
                            className="px-3 py-1 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-full text-[10px] font-semibold text-gray-600 transition-all disabled:opacity-50"
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Input Panel */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask me: 'Is our production efficient?' or 'What is our monthly sales volume?'"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isSending}
                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={isSending || !chatInput.trim()}
                        className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                        <Send size={14} />
                    </button>
                </div>
            </Card>
        </div>
    );
}
