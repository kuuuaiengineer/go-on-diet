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

// 人型シルエット（正面・首から下）
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

  const sw = w * 0.26;   // 肩の半幅
  const nw = w * 0.055;  // 首の半幅
  const tw = w * 0.145;  // 胴体腰の半幅
  const hw = w * 0.195;  // 腰の半幅
  const lw = w * 0.095;  // 脚の半幅
  const aw = w * 0.085;  // 腕の半幅

  const hipY  = wY + (aY - wY) * 0.18;
  const crotY = wY + (aY - wY) * 0.28;
  const kneeY = wY + (aY - wY) * 0.56;
  const uarmY = sY + (wY - sY) * 0.28; // 脇
  const earmY = sY + (wY - sY) * 0.62; // 肘
  const wristY = wY + h * 0.01;        // 手首

  ctx.save();
  ctx.beginPath();

  // 左首 → 左肩
  ctx.moveTo(cx - nw, 0);
  ctx.bezierCurveTo(cx - nw * 1.5, sY * 0.4, cx - sw * 0.7, sY * 0.7, cx - sw, sY);

  // 左腕（外側）
  ctx.bezierCurveTo(cx - sw - aw * 0.3, uarmY, cx - sw - aw * 0.5, earmY, cx - sw - aw * 0.3, wristY);
  // 左手
  ctx.bezierCurveTo(cx - sw - aw * 0.2, wristY + h * 0.025, cx - sw - aw * 0.5, wristY + h * 0.025, cx - sw - aw * 0.5, wristY);
  // 左腕（内側）
  ctx.bezierCurveTo(cx - sw - aw * 0.1, earmY, cx - tw - aw * 0.2, uarmY, cx - tw - aw * 0.1, uarmY);

  // 左胴体
  ctx.bezierCurveTo(cx - tw * 1.05, wY * 0.85, cx - tw, wY * 0.95, cx - tw, wY);
  // 左腰〜股
  ctx.bezierCurveTo(cx - hw, hipY, cx - hw * 1.05, crotY * 0.92, cx - lw * 1.1, crotY);
  ctx.quadraticCurveTo(cx - lw * 0.3, crotY + h * 0.01, cx - lw, crotY + h * 0.02);

  // 左脚（内側→外側）
  ctx.bezierCurveTo(cx - lw * 0.8, kneeY, cx - lw, aY * 0.97, cx - lw, aY);
  // 左足
  ctx.lineTo(cx - lw * 2.2, aY + h * 0.035);
  // 右足
  ctx.lineTo(cx + lw * 2.2, aY + h * 0.035);
  // 右脚
  ctx.lineTo(cx + lw, aY);
  ctx.bezierCurveTo(cx + lw, aY * 0.97, cx + lw * 0.8, kneeY, cx + lw, crotY + h * 0.02);

  // 右股〜腰
  ctx.quadraticCurveTo(cx + lw * 0.3, crotY + h * 0.01, cx + lw * 1.1, crotY);
  ctx.bezierCurveTo(cx + hw * 1.05, crotY * 0.92, cx + hw, hipY, cx + tw, wY);

  // 右胴体
  ctx.bezierCurveTo(cx + tw, wY * 0.95, cx + tw * 1.05, wY * 0.85, cx + tw + aw * 0.1, uarmY);
  // 右腕（内側）
  ctx.bezierCurveTo(cx + sw + aw * 0.1, earmY, cx + sw + aw * 0.5, earmY, cx + sw + aw * 0.5, wristY);
  // 右手
  ctx.bezierCurveTo(cx + sw + aw * 0.5, wristY + h * 0.025, cx + sw + aw * 0.2, wristY + h * 0.025, cx + sw + aw * 0.3, wristY);
  // 右腕（外側）
  ctx.bezierCurveTo(cx + sw + aw * 0.5, earmY, cx + sw + aw * 0.3, uarmY, cx + sw, sY);

  // 右肩 → 右首
  ctx.bezierCurveTo(cx + sw * 0.7, sY * 0.7, cx + nw * 1.5, sY * 0.4, cx + nw, 0);
  ctx.closePath();

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.restore();
}

// ガイドポイントのラベルを描画
function drawKeyPointLabels(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  guide: GuidePoints
) {
  const points = [
    { y: guide.shoulder.y * h, color: "rgba(147,197,253,0.9)", label: "肩" },
    { y: guide.waist.y * h,    color: "rgba(253,186,116,0.9)", label: "腰" },
    { y: guide.ankle.y * h,    color: "rgba(216,180,254,0.9)", label: "足首" },
  ];

  points.forEach(({ y, color, label }) => {
    // 両端に短い横線
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w * 0.1, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.9, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // ラベル（小さめ・背景付き）
    const fontSize = Math.max(11, w * 0.032);
    ctx.font = `600 ${fontSize}px -apple-system, sans-serif`;
    const tw = ctx.measureText(label).width;
    const px = 6, py = 3;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(4, y - fontSize - py * 2, tw + px * 2, fontSize + py * 2, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textBaseline = "bottom";
    ctx.fillText(label, 4 + px, y - py);
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
