export type ImageOp = 'compress' | 'resize' | 'format' | 'crop' | 'watermark' | 'smart';
export type WatermarkType = 'text' | 'image';
export type WatermarkPosition = 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';

export interface OpOption {
  label: string;
  value: ImageOp;
  params: string;
}

export const OP_OPTIONS: OpOption[] = [
  { label: '压缩', value: 'compress', params: 'quality(1-100)' },
  { label: '调整尺寸', value: 'resize', params: '宽度,高度(px)' },
  { label: '格式转换', value: 'format', params: 'jpg/png/webp/avif' },
  { label: '裁剪', value: 'crop', params: '裁剪区域' },
  { label: '加水印', value: 'watermark', params: '水印文字或图片URL' },
  { label: '智能处理 (描述需求)', value: 'smart', params: '用自然语言描述' },
];

export const MODEL_OPTIONS = [
  { label: 'DeepSeek Chat (快速)', value: 'deepseek-chat' },
];

export const FORMAT_OPTIONS = [
  { label: '保持原格式', value: '' },
  { label: 'JPEG (.jpg)', value: 'jpg' },
  { label: 'PNG (.png)', value: 'png' },
  { label: 'WebP (.webp)', value: 'webp' },
  { label: 'AVIF (.avif)', value: 'avif' },
];

export const WATERMARK_TYPE_OPTIONS = [
  { label: '文字水印', value: 'text' },
  { label: '图片水印', value: 'image' },
];

export const WATERMARK_POSITION_OPTIONS = [
  { label: '左上', value: 'top-left' },
  { label: '右上', value: 'top-right' },
  { label: '居中', value: 'center' },
  { label: '左下', value: 'bottom-left' },
  { label: '右下', value: 'bottom-right' },
];

export function generateTextWatermarkSvg(
  text: string,
  fontSize: number = 32,
  color: string = '#ffffff',
  opacity: number = 50,
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
  <rect width="100%" height="100%" fill="transparent"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    font-size="${fontSize}px" font-family="Arial, sans-serif"
    fill="${color}" fill-opacity="${opacity / 100}"
    transform="rotate(-30, 400, 400)">
    ${escapeXml(text)}
  </text>
</svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildWeservUrl(
  imageUrl: string,
  op: ImageOp,
  params: string,
  format: string,
  watermarkOptions?: {
    type: WatermarkType;
    text?: string;
    imageUrl?: string;
    position: WatermarkPosition;
    opacity: number;
    size: number;
  },
): string {
  const encodedUrl = encodeURIComponent(imageUrl);
  let weservUrl = `https://images.weserv.nl/?url=${encodedUrl}`;

  switch (op) {
    case 'compress': {
      const quality = parseInt(params) || 80;
      weservUrl += `&q=${Math.max(1, Math.min(100, quality))}`;
      break;
    }
    case 'resize': {
      const parts = params.split(/[,xX，x]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 1) weservUrl += `&w=${parseInt(parts[0]) || 200}`;
      if (parts.length >= 2 && parts[1]) weservUrl += `&h=${parseInt(parts[1]) || 200}`;
      break;
    }
    case 'crop': {
      weservUrl += '&a=crop';
      const parts = params.split(/[,xX，x]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) weservUrl += `&w=${parseInt(parts[0]) || 200}&h=${parseInt(parts[1]) || 200}`;
      break;
    }
    case 'watermark': {
      if (watermarkOptions) {
        const wmUrl = watermarkOptions.type === 'text'
          ? generateTextWatermarkSvg(watermarkOptions.text || '', watermarkOptions.size, '#ffffff', watermarkOptions.opacity)
          : watermarkOptions.imageUrl || '';
        if (wmUrl) {
          weservUrl += `&overlay-image=${encodeURIComponent(wmUrl)}`;
          const posMap: Record<WatermarkPosition, string> = {
            'top-left': '10,10',
            'top-right': '-10,10',
            'center': '-50,-50',
            'bottom-left': '10,-10',
            'bottom-right': '-10,-10',
          };
          weservUrl += `&overlay-x=${posMap[watermarkOptions.position]?.split(',')[0] || 10}`;
          weservUrl += `&overlay-y=${posMap[watermarkOptions.position]?.split(',')[1] || 10}`;
          weservUrl += `&overlay-alpha=${watermarkOptions.opacity}`;
        }
      }
      break;
    }
  }

  if (format) weservUrl += `&output=${format}`;
  weservUrl += '&we_accept=no-redirects';
  return weservUrl;
}

export function getSmartPrompt(): string {
  return `你是一个图片处理专家。用户会描述他们想要对图片进行的处理操作。
请分析用户的需求，确定最合适的图片处理参数。
以JSON格式返回，包含以下字段：
- operation: 操作类型（"compress" | "resize" | "format" | "crop" | "watermark"）
- params: 处理参数描述
- width: 目标宽度（像素，无需则填0）
- height: 目标高度（像素，无需则填0）
- quality: 压缩质量（1-100，无需则填0）
- format: 目标格式（"jpg" | "png" | "webp" | "avif" | ""）
- watermark: { type: "text"|"image", content: "文字或图片URL", position: "top-left"|"center"|"bottom-right", opacity: 50 } （无水印则填null）
- explanation: 你的处理方案说明（30字以内）
仅返回JSON，不要其他文字。`;
}
