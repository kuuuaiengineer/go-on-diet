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

// ガイドラインをCanvasに描画（カメラプレビュー用・初回のみ）
export function drawGuideLines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  guide: GuidePoints
) {
  const lines = [
    { y: guide.shoulder.y * height, color: "#60a5fa", label: "肩" },
    { y: guide.waist.y * height, color: "#f97316", label: "腰" },
    { y: guide.ankle.y * height, color: "#a78bfa", label: "足首" },
  ];

  lines.forEach(({ y, color, label }) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = color;
    ctx.font = "bold 13px sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, 8, y - 3);
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
