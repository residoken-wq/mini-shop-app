"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getShopSettings() {
    // Get or create default settings
    let settings = await db.shopSettings.findUnique({
        where: { id: "shop" }
    });

    if (!settings) {
        settings = await db.shopSettings.create({
            data: {
                id: "shop",
                name: "Mini Shop",
                phone: "",
                address: "",
                email: "",
                bankName: "",
                bankAccount: "",
                bankOwner: ""
            }
        });
    }

    return settings;
}

export async function updateShopSettings(data: {
    name: string;
    phone: string;
    address: string;
    email?: string;
    bankName?: string;
    bankAccount?: string;
    bankOwner?: string;
    // SMTP Email Config
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPass?: string;
    smtpFrom?: string;
    notifyEmails?: string;
    emailEnabled?: boolean;
}) {
    try {
        const settings = await db.shopSettings.upsert({
            where: { id: "shop" },
            update: {
                name: data.name,
                phone: data.phone,
                address: data.address,
                email: data.email || "",
                bankName: data.bankName || "",
                bankAccount: data.bankAccount || "",
                bankOwner: data.bankOwner || "",
                // SMTP fields
                smtpHost: data.smtpHost || "",
                smtpPort: data.smtpPort || 587,
                smtpUser: data.smtpUser || "",
                smtpPass: data.smtpPass || "",
                smtpFrom: data.smtpFrom || "",
                notifyEmails: data.notifyEmails || "",
                emailEnabled: data.emailEnabled || false
            },
            create: {
                id: "shop",
                name: data.name,
                phone: data.phone,
                address: data.address,
                email: data.email || "",
                bankName: data.bankName || "",
                bankAccount: data.bankAccount || "",
                bankOwner: data.bankOwner || "",
                // SMTP fields
                smtpHost: data.smtpHost || "",
                smtpPort: data.smtpPort || 587,
                smtpUser: data.smtpUser || "",
                smtpPass: data.smtpPass || "",
                smtpFrom: data.smtpFrom || "",
                notifyEmails: data.notifyEmails || "",
                emailEnabled: data.emailEnabled || false
            }
        });

        revalidatePath("/settings");
        revalidatePath("/orders");
        revalidatePath("/portal");
        return { success: true, settings };
    } catch (error) {
        console.error("Update settings error:", error);
        return { success: false, error: "Lỗi cập nhật cài đặt" };
    }
}

// ============ EMAIL TEST ============

export async function testEmailSettings() {
    try {
        const { sendTestEmail } = await import("@/lib/email");
        const result = await sendTestEmail();
        return result;
    } catch (error) {
        console.error("Test email error:", error);
        return { success: false, error: String(error) };
    }
}

// ============ CARRIER MANAGEMENT ============

export async function getCarriers() {
    return await db.carrier.findMany({
        orderBy: { createdAt: "desc" }
    });
}

export async function createCarrier(data: { name: string; phone?: string }) {
    try {
        const carrier = await db.carrier.create({
            data: {
                name: data.name,
                phone: data.phone || null
            }
        });
        revalidatePath("/settings");
        revalidatePath("/orders");
        return { success: true, carrier };
    } catch (error) {
        console.error("Create carrier error:", error);
        return { success: false, error: "Lỗi tạo nhà vận chuyển" };
    }
}

export async function updateCarrier(id: string, data: { name: string; phone?: string; isActive?: boolean }) {
    try {
        const carrier = await db.carrier.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone || null,
                isActive: data.isActive ?? true
            }
        });
        revalidatePath("/settings");
        revalidatePath("/orders");
        return { success: true, carrier };
    } catch (error) {
        console.error("Update carrier error:", error);
        return { success: false, error: "Lỗi cập nhật nhà vận chuyển" };
    }
}

export async function deleteCarrier(id: string) {
    try {
        await db.carrier.delete({ where: { id } });
        revalidatePath("/settings");
        revalidatePath("/orders");
        return { success: true };
    } catch (error) {
        console.error("Delete carrier error:", error);
        return { success: false, error: "Lỗi xóa nhà vận chuyển" };
    }
}

// ============ DISTRICT MANAGEMENT ============

export async function getDistricts() {
    try {
        const districts = await db.district.findMany({
            orderBy: { name: "asc" }
        });
        return { success: true, districts };
    } catch (error) {
        console.error("Get districts error:", error);
        return { success: false, error: "Lỗi lấy danh sách quận/huyện" };
    }
}

export async function getActiveDistricts() {
    try {
        const districts = await db.district.findMany({
            where: { isActive: true },
            orderBy: { name: "asc" }
        });
        return { success: true, districts };
    } catch (error) {
        console.error("Get active districts error:", error);
        return { success: false, error: "Lỗi lấy danh sách quận/huyện" };
    }
}

export async function createDistrict(data: { name: string; shippingFee: number }) {
    try {
        const district = await db.district.create({
            data: {
                name: data.name,
                shippingFee: data.shippingFee || 0
            }
        });
        revalidatePath("/settings");
        revalidatePath("/portal");
        return { success: true, district };
    } catch (error: any) {
        console.error("Create district error:", error);
        if (error.code === "P2002") {
            return { success: false, error: "Quận/huyện này đã tồn tại" };
        }
        return { success: false, error: "Lỗi tạo quận/huyện" };
    }
}

export async function updateDistrict(id: string, data: { name?: string; shippingFee?: number; isActive?: boolean }) {
    try {
        const district = await db.district.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.shippingFee !== undefined && { shippingFee: data.shippingFee }),
                ...(data.isActive !== undefined && { isActive: data.isActive })
            }
        });
        revalidatePath("/settings");
        revalidatePath("/portal");
        return { success: true, district };
    } catch (error) {
        console.error("Update district error:", error);
        return { success: false, error: "Lỗi cập nhật quận/huyện" };
    }
}

export async function deleteDistrict(id: string) {
    try {
        await db.district.delete({ where: { id } });
        revalidatePath("/settings");
        revalidatePath("/portal");
        return { success: true };
    } catch (error) {
        console.error("Delete district error:", error);
        return { success: false, error: "Lỗi xóa quận/huyện" };
    }
}
