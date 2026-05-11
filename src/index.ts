import {
  basekit,
  FieldType,
  FieldComponent,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';
import { callDeepSeek, extractJSON } from './ai';
import { OP_OPTIONS, MODEL_OPTIONS, FORMAT_OPTIONS, buildWeservUrl, getSmartPrompt, ImageOp } from './prompts';

basekit.addDomainList(['api.deepseek.com', 'images.weserv.nl']);

basekit.addField({
  i18n: {
    messages: {
      'zh-CN': {
        field_name: '图片处理',
        api_key: 'DeepSeek API Key',
        api_key_placeholder: '请输入你的 DeepSeek API Key',
        source_field: '图片URL字段',
        image_op: '处理操作',
        image_params: '处理参数',
        image_params_placeholder: '如：80（压缩质量）或 800,600（宽x高）',
        target_format: '输出格式',
        model: 'AI 模型',
        no_api_key: '请先配置 DeepSeek API Key',
        no_input: '（请输入图片URL）',
        ai_error: '处理失败',
        result_url: '🔗 处理后URL',
        result_explanation: '💡 说明',
        result_preview: '👁️ 提示: 点击URL在新标签页中预览',
        smart_desc_placeholder: '描述你想怎么处理这张图片，如：压缩到500KB以内，转为WebP格式',
        invalid_url: '⚠️ 请输入有效的图片URL（http:// 或 https:// 开头）',
      },
      'en-US': {
        field_name: 'Image Processor',
        api_key: 'DeepSeek API Key',
        api_key_placeholder: 'Enter your DeepSeek API Key',
        source_field: 'Image URL Field',
        image_op: 'Operation',
        image_params: 'Parameters',
        image_params_placeholder: 'e.g. 80 (quality) or 800,600 (wxh)',
        target_format: 'Output Format',
        model: 'AI Model',
        no_api_key: 'Please configure your DeepSeek API Key',
        no_input: '(Please enter image URL)',
        ai_error: 'Processing failed',
        result_url: '🔗 Processed URL',
        result_explanation: '💡 Info',
        result_preview: '👁️ Tip: Open URL in new tab to preview',
        smart_desc_placeholder: 'Describe how to process this image, e.g. compress to under 500KB and convert to WebP',
        invalid_url: '⚠️ Please enter a valid image URL starting with http:// or https://',
      },
    },
  },
  formItems: [
    {
      key: 'apiKey',
      label: 'api_key',
      component: FieldComponent.Input,
      props: { placeholder: 'api_key_placeholder' },
      validator: { required: true },
    },
    {
      key: 'sourceField',
      label: 'source_field',
      component: FieldComponent.FieldSelect,
      props: { supportType: [FieldType.Text] },
      validator: { required: true },
    },
    {
      key: 'imageOp',
      label: 'image_op',
      component: FieldComponent.SingleSelect,
      props: { options: OP_OPTIONS },
      validator: { required: true },
    },
    {
      key: 'imageParams',
      label: 'image_params',
      component: FieldComponent.Input,
      props: { placeholder: 'image_params_placeholder' },
    },
    {
      key: 'targetFormat',
      label: 'target_format',
      component: FieldComponent.SingleSelect,
      props: { options: FORMAT_OPTIONS },
    },
    {
      key: 'model',
      label: 'model',
      component: FieldComponent.SingleSelect,
      props: { options: MODEL_OPTIONS },
    },
  ],
  resultType: { type: FieldType.Text },
  execute: async (formItemParams: Record<string, any>, context: any) => {
    const logID = context?.logID || '未知';
    try {
      const apiKey: string = formItemParams.apiKey || '';
      const sourceValue: string = formItemParams.sourceField ?? '';
      const op: ImageOp = formItemParams.imageOp || 'compress';
      const params: string = formItemParams.imageParams || '';
      const format: string = formItemParams.targetFormat || '';
      const model: string = formItemParams.model || 'deepseek-chat';

      if (!apiKey) return { code: FieldCode.Success, data: '⚠️ 请先配置 DeepSeek API Key' };
      if (!sourceValue) return { code: FieldCode.Success, data: '（请输入图片URL）' };

      const urlMatch = String(sourceValue).match(/https?:\/\/[^\s]+/i);
      if (!urlMatch) return { code: FieldCode.Success, data: '⚠️ 请输入有效的图片URL' };
      const imageUrl = urlMatch[0];

      // For smart mode, use AI to interpret user's request
      if (op === 'smart') {
        if (!params) return { code: FieldCode.Success, data: '⚠️ 请描述你想怎么处理这张图片' };

        const systemPrompt = getSmartPrompt();
        const aiResult = await callDeepSeek(systemPrompt, params, { apiKey, model });

        if (!aiResult.success) {
          return { code: FieldCode.Error, data: `⚠️ ${aiResult.error}` };
        }

        const parsed = extractJSON(aiResult.data!);
        if (parsed && parsed.operation) {
          const smartOp = parsed.operation as ImageOp;
          const smartParams = `${parsed.width || ''}${parsed.width && parsed.height ? ',' : ''}${parsed.height || ''}`;
          const smartFormat = parsed.format || format;
          const finalUrl = buildWeservUrl(imageUrl, smartOp, smartParams, smartFormat);
          const lines: string[] = ['🔗 处理后URL:'];
          lines.push(`  ${finalUrl}`);
          if (parsed.explanation) lines.push(`💡 ${parsed.explanation}`);
          lines.push('👁️ 右键URL → 在新标签页打开预览');
          return { code: FieldCode.Success, data: lines.join('\n') };
        }

        // Fallback: use params as resize if AI parsing fails
        const fallbackUrl = buildWeservUrl(imageUrl, 'resize', '800,0', format);
        return { code: FieldCode.Success, data: `🔗 处理后URL:\n  ${fallbackUrl}\n💡 已按默认参数处理` };
      }

      // For non-smart modes, directly build the URL
      const processedUrl = buildWeservUrl(imageUrl, op, params, format);
      const lines: string[] = ['🔗 处理后URL:'];
      lines.push(`  ${processedUrl}`);
      lines.push('👁️ 右键URL → 在新标签页打开预览');

      return { code: FieldCode.Success, data: lines.join('\n') };
    } catch (err: any) {
      return { code: FieldCode.Error, data: `⚠️ 处理异常: ${err.message || '未知错误'}` };
    }
  },
});

export default basekit;
