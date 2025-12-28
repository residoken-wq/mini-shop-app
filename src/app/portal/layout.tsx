import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Đặt hàng | Mini Shop",
    description: "Portal đặt hàng Mini Shop",
};

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-50 to-slate-100`}>
            {/* Simple Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">M</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Mini Shop</h1>
                            <p className="text-xs text-gray-500">Portal Đặt Hàng</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {children}
            </main>

            {/* Footer */}
            <footer className="mt-auto py-4 text-center text-sm text-gray-500">
                © 2024 Mini Shop. Liên hệ: 0123-456-789
            </footer>
        </div>
    );
}
