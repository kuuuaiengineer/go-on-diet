"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";

export default function LoginPage() {
  const { user, loading, signIn } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/home");
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      await signIn();
      router.replace("/home");
    } catch {
      alert("ログインに失敗しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-8 py-16">
      {/* ロゴエリア */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="w-24 h-24 bg-beige-100 rounded-full flex items-center justify-center border-4 border-beige-200">
          <span className="text-4xl">🥗</span>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-beige-800 tracking-tight">
            GoOnDiet
          </h1>
          <p className="mt-2 text-beige-500 text-sm leading-relaxed">
            毎日1分で続けられる
            <br />
            ビフォーアフター記録アプリ
          </p>
        </div>

        {/* 特徴 */}
        <div className="w-full mt-4 flex flex-col gap-3">
          {[
            { icon: "📸", text: "ガイド付きで毎回同じ角度で撮影" },
            { icon: "🔒", text: "写真はあなたのGoogleドライブに保存" },
            { icon: "🎬", text: "1〜2ヶ月分をぱらぱら動画に変換" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-beige-100"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm text-beige-700">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ログインボタン */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-beige-200 rounded-2xl py-4 shadow-sm active:scale-95 transition-transform"
        >
          <GoogleIcon />
          <span className="font-semibold text-beige-800">
            Googleアカウントで続ける
          </span>
        </button>
        <p className="text-center text-xs text-beige-400 leading-relaxed">
          ログインすることで、GoOnDietが
          <br />
          Googleドライブへのアクセス許可を求めます
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
