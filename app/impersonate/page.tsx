"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function ImpersonatePage() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setError("لینک نامعتبر است."); return; }

    signIn("impersonation-credentials", { token, redirect: false }).then((res) => {
      if (res?.error) { setError("این لینک منقضی شده یا قبلاً استفاده شده است."); return; }
      router.push("/tickets");
    });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-muted">{error || "در حال ورود..."}</p>
    </div>
  );
}
