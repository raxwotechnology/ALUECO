import { useCallback } from 'react';
import api from '../api/axios';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/dataExport';
import { useAuthStore } from '../store/authStore';
import { useSettings } from '../features/settings/useSettings';

/**
 * useExport hook
 * Centralizes logic for exporting table data to multiple formats.
 */
export const useExport = ({ title, columns, fileName, module }) => {
    const { user } = useAuthStore();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const generateFileName = useCallback((ext) => {
        const date = new Date().toISOString().slice(0, 10);
        return `${fileName || title.replace(/\s+/g, '_')}_${date}.${ext}`;
    }, [fileName, title]);

    const handleBackendExport = async (format, filters = {}) => {
        try {
            const response = await api.get(
                `/export/${module}/${format}`,
                {
                    params: { filters: JSON.stringify(filters) },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', generateFileName(format === 'excel' ? 'xlsx' : format));
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            // If the error response is a blob, try to read it as JSON
            if (error.response?.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorMsg = JSON.parse(reader.result).message;
                        alert(`Export failed: ${errorMsg}`);
                    } catch (e) {
                        alert('Export failed. Please check server logs.');
                    }
                };
                reader.readAsText(error.response.data);
            } else {
                alert(`Export failed: ${error.message}`);
            }
        }
    };

    const handleExportExcel = useCallback((data, isAll = false, filters = {}) => {
        if (isAll && module) return handleBackendExport('excel', filters);
        if (!data || data.length === 0) return;
        
        const exportData = data.map(item => {
            const row = {};
            columns.forEach(col => {
                row[col.header] = item[col.dataKey] ?? '';
            });
            return row;
        });

        exportToExcel(exportData, generateFileName('xlsx').replace('.xlsx', ''), title);
    }, [columns, generateFileName, module, title]);

    const handleExportCSV = useCallback((data, isAll = false, filters = {}) => {
        if (isAll && module) return handleBackendExport('csv', filters);
        if (!data || data.length === 0) return;
        
        const exportData = data.map(item => {
            const row = {};
            columns.forEach(col => {
                row[col.header] = item[col.dataKey] ?? '';
            });
            return row;
        });

        exportToCSV(exportData, generateFileName('csv'));
    }, [columns, generateFileName, module]);

    const handleExportPDF = useCallback((data, isAll = false, filters = {}) => {
        if (isAll && module) return handleBackendExport('pdf', filters);
        if (!data || data.length === 0) return;

        const preparedColumns = columns.map(col => ({
            header: col.header,
            dataKey: col.dataKey
        }));

        exportToPDF(
            title, 
            preparedColumns, 
            data, 
            generateFileName('pdf').replace('.pdf', ''),
            {
                userName: `${user?.firstName} ${user?.lastName}`,
                userRole: user?.role,
                companyName: settings?.companyName
            }
        );
    }, [columns, generateFileName, module, title, user, settings]);

    return {
        handleExportExcel,
        handleExportCSV,
        handleExportPDF
    };
};
