"use server";

import { db } from "@/lib/db";

export async function getDashboardStats() {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get this month's date range
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // Total revenue this month (completed sales)
    const revenueThisMonth = await db.order.aggregate({
        where: {
            type: "SALE",
            status: "COMPLETED",
            createdAt: {
                gte: firstDayOfMonth,
                lt: firstDayOfNextMonth
            }
        },
        _sum: { total: true }
    });

    // Revenue last month for comparison
    const revenueLastMonth = await db.order.aggregate({
        where: {
            type: "SALE",
            status: "COMPLETED",
            createdAt: {
                gte: firstDayOfLastMonth,
                lt: firstDayOfMonth
            }
        },
        _sum: { total: true }
    });

    // Orders today
    const ordersToday = await db.order.count({
        where: {
            type: "SALE",
            createdAt: {
                gte: today,
                lt: tomorrow
            }
        }
    });

    // Total orders this month
    const ordersThisMonth = await db.order.count({
        where: {
            type: "SALE",
            createdAt: {
                gte: firstDayOfMonth,
                lt: firstDayOfNextMonth
            }
        }
    });

    // Total products
    const totalProducts = await db.product.count();

    // Low stock products (stock <= 5)
    const lowStockCount = await db.product.count({
        where: { stock: { lte: 5 } }
    });

    // Total customers
    const totalCustomers = await db.customer.count();

    // New customers this month
    const newCustomersThisMonth = await db.customer.count({
        where: {
            createdAt: {
                gte: firstDayOfMonth,
                lt: firstDayOfNextMonth
            }
        }
    });

    // Recent orders (last 5)
    const recentOrders = await db.order.findMany({
        where: { type: "SALE" },
        include: {
            customer: true,
            items: { include: { product: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 5
    });

    // Calculate revenue change percentage
    const thisMonthTotal = revenueThisMonth._sum.total || 0;
    const lastMonthTotal = revenueLastMonth._sum.total || 0;
    const revenueChange = lastMonthTotal > 0
        ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
        : "0";

    return {
        revenue: {
            thisMonth: thisMonthTotal,
            change: revenueChange
        },
        orders: {
            today: ordersToday,
            thisMonth: ordersThisMonth
        },
        products: {
            total: totalProducts,
            lowStock: lowStockCount
        },
        customers: {
            total: totalCustomers,
            newThisMonth: newCustomersThisMonth
        },
        recentOrders
    };
}
