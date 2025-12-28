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

