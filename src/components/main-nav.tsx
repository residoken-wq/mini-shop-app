"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    FileText,
    Truck,
    Banknote,
    Users,
    Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {
    setOpen?: (open: boolean) => void;
}

export function MainNav({ className, setOpen, ...props }: MainNavProps) {
    const pathname = usePathname();

    const routes = [
        {
            href: "/",
            label: "Tổng quan",
            icon: LayoutDashboard,
            active: pathname === "/",
        },
        {
            href: "/sales",
            label: "Bán hàng",
            icon: ShoppingCart,
            active: pathname === "/sales",
        },
        {
            href: "/products",
            label: "Hàng hóa",
            icon: Package,
            active: pathname === "/products",
        },
        {
            href: "/orders",
            label: "Đơn hàng",
            icon: FileText,
            active: pathname === "/orders",
        },
        {
            href: "/customers",
            label: "Khách hàng",
            icon: Users,
            active: pathname === "/customers",
        },
        {
            href: "/suppliers",
            label: "Nhà cung cấp",
            icon: Truck,
            active: pathname === "/suppliers",
        },
        {
            href: "/finance",
            label: "Thu chi & Nợ",
            icon: Banknote,
            active: pathname === "/finance",
        },
        {
            href: "/settings",
            label: "Cài đặt",
            icon: Settings,
            active: pathname === "/settings",
        },
    ];

    return (
        <nav
            className={cn("flex flex-col space-y-1", className)}
            {...props}
        >
            {routes.map((route) => (
                <Link
                    key={route.href}
                    href={route.href}
                    onClick={() => setOpen?.(false)}
                >
                    <Button
                        variant={route.active ? "secondary" : "ghost"}
                        className={cn("w-full justify-start", route.active && "bg-secondary")}
                    >
                        <route.icon className="mr-2 h-4 w-4" />
                        {route.label}
                    </Button>
                </Link>
            ))}
        </nav>
    );
}
