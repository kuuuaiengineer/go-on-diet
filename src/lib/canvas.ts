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

// 初回用：腕付き人型シルエット（ラベル・線なし）
export function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guide: GuidePoints
) {
  drawBodySilhouette(ctx, width, height, guide);
}

// 腕付き人型シルエット（首から下・正面）
function drawBodySilhouette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: GuidePoints
) {
  const cx = w / 2;
  const sY  = guide.shoulder.y * h;
  const wY  = guide.waist.y * h;
  const aY  = guide.ankle.y * h;

  // 体の幅
  const nw  = w * 0.052;  // 首半幅
  const sw  = w * 0.22;   // 肩半幅
  const uw  = w * 0.14;   // 脇半幅
  const ww  = w * 0.14;   // 腰半幅
  const hw  = w * 0.185;  // ヒップ半幅
  const lw  = w * 0.083;  // 脚半幅

  // 腕
  const armOX = w * 0.315; // 腕外側X（中心から）
  const armIX = w * 0.245; // 腕内側X
  const armW  = armOX - armIX;

  // Y座標
  const axY   = sY  + (wY - sY) * 0.32;  // 脇
  const wristY = wY + (aY - wY) * 0.08;  // 手首
  const handY  = wristY + h * 0.04;       // 手先
  const hipY   = wY + (aY - wY) * 0.22;
  const crotY  = wY + (aY - wY) * 0.34;
  const footY  = aY + h * 0.038;

  ctx.save();
  ctx.beginPath();

  // ── 左側（首→肩→腕→胴体→脚） ──
  ctx.moveTo(cx - nw, 0);
  // 首〜肩
  ctx.bezierCurveTo(cx - nw * 1.6, sY * 0.35, cx - sw * 0.65, sY * 0.7, cx - sw, sY);
  // 肩〜左腕外側
  ctx.bezierCurveTo(cx - sw * 1.05, sY + (axY - sY) * 0.4, cx - armOX, axY * 0.85, cx - armOX, axY);
  // 左腕外側〜手首
  ctx.bezierCurveTo(cx - armOX * 1.02, axY + (wristY - axY) * 0.5, cx - armOX * 0.98, wristY - h * 0.01, cx - armOX + armW * 0.15, wristY);
  // 手
  ctx.bezierCurveTo(cx - armOX + armW * 0.1, handY, cx - armIX - armW * 0.1, handY, cx - armIX - armW * 0.15, wristY);
  // 左腕内側〜脇
  ctx.bezierCurveTo(cx - armIX * 0.98, wristY - h * 0.01, cx - armIX * 1.02, axY * 0.85, cx - armIX, axY);
  // 脇〜腰
  ctx.bezierCurveTo(cx - uw * 1.05, axY + (wY - axY) * 0.5, cx - ww, wY * 0.95, cx - ww, wY);
  // 腰〜ヒップ〜股
  ctx.bezierCurveTo(cx - hw * 1.08, wY + (hipY - wY) * 0.6, cx - hw * 1.05, hipY, cx - hw, hipY);
  ctx.bezierCurveTo(cx - hw * 1.02, hipY + (crotY - hipY) * 0.7, cx - lw * 1.6, crotY * 0.98, cx - lw * 1.3, crotY);
  ctx.bezierCurveTo(cx - lw * 0.6, crotY + h * 0.008, cx - lw, crotY + h * 0.015, cx - lw, crotY + h * 0.02);
  // 左脚
  ctx.bezierCurveTo(cx - lw * 1.05, crotY + (aY - crotY) * 0.45, cx - lw * 1.02, aY - h * 0.01, cx - lw, aY);
  // 左足
  ctx.bezierCurveTo(cx - lw * 1.1, aY + footY * 0.01, cx - lw * 2.5, aY + h * 0.025, cx - lw * 2.8, footY);

  // 足底
  ctx.lineTo(cx + lw * 2.8, footY);

  // ── 右側（脚→胴体→腕→肩→首） ──
  // 右足
  ctx.bezierCurveTo(cx + lw * 2.5, aY + h * 0.025, cx + lw * 1.1, aY + footY * 0.01, cx + lw, aY);
  // 右脚
  ctx.bezierCurveTo(cx + lw * 1.02, aY - h * 0.01, cx + lw * 1.05, crotY + (aY - crotY) * 0.45, cx + lw, crotY + h * 0.02);
  ctx.bezierCurveTo(cx + lw, crotY + h * 0.015, cx + lw * 0.6, crotY + h * 0.008, cx + lw * 1.3, crotY);
  ctx.bezierCurveTo(cx + lw * 1.6, crotY * 0.98, cx + hw * 1.02, hipY + (crotY - hipY) * 0.7, cx + hw, hipY);
  // ヒップ〜腰
  ctx.bezierCurveTo(cx + hw * 1.05, hipY, cx + hw * 1.08, wY + (hipY - wY) * 0.6, cx + ww, wY);
  // 腰〜脇
  ctx.bezierCurveTo(cx + ww, wY * 0.95, cx + armIX * 1.02, axY * 0.85, cx + armIX, axY);
  // 右腕内側〜手首
  ctx.bezierCurveTo(cx + armIX * 1.02, axY * 0.85, cx + armIX * 0.98, wristY - h * 0.01, cx + armIX + armW * 0.15, wristY);
  // 手
  ctx.bezierCurveTo(cx + armIX + armW * 0.1, handY, cx + armOX - armW * 0.1, handY, cx + armOX - armW * 0.15, wristY);
  // 右腕外側〜肩
  ctx.bezierCurveTo(cx + armOX * 0.98, wristY - h * 0.01, cx + armOX * 1.02, axY * 0.85, cx + armOX, axY);
  ctx.bezierCurveTo(cx + armOX, axY * 0.85, cx + sw * 1.05, sY + (axY - sY) * 0.4, cx + sw, sY);
  // 肩〜首
  ctx.bezierCurveTo(cx + sw * 0.65, sY * 0.7, cx + nw * 1.6, sY * 0.35, cx + nw, 0);

  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
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
