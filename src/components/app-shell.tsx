"use client";

import { MainNav } from "@/components/main-nav";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import Link from "next/link";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const [open, setOpen] = useState(false);

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
                        </nav>
                    </SheetContent>
                </Sheet>
                <div className="flex-1 font-semibold text-lg">Mini Shop</div>
                <div className="flex items-center gap-2">
                    {/* Right side of header (e.g. User Profile or Voice Input Placeholder) */}
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
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-muted/10 p-4 lg:p-6">
                {children}
            </main>
        </div>
    );
}
