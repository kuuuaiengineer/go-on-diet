"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRecords } from "@/hooks/useRecords";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

export default function HomePage() {
  const { user, accessToken, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const { settings, loading: settingsLoading, getDayNumber, initSettings } = useUserSettings(
    user?.uid ?? null,
    accessToken
  );
  const { hasTodayRecord } = useRecords(user?.uid ?? null, accessToken);
  const [showSetup, setShowSetup] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [setupLoading, setSetupLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const recorded = hasTodayRecord(today);
  const dayNumber = getDayNumber();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!settingsLoading && !settings) {
      setShowSetup(true);
    }
  }, [user, authLoading, settings, settingsLoading, router]);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      await initSettings(startDate);
      setShowSetup(false);
    } catch {
      alert("初期設定に失敗しました。もう一度お試しください。");
    } finally {
      setSetupLoading(false);
    }
  };

  if (authLoading || settingsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
      </div>
    );
  }

  // 初回セットアップモーダル
  if (showSetup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold text-beige-800">ダイエット開始日を設定</h2>
          <p className="mt-2 text-sm text-beige-500">
            GoOnDietフォルダをGoogleドライブに作成します
          </p>
        </div>
        <div className="w-full card">
          <label className="block text-sm font-medium text-beige-700 mb-2">
            開始日
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={today}
            className="w-full bg-beige-50 border border-beige-200 rounded-xl px-4 py-3 text-beige-800 text-base"
          />
        </div>
        <button
          onClick={handleSetup}
          disabled={setupLoading}
          className="btn-primary w-full"
        >
          {setupLoading ? "設定中..." : "はじめる"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* ヘッダー */}
      <div className="px-6 pt-12 pb-6">
        <p className="text-xs text-beige-400 font-medium tracking-widest uppercase">
          GoOnDiet
        </p>
        <h1 className="text-2xl font-bold text-beige-800 mt-1">
          {today.replace(/-/g, "/")}
        </h1>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4">
        {/* ダイエット何日目カード */}
        <div className="card flex flex-col items-center py-8 gap-2">
          <p className="text-sm text-beige-400 font-medium">ダイエット</p>
          <div className="flex items-end gap-1">
            <span className="text-7xl font-bold text-beige-800 leading-none">
              {dayNumber}
            </span>
            <span className="text-2xl text-beige-500 mb-2">日目</span>
          </div>
          <p className="text-xs text-beige-400 mt-1">
            開始日：{settings?.startDate.replace(/-/g, "/")}
          </p>
        </div>

        {/* 今日の記録状況 */}
        <div
          className={`card flex items-center gap-4 ${
            recorded ? "border-accent-200 bg-accent-50" : ""
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              recorded ? "bg-accent-100" : "bg-beige-100"
            }`}
          >
            <span className="text-2xl">{recorded ? "✅" : "📷"}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-beige-800">
              {recorded ? "今日の記録完了！" : "今日はまだ記録がありません"}
            </p>
            <p className="text-xs text-beige-400 mt-0.5">
              {recorded
                ? "お疲れさまです。継続中です！"
                : "1分で完了します。記録しましょう！"}
            </p>
          </div>
        </div>

        {/* 撮影ボタン */}
        {!recorded && (
          <Link href="/camera" className="btn-primary text-center block">
            今日の記録をする
          </Link>
        )}

        {/* 継続ストリーク（シンプル） */}
        <div className="card">
          <p className="text-sm font-medium text-beige-600 mb-3">
            直近7日間の記録
          </p>
          <WeekStreak uid={user?.uid ?? null} accessToken={accessToken} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function WeekStreak({
  uid,
  accessToken,
}: {
  uid: string | null;
  accessToken: string | null;
}) {
  const { hasTodayRecord } = useRecords(uid, accessToken);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  return (
    <div className="flex justify-between">
      {days.map((date) => {
        const recorded = hasTodayRecord(date);
        const isToday = date === new Date().toISOString().split("T")[0];
        const dayLabel = ["日", "月", "火", "水", "木", "金", "土"][
          new Date(date).getDay()
        ];
        return (
          <div key={date} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] ${isToday ? "text-accent-500 font-bold" : "text-beige-400"}`}>
              {dayLabel}
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                recorded
                  ? "bg-accent-500"
                  : isToday
                  ? "border-2 border-accent-300 bg-accent-50"
                  : "bg-beige-100"
              }`}
            >
              {recorded && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2.5 7L5.5 10L11.5 4"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
