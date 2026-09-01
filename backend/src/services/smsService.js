import mongoose from 'mongoose';
import SmsLog from '../models/SmsLog.js';
import Supplier from '../models/Supplier.js';

export const formatSmsContact = (phone) => {
    if (!phone || phone === 'N/A') return null;
    let clean = phone.replace(/[^0-9]/g, ''); // keep only numbers
    if (clean.startsWith('0')) {
        clean = '94' + clean.slice(1);
    }
    if (clean.length === 9) { // e.g. 772268608
        clean = '94' + clean;
    }
    if (clean.startsWith('94') && clean.length === 11) {
        return '+' + clean;
    }
    return '+' + clean;
};

/**
 * Construct and send (simulate) a confirmation SMS to the supplier after GRN QA approval.
 * Writes a record to the database SmsLog.
 */
export const sendGrnConfirmationSms = async (grn, customMessage = null) => {
    try {
        if (!grn) return;
        
        let supplierPhone = 'N/A';
        let supplierName = grn.supplierName || 'Supplier';

        // Load the supplier to get the phone number if available
        if (grn.supplierId) {
            const supplier = await Supplier.findById(grn.supplierId);
            if (supplier && supplier.primaryContact) {
                supplierPhone = supplier.primaryContact.mobile || supplier.primaryContact.phone || 'N/A';
                supplierName = supplier.displayName || supplier.companyName || supplierName;
            }
        }

        const formattedDate = grn.receiptDate ? new Date(grn.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        
        // Formulate products details
        const productsList = grn.items.map(item => {
            const qty = item.acceptedQuantity || item.receivedQuantity || 0;
            const uom = item.unitOfMeasure || 'kg';
            return `${item.productName} (${qty} ${uom})`;
        }).join(', ');

        const totalVal = grn.totalAcceptedValue || grn.totalPayableLKR || 0;
        const formattedTotal = totalVal.toLocaleString('en-LK', { minimumFractionDigits: 2 });

        const paymentTermText = (grn.balanceDueLKR === 0) ? 'Paid' : `Credit (Outstanding: Rs. ${grn.balanceDueLKR?.toLocaleString('en-LK', { minimumFractionDigits: 2 })})`;

        // Construct the SMS message
        const message = customMessage || `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Payment status: ${paymentTermText}. Total accepted value: Rs. ${formattedTotal}. Thank you.`;

        let status = 'sent';
        let formattedContact = formatSmsContact(supplierPhone);

        // Send actual SMS if credentials are set in .env
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;

        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched via SMSlenz to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });

                const data = await response.json();
                if (response.status === 200 && data.success) {
                    console.log(`[SMS Gateway] Sent successfully. Campaign ID: ${data.data?.campaign_id}. Balance: ${data.data?.sms_credit_balance}`);
                } else {
                    console.error(`[SMS Gateway] Failed to send: ${data.message || response.statusText}`);
                    status = 'failed';
                }
            } catch (err) {
                console.error('[SMS Gateway] HTTP request failed:', err.message);
                status = 'failed';
            }
        } else {
            // Fallback simulated mode
            console.log(`[SMS Gateway Simulated Dispatch] To: ${supplierPhone} | Msg: ${message}`);
            if (supplierPhone === 'N/A') {
                status = 'failed';
            }
        }

        // Write log entry to database
        const log = await SmsLog.create({
            supplierName,
            supplierPhone: supplierPhone === 'N/A' ? '0770000000' : supplierPhone, // fallback phone for model validations
            message,
            grnId: grn._id,
            status
        });

        return log;
    } catch (error) {
        console.error('[SMS Service] Failed to send/log SMS:', error.message);
        // Attempt to create a failed log
        try {
            await SmsLog.create({
                supplierName: grn?.supplierName || 'Unknown',
                supplierPhone: '0770000000',
                message: 'Failed to construct or send SMS receipt.',
                grnId: grn?._id,
                status: 'failed'
            });
        } catch (innerError) {
            console.error('[SMS Service] Failed to create error log:', innerError.message);
        }
    }
};

/**
 * Automatically send a confirmation SMS to the supplier immediately when a GRN is created/saved.
 * SMS template requested by the user:
 * Dear (Supplier Name), thank you for your supply to Authentic Lanka Exports.
 * Date: (DD/MM/YYYY)
 * Product: (Item Name)
 * Quantity: (Qty) kg
 * Rate: (Rate) LKR/kg
 * Total Amount: (Total) LKR
 * If any discrepancy, please contact with this Contact No immediately.
 */
