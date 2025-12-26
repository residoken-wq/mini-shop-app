import { db } from "./db";

export async function generateCode(type: "SO" | "PO") {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
    const prefix = `${type}-${dateStr}`;

    // Find last code with this prefix
    const lastOrder = await db.order.findFirst({
        where: {
            code: { startsWith: prefix }
        },
        orderBy: { code: "desc" },
        select: { code: true }
    });

    let sequence = 1;
    if (lastOrder && lastOrder.code) {
        const parts = lastOrder.code.split("-");
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    // Format: SO-20231225-001
    return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}

export async function generateSku(categoryCode: string) {
    const prefix = categoryCode.toUpperCase();

    // Find last product with this prefix
    const lastProduct = await db.product.findFirst({
        where: {
            sku: { startsWith: prefix }
        },
        orderBy: { sku: "desc" },
        select: { sku: true }
    });

    let sequence = 1;
    if (lastProduct && lastProduct.sku) {
        // Assume format CAT-001
        const parts = lastProduct.sku.split("-");
        const lastSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    return `${prefix}-${sequence.toString().padStart(3, "0")}`;
}
