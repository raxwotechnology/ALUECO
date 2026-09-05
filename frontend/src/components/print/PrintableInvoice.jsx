import { forwardRef } from 'react';
import CustomerQuotationView from '../aluminium/CustomerQuotationView';

/**
 * Printable invoice wrapper using the unified ALUECO Document View.
 * Renders the exact same layout as Quotation view for consistency across view, print, and PDF export.
 */
const PrintableInvoice = forwardRef(({ companyInfo, invoice, options = {} }, ref) => {
    if (!invoice) return null;

    const settings = {
        companyName: companyInfo?.name || 'ALUECO ALUMINIUM SYSTEMS',
        companyAddress: companyInfo?.address || 'No. 123, Negoda Road, Weliweriya, Sri Lanka.',
        companyPhone: companyInfo?.phone || '0777 140 680',
        companyEmail: companyInfo?.email || 'info@alueco.lk',
        companyWebsite: companyInfo?.website || 'www.alueco.lk',
        companyLogo: companyInfo?.logo,
        secondaryLogo: companyInfo?.secondaryLogo,
    };

    return (
        <div ref={ref} className="print-container bg-white text-black p-0 max-w-[800px] mx-auto">
            <CustomerQuotationView 
                invoice={invoice}
                type="INVOICE"
                settings={settings}
                options={options}
            />
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;