"use client";

import { MainNav } from "@/components/main-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Store, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getCurrentUser, logout, ensureAdminUser, type SessionUser } from "@/lib/auth";

interface AppShellProps {
    children: React.ReactNode;
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/portal"];

export function AppShell({ children }: AppShellProps) {
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<SessionUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAuth = async () => {
            // Ensure admin user exists
            await ensureAdminUser();

            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);

            // Redirect to login if not authenticated and not on public route
            const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
            if (!currentUser && !isPublicRoute) {
                router.push("/login");
            }
        };
        checkAuth();
    }, [pathname, router]);

    const handleLogout = async () => {
        await logout();
        setUser(null);
        router.push("/login");
    };

    // Show nothing while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // For login and portal pages, just render children without shell
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // If not logged in and not on public route, show nothing (redirect will happen)
    if (!user) {
        return null;
    }

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 lg:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[300px] sm:w-[350px]">
                        <nav className="flex flex-col gap-4">
                            <Link href="/" className="flex items-center gap-2 text-lg font-semibold" onClick={() => setOpen(false)}>
                                <Store className="h-6 w-6" />
                                <span>Mini Shop</span>
                            </Link>
                            <div className="my-2 border-b" />
                            <MainNav setOpen={setOpen} />
                            <div className="mt-auto pt-4 border-t">
                                <div className="text-sm text-muted-foreground mb-2">
                                    Xin chào, {user.name}
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => { handleLogout(); setOpen(false); }}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Đăng xuất
                                </Button>
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>
                <div className="flex-1 font-semibold text-lg">Mini Shop</div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Đăng xuất">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-muted/40 lg:flex">
                <div className="flex h-14 items-center border-b px-6 font-semibold lg:h-[60px]">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <Store className="h-6 w-6" />
                        <span>Mini Shop</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-auto py-4 px-4">
                    <MainNav />
                </div>
                {/* User Info & Logout */}
                <div className="p-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">
                        Xin chào, <strong>{user.name}</strong>
                    </div>
                    <Button
                        variant="outline"
                        className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-muted/10 p-4 lg:p-6">
                {children}
            </main>
        </div>
    );
}
