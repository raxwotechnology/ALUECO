import { useState, useEffect } from 'react';
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Download, Info, Clock, RefreshCw, FileText, LayoutList,
    Database, Layers, ArrowLeftRight
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import api from '../api/axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ImportPreviewModal from '../components/ImportPreviewModal';
import EditableDataGrid from '../components/EditableDataGrid';

const IMPORT_MODULES = [
    { value: 'petty-cash', label: 'Petty Cash Expenses (DHY)' },
    { value: 'production', label: 'Production Batches (DHY)' },
    { value: 'pnl', label: 'Daily P&L Performance (DHY)' },
];

export default function ImportDataPage() {
    const [viewMode, setViewMode] = useState('sync'); // 'sync' or 'upload'
    const [selectedModule, setSelectedModule] = useState('petty-cash');
    const [liveData, setLiveData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [history, setHistory] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    useEffect(() => {
        if (viewMode === 'sync') {
            fetchLiveData();
        } else {
            fetchHistory();
        }
    }, [viewMode, selectedModule]);

    const fetchLiveData = async () => {
        setIsLoadingData(true);
        try {
            const response = await api.get(`/sync/${selectedModule}`);
            setLiveData(response.data.data || []);
        } catch (err) {
            toast.error('Failed to fetch live data');
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await api.get('/import/history');
            setHistory(response.data.data.filter(h => h.importType === selectedModule.replace('-', '_')) || []);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            handlePreview(selectedFile);
        }
    };

    const handlePreview = async (selectedFile) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

            // Map rows for preview based on analysis (Simplified view)
            let previewRows = json.slice(0, 20).filter(r => r.some(c => c !== null));
            setPreviewData(previewRows.map(r => ({ data: JSON.stringify(r).slice(0, 100) })));
            setIsPreviewOpen(true);
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleConfirmImport = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        setIsUploading(true);
        try {
            await api.post(`/import/${selectedModule}`, formData);
            toast.success('Data Imported and Synchronized');
            setIsPreviewOpen(false);
            setFile(null);
            setViewMode('sync');
            fetchLiveData();
        } catch (err) {
            toast.error('Import failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleExport = async () => {
        try {
            toast.loading('Regenerating Excel Document...', { id: 'export' });
            const response = await api.get(`/sync/export-template/${selectedModule}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedModule}_synced_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Export Successful - Formatting & Formulas Preserved', { id: 'export' });
        } catch (err) {
            toast.error('Export failed', { id: 'export' });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bi-Directional Sync Center"
                description="Synchronize Excel files with Live ERP Database & UI"
                actions={
                    <div className="flex p-1 bg-white border border-gray-200 rounded-2xl shadow-sm">
                        <button
                            onClick={() => setViewMode('sync')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'sync' ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ArrowLeftRight size={14} /> LIVE SYNC
                        </button>
                        <button
                            onClick={() => setViewMode('upload')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${viewMode === 'upload' ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Upload size={14} /> IMPORT EXCEL
                        </button>
                    </div>
                }
            />

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <Card className="p-6 border-none shadow-xl bg-gradient-to-br from-white to-gray-50/50">
                        <h3 className="text-[10px] font-black mb-4 flex items-center gap-2 text-primary-600 uppercase tracking-widest">
                            <Layers size={14} /> Target Module
                        </h3>
                        <Select
                            options={IMPORT_MODULES}
                            value={selectedModule}
                            onChange={(e) => setSelectedModule(e.target.value)}
                            className="bg-white border-gray-100"
                        />
                        <div className="mt-8 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Sync Status</p>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-xs font-bold text-gray-900">Connected to Database</span>
                                </div>
                            </div>
                            <Button
                                variant="primary"
                                className="w-full py-4 rounded-2xl shadow-xl shadow-primary-200 font-black uppercase text-[10px] tracking-widest"
                                onClick={handleExport}
                            >
                                <Download size={16} className="mr-2" /> Sync to Excel
                            </Button>
                        </div>
                    </Card>
                </div>

                <div className="col-span-12 lg:col-span-9">
                    {viewMode === 'sync' ? (
                        <Card className="p-0 border-none shadow-2xl relative overflow-hidden h-[700px] flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-tighter flex items-center gap-2">
                                        <Database size={16} className="text-primary-600" />
                                        Live Spreadsheet Interface
                                    </h3>
                                    <p className="text-[9px] text-gray-400 font-medium tracking-tight">Direct bi-directional editing mapped to Excel structure</p>
                                </div>
                                <button onClick={fetchLiveData} className="p-2 hover:bg-white rounded-xl border transition-all text-gray-400 hover:text-primary-600">
                                    <RefreshCw size={16} className={isLoadingData ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden p-2">
                                {isLoadingData ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Loader2 size={40} className="animate-spin text-primary-200" />
                                    </div>
                                ) : (
                                    <EditableDataGrid
                                        data={liveData}
                                        type={selectedModule}
                                        onUpdate={(data, action) => {
                                            if (action === 'delete') {
                                                setLiveData(prev => prev.filter(item => item._id !== data._id));
                                            } else if (action === 'create') {
                                                setLiveData(prev => [data, ...prev]);
                                            } else {
                                                setLiveData(prev => prev.map(item => item._id === data._id ? data : item));
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="p-12 border-none shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
                            <div className="max-w-md w-full text-center">
                                <div className="w-24 h-24 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-primary-100">
                                    <FileSpreadsheet size={48} className="text-primary-600" />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tighter mb-4">Initialize Source Sync</h2>
                                <p className="text-sm text-gray-500 mb-10 leading-relaxed italic">
                                    Upload your original "DHY" Excel file to initialize or update the live database synchronization.
                                </p>

                                <input
                                    type="file"
                                    id="sync-upload"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="sync-upload" className="block w-full">
                                    <div className="border-2 border-dashed border-primary-200 rounded-3xl p-10 hover:bg-primary-50 transition-all cursor-pointer group">
                                        <Upload size={32} className="mx-auto mb-4 text-primary-300 group-hover:text-primary-600 transition-all" />
                                        <p className="text-xs font-black uppercase tracking-widest text-primary-700">
                                            {file ? file.name : 'Choose Excel File'}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            <ImportPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                data={previewData}
                type={selectedModule}
                isUploading={isUploading}
                onConfirm={handleConfirmImport}
            />
        </div>
    );
}

function Loader2({ size, className }) {
    return <RefreshCw size={size} className={`animate-spin ${className}`} />;
}
