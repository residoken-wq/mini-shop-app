import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Đăng nhập | Mini Shop",
    description: "Đăng nhập vào hệ thống quản lý Mini Shop",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
