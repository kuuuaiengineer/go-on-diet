"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DailyRecord, ShotType } from "@/types";
import { deleteFile } from "@/lib/drive";

export function useRecords(uid: string | null, accessToken: string | null) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!uid) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, "records"),
        where("uid", "==", uid)
      );
      const snap = await getDocs(q);
      const data = snap.docs
        .map((d) => d.data() as DailyRecord & { uid: string })
        .sort((a, b) => b.date.localeCompare(a.date));
      setRecords(data);
    } catch (error) {
      console.error("fetchRecords error:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // 今日の特定タイプの記録があるか確認
  const getTodayRecord = (date: string, shotType: ShotType): DailyRecord | undefined => {
    return records.find((r) => r.date === date && r.shotType === shotType);
  };

  // 今日の記録が1件以上あるか
  const hasTodayRecord = (date: string): boolean => {
    return records.some((r) => r.date === date);
  };

  // 記録を保存（上書き含む）
  const saveRecord = async (
    record: DailyRecord,
    existingRecord?: DailyRecord
  ) => {
    if (!uid || !accessToken) throw new Error("Not authenticated");

    // 既存のドライブファイルを削除（上書き時）
    if (existingRecord && existingRecord.driveFileId !== record.driveFileId) {
      await deleteFile(accessToken, existingRecord.driveFileId);
    }

    const docId = `${uid}_${record.date}_${record.shotType}`;
    await setDoc(doc(db, "records", docId), { ...record, uid });
    await fetchRecords();
  };

  // 1枚削除
  const deleteRecord = async (record: DailyRecord) => {
    if (!uid || !accessToken) return;
    await deleteFile(accessToken, record.driveFileId);
    const docId = `${uid}_${record.date}_${record.shotType}`;
    await deleteDoc(doc(db, "records", docId));
    setRecords((prev) => prev.filter((r) => !(r.date === record.date && r.shotType === record.shotType)));
  };

  // 全記録削除（リセット）- ドライブフォルダはUserSettings側で削除
  const deleteAllRecords = async () => {
    if (!uid) return;
    const q = query(collection(db, "records"), where("uid", "==", uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    setRecords([]);
  };

  // タイプ別に絞り込み
  const getRecordsByType = (shotType: ShotType): DailyRecord[] => {
    return records
      .filter((r) => r.shotType === shotType)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  return {
    records,
    loading,
    fetchRecords,
    getTodayRecord,
    hasTodayRecord,
    saveRecord,
    deleteRecord,
    deleteAllRecords,
    getRecordsByType,
  };
}
