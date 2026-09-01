import Modal from './ui/Modal';
import Button from './ui/Button';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function ImportPreviewModal({ isOpen, onClose, data, onConfirm, isUploading, type }) {
    if (!data) return null;

    const hasErrors = data.some(row => row._errors);
    const validCount = data.filter(row => !row._errors).length;
    const errorCount = data.filter(row => row._errors).length;

    // Filter out internal fields for display
    const getDisplayData = () => {
        return data.map(row => {
            const entry = { ...row };
            delete entry._errors;
            return entry;
        });
    };

    const displayData = getDisplayData();
    const headers = displayData.length > 0 ? Object.keys(displayData[0]) : [];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Preview Import Data: ${type.toUpperCase().replace('-', ' ')}`}
            size="xl"
        >
            <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-3 border border-gray-200">
                        <Info className="text-gray-400" size={20} />
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-wider">Total Rows</p>
                            <p className="text-lg font-bold">{data.length}</p>
                        </div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3 border border-green-200">
                        <CheckCircle2 className="text-green-600" size={20} />
                        <div>
                            <p className="text-[10px] text-green-700 uppercase font-black tracking-wider">Valid</p>
                            <p className="text-lg font-bold text-green-800">{validCount}</p>
                        </div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg flex items-center gap-3 border border-red-200">
                        <AlertCircle className="text-red-600" size={20} />
                        <div>
                            <p className="text-[10px] text-red-700 uppercase font-black tracking-wider">Errors</p>
                            <p className="text-lg font-bold text-red-800">{errorCount}</p>
                        </div>
                    </div>
                </div>

                <div className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="max-h-[500px] overflow-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 border-b z-10">
                                <tr>
                                    {headers.map(key => (
                                        <th key={key} className="px-4 py-3 font-bold text-gray-600 uppercase tracking-tighter whitespace-nowrap">
                                            {key.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 font-bold text-gray-600 uppercase tracking-tighter sticky right-0 bg-gray-50">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.map((row, idx) => (
                                    <tr key={idx} className={`${row._errors ? 'bg-red-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                                        {headers.map((key, i) => (
                                            <td key={i} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                                {row[key] !== null && row[key] !== undefined ? String(row[key]) : <span className="text-gray-300">-</span>}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 sticky right-0 bg-white/80 backdrop-blur-sm border-l">
                                            {row._errors ? (
                                                <span className="text-red-600 font-bold flex items-center gap-1.5">
                                                    <AlertCircle size={14} /> {row._errors}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 font-bold flex items-center gap-1.5">
                                                    <CheckCircle2 size={14} /> Ready
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                    <p className="text-xs text-gray-500 italic">
                        * Please ensure all required columns are present and data types match.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button
                            variant="primary"
                            disabled={validCount === 0 || isUploading}
                            loading={isUploading}
                            onClick={onConfirm}
                            className="shadow-lg shadow-primary-200"
                        >
                            <Upload className="mr-2" size={18} /> Confirm & Commit {validCount} Rows
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
