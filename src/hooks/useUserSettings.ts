"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserSettings, ShotType, StampPosition } from "@/types";
import { getOrCreateAppFolder, getOrCreateSubFolder } from "@/lib/drive";

export function useUserSettings(uid: string | null, accessToken: string | null) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSettings(null);
      setLoading(false);
      return;
    }
    fetchSettings(uid);
  }, [uid]);

  const fetchSettings = async (userId: string) => {
    setLoading(true);
    try {
      const ref = doc(db, "users", userId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSettings(snap.data() as UserSettings);
      } else {
        setSettings(null);
      }
    } catch (error) {
      console.error("fetchSettings error:", error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // 初回セットアップ（ダイエット開始日登録）
  const initSettings = async (startDate: string): Promise<UserSettings> => {
    if (!uid || !accessToken) throw new Error("Not authenticated");

    // Googleドライブにフォルダを作成
    const appFolderId = await getOrCreateAppFolder(accessToken);
    const shotTypes: ShotType[] = ["front", "back", "side", "face"];
    const subFolderIds: Partial<Record<ShotType, string>> = {};

    for (const type of shotTypes) {
      subFolderIds[type] = await getOrCreateSubFolder(accessToken, appFolderId, type);
    }

    const newSettings: UserSettings = {
      uid,
      startDate,
      appFolderId,
      subFolderIds,
      defaultStampPosition: "bottom-right",
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", uid), newSettings);
    setSettings(newSettings);
    return newSettings;
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!uid) return;
    await updateDoc(doc(db, "users", uid), updates);
    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
  };

  // デフォルトスタンプ位置を更新
  const updateStampPosition = async (position: StampPosition) => {
    await updateSettings({ defaultStampPosition: position });
  };

  // ガイド写真IDを保存
  const saveGuidePhotoId = async (shotType: ShotType, fileId: string) => {
    if (!settings) return;
    const guidePhotoId = { ...(settings.guidePhotoId || {}), [shotType]: fileId };
    await updateSettings({ guidePhotoId });
  };

  // 今日の記録日数を計算
  const getDayNumber = (): number => {
    if (!settings) return 1;
    const start = new Date(settings.startDate);
    const today = new Date();
    const diff = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(1, diff + 1);
  };

  return { settings, loading, initSettings, updateSettings, updateStampPosition, saveGuidePhotoId, getDayNumber };
}
