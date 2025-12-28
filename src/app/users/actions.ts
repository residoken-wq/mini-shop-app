"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Simple password hashing (in production use bcrypt)
function hashPassword(password: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(password + 'mini-shop-salt').digest('hex');
}

export async function getUsers() {
    return await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            username: true,
            name: true,
            role: true,
            createdAt: true
        }
    });
}

export async function createUser(data: {
    username: string;
    password: string;
    name: string;
    role: string;
}) {
    try {
        // Check if username exists
        const existing = await db.user.findUnique({
            where: { username: data.username }
        });

        if (existing) {
            return { success: false, error: "Username đã tồn tại" };
        }

        const user = await db.user.create({
            data: {
                username: data.username,
                password: hashPassword(data.password),
                name: data.name,
                role: data.role
            },
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        revalidatePath("/users");
        return { success: true, user };
    } catch (error) {
        console.error("Create user error:", error);
        return { success: false, error: "Không thể tạo người dùng" };
    }
}

export async function updateUser(id: string, data: {
    name: string;
    role: string;
    password?: string;
}) {
    try {
        const updateData: any = {
            name: data.name,
            role: data.role
        };

        // Only update password if provided
        if (data.password && data.password.trim()) {
            updateData.password = hashPassword(data.password);
        }

        const user = await db.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                username: true,
                name: true,
                role: true,
                createdAt: true
            }
        });

        revalidatePath("/users");
        return { success: true, user };
    } catch (error) {
        console.error("Update user error:", error);
        return { success: false, error: "Không thể cập nhật người dùng" };
    }
}

export async function deleteUser(id: string) {
    try {
        // Check if it's the last admin
        const user = await db.user.findUnique({ where: { id } });
        if (user?.role === "admin") {
            const adminCount = await db.user.count({
                where: { role: "admin" }
            });
            if (adminCount <= 1) {
                return { success: false, error: "Không thể xóa admin duy nhất" };
            }
        }

        await db.user.delete({ where: { id } });

        revalidatePath("/users");
        return { success: true };
    } catch (error) {
        console.error("Delete user error:", error);
        return { success: false, error: "Không thể xóa người dùng" };
    }
}
