"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/AuthProvider";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useRecords } from "@/hooks/useRecords";
import { ShotType, SHOT_TYPE_LABELS, StampPosition } from "@/types";
import { applyStampToImage, generateGuidePoints, drawGuideLines, drawGhostOverlay } from "@/lib/canvas";
import { uploadPhoto, overwritePhoto, downloadFile } from "@/lib/drive";
import BottomNav from "@/components/BottomNav";

type Step = "select-type" | "camera" | "preview";

export default function CameraPage() {
  const { user, accessToken, refreshAccessToken } = useAuthContext();
  const router = useRouter();
  const { settings, getDayNumber, saveGuidePhotoId } = useUserSettings(
    user?.uid ?? null,
    accessToken
  );
  const { getTodayRecord, saveRecord } = useRecords(user?.uid ?? null, accessToken);

  const [step, setStep] = useState<Step>("select-type");
  const [shotType, setShotType] = useState<ShotType>("front");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [stampedBlob, setStampedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [stampPosition, setStampPosition] = useState<StampPosition>(
    settings?.defaultStampPosition ?? "bottom-right"
  );
  const [showGuide, setShowGuide] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState(false);
  const [referenceImage, setReferenceImage] = useState<HTMLImageElement | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const today = new Date().toISOString().split("T")[0];
  const dayNumber = getDayNumber();
  const existingRecord = getTodayRecord(today, shotType);

  // 参照写真をロードしてエッジCanvasを生成
  useEffect(() => {
    if (!accessToken || !settings || step !== "camera") return;
    const guideFileId = settings.guidePhotoId?.[shotType];
    if (!guideFileId) {
      setReferenceImage(null);
      return;
    }
    downloadFile(accessToken, guideFileId).then((blob) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        setReferenceImage(img);
      };
      img.src = url;
    }).catch(() => setReferenceImage(null));
  }, [accessToken, settings, shotType, step]);

  // ガイドオーバーレイを描画
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas || !showGuide) return;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (referenceImage) {
      // 2回目以降：ゴースト表示
      drawGhostOverlay(ctx, canvas.width, canvas.height, referenceImage);
    }
    // 初回はガイドなし

    animFrameRef.current = requestAnimationFrame(drawOverlay);
  }, [showGuide, referenceImage]);

  // カメラを起動
  const startCamera = useCallback(async () => {
    try {
      // 既存のストリームを停止
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert("カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。");
    }
  }, [facingMode]);

  // カメラを停止（animationFrameはガイド側で管理するため触らない）
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (step === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, startCamera, stopCamera, facingMode]);

  useEffect(() => {
    if (step === "camera" && showGuide) {
      animFrameRef.current = requestAnimationFrame(drawOverlay);
    } else {
      cancelAnimationFrame(animFrameRef.current);
      // OFFにしたらcanvasをクリア
      const canvas = overlayRef.current;
      if (canvas) {
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [step, showGuide, drawOverlay]);

  // オーバーレイCanvasのサイズをvideoに合わせる
  const handleVideoReady = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    // clientWidthではなくgetBoundingClientRectで正確なサイズを取得
    const rect = video.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
  };

  // シャッターを押したとき（タイマーONならカウントダウン → 撮影）
  const handleShutter = () => {
    if (countdown !== null) {
      // カウント中にもう一度押したらキャンセル
      if (countdownRef.current) clearTimeout(countdownRef.current);
      setCountdown(null);
      return;
    }
    if (timerEnabled) {
      setCountdown(10);
      let count = 10;
      const tick = () => {
        count -= 1;
        if (count <= 0) {
          setCountdown(null);
          capture();
        } else {
          setCountdown(count);
          countdownRef.current = setTimeout(tick, 1000);
        }
      };
      countdownRef.current = setTimeout(tick, 1000);
    } else {
      capture();
    }
  };

  // 撮影
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      setCapturedBlob(blob);

      // スタンプを適用してプレビュー
      const w = weight ? parseFloat(weight) : undefined;
      const stamped = await applyStampToImage(blob, dayNumber, w, stampPosition);
      setStampedBlob(stamped);
      setPreviewUrl(URL.createObjectURL(stamped));
      setStep("preview");
    }, "image/jpeg", 0.92);
  };

  // スタンプ設定を変更してプレビューを更新
  const updateStamp = async (pos: StampPosition, w: string) => {
    if (!capturedBlob) return;
    const weightVal = w ? parseFloat(w) : undefined;
    const stamped = await applyStampToImage(capturedBlob, dayNumber, weightVal, pos);
    setStampedBlob(stamped);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(stamped));
  };

  // 保存処理
  const handleSave = async () => {
    if (!stampedBlob || !user) {
      alert("撮影データがありません。");
      return;
    }
    if (!settings) {
      alert("設定が読み込まれていません。ホームに戻って再度お試しください。");
      return;
    }

    if (existingRecord && !overwriteConfirm) {
      setOverwriteConfirm(true);
      return;
    }

    setSaving(true);
    try {
      // トークン取得（失効していたらポップアップで再取得）
      let token = accessToken;
      if (!token) {
        token = await refreshAccessToken();
      }
      if (!token) {
        throw new Error("Googleドライブへのアクセス権がありません。ログインし直してください。");
      }

      // Drive へアップロード（401なら自動でトークン再取得してリトライ）
      const doUpload = async (tk: string): Promise<string> => {
        const { getOrCreateAppFolder, getOrCreateSubFolder } = await import("@/lib/drive");
        let folderId = settings.subFolderIds[shotType];
        if (!folderId) {
          const appFolderId = settings.appFolderId || await getOrCreateAppFolder(tk);
          folderId = await getOrCreateSubFolder(tk, appFolderId, shotType);
        }
        const fileName = `${today}.jpg`;
        if (existingRecord) {
          return overwritePhoto(tk, folderId, fileName, stampedBlob!, existingRecord.driveFileId);
        } else {
          return uploadPhoto(tk, folderId, fileName, stampedBlob!);
        }
      };

      let fileId: string;
      try {
        fileId = await doUpload(token);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("401") || msg.includes("invalid_grant") || msg.includes("Invalid Credentials")) {
          // トークン失効 → ポップアップで再取得してリトライ
          token = await refreshAccessToken();
          if (!token) throw new Error("トークンの更新に失敗しました。再ログインしてください。");
          fileId = await doUpload(token);
        } else {
          throw err;
        }
      }

      // ガイド用写真として最初の記録を保存
      if (!settings.guidePhotoId?.[shotType]) {
        await saveGuidePhotoId(shotType, fileId);
      }

      // Firestore に記録を保存
      await saveRecord(
        {
          date: today,
          shotType,
          driveFileId: fileId,
          driveFolderId: settings.subFolderIds[shotType] ?? "",
          dayNumber,
          ...(weight ? { weight: parseFloat(weight) } : {}),
          stampPosition,
          guideEnabled: showGuide,
        },
        existingRecord
      );

      router.replace("/home");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Save error:", msg);
      setSaving(false);
      setOverwriteConfirm(false);
      alert(`保存に失敗しました。\n\nエラー: ${msg}`);
      return;
    }
    setSaving(false);
    setOverwriteConfirm(false);
  };

  const handleBack = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    setStampedBlob(null);
    setOverwriteConfirm(false);
    if (step === "preview") setStep("camera");
    else if (step === "camera") setStep("select-type");
  };

  // タイプ選択画面
  if (step === "select-type") {
    return (
      <div className="flex-1 flex flex-col pb-20">
        <div className="px-6 pt-12 pb-4">
          <h1 className="text-xl font-bold text-beige-800">記録タイプを選ぶ</h1>
          <p className="text-sm text-beige-400 mt-1">Day {dayNumber}</p>
        </div>

        <div className="px-6 flex flex-col gap-3">
          {(["front", "back", "side", "face"] as ShotType[]).map((type) => {
            const hasRecord = !!getTodayRecord(today, type);
            return (
              <button
                key={type}
                onClick={() => {
                  setShotType(type);
                  setStep("camera");
                }}
                className={`card flex items-center gap-4 text-left active:scale-98 transition-transform ${
                  hasRecord ? "border-accent-200" : ""
                }`}
              >
                <div className="w-12 h-12 bg-beige-100 rounded-2xl flex items-center justify-center text-2xl">
                  {type === "front" ? "🧍" : type === "back" ? "🔙" : type === "side" ? "↔️" : "😊"}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-beige-800">
                    {SHOT_TYPE_LABELS[type]}
                  </p>
                  <p className="text-xs text-beige-400 mt-0.5">
                    {type === "front"
                      ? "首から下・正面"
                      : type === "back"
                      ? "首から下・背面"
                      : type === "side"
                      ? "首から下・横"
                      : "顔アップ"}
                  </p>
                </div>
                {hasRecord && (
                  <span className="text-xs bg-accent-100 text-accent-600 px-2 py-1 rounded-full font-medium">
                    記録済
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <BottomNav />
      </div>
    );
  }

  // カメラ画面（フルスクリーン）
  if (step === "camera") {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* ビデオ + オーバーレイ（フル画面） */}
        <div className="flex-1 relative overflow-hidden">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={facingMode === "user" ? { transform: "scaleX(-1)" } : {}}
            playsInline
            muted
            autoPlay
            onLoadedMetadata={handleVideoReady}
            onPlay={handleVideoReady}
          />
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* 戻るボタン */}
          <button
            onClick={handleBack}
            className="absolute top-12 left-4 z-20 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 4L7 10L13 16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* ガイドOn/Off */}
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="absolute top-12 right-4 z-20 bg-black/50 rounded-full px-3 py-2 text-xs text-white font-medium"
          >
            {referenceImage ? "ゴースト" : "ガイド"} {showGuide ? "ON" : "OFF"}
          </button>

          {/* タイプ表示 */}
          <div className="absolute top-12 left-0 right-0 flex justify-center z-10">
            <span className="bg-black/50 text-white text-sm px-4 py-1.5 rounded-full font-medium">
              {SHOT_TYPE_LABELS[shotType]}
            </span>
          </div>

          {/* カウントダウン表示 */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <span className="text-white font-bold drop-shadow-lg"
                style={{ fontSize: "min(40vw, 40vh)" }}>
                {countdown}
              </span>
            </div>
          )}
        </div>

        {/* 非表示Canvas（撮影用） */}
        <canvas ref={canvasRef} className="hidden" />

        {/* シャッターボタン + タイマー + カメラ切り替え */}
        <div className="bg-black flex items-center justify-center gap-8 py-8 safe-bottom">
          {/* タイマートグル */}
          <button
            onClick={() => setTimerEnabled((v) => !v)}
            className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform ${timerEnabled ? "bg-yellow-400/80" : "bg-white/20"}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="13" r="8" stroke="white" strokeWidth="1.8"/>
              <path d="M12 9v4l2.5 2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M9 2h6M12 2v3" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>

          {/* シャッター（タイマーON時はカウントダウン開始） */}
          <button
            onClick={handleShutter}
            className={`w-20 h-20 rounded-full border-4 border-white active:scale-90 transition-transform ${countdown !== null ? "bg-red-500/60" : "bg-white/20"}`}
          />

          {/* カメラ切り替え */}
          <button
            onClick={() => setFacingMode((m) => m === "environment" ? "user" : "environment")}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 7h-3.17L15 5H9L7.17 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="3" stroke="white" strokeWidth="1.8"/>
              <path d="M15 2l2 2-2 2M9 2L7 4l2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // プレビュー画面
  return (
    <div className="flex-1 flex flex-col pb-20 bg-beige-50">
      <div className="px-6 pt-12 pb-4 flex items-center gap-4">
        <button onClick={handleBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 4L9 12L15 20" stroke="#5e4c36" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-beige-800">確認・設定</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-4">
        {/* プレビュー画像 */}
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="preview"
            className="w-full rounded-2xl object-contain max-h-72"
          />
        )}

        {/* 上書き警告 */}
        {overwriteConfirm && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-700">
              今日はすでに記録済みですが、上書きしますか？
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setOverwriteConfirm(false)}
                className="flex-1 btn-secondary py-2 text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 btn-primary py-2 text-sm"
              >
                上書き保存
              </button>
            </div>
          </div>
        )}

        {/* 体重入力 */}
        <div className="card">
          <label className="block text-sm font-medium text-beige-700 mb-2">
            体重（任意）
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="例: 58.5"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                updateStamp(stampPosition, e.target.value);
              }}
              className="flex-1 bg-beige-50 border border-beige-200 rounded-xl px-4 py-3 text-beige-800 text-base"
              step="0.1"
              min="20"
              max="300"
            />
            <span className="text-beige-500 font-medium">kg</span>
          </div>
        </div>

        {/* スタンプ位置 */}
        <div className="card">
          <p className="text-sm font-medium text-beige-700 mb-3">スタンプ位置</p>
          <div className="grid grid-cols-2 gap-2">
            {(["top-left", "top-right", "bottom-left", "bottom-right"] as StampPosition[]).map(
              (pos) => {
                const labels: Record<StampPosition, string> = {
                  "top-left": "左上",
                  "top-right": "右上",
                  "bottom-left": "左下",
                  "bottom-right": "右下",
                };
                return (
                  <button
                    key={pos}
                    onClick={() => {
                      setStampPosition(pos);
                      updateStamp(pos, weight);
                    }}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      stampPosition === pos
                        ? "bg-accent-500 text-white border-accent-500"
                        : "bg-beige-50 text-beige-600 border-beige-200"
                    }`}
                  >
                    {labels[pos]}
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 保存ボタン */}
        {!overwriteConfirm && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "保存中..." : "記録を保存"}
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
