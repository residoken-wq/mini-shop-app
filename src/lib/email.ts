import nodemailer from 'nodemailer';
import { db } from './db';

export interface OrderDetails {
    code: string;
    customerName: string;
    customerPhone: string;
    deliveryAddress?: string;
    deliveryMethod: string;
    paymentMethod: string;
    items: { name: string; quantity: number; price: number; unit: string }[];
    total: number;
    note?: string;
    createdAt: Date;
}

// Get email configuration from settings
async function getEmailConfig() {
    const settings = await db.shopSettings.findUnique({
        where: { id: "shop" }
    });

    if (!settings || !settings.emailEnabled) {
        return null;
    }

    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
        console.log("Email config incomplete");
        return null;
    }

    return {
        host: settings.smtpHost,
        port: settings.smtpPort,
        user: settings.smtpUser,
        pass: settings.smtpPass,
        from: settings.smtpFrom || settings.smtpUser,
        recipients: settings.notifyEmails
            .split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0)
    };
}

// Create transporter
function createTransporter(config: { host: string; port: number; user: string; pass: string }) {
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
            user: config.user,
            pass: config.pass
        }
    });
}

// Generate order email HTML
function generateOrderEmailHtml(order: OrderDetails, shopName: string): string {
    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price)}đ</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.price * item.quantity)}đ</td>
        </tr>
    `).join('');

    const paymentLabel = order.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng'
        : order.paymentMethod === 'QR' ? 'Chuyển khoản'
            : 'Ghi nợ';

    const deliveryLabel = order.deliveryMethod === 'PICKUP' ? 'Nhận tại shop' : 'Giao hàng';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Đơn hàng mới - ${order.code}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">🛒 Đơn hàng mới!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Mã đơn: <strong>${order.code}</strong></p>
    </div>
    
    <div style="background: #f9f9f9; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #333; margin-top: 0;">Thông tin khách hàng</h2>
        <table style="width: 100%;">
            <tr>
                <td style="padding: 5px 0; color: #666;">Khách hàng:</td>
                <td style="padding: 5px 0;"><strong>${order.customerName}</strong></td>
            </tr>
            <tr>
                <td style="padding: 5px 0; color: #666;">SĐT:</td>
                <td style="padding: 5px 0;"><strong>${order.customerPhone}</strong></td>
            </tr>
            <tr>
                <td style="padding: 5px 0; color: #666;">Hình thức:</td>
                <td style="padding: 5px 0;">${deliveryLabel}</td>
            </tr>
            ${order.deliveryAddress ? `
            <tr>
                <td style="padding: 5px 0; color: #666;">Địa chỉ:</td>
                <td style="padding: 5px 0;">${order.deliveryAddress}</td>
            </tr>
            ` : ''}
            <tr>
                <td style="padding: 5px 0; color: #666;">Thanh toán:</td>
                <td style="padding: 5px 0;">${paymentLabel}</td>
            </tr>
        </table>
        
        ${order.note ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px;">
            <strong>📝 Ghi chú:</strong> ${order.note}
        </div>
        ` : ''}
    </div>
    
    <div style="background: white; padding: 20px; border: 1px solid #eee; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">Chi tiết đơn hàng</h2>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; text-align: left;">Sản phẩm</th>
                    <th style="padding: 10px; text-align: center;">SL</th>
                    <th style="padding: 10px; text-align: right;">Đơn giá</th>
                    <th style="padding: 10px; text-align: right;">Thành tiền</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="padding: 15px 8px; text-align: right; font-size: 18px;"><strong>Tổng cộng:</strong></td>
                    <td style="padding: 15px 8px; text-align: right; font-size: 20px; color: #e53e3e;"><strong>${formatCurrency(order.total)}đ</strong></td>
                </tr>
            </tfoot>
        </table>
    </div>
    
    <div style="background: #333; color: white; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
        <p style="margin: 0; font-size: 14px;">
            ${shopName} - ${new Date(order.createdAt).toLocaleString('vi-VN')}
        </p>
    </div>
</body>
</html>
    `;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
}

// Send order notification email
export async function sendOrderNotificationEmail(order: OrderDetails): Promise<{ success: boolean; error?: string }> {
    try {
        const config = await getEmailConfig();

        if (!config) {
            console.log("Email notifications disabled or not configured");
            return { success: true }; // Not an error, just disabled
        }

        if (config.recipients.length === 0) {
            console.log("No notification recipients configured");
            return { success: true };
        }

        const settings = await db.shopSettings.findUnique({ where: { id: "shop" } });
        const shopName = settings?.name || "Mini Shop";

        const transporter = createTransporter(config);

        const html = generateOrderEmailHtml(order, shopName);

        await transporter.sendMail({
            from: `"${shopName}" <${config.from}>`,
            to: config.recipients.join(', '),
            subject: `🛒 Đơn hàng mới #${order.code} - ${order.customerName}`,
            html: html
        });

        console.log(`Order notification sent to: ${config.recipients.join(', ')}`);
        return { success: true };
    } catch (error) {
        console.error("Failed to send order notification email:", error);
        return { success: false, error: String(error) };
    }
}

// Test email connection
export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
    try {
        const config = await getEmailConfig();

        if (!config) {
            return { success: false, error: "Email chưa được cấu hình hoặc đã tắt" };
        }

        const transporter = createTransporter(config);
        await transporter.verify();

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

// Send test email
export async function sendTestEmail(): Promise<{ success: boolean; error?: string }> {
    try {
        const config = await getEmailConfig();

        if (!config) {
            return { success: false, error: "Email chưa được cấu hình hoặc đã tắt" };
        }

        if (config.recipients.length === 0) {
            return { success: false, error: "Chưa có email nhận thông báo" };
        }

        const settings = await db.shopSettings.findUnique({ where: { id: "shop" } });
        const shopName = settings?.name || "Mini Shop";

        const transporter = createTransporter(config);

        await transporter.sendMail({
            from: `"${shopName}" <${config.from}>`,
            to: config.recipients.join(', '),
            subject: `✅ Test email từ ${shopName}`,
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>🎉 Cấu hình email thành công!</h2>
                    <p>Email này xác nhận rằng cấu hình SMTP đã hoạt động đúng.</p>
                    <p>Từ giờ bạn sẽ nhận được thông báo khi có đơn hàng mới từ portal.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">Sent from ${shopName}</p>
                </div>
            `
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
