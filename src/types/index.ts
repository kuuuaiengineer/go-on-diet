// 撮影タイプ
export type ShotType = "front" | "back" | "side" | "face";

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  front: "正面",
  back: "背面",
  side: "横",
  face: "顔",
};

export const SHOT_TYPE_DESCRIPTION: Record<ShotType, string> = {
  front: "首から下・正面",
  back: "首から下・背面",
  side: "首から下・横",
  face: "顔アップ",
};

// スタンプ位置
export type StampPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

// 1日の記録
export interface DailyRecord {
  date: string; // YYYY-MM-DD
  shotType: ShotType;
  driveFileId: string; // GoogleドライブのファイルID
  driveFolderId: string;
  dayNumber: number;
  weight?: number;
  stampPosition: StampPosition;
  guideEnabled: boolean;
}

// ユーザー設定（Firestoreに保存）
export interface UserSettings {
  uid: string;
  startDate: string; // YYYY-MM-DD（ダイエット開始日）
  appFolderId: string; // GoOnDietフォルダのID
  subFolderIds: Partial<Record<ShotType, string>>;
  defaultStampPosition: StampPosition;
  guidePhotoId?: Partial<Record<ShotType, string>>; // ガイド用写真のdriveFileId
  createdAt: string;
}

// ガイドポイント（肩・腰・足首）
export interface GuidePoints {
  shoulder: { y: number }; // 画像高さに対する割合 (0-1)
  waist: { y: number };
  ankle: { y: number };
}
