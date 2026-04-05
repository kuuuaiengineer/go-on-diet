"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";

export default function RootPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
    </div>
  );
}
