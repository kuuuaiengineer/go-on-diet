"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { useRecords } from "@/hooks/useRecords";
import { useUserSettings } from "@/hooks/useUserSettings";
import { DailyRecord, ShotType, SHOT_TYPE_LABELS } from "@/types";
import { deleteAppFolder } from "@/lib/drive";
import BottomNav from "@/components/BottomNav";
import { downloadFile } from "@/lib/drive";

export default function RecordsPage() {
  const { user, accessToken } = useAuthContext();
  const { records, loading, deleteRecord, deleteAllRecords } = useRecords(
    user?.uid ?? null,
    accessToken
  );
  const { settings, updateSettings } = useUserSettings(user?.uid ?? null, accessToken);

  const [activeType, setActiveType] = useState<ShotType>("front");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewRecord, setPreviewRecord] = useState<DailyRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const typeRecords = records
    .filter((r) => r.shotType === activeType)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handlePreview = async (record: DailyRecord) => {
    if (!accessToken) return;
    setPreviewRecord(record);
    setPreviewLoading(true);
    try {
      const blob = await downloadFile(accessToken, record.driveFileId);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      alert("画像の読み込みに失敗しました。");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (record: DailyRecord) => {
    const key = `${record.date}_${record.shotType}`;
    setDeletingId(key);
    try {
      await deleteRecord(record);
      if (previewRecord?.date === record.date && previewRecord.shotType === record.shotType) {
        setPreviewRecord(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch {
      alert("削除に失敗しました。");
    } finally {
      setDeletingId(null);
    }
  };

  const handleReset = async () => {
    if (!accessToken || !settings) return;
    setResetting(true);
    try {
      // ドライブのGoOnDietフォルダを削除して再作成の準備
      await deleteAppFolder(accessToken);
      await deleteAllRecords();
      // settingsもリセット（フォルダIDをクリア）
      await updateSettings({
        appFolderId: "",
        subFolderIds: {},
        guidePhotoId: {},
      });
    } catch {
      alert("リセットに失敗しました。");
    } finally {
      setResetting(false);
      setShowResetConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}(${["日","月","火","水","木","金","土"][d.getDay()]})`;
  };

  return (
    <div className="flex-1 flex flex-col pb-20">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-beige-800">記録一覧</h1>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-xs text-red-400 font-medium"
        >
          全リセット
        </button>
      </div>

      {/* タイプタブ */}
      <div className="flex gap-2 px-6 mb-4 overflow-x-auto">
        {(["front", "back", "side", "face"] as ShotType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeType === type
                ? "bg-accent-500 text-white"
                : "bg-beige-100 text-beige-600"
            }`}
          >
            {SHOT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* 画像プレビューモーダル */}
      {previewRecord && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center px-6 gap-4"
          onClick={() => {
            setPreviewRecord(null);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between border-b border-beige-100">
              <div>
                <p className="font-semibold text-beige-800">
                  {formatDate(previewRecord.date)}
                </p>
                <p className="text-xs text-beige-400">
                  Day {previewRecord.dayNumber} / {SHOT_TYPE_LABELS[previewRecord.shotType]}
                </p>
              </div>
              <button
                onClick={() => {
                  setPreviewRecord(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="w-8 h-8 flex items-center justify-center text-beige-400"
              >
                ✕
              </button>
            </div>
            <div className="bg-beige-50 flex items-center justify-center min-h-48">
              {previewLoading ? (
                <div className="w-8 h-8 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="w-full object-contain max-h-80" />
              ) : null}
            </div>
            <div className="p-4">
              <button
                onClick={() => handleDelete(previewRecord)}
                disabled={!!deletingId}
                className="btn-danger w-full text-sm"
              >
                {deletingId ? "削除中..." : "この記録を削除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全リセット確認 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm card">
            <p className="font-bold text-beige-800 text-center">本当にリセットしますか？</p>
            <p className="text-sm text-beige-500 text-center mt-2">
              すべての記録とGoogleドライブの写真が削除されます。この操作は取り消せません。
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 btn-secondary"
              >
                キャンセル
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 btn-danger"
              >
                {resetting ? "削除中..." : "全削除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 記録グリッド */}
      <div className="flex-1 px-6 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
          </div>
        ) : typeRecords.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-beige-400">
            <span className="text-4xl">📷</span>
            <p className="text-sm">まだ{SHOT_TYPE_LABELS[activeType]}の記録がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {typeRecords.map((record) => {
              const key = `${record.date}_${record.shotType}`;
              return (
                <button
                  key={key}
                  onClick={() => handlePreview(record)}
                  className="aspect-square bg-beige-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-1 relative active:scale-95 transition-transform"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-[10px] text-beige-500 font-medium">
                    {formatDate(record.date)}
                  </span>
                  <span className="text-[10px] text-accent-500 font-bold">
                    Day {record.dayNumber}
                  </span>
                  {deletingId === key && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
