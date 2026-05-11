export type ImageOp = 'compress' | 'resize' | 'format' | 'crop' | 'smart';

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

/**
 * Build a transformation URL using images.weserv.nl (free image processing CDN)
 */
export function buildWeservUrl(imageUrl: string, op: ImageOp, params: string, format: string): string {
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
      weservUrl += `&a=crop`;
      const parts = params.split(/[,xX，x]/).map(s => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        weservUrl += `&w=${parseInt(parts[0]) || 200}&h=${parseInt(parts[1]) || 200}`;
      }
      break;
    }
    case 'format': {
      // Format is handled separately via the format parameter
      break;
    }
    case 'smart': {
      // Smart mode uses AI to determine parameters
      // Just pass through, AI will interpret
      break;
    }
  }

  if (format) {
    weservUrl += `&output=${format}`;
  }

  if (op === 'compress') {
    weservUrl += '&we_accept=no-transform';
  }

  weservUrl += '&we_accept=no-redirects';

  return weservUrl;
}

export function getSmartPrompt(): string {
  return `你是一个图片处理专家。用户会描述他们想要对图片进行的处理操作。

请分析用户的需求，确定最合适的图片处理参数。

以JSON格式返回，包含以下字段：
- operation: 操作类型（"compress" | "resize" | "format" | "crop"）
- params: 处理参数描述
- width: 目标宽度（像素，无需则填0）
- height: 目标高度（像素，无需则填0）
- quality: 压缩质量（1-100，无需则填0）
- format: 目标格式（"jpg" | "png" | "webp" | "avif" | ""）
- explanation: 你的处理方案说明（30字以内）

仅返回JSON，不要其他文字。`;
}
