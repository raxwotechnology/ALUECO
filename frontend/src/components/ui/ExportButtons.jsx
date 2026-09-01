import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table as TableIcon, FileSpreadsheet, ChevronDown } from 'lucide-react';
import Button from './Button';

/**
 * ExportButtons Component
 * 
 * @param {Object} props
 * @param {Function} props.onExportPDF - Callback for PDF export
 * @param {Function} props.onExportExcel - Callback for Excel export
 * @param {Function} props.onExportCSV - Callback for CSV export
 * @param {boolean} props.isLoading - Global loading state
 * @param {boolean} props.isDisabled - Disable buttons
 */
export default function ExportButtons({
    onExportPDF,
    onExportExcel,
    onExportCSV,
    onExportAllPDF,
    onExportAllExcel,
    onExportAllCSV,
    isLoading,
    isDisabled
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        if (action) action();
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isDisabled || isLoading}
                className="flex items-center gap-2"
            >
                <Download size={16} />
                <span>Export</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl ring-1 ring-black/5 z-50 overflow-hidden divide-y divide-gray-100 border border-gray-100">
                    {/* Current Page Section */}
                    <div className="py-1">
                        <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Current Page
                        </div>
                        <button
                            onClick={() => handleAction(onExportPDF)}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                            <FileText size={16} className="mr-3 text-red-500" />
                            Download PDF
                        </button>
                        <button
                            onClick={() => handleAction(onExportExcel)}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                            <FileSpreadsheet size={16} className="mr-3 text-green-600" />
                            Export Excel
                        </button>
                        <button
                            onClick={() => handleAction(onExportCSV)}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                            <TableIcon size={16} className="mr-3 text-blue-500" />
                            Export CSV
                        </button>
                    </div>

                    {/* All Records Section */}
                    {(onExportAllPDF || onExportAllExcel || onExportAllCSV) && (
                        <div className="py-1 bg-gray-50/50">
                            <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                All Records (Backend)
                            </div>
                            {onExportAllPDF && (
                                <button
                                    onClick={() => handleAction(onExportAllPDF)}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                    <FileText size={16} className="mr-3 text-indigo-400" />
                                    Download Full PDF
                                </button>
                            )}
                            {onExportAllExcel && (
                                <button
                                    onClick={() => handleAction(onExportAllExcel)}
                                    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                    <FileSpreadsheet size={16} className="mr-3 text-indigo-400" />
                                    Export Full Excel
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
