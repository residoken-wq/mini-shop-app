// Order Status Constants for Sales Orders
export const ORDER_STATUSES = {
    PENDING: { label: "Chờ xử lý", color: "yellow", step: 1 },
    PROCESSING: { label: "Đang xử lý", color: "blue", step: 2 },
    READY: { label: "Đủ hàng", color: "purple", step: 3 },
    SHIPPING: { label: "Đang giao", color: "orange", step: 4 },
    COMPLETED: { label: "Hoàn tất", color: "green", step: 5 },
    CANCELLED: { label: "Đã hủy", color: "red", step: 0 },
} as const;

export type OrderStatus = keyof typeof ORDER_STATUSES;

// Helper functions (sync)
export function getNextStatus(currentStatus: string): OrderStatus | null {
    const flow: OrderStatus[] = ["PENDING", "PROCESSING", "READY", "SHIPPING", "COMPLETED"];
    const currentIndex = flow.indexOf(currentStatus as OrderStatus);
    if (currentIndex === -1 || currentIndex >= flow.length - 1) return null;
    return flow[currentIndex + 1];
}

export function getAllowedNextStatuses(currentStatus: string): OrderStatus[] {
    switch (currentStatus) {
        case "PENDING":
            return ["PROCESSING", "CANCELLED"];
        case "PROCESSING":
            return ["READY", "CANCELLED"];
        case "READY":
            return ["SHIPPING"];
        case "SHIPPING":
            return ["COMPLETED"];
        default:
            return [];
    }
}
