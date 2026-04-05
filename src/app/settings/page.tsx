"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRecords } from "@/hooks/useRecords";
import { deleteAppFolder } from "@/lib/drive";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { StampPosition } from "@/types";
import BottomNav from "@/components/BottomNav";

export default function SettingsPage() {
  const { user, accessToken, signOut } = useAuthContext();
  const router = useRouter();
  const { settings, updateStampPosition } = useUserSettings(
    user?.uid ?? null,
    accessToken
  );
  const { deleteAllRecords } = useRecords(user?.uid ?? null, accessToken);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    if (!user || !accessToken) return;
    setDeleting(true);
    try {
      // 1. Googleドライブのフォルダを削除
      await deleteAppFolder(accessToken);
      // 2. Firestoreの記録を削除
      await deleteAllRecords();
      // 3. Firestoreのユーザー設定を削除
      await deleteDoc(doc(db, "users", user.uid));
      // 4. Firebaseアカウントを削除
      await deleteUser(auth.currentUser!);
      router.replace("/login");
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "auth/requires-recent-login") {
        alert(
          "セキュリティのため、一度ログアウトして再ログインしてから退会してください。"
        );
        await signOut();
        router.replace("/login");
      } else {
        alert("退会処理に失敗しました。もう一度お試しください。");
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const stampLabels: Record<StampPosition, string> = {
    "top-left": "左上",
    "top-right": "右上",
    "bottom-left": "左下",
    "bottom-right": "右下",
  };

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* 退会確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm card">
            <p className="font-bold text-beige-800 text-center text-lg">退会しますか？</p>
            <p className="text-sm text-beige-500 text-center mt-3 leading-relaxed">
              すべての記録とGoogleドライブの写真が削除されます。
              <br />
              この操作は取り消せません。
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 btn-danger"
              >
                {deleting ? "処理中..." : "退会する"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 pt-12 pb-4">
        <h1 className="text-xl font-bold text-beige-800">設定</h1>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4 overflow-y-auto">
        {/* アカウント情報 */}
        <div className="card flex items-center gap-4">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt="avatar"
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-beige-100 flex items-center justify-center text-xl">
              👤
            </div>
          )}
          <div>
            <p className="font-semibold text-beige-800">{user?.displayName}</p>
            <p className="text-xs text-beige-400">{user?.email}</p>
          </div>
        </div>

        {/* ダイエット情報 */}
        <div className="card">
          <p className="text-sm font-medium text-beige-700 mb-3">ダイエット情報</p>
          <div className="flex justify-between items-center py-2 border-b border-beige-50">
            <span className="text-sm text-beige-600">開始日</span>
            <span className="text-sm font-medium text-beige-800">
              {settings?.startDate.replace(/-/g, "/") ?? "未設定"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-beige-600">Driveフォルダ</span>
            <span className="text-xs text-beige-400">GoOnDiet/</span>
          </div>
        </div>

        {/* デフォルトスタンプ位置 */}
        <div className="card">
          <p className="text-sm font-medium text-beige-700 mb-3">
            デフォルトスタンプ位置
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as StampPosition[]).map(
              (pos) => (
                <button
                  key={pos}
                  onClick={() => updateStampPosition(pos)}
                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    settings?.defaultStampPosition === pos
                      ? "bg-accent-500 text-white border-accent-500"
                      : "bg-beige-50 text-beige-600 border-beige-200"
                  }`}
                >
                  {stampLabels[pos]}
                </button>
              )
            )}
          </div>
        </div>

        {/* アクション */}
        <div className="card flex flex-col gap-1">
          <button
            onClick={handleSignOut}
            className="w-full text-left py-3 px-1 text-sm text-beige-700 font-medium border-b border-beige-50"
          >
            ログアウト
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full text-left py-3 px-1 text-sm text-red-400 font-medium"
          >
            退会する（全データ削除）
          </button>
        </div>

        <p className="text-center text-xs text-beige-300 pb-2">
          GoOnDiet v0.1.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
