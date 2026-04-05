"use client";

import { useState } from "react";
import { useAuthContext } from "@/components/AuthProvider";
import { useRecords } from "@/hooks/useRecords";
import { ShotType, SHOT_TYPE_LABELS, DailyRecord } from "@/types";
import { downloadFile } from "@/lib/drive";
import BottomNav from "@/components/BottomNav";

type GenerateState = "idle" | "downloading" | "encoding" | "done";

export default function VideoPage() {
  const { user, accessToken } = useAuthContext();
  const { getRecordsByType } = useRecords(user?.uid ?? null, accessToken);

  const [activeType, setActiveType] = useState<ShotType>("front");
  const [range, setRange] = useState<"1month" | "2months" | "all">("1month");
  const [fps, setFps] = useState(8);
  const [state, setState] = useState<GenerateState>("idle");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(() =>
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)
  );

  const getRangeRecords = (): DailyRecord[] => {
    const all = getRecordsByType(activeType);
    if (range === "all") return all;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - (range === "1month" ? 1 : 2));
    return all.filter((r) => new Date(r.date) >= cutoff);
  };

  const records = getRangeRecords();

  const handleGenerate = async () => {
    if (!accessToken || records.length < 2) return;

    setState("downloading");
    setProgress(0);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);

    try {
      // 写真をダウンロード
      const blobs: Blob[] = [];
      for (let i = 0; i < records.length; i++) {
        const blob = await downloadFile(accessToken, records[i].driveFileId);
        blobs.push(blob);
        setProgress(Math.round((i / records.length) * 50));
      }

      setState("encoding");

      // Canvas + MediaRecorder でぱらぱら動画を生成
      const url = await generateFlipbookVideo(blobs, fps, (p) => {
        setProgress(50 + Math.round(p * 50));
      });

      setVideoUrl(url);
      setState("done");
    } catch (err) {
      console.error(err);
      alert("動画の生成に失敗しました。");
      setState("idle");
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement("a");
    a.href = videoUrl;
    a.download = `GoOnDiet_${activeType}_${new Date().toISOString().split("T")[0]}.webm`;
    a.click();
  };

  return (
    <div className="flex-1 flex flex-col pb-20">
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-xl font-bold text-beige-800">ぱらぱら動画</h1>
        <p className="text-sm text-beige-400 mt-1">
          変化をフリップブック動画に変換
        </p>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-4 overflow-y-auto">
        {/* タイプ選択 */}
        <div className="card">
          <p className="text-sm font-medium text-beige-700 mb-3">撮影タイプ</p>
          <div className="flex gap-2">
            {(["front", "back", "side", "face"] as ShotType[]).map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                  activeType === type
                    ? "bg-accent-500 text-white"
                    : "bg-beige-100 text-beige-600"
                }`}
              >
                {SHOT_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* 期間選択 */}
        <div className="card">
          <p className="text-sm font-medium text-beige-700 mb-3">期間</p>
          <div className="flex gap-2">
            {(["1month", "2months", "all"] as const).map((r) => {
              const label = r === "1month" ? "1ヶ月" : r === "2months" ? "2ヶ月" : "全期間";
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    range === r
                      ? "bg-accent-500 text-white"
                      : "bg-beige-100 text-beige-600"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-beige-400 mt-2 text-center">
            対象: {records.length}枚
          </p>
        </div>

        {/* 速度設定 */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-beige-700">速度</p>
            <span className="text-sm text-accent-500 font-semibold">{fps} fps</span>
          </div>
          <input
            type="range"
            min={3}
            max={15}
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value))}
            className="w-full accent-accent-500"
          />
          <div className="flex justify-between text-xs text-beige-400 mt-1">
            <span>ゆっくり</span>
            <span>はやい</span>
          </div>
        </div>

        {/* 生成ボタン / 進捗 */}
        {state === "idle" || state === "done" ? (
          <>
            {records.length < 2 ? (
              <div className="card text-center py-6">
                <p className="text-beige-400 text-sm">
                  {SHOT_TYPE_LABELS[activeType]}の記録が2枚以上必要です
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                className="btn-primary w-full"
              >
                動画を生成する
              </button>
            )}
          </>
        ) : (
          <div className="card flex flex-col items-center gap-3 py-6">
            <div className="w-10 h-10 border-4 border-beige-300 border-t-accent-500 rounded-full animate-spin" />
            <p className="text-sm text-beige-600 font-medium">
              {state === "downloading" ? "写真をダウンロード中..." : "動画を生成中..."}
            </p>
            <div className="w-full bg-beige-100 rounded-full h-2">
              <div
                className="bg-accent-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-beige-400">{progress}%</p>
          </div>
        )}

        {/* 完成動画 */}
        {state === "done" && videoUrl && (
          <div className="card flex flex-col gap-4">
            <video
              src={videoUrl}
              autoPlay
              loop
              playsInline
              muted
              className="w-full rounded-xl"
            />
            <button onClick={handleDownload} className="btn-primary w-full">
              動画をダウンロード
            </button>
            {isIOS && (
              <p className="text-xs text-beige-400 text-center leading-relaxed">
                iPhoneの場合、ダウンロードした動画は「ファイル」アプリに保存されます。
                カメラロールへ移動するには「ファイル」アプリから共有してください。
              </p>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

// Canvas + MediaRecorder でぱらぱら動画を生成
async function generateFlipbookVideo(
  blobs: Blob[],
  fps: number,
  onProgress: (p: number) => void
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // 最初の画像でサイズを決める
    const firstImg = await loadImage(blobs[0]);
    const w = firstImg.naturalWidth;
    const h = firstImg.naturalHeight;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      resolve(URL.createObjectURL(blob));
    };

    recorder.start();

    const frameDuration = 1000 / fps;
    for (let i = 0; i < blobs.length; i++) {
      const img = await loadImage(blobs[i]);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      onProgress((i + 1) / blobs.length);
      await sleep(frameDuration);
    }

    recorder.stop();
  });
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
