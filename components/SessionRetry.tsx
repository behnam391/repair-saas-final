"use client";
import { RefreshCw } from "lucide-react";
export default function SessionRetry() {
  return <main dir="rtl" className="max-w-md mx-auto p-8 mt-16 text-center space-y-4"><h1 className="text-lg font-bold">اتصال موقتاً برقرار نیست</h1><p className="text-sm text-muted">برای بررسی حساب دوباره تلاش کنید. اطلاعات ورود شما پاک نشده است؛ تا برقراری اتصال، دسترسی به اطلاعات متوقف می‌ماند.</p><button className="inline-flex items-center gap-2 border border-border rounded-lg px-4 py-3" onClick={() => window.location.reload()}><RefreshCw size={18}/>تلاش دوباره</button></main>;
}
