import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Printer, Plus, Trash2, Search, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import AluAgreementPrintView from '../components/print/AluAgreementPrintView';

const AluAgreementFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const routerLocation = useLocation();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [quotations, setQuotations] = useState([]);
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Form State
    const [agreementData, setAgreementData] = useState({
        agreementNumber: 'PA-200',
        quotationId: '',
        quotationNumber: 'QOT-231',
        agreementDate: new Date().toISOString().split('T')[0],
        customerDetails: {
            customerName: 'Mr.Shashika Rodrigo',
            projectLocation: '22/25, Army housing scheme, Dhawatagahawatta, Thalangama north, Koswatta, Battaramulla',
            contactNo: '0767204946'
        },
        projectValue: 1650000,
        paymentSchedule: [
            { stageName: 'Order Confirmation Advance', amount: 900000, percentage: 54.55 },
            { stageName: 'Project Progress Payment', amount: 300000, percentage: 18.18 },
            { stageName: 'Final Payment Upon Project Completion', amount: 450000, percentage: 27.27 }
        ],
        scopeOfWork: 'LUXO Construction (Pvt) Ltd agrees to supply, fabricate, deliver, and install the aluminium works as detailed in the approved quotation. Any additional work requested outside the approved quotation shall be treated as a variation and charged separately.',
        leadTimeDays: 14,
        warranties: {
            workmanshipYears: 10,
            hardwareYears: 5
        },
        generalConditions: 'All payments shall follow the agreed schedule. Variations will be charged separately. Final handover will be after full payment.',
        bankDetails: {
            bankName: 'Hatton National Bank',
            accountName: 'M.E.H.Bandara',
            accountNumber: '147020135728',
            branch: 'Nawala'
        }
    });

    // Load active quotations for auto-fill dropdown
    useEffect(() => {
        const fetchQuotations = async () => {
            try {
                const res = await api.get('/alu/quotations');
                if (res.data?.success) {
                    setQuotations(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to load quotations list', err);
            }
        };
        fetchQuotations();

        // If editing existing agreement
        if (id) {
            const fetchAgreement = async () => {
                setLoading(true);
                try {
                    const res = await api.get(`/alu/agreements/${id}`);
                    if (res.data?.success) {
                        const a = res.data.data;
                        setAgreementData({
                            ...a,
                            agreementDate: a.agreementDate ? new Date(a.agreementDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
                        });
                    }
                } catch (err) {
                    toast.error('Failed to load agreement details');
                } finally {
                    setLoading(false);
                }
            };
            fetchAgreement();
        } else if (routerLocation.state?.quotation) {
            // Auto-fill from quotation passed via router state
            handleSelectQuotation(routerLocation.state.quotation);
        }
    }, [id]);

    // Handle Quotation Auto-Fill Selection
    const handleSelectQuotation = (q) => {
        const totalVal = q.finalSellingPrice || q.calculatedSellingPrice || 1650000;
        const adv = Math.round(totalVal * 0.55);
        const prog = Math.round(totalVal * 0.20);
        const fin = totalVal - adv - prog;

        setAgreementData(prev => ({
            ...prev,
            quotationId: q._id,
            quotationNumber: q.quoteNumber || 'QOT-231',
            customerDetails: {
                customerName: q.customerName || '',
                projectLocation: q.location || q.projectName || '',
                contactNo: q.customerContact || ''
            },
            projectValue: totalVal,
            paymentSchedule: [
                { stageName: 'Order Confirmation Advance', amount: adv, percentage: 55 },
                { stageName: 'Project Progress Payment', amount: prog, percentage: 20 },
                { stageName: 'Final Payment Upon Project Completion', amount: fin, percentage: 25 }
            ]
        }));
        toast.success(`Auto-filled details from Quotation ${q.quoteNumber || ''}`);
    };

    // Calculate Payment Schedule Sum & Validation
    const totalScheduleAmount = agreementData.paymentSchedule.reduce((sum, stage) => sum + (Number(stage.amount) || 0), 0);
    const isScheduleValid = Math.abs(totalScheduleAmount - agreementData.projectValue) < 1;

    // Handle Payment Stage Amount Change
    const handleStageAmountChange = (index, amount) => {
        const val = Math.max(0, Number(amount) || 0);
        const newSchedule = [...agreementData.paymentSchedule];
        newSchedule[index].amount = val;
        newSchedule[index].percentage = agreementData.projectValue > 0 
            ? parseFloat(((val / agreementData.projectValue) * 100).toFixed(2)) 
            : 0;
        setAgreementData({ ...agreementData, paymentSchedule: newSchedule });
    };

    // Add / Remove Payment Stage
    const addPaymentStage = () => {
        setAgreementData({
            ...agreementData,
            paymentSchedule: [
                ...agreementData.paymentSchedule,
                { stageName: 'Additional Milestone Payment', amount: 0, percentage: 0 }
            ]
        });
    };

    const removePaymentStage = (index) => {
        if (agreementData.paymentSchedule.length <= 1) {
            toast.error('Agreement must have at least one payment stage.');
            return;
        }
        setAgreementData({
            ...agreementData,
            paymentSchedule: agreementData.paymentSchedule.filter((_, i) => i !== index)
        });
    };

    // Save Agreement Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isScheduleValid) {
            toast.error(`Payment schedule total (LKR ${totalScheduleAmount.toLocaleString()}) must match Total Project Value (LKR ${agreementData.projectValue.toLocaleString()})`);
            return;
        }

        setSaving(true);
        try {
            if (id) {
                await api.put(`/alu/agreements/${id}`, agreementData);
                toast.success('Project Agreement updated successfully!');
            } else {
                const res = await api.post('/alu/agreements', agreementData);
                toast.success('Project Agreement created successfully!');
                navigate(`/alu/agreements/${res.data.data._id}`);
            }
        } catch (err) {
            toast.error('Failed to save Project Agreement');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/alu/agreements')}
                        className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                            <FileText className="text-indigo-600" size={24} /> {id ? 'Edit Project Agreement' : 'New Project Agreement Generator'}
                        </h1>
                        <p className="text-slate-500 text-xs mt-0.5">
                            Auto-fill from quotation, configure payment schedules, customized warranties, and print official agreement.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        onClick={() => setShowPrintModal(true)}
                        className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                        <Printer size={15} /> Preview & Print
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition"
                    >
                        <Save size={15} /> {saving ? 'Saving...' : 'Save Agreement'}
                    </Button>
                </div>
            </div>

            {/* Quotation Auto-Fill Selector Card */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-2xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Step 1. Quotation Auto-Fill Integration</span>
                    <h3 className="text-sm font-bold mt-0.5">Select an existing quotation to auto-populate customer details & project value</h3>
                </div>
                <div className="w-full md:w-72">
                    <select
                        onChange={(e) => {
                            const q = quotations.find(item => item._id === e.target.value);
                            if (q) handleSelectQuotation(q);
                        }}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white font-bold focus:outline-none focus:bg-slate-900"
                    >
                        <option value="" className="text-slate-800">-- Select Quotation (e.g. QOT-231) --</option>
                        {quotations.map(q => (
                            <option key={q._id} value={q._id} className="text-slate-800">
                                {q.quoteNumber} - {q.customerName} (LKR {(q.finalSellingPrice || 0).toLocaleString()})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Agreement Metadata & Customer Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b pb-2">
                        1. Agreement Details & Customer Info
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Agreement Number</label>
                            <input
                                type="text"
                                value={agreementData.agreementNumber}
                                onChange={(e) => setAgreementData({ ...agreementData, agreementNumber: e.target.value })}
                                className="w-full p-2 border rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Quotation Reference</label>
                            <input
                                type="text"
                                value={agreementData.quotationNumber}
                                onChange={(e) => setAgreementData({ ...agreementData, quotationNumber: e.target.value })}
                                className="w-full p-2 border rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Agreement Date</label>
                            <input
                                type="date"
                                value={agreementData.agreementDate}
                                onChange={(e) => setAgreementData({ ...agreementData, agreementDate: e.target.value })}
                                className="w-full p-2 border rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Customer Name</label>
                            <input
                                type="text"
                                value={agreementData.customerDetails.customerName}
                                onChange={(e) => setAgreementData({ ...agreementData, customerDetails: { ...agreementData.customerDetails, customerName: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-semibold focus:ring-2 focus:ring-indigo-500/20"
                                required
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Contact Number</label>
                            <input
                                type="text"
                                value={agreementData.customerDetails.contactNo}
                                onChange={(e) => setAgreementData({ ...agreementData, customerDetails: { ...agreementData.customerDetails, contactNo: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-mono font-semibold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Total Project Value (LKR)</label>
                            <input
                                type="number"
                                value={agreementData.projectValue}
                                onChange={(e) => setAgreementData({ ...agreementData, projectValue: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full p-2 border rounded-xl font-mono font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500/20"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-bold text-slate-600 mb-1 text-xs">Project Location Address</label>
                        <input
                            type="text"
                            value={agreementData.customerDetails.projectLocation}
                            onChange={(e) => setAgreementData({ ...agreementData, customerDetails: { ...agreementData.customerDetails, projectLocation: e.target.value } })}
                            className="w-full p-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                            required
                        />
                    </div>
                </div>

                {/* 2. Flexible Payment Schedule Configurator */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                            2. Flexible Payment Schedule Configurator
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isScheduleValid ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-rose-50 text-rose-700 border-rose-300'}`}>
                                Total: LKR {totalScheduleAmount.toLocaleString()} / {agreementData.projectValue.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {!isScheduleValid && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                            <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
                            <span>Payment stages sum (LKR {totalScheduleAmount.toLocaleString()}) does not match Total Project Value (LKR {agreementData.projectValue.toLocaleString()}). Difference: LKR {Math.abs(totalScheduleAmount - agreementData.projectValue).toLocaleString()}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        {agreementData.paymentSchedule.map((stage, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                                <input
                                    type="text"
                                    value={stage.stageName}
                                    onChange={(e) => {
                                        const next = [...agreementData.paymentSchedule];
                                        next[idx].stageName = e.target.value;
                                        setAgreementData({ ...agreementData, paymentSchedule: next });
                                    }}
                                    className="flex-1 p-2 bg-white border rounded-lg font-semibold"
                                    placeholder="Stage Description"
                                />
                                <div className="w-40 flex items-center gap-1">
                                    <span className="font-bold text-slate-400">LKR</span>
                                    <input
                                        type="number"
                                        value={stage.amount}
                                        onChange={(e) => handleStageAmountChange(idx, e.target.value)}
                                        className="w-full p-2 bg-white border rounded-lg font-mono font-bold text-indigo-700 text-right"
                                    />
                                </div>
                                <span className="w-16 text-right font-mono font-semibold text-slate-500">
                                    {stage.percentage || 0}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removePaymentStage(idx)}
                                    className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        onClick={addPaymentStage}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition"
                    >
                        <Plus size={14} /> Add Payment Stage
                    </Button>
                </div>

                {/* 3. Dynamic Lead Time, Warranties & Scope */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b pb-2">
                        3. Scope of Work, Lead Time & Warranty Customization
                    </h3>

                    <div>
                        <label className="block font-bold text-slate-600 mb-1">Scope of Work</label>
                        <textarea
                            rows={3}
                            value={agreementData.scopeOfWork}
                            onChange={(e) => setAgreementData({ ...agreementData, scopeOfWork: e.target.value })}
                            className="w-full p-2.5 border rounded-xl font-medium focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Project Lead Time (Working Days)</label>
                            <input
                                type="number"
                                value={agreementData.leadTimeDays}
                                onChange={(e) => setAgreementData({ ...agreementData, leadTimeDays: Math.max(1, parseInt(e.target.value) || 1) })}
                                className="w-full p-2 border rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Fabrication Workmanship Warranty (Years)</label>
                            <input
                                type="number"
                                value={agreementData.warranties.workmanshipYears}
                                onChange={(e) => setAgreementData({ ...agreementData, warranties: { ...agreementData.warranties, workmanshipYears: Math.max(0, parseInt(e.target.value) || 0) } })}
                                className="w-full p-2 border rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Hardware & Accessories Warranty (Years)</label>
                            <input
                                type="number"
                                value={agreementData.warranties.hardwareYears}
                                onChange={(e) => setAgreementData({ ...agreementData, warranties: { ...agreementData.warranties, hardwareYears: Math.max(0, parseInt(e.target.value) || 0) } })}
                                className="w-full p-2 border rounded-xl font-bold focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                </div>

                {/* 4. Bank Details */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 border-b pb-2">
                        4. Contractor Bank Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Bank Name</label>
                            <input
                                type="text"
                                value={agreementData.bankDetails.bankName}
                                onChange={(e) => setAgreementData({ ...agreementData, bankDetails: { ...agreementData.bankDetails, bankName: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Account Name</label>
                            <input
                                type="text"
                                value={agreementData.bankDetails.accountName}
                                onChange={(e) => setAgreementData({ ...agreementData, bankDetails: { ...agreementData.bankDetails, accountName: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Account Number</label>
                            <input
                                type="text"
                                value={agreementData.bankDetails.accountNumber}
                                onChange={(e) => setAgreementData({ ...agreementData, bankDetails: { ...agreementData.bankDetails, accountNumber: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-mono font-bold"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-600 mb-1">Branch</label>
                            <input
                                type="text"
                                value={agreementData.bankDetails.branch}
                                onChange={(e) => setAgreementData({ ...agreementData, bankDetails: { ...agreementData.bankDetails, branch: e.target.value } })}
                                className="w-full p-2 border rounded-xl font-semibold"
                            />
                        </div>
                    </div>
                </div>

            </form>

            {/* Print Preview Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 bg-slate-950/80 z-50 overflow-y-auto p-4 flex justify-center items-start">
                    <div className="bg-white rounded-2xl p-6 max-w-4xl w-full my-8 space-y-4 shadow-2xl relative">
                        <div className="flex justify-between items-center border-b pb-3 print:hidden">
                            <h3 className="font-extrabold text-slate-800 text-sm">Print / PDF Preview - Official Project Agreement</h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => window.print()}
                                    className="bg-indigo-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1"
                                >
                                    <Printer size={14} /> Print / Export PDF
                                </Button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="text-slate-400 hover:text-slate-600 font-bold px-2 text-sm"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Agreement Printable Document Component */}
                        <AluAgreementPrintView agreement={agreementData} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AluAgreementFormPage;
