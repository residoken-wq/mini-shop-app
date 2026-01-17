import { db } from './db';

// SendBulkTexts.com API configuration
// Docs: /docs/send-bulk-texts-api-documentation.yaml
const SMS_CONFIG = {
    baseUrl: "https://www.sendbulktexts.com/sms-api",
    accountId: "69507",
    apiKey: "31c1f717-8be2-455f-b494-2a5eedf01bd9"
};

interface SMSPayload {
    to: string;
    body: string;
    imageurl?: string;
}

// Format Vietnamese phone number to E.164 format
function formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with +84
    if (cleaned.startsWith('0')) {
        cleaned = '84' + cleaned.substring(1);
    }

    // If doesn't start with country code, add 84
    if (!cleaned.startsWith('84')) {
        cleaned = '84' + cleaned;
    }

    return '+' + cleaned;
}

/**
 * Send SMS via SendBulkTexts API
 * Endpoint: POST /v1/{accountid}/send-sms/{apikey}
 * Content-Type: application/x-www-form-urlencoded
 */
export async function sendSMS(payload: SMSPayload): Promise<{ success: boolean; error?: string }> {
    try {
        const formattedPhone = formatPhoneNumber(payload.to);

        // Build form data
        const formData = new URLSearchParams();
        formData.append('to', formattedPhone);
        formData.append('body', payload.body);
        if (payload.imageurl) {
            formData.append('imageurl', payload.imageurl);
        }

        const url = `${SMS_CONFIG.baseUrl}/v1/${SMS_CONFIG.accountId}/send-sms/${SMS_CONFIG.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (response.ok) {
            console.log(`SMS sent to ${formattedPhone}`);
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
            console.error('SMS send failed:', errorData);
            return { success: false, error: errorData.message || `HTTP ${response.status}` };
        }
    } catch (error) {
        console.error('SMS send error:', error);
        return { success: false, error: String(error) };
    }
}

// Generate shipping notification message
export function generateShippingMessage(orderCode: string, recipientName: string, shopName: string): string {
    return `${shopName}: Xin chào ${recipientName}, đơn hàng ${orderCode} của bạn đang được giao. Vui lòng chuẩn bị nhận hàng. Cảm ơn quý khách!`;
}

// Send shipping notification SMS
export async function sendShippingNotification(data: {
    orderCode: string;
    recipientName: string;
    recipientPhone: string;
}): Promise<{ success: boolean; error?: string }> {
    try {
        // Get shop name
        const settings = await db.shopSettings.findUnique({
            where: { id: "shop" }
        });
        const shopName = settings?.name || "Mini Shop";

        // Generate message
        const message = generateShippingMessage(data.orderCode, data.recipientName, shopName);

        // Send SMS
        const result = await sendSMS({
            to: data.recipientPhone,
            body: message
        });

        return result;
    } catch (error) {
        console.error('Shipping notification error:', error);
        return { success: false, error: String(error) };
    }
}