export const sendGrnCreationSms = async (grn) => {
    try {
        if (!grn) return;

        let supplierPhone = 'N/A';
        let supplierName = grn.supplierName || 'Supplier';

        // Load the supplier to get the phone number if available
        if (grn.supplierId) {
            const supplier = await Supplier.findById(grn.supplierId);
            if (supplier && supplier.primaryContact) {
                supplierPhone = supplier.primaryContact.mobile || supplier.primaryContact.phone || 'N/A';
                supplierName = supplier.displayName || supplier.companyName || supplierName;
            }
        }

        const dateObj = grn.receiptDate ? new Date(grn.receiptDate) : new Date();
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        // Get company contact number from settings
        let contactNo = '0772268608';
        try {
            const Settings = mongoose.model('Settings');
            const settings = await Settings.findOne();
            if (settings && settings.companyPhone) {
                contactNo = settings.companyPhone;
            }
        } catch (err) {
            console.warn('[SMS Service] Could not fetch settings for contact number:', err.message);
        }

        // Calculate total received value (creation time using receivedQuantity)
        const totalVal = grn.items.reduce((sum, item) => sum + ((item.receivedQuantity || 0) * (item.unitPrice || 0)), 0);
        const formattedTotal = totalVal.toLocaleString('en-LK', { minimumFractionDigits: 2 });

        // Build product details
        let productText = '';
        let quantityText = '';
        let rateText = '';

        if (grn.items.length === 1) {
            const item = grn.items[0];
            productText = item.productName;
            quantityText = `${item.receivedQuantity} ${item.unitOfMeasure || 'kg'}`;
            rateText = `${item.unitPrice} LKR/kg`;
        } else {
            productText = grn.items.map(item => item.productName).join(', ');
            quantityText = grn.items.map(item => `${item.receivedQuantity} ${item.unitOfMeasure || 'kg'}`).join(', ');
            rateText = grn.items.map(item => `${item.unitPrice} LKR/kg`).join(', ');
        }

        // Construct the SMS message using user's template
        const message = `Dear ${supplierName}, thank you for your supply to Authentic Lanka Exports.\nDate: ${formattedDate}\nProduct: ${productText}\nQuantity: ${quantityText}\nRate: ${rateText}\nTotal Amount: ${formattedTotal} LKR\nIf any discrepancy, please contact with ${contactNo} immediately.`;

        let status = 'sent';
        let formattedContact = formatSmsContact(supplierPhone);

        // Send actual SMS if credentials are set in .env
        const { SMS_USER_ID, SMS_API_KEY, SMS_SENDER_ID, SMS_GATEWAY_URL } = process.env;

        if (SMS_USER_ID && SMS_API_KEY && SMS_SENDER_ID && SMS_GATEWAY_URL && formattedContact) {
            console.log(`[SMS Gateway] Dispatched Creation SMS via SMSlenz to: ${formattedContact}`);
            try {
                const response = await fetch(SMS_GATEWAY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: SMS_USER_ID,
                        api_key: SMS_API_KEY,
                        sender_id: SMS_SENDER_ID,
                        contact: formattedContact,
                        message: message
                    })
                });

                const data = await response.json();
                if (response.status === 200 && data.success) {
                    console.log(`[SMS Gateway] Creation SMS sent successfully. Campaign ID: ${data.data?.campaign_id}`);
                } else {
                    console.error(`[SMS Gateway] Creation SMS failed to send: ${data.message || response.statusText}`);
                    status = 'failed';
                }
            } catch (err) {
                console.error('[SMS Gateway] Creation SMS HTTP request failed:', err.message);
                status = 'failed';
            }
        } else {
            // Fallback simulated mode
            console.log(`[SMS Gateway Simulated Creation SMS Dispatch] To: ${supplierPhone} | Msg: ${message}`);
            if (supplierPhone === 'N/A') {
                status = 'failed';
            }
        }

        // Write log entry to database
        const log = await SmsLog.create({
            supplierName,
            supplierPhone: supplierPhone === 'N/A' ? '0770000000' : supplierPhone,
            message,
            grnId: grn._id,
            status
        });

        return log;
    } catch (error) {
        console.error('[SMS Service] Failed to send/log GRN Creation SMS:', error.message);
    }
};
