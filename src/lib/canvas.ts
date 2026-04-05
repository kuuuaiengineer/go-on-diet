import { StampPosition, GuidePoints } from "@/types";

// スタンプ（Day番号・体重）を画像に描画してBlobを返す
export async function applyStampToImage(
  imageBlob: Blob,
  dayNumber: number,
  weight: number | undefined,
  position: StampPosition
): Promise<Blob> {
  const img = await loadImage(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(img, 0, 0);

  // スタンプのテキスト
  const lines: string[] = [`Day ${dayNumber}`];
  if (weight !== undefined) lines.push(`${weight}kg`);

  const fontSize = Math.floor(img.width * 0.055); // 画像幅の5.5%
  const padding = Math.floor(img.width * 0.04);
  const lineHeight = fontSize * 1.4;
  const bgPadding = Math.floor(fontSize * 0.5);
  const textWidth = Math.max(
    ...lines.map((l) => {
      ctx.font = `bold ${fontSize}px 'Hiragino Kaku Gothic ProN', sans-serif`;
      return ctx.measureText(l).width;
    })
  );
  const bgWidth = textWidth + bgPadding * 2;
  const bgHeight = lineHeight * lines.length + bgPadding;

  // 位置の計算
  let x: number, y: number;
  switch (position) {
    case "top-left":
      x = padding;
      y = padding;
      break;
    case "top-right":
      x = img.width - bgWidth - padding;
      y = padding;
      break;
    case "bottom-left":
      x = padding;
      y = img.height - bgHeight - padding;
      break;
    case "bottom-right":
    default:
      x = img.width - bgWidth - padding;
      y = img.height - bgHeight - padding;
      break;
  }

  // 背景（半透明ブラック）
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  roundRect(ctx, x, y, bgWidth, bgHeight, 8);
  ctx.fill();

  // テキスト
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fontSize}px 'Hiragino Kaku Gothic ProN', sans-serif`;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    ctx.fillText(line, x + bgPadding, y + bgPadding / 2 + i * lineHeight);
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
  });
}

// 初回写真からガイドポイントを自動検出（重心ベースの簡易実装）
// 実際にはユーザーが手動で調整できるUIを使う
export function generateGuidePoints(imageHeight: number): GuidePoints {
  return {
    shoulder: { y: 0.18 },
    waist: { y: 0.45 },
    ankle: { y: 0.88 },
  };
}

// 初回用：人型シルエット＋ガイドライン
export function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guide: GuidePoints
) {
  drawBodySilhouette(ctx, width, height, guide);
  drawKeyPointLabels(ctx, width, height, guide);
}

// シンプルな人型シルエット（首から下・正面）
function drawBodySilhouette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: GuidePoints
) {
  const cx = w / 2;
  const sY = guide.shoulder.y * h;
  const wY = guide.waist.y * h;
  const aY = guide.ankle.y * h;

  const nw = w * 0.05;   // 首の半幅
  const sw = w * 0.24;   // 肩の半幅
  const ww = w * 0.15;   // 腰の半幅
  const hw = w * 0.19;   // ヒップの半幅
  const lw = w * 0.085;  // 脚の半幅

  const hipY   = wY + (aY - wY) * 0.22;
  const crotY  = wY + (aY - wY) * 0.34;
  const footY  = aY + h * 0.04;

  ctx.save();
  ctx.beginPath();

  // 左首 → 左肩
  ctx.moveTo(cx - nw, 0);
  ctx.quadraticCurveTo(cx - sw * 0.45, sY * 0.45, cx - sw, sY);
  // 左肩 → 左わき → 左腰
  ctx.lineTo(cx - sw, sY + (wY - sY) * 0.35);
  ctx.quadraticCurveTo(cx - sw * 0.95, wY * 0.9, cx - ww, wY);
  // 左腰 → 左ヒップ → 股
  ctx.quadraticCurveTo(cx - hw * 1.05, hipY, cx - hw, hipY);
  ctx.quadraticCurveTo(cx - hw * 1.0, crotY * 0.96, cx - lw * 1.5, crotY);
  // 左脚
  ctx.quadraticCurveTo(cx - lw * 1.3, crotY + (aY - crotY) * 0.5, cx - lw, aY);
  // 左足
  ctx.lineTo(cx - lw * 2.8, footY);
  // 右足
  ctx.lineTo(cx + lw * 2.8, footY);
  // 右脚
  ctx.lineTo(cx + lw, aY);
  ctx.quadraticCurveTo(cx + lw * 1.3, crotY + (aY - crotY) * 0.5, cx + lw * 1.5, crotY);
  // 股 → 右ヒップ → 右腰
  ctx.quadraticCurveTo(cx + hw * 1.0, crotY * 0.96, cx + hw, hipY);
  ctx.quadraticCurveTo(cx + hw * 1.05, hipY, cx + ww, wY);
  // 右腰 → 右わき → 右肩
  ctx.quadraticCurveTo(cx + sw * 0.95, wY * 0.9, cx + sw, sY + (wY - sY) * 0.35);
  ctx.lineTo(cx + sw, sY);
  // 右肩 → 右首
  ctx.quadraticCurveTo(cx + sw * 0.45, sY * 0.45, cx + nw, 0);
  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

// ガイドポイントのラベル
function drawKeyPointLabels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: GuidePoints
) {
  const points = [
    { y: guide.shoulder.y * h, color: "rgba(147,197,253,0.95)", label: "肩" },
    { y: guide.waist.y * h,    color: "rgba(253,186,116,0.95)", label: "腰" },
    { y: guide.ankle.y * h,    color: "rgba(216,180,254,0.95)", label: "足首" },
  ];

  const fontSize = Math.round(Math.max(12, w * 0.034));

  points.forEach(({ y, color, label }) => {
    // 両端の短い横線
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    [[0, w * 0.08], [w * 0.92, w]].forEach(([from, to]) => {
      ctx.beginPath();
      ctx.moveTo(from, y);
      ctx.lineTo(to, y);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // ラベル背景
    ctx.font = `600 ${fontSize}px -apple-system, "Hiragino Sans", sans-serif`;
    const tw = ctx.measureText(label).width + 10;
    const th = fontSize + 6;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(w * 0.09, y - th, tw, th, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textBaseline = "bottom";
    ctx.fillText(label, w * 0.09 + 5, y - 3);
  });
}

// 参照写真をゴースト（半透明シルエット）としてCanvasに描画
export function drawGhostOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  referenceImage: HTMLImageElement,
  opacity: number = 0.35
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  // アスペクト比を保ちつつ中央に収める
  const scale = Math.min(width / referenceImage.naturalWidth, height / referenceImage.naturalHeight);
  const drawW = referenceImage.naturalWidth * scale;
  const drawH = referenceImage.naturalHeight * scale;
  const offsetX = (width - drawW) / 2;
  const offsetY = (height - drawH) / 2;
  ctx.drawImage(referenceImage, offsetX, offsetY, drawW, drawH);
  ctx.restore();

  // ゴーストの上に3本の補助線を薄く重ねる
  const guide = generateGuidePoints(height);
  const lines = [
    { y: guide.shoulder.y * height, color: "rgba(96,165,250,0.7)", label: "肩" },
    { y: guide.waist.y * height, color: "rgba(249,115,22,0.7)", label: "腰" },
    { y: guide.ankle.y * height, color: "rgba(167,139,250,0.7)", label: "足首" },
  ];
  lines.forEach(({ y, color, label }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = "bold 12px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, 8, y - 3);
  });
}

// 画像Blobをロード
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
