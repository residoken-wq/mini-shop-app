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
                bankOwner: data.bankOwner || ""
            },
            create: {
                id: "shop",
                name: data.name,
                phone: data.phone,
                address: data.address,
                email: data.email || "",
                bankName: data.bankName || "",
                bankAccount: data.bankAccount || "",
                bankOwner: data.bankOwner || ""
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


