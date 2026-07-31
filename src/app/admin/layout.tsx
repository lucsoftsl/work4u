"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/signin?redirect=/admin");
        } else if (user.userType !== "ADMIN") {
            router.replace("/dashboard");
        }
    }, [user, loading, router]);

    if (loading || !user || user.userType !== "ADMIN") {
        return null;
    }

    return <>{children}</>;
}
