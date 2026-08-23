import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Navigation, Plus, Edit, Trash2, FileText, CheckCircle, Clock, User, Clipboard, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const AluSurveyPage = () => {
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editingSurvey, setEditingSurvey] = useState(null);
    const [deletingSurvey, setDeletingSurvey] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Linked Metadata
    const [inquiries, setInquiries] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedInquiryId, setSelectedInquiryId] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [attachments, setAttachments] = useState([]); // Array of {fileName, fileUrl}
    const [uploading, setUploading] = useState(false);

    // Form State
    const [customerName, setCustomerName] = useState('');
    const [projectName, setProjectName] = useState('');
    const [surveyorName, setSurveyorName] = useState('');
    const [notes, setNotes] = useState('');
    const [measurements, setMeasurements] = useState([
        { label: 'GF-W1', width: 1200, height: 1200, applicationType: 'Casement Window', configuration: '1 Panel' }
    ]);

    const fetchSurveys = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alu/surveys');
            setSurveys(res.data.data || []);
        } catch (error) {
            toast.error('Failed to load surveys');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSurveys();
        const loadMetadata = async () => {
            try {
                const [inqRes, custRes] = await Promise.all([
                    api.get('/crm/inquiries?limit=100'),
                    api.get('/customers?limit=500')
                ]);
                setInquiries(inqRes.data.data || []);
                setCustomers(custRes.data.data || []);
            } catch (err) {
                console.error("Failed to load metadata", err);
            }
        };
        loadMetadata();
    }, []);

    const handleOpenCreate = () => {
        setEditingSurvey(null);
        setSelectedInquiryId('');
        setSelectedCustomerId('');
        setCustomerName('');
        setProjectName('');
        setSurveyorName('');
        setNotes('');
        setAttachments([]);
        setMeasurements([
            { label: 'GF-W1', width: 1200, height: 1200, applicationType: 'Casement Window', configuration: '1 Panel' }
        ]);
        setIsOpen(true);
    };

    const handleOpenEdit = (survey) => {
        setEditingSurvey(survey);
        setSelectedInquiryId(survey.inquiryId?._id || survey.inquiryId || '');
        setSelectedCustomerId(survey.customerId?._id || survey.customerId || '');
        setCustomerName(survey.customerName || '');
        setProjectName(survey.projectName || '');
        setSurveyorName(survey.surveyorName || '');
        setNotes(survey.notes || '');
        setAttachments(survey.attachments || []);
        setMeasurements(
            survey.measurements && survey.measurements.length > 0
                ? survey.measurements.map(m => ({
                    label: m.label || '',
                    width: m.width || 0,
                    height: m.height || 0,
                    applicationType: m.applicationType || 'Casement Window',
                    configuration: m.configuration || '1 Panel'
                }))
                : [{ label: 'GF-W1', width: 1200, height: 1200, applicationType: 'Casement Window', configuration: '1 Panel' }]
        );
        setIsOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingSurvey) return;
        setIsDeleting(true);
        try {
            await api.delete(`/alu/surveys/${deletingSurvey._id}`);
            toast.success(`Survey ${deletingSurvey.surveyNumber || ''} deleted successfully`);
            setDeletingSurvey(null);
            fetchSurveys();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete survey');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleInquiryChange = (inqId) => {
        setSelectedInquiryId(inqId);
        if (inqId) {
            const inq = inquiries.find(i => i._id === inqId);
            if (inq) {
                setCustomerName(inq.companyName || inq.contactPerson || '');
                setProjectName(inq.projectLocation ? `Project at ${inq.projectLocation}` : 'New Aluminium Project');
                if (inq.customer) {
                    setSelectedCustomerId(inq.customer._id || inq.customer);
                }
            }
        }
    };

    const handleCustomerChange = (custId) => {
        setSelectedCustomerId(custId);
        if (custId) {
            const cust = customers.find(c => c._id === custId);
            if (cust) {
                setCustomerName(cust.displayName || cust.companyName);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);
        
        setUploading(true);
        try {
            const res = await api.post('/alu/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setAttachments([...attachments, res.data.data]);
            toast.success('Drawing uploaded successfully');
        } catch (err) {
            toast.error('Failed to upload drawing');
        } finally {
            setUploading(false);
        }
    };

    const removeAttachment = (idx) => {
        setAttachments(attachments.filter((_, i) => i !== idx));
    };

    const addMeasurementRow = () => {
        setMeasurements([...measurements, {
            label: `GF-W${measurements.length + 1}`,
            width: 1200,
            height: 1200,
            applicationType: 'Casement Window',
            configuration: '1 Panel'
        }]);
    };

    const removeMeasurementRow = (idx) => {
        setMeasurements(measurements.filter((_, i) => i !== idx));
    };

    const handleRowChange = (idx, field, val) => {
        const updated = [...measurements];
        updated[idx][field] = val;
        setMeasurements(updated);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!customerName || !projectName) {
            return toast.error('Customer and Project name are required');
        }

        setIsSubmitting(true);
        const payload = {
            customerName,
            customerId: selectedCustomerId || undefined,
            inquiryId: selectedInquiryId || undefined,
            projectName,
            surveyorName,
            notes,
            measurements,
            attachments
        };

        try {
            if (editingSurvey) {
                await api.put(`/alu/surveys/${editingSurvey._id}`, payload);
                toast.success('Survey updated successfully');
            } else {
                await api.post('/alu/surveys', payload);
                toast.success('Survey measurements saved successfully');
            }
            setIsOpen(false);
            setEditingSurvey(null);
            fetchSurveys();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save survey record');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 1-Click Convert to official ERP Quotation
    const convertToQuotation = (survey) => {
        navigate('/alu/quotations/new', {
            state: {
                customerName: survey.customerName,
                projectName: survey.projectName,
                items: survey.measurements.map(m => ({
                    applicationType: m.applicationType,
                    configuration: m.configuration,
                    width: m.width,
                    height: m.height,
                    quantity: 1
                }))
            }
        });
        toast.success('Pre-filled survey dimensions into quotation builder!');
    };

    return (
        <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Navigation className="text-indigo-600 animate-pulse" size={24} /> On-Site Site Surveys
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Collect concrete window opening sizes directly from construction sites and quote them instantly.</p>
                </div>
                <Button onClick={handleOpenCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-md transition-all duration-200">
                    <Plus size={18} /> New Site Survey
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-40 text-slate-500 text-sm">Loading site surveys...</div>
            ) : surveys.length === 0 ? (
                <div className="text-center py-20 bg-white border rounded-2xl text-slate-400 italic text-sm">
                    No survey records logged yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {surveys.map(survey => (
                        <div key={survey._id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition">
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1 mr-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{survey.surveyNumber}</span>
                                        <h4 className="font-extrabold text-slate-800 text-sm truncate">{survey.projectName}</h4>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                            survey.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                            {survey.status === 'pending' ? <Clock size={10} /> : <CheckCircle size={10} />}
                                            {survey.status === 'pending' ? 'Pending Quote' : 'Quoted'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <User size={12} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">Client: <strong className="text-slate-700">{survey.customerName}</strong></span>
                                    </div>
                                    {survey.inquiryId && (
                                        <div className="flex items-center gap-1.5">
                                            <FileText size={12} className="text-slate-400 flex-shrink-0" />
                                            <span className="truncate">Lead: <strong className="text-indigo-600">{survey.inquiryId.inquiryCode || 'Linked'}</strong></span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5">
                                        <Clipboard size={12} className="text-slate-400 flex-shrink-0" />
                                        <span className="truncate">Surveyor: <span className="text-slate-700">{survey.surveyorName || 'N/A'}</span></span>
                                    </div>
                                    {survey.notes && (
                                        <p className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 line-clamp-2">
                                            "{survey.notes}"
                                        </p>
                                    )}
                                </div>

                                {survey.attachments && survey.attachments.length > 0 && (
                                    <div className="space-y-1">
                                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Drawings & Sketches</span>
                                        <div className="flex flex-wrap gap-1">
                                            {survey.attachments.map((att, aIdx) => (
                                                <a 
                                                    key={aIdx} 
                                                    href={`${api.defaults.baseURL.replace('/api', '')}${att.fileUrl}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5"
                                                >
                                                    <FileText size={10} /> {att.fileName}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-slate-50 border rounded-xl p-3 space-y-1.5 text-xs max-h-[140px] overflow-y-auto">
                                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Openings Logged ({survey.measurements?.length || 0})</span>
                                    {survey.measurements?.map((m, idx) => (
                                        <div key={idx} className="flex justify-between text-slate-600 border-b last:border-b-0 pb-1">
                                            <span className="font-semibold text-slate-700">{m.label} ({m.applicationType})</span>
                                            <span className="font-mono text-slate-500">{m.width}x{m.height} mm</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-3 border-t space-y-2">
                                <Button
                                    onClick={() => convertToQuotation(survey)}
                                    className="w-full flex justify-center items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm transition"
                                >
                                    <FileText size={13} /> Convert to Quotation
                                </Button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(survey)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-lg transition"
                                    >
                                        <Edit size={13} /> Edit
                                    </button>
                                    <button
                                        onClick={() => setDeletingSurvey(survey)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition"
                                    >
                                        <Trash2 size={13} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Log / Edit Survey Modal */}
            <Modal 
                isOpen={isOpen} 
                onClose={() => { setIsOpen(false); setEditingSurvey(null); }} 
                title={editingSurvey ? `Edit Site Survey — ${editingSurvey.surveyNumber}` : "Log Site Survey measurements"}
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Link to Sales Lead (Inquiry)</label>
                            <select
                                value={selectedInquiryId}
                                onChange={(e) => handleInquiryChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="">-- Optional: Link CRM Lead --</option>
                                {inquiries.map(inq => (
                                    <option key={inq._id} value={inq._id}>
                                        {inq.inquiryCode} - {inq.companyName || inq.contactPerson} ({inq.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Link to ERP Customer</label>
                            <select
                                value={selectedCustomerId}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            >
                                <option value="">-- Optional: Link Customer --</option>
                                {customers.map(c => (
                                    <option key={c._id} value={c._id}>
                                        {c.displayName || c.companyName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Customer / Client Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Dilum Weerasinghe"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name *</label>
                            <input
                                type="text"
                                placeholder="e.g. Colombo Residence"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Surveyor Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Kasun Perera"
                                value={surveyorName}
                                onChange={(e) => setSurveyorName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notes</label>
                            <input
                                type="text"
                                placeholder="e.g. Verify wall level alignment"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Drawings Upload Section */}
                    <div className="border rounded-xl p-3 bg-slate-50/50 space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase">Drawings & sketches</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="file" 
                                onChange={handleFileUpload} 
                                className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                            />
                            {uploading && <span className="text-[10px] text-slate-500">Uploading...</span>}
                        </div>
                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1.5">
                                {attachments.map((att, idx) => (
                                    <div key={idx} className="inline-flex items-center gap-1.5 bg-white border rounded px-2.5 py-1 text-xs">
                                        <span className="text-slate-700 max-w-[120px] truncate">{att.fileName}</span>
                                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700 font-bold ml-1">×</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Measurements List Form */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center border-b pb-1">
                            <h4 className="text-xs font-bold text-slate-700">Openings List</h4>
                            <button type="button" onClick={addMeasurementRow} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                                <PlusCircle size={14} /> Add Row
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {measurements.map((m, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border">
                                    <div className="col-span-3 sm:col-span-2">
                                        <input
                                            type="text"
                                            value={m.label}
                                            onChange={(e) => handleRowChange(idx, 'label', e.target.value)}
                                            className="w-full px-2 py-1.5 border rounded-lg text-xs font-mono"
                                            placeholder="Tag"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-4 sm:col-span-3">
                                        <select
                                            value={m.applicationType}
                                            onChange={(e) => handleRowChange(idx, 'applicationType', e.target.value)}
                                            className="w-full px-2 py-1.5 border rounded-lg text-xs bg-white"
                                        >
                                            <option value="Sliding Door">Sliding Door</option>
                                            <option value="Casement Window">Casement Window</option>
                                            <option value="Fixed Glass">Fixed Glass</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={m.width}
                                            onChange={(e) => handleRowChange(idx, 'width', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 border rounded-lg text-xs"
                                            placeholder="Width"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            value={m.height}
                                            onChange={(e) => handleRowChange(idx, 'height', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-1.5 border rounded-lg text-xs"
                                            placeholder="Height"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-12 sm:col-span-2 mt-1 sm:mt-0 flex gap-2">
                                        <select
                                            value={m.configuration}
                                            onChange={(e) => handleRowChange(idx, 'configuration', e.target.value)}
                                            className="flex-1 px-2 py-1.5 border rounded-lg text-[10px] bg-white"
                                        >
                                            <option value="1 Panel">1 Panel</option>
                                            <option value="2 Panel">2 Panel</option>
                                            <option value="3 Panel">3 Panel</option>
                                            <option value="4 Panel">4 Panel</option>
                                        </select>
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button type="button" onClick={() => removeMeasurementRow(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t">
                        <Button type="button" variant="outline" onClick={() => { setIsOpen(false); setEditingSurvey(null); }} fullWidth className="sm:w-auto">Cancel</Button>
                        <Button type="submit" variant="primary" loading={isSubmitting} fullWidth className="sm:w-auto">
                            {editingSurvey ? 'Update Survey' : 'Save Survey'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={!!deletingSurvey}
                onClose={() => setDeletingSurvey(null)}
                onConfirm={handleDelete}
                title="Delete Site Survey"
                message={`Are you sure you want to delete the site survey "${deletingSurvey?.surveyNumber || ''} (${deletingSurvey?.projectName || ''})"? This action cannot be undone.`}
                confirmText="Delete Survey"
                variant="danger"
                loading={isDeleting}
            />
        </div>
    );
};

export default AluSurveyPage;
