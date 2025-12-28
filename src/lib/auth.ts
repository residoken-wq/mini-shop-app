"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db";

// Simple password hashing (in production, use bcrypt)
// For this simple app, we'll use a basic hash function
function simpleHash(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

function verifyPassword(password: string, hash: string): boolean {
    return simpleHash(password) === hash;
}

export async function hashPassword(password: string): Promise<string> {
    return simpleHash(password);
}

const SESSION_COOKIE_NAME = "mini-shop-session";

export interface SessionUser {
    id: string;
    username: string;
    name: string;
    role: string;
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: SessionUser }> {
    try {
        const user = await db.user.findUnique({
            where: { username }
        });

        if (!user) {
            return { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" };
        }

        if (!verifyPassword(password, user.password)) {
            return { success: false, error: "Tên đăng nhập hoặc mật khẩu không đúng" };
        }

        // Create session cookie
        const sessionData = JSON.stringify({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        });

        const cookieStore = await cookies();
        cookieStore.set(SESSION_COOKIE_NAME, Buffer.from(sessionData).toString('base64'), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Đã xảy ra lỗi, vui lòng thử lại" };
    }
}

export async function logout(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

        if (!sessionCookie?.value) {
            return null;
        }

        const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString());
        return sessionData as SessionUser;
    } catch {
        return null;
    }
}

export async function requireAuth(): Promise<SessionUser> {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }
    return user;
}

// Create default admin user if none exists
export async function ensureAdminUser(): Promise<void> {
    const userCount = await db.user.count();
    if (userCount === 0) {
        await db.user.create({
            data: {
                username: "admin",
                password: simpleHash("admin123"),
                name: "Quản trị viên",
                role: "admin"
            }
        });
    }
}
