import {
  basekit,
  FieldType,
  FieldComponent,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';
import { callDeepSeek, extractJSON } from './ai';
import {
  OP_OPTIONS, MODEL_OPTIONS, FORMAT_OPTIONS,
  WATERMARK_TYPE_OPTIONS, WATERMARK_POSITION_OPTIONS,
  buildWeservUrl, getSmartPrompt, ImageOp, WatermarkType, WatermarkPosition,
} from './prompts';

basekit.addDomainList(['api.deepseek.com', 'images.weserv.nl']);

basekit.addField({
  i18n: {
    messages: {
      'zh-CN': {
        field_name: '批量图片处理',
        api_key: 'DeepSeek API Key',
        api_key_placeholder: '请输入你的 DeepSeek API Key（智能模式需要）',
        source_field: '图片URL字段',
        image_op: '处理操作',
        image_params: '处理参数',
        image_params_placeholder: '如：80（压缩质量）或 800,600（宽x高）',
        target_format: '输出格式',
        model: 'AI 模型',
        no_api_key: '请先配置 DeepSeek API Key',
        no_input: '（请输入图片URL）',
        ai_error: '处理失败',
        result_url: '处理后URL',
        smart_desc_placeholder: '描述你想怎么处理这张图片',
        invalid_url: '请输入有效的图片URL',
        // 水印配置
        watermark_type: '水印类型',
        watermark_text: '水印文字',
        watermark_text_placeholder: '请输入水印文字（如：© 版权所有）',
        watermark_image_url: '水印图片URL',
        watermark_image_placeholder: '请输入水印图片的URL',
        watermark_position: '水印位置',
        watermark_opacity: '水印透明度',
        watermark_size: '水印大小',
        watermark_size_placeholder: '字号(px)，默认32',
        // 操作链
        chain_mode: '操作链模式',
        chain_mode_off: '单次操作',
        chain_mode_on: '多操作组合',
        chain_steps: '操作步骤',
        chain_step_op: '操作',
        chain_step_params: '参数',
        chain_step_add: '添加步骤',
        chain_step_remove: '删除',
        // 结果展示
        result_preview: '提示: 复制URL到浏览器预览效果',
        result_chain: '操作链完成',
      },
      'en-US': {
        field_name: 'Image Processor',
        api_key: 'DeepSeek API Key',
        api_key_placeholder: 'Enter your DeepSeek API Key (for smart mode)',
        source_field: 'Image URL Field',
        image_op: 'Operation',
        image_params: 'Parameters',
        image_params_placeholder: 'e.g. 80 (quality) or 800,600 (wxh)',
        target_format: 'Output Format',
        model: 'AI Model',
        no_api_key: 'Please configure your DeepSeek API Key',
        no_input: '(Please enter image URL)',
        ai_error: 'Processing failed',
        result_url: 'Processed URL',
        smart_desc_placeholder: 'Describe how to process this image',
        invalid_url: 'Please enter a valid image URL',
        watermark_type: 'Watermark Type',
        watermark_text: 'Watermark Text',
        watermark_text_placeholder: 'Enter watermark text (e.g. © Copyright)',
        watermark_image_url: 'Watermark Image URL',
        watermark_image_placeholder: 'Enter watermark image URL',
        watermark_position: 'Watermark Position',
        watermark_opacity: 'Watermark Opacity',
        watermark_size: 'Watermark Size',
        watermark_size_placeholder: 'Font size(px), default 32',
        chain_mode: 'Chain Mode',
        chain_mode_off: 'Single operation',
        chain_mode_on: 'Multi-operation chain',
        chain_steps: 'Operation Steps',
        chain_step_op: 'Operation',
        chain_step_params: 'Parameters',
        chain_step_add: 'Add Step',
        chain_step_remove: 'Remove',
        result_preview: 'Tip: Copy URL to browser to preview',
        result_chain: 'Chain complete',
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
      key: 'watermarkType',
      label: 'watermark_type',
      component: FieldComponent.SingleSelect,
      props: { options: WATERMARK_TYPE_OPTIONS },
    },
    {
      key: 'watermarkText',
      label: 'watermark_text',
      component: FieldComponent.Input,
      props: { placeholder: 'watermark_text_placeholder' },
    },
    {
      key: 'watermarkImageUrl',
      label: 'watermark_image_url',
      component: FieldComponent.Input,
      props: { placeholder: 'watermark_image_placeholder' },
    },
    {
      key: 'watermarkPosition',
      label: 'watermark_position',
      component: FieldComponent.SingleSelect,
      props: { options: WATERMARK_POSITION_OPTIONS },
    },
    {
      key: 'watermarkOpacity',
      label: 'watermark_opacity',
      component: FieldComponent.Input,
      props: { placeholder: '50' },
    },
    {
      key: 'watermarkSize',
      label: 'watermark_size',
      component: FieldComponent.Input,
      props: { placeholder: 'watermark_size_placeholder' },
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
    try {
      const apiKey: string = formItemParams.apiKey || '';
      const sourceValue: string = formItemParams.sourceField ?? '';
      const op: ImageOp = formItemParams.imageOp || 'compress';
      const params: string = formItemParams.imageParams || '';
      const format: string = formItemParams.targetFormat || '';
      const model: string = formItemParams.model || 'deepseek-chat';

      if (!apiKey) return { code: FieldCode.Success, data: '请先配置 DeepSeek API Key' };
      if (!sourceValue) return { code: FieldCode.Success, data: '（请输入图片URL）' };

      const urlMatch = String(sourceValue).match(/https?:\/\/[^\s]+/i);
      if (!urlMatch) return { code: FieldCode.Success, data: '请输入有效的图片URL' };
      const imageUrl = urlMatch[0];

      if (op === 'smart') {
        if (!params) return { code: FieldCode.Success, data: '请描述你想怎么处理这张图片' };
        const systemPrompt = getSmartPrompt();
        const aiResult = await callDeepSeek(systemPrompt, params, { apiKey, model });
        if (!aiResult.success) return { code: FieldCode.Error, data: `处理失败: ${aiResult.error}` };

        const parsed = extractJSON(aiResult.data!);
        if (parsed && parsed.operation) {
          const smartOp = parsed.operation as ImageOp;
          const smartParams = `${parsed.width || ''}${parsed.width && parsed.height ? ',' : ''}${parsed.height || ''}`;
          const smartFormat = parsed.format || format;
          const wmOpts = parsed.watermark ? {
            type: (parsed.watermark.type || 'text') as WatermarkType,
            text: parsed.watermark.content || '',
            imageUrl: parsed.watermark.content || '',
            position: (parsed.watermark.position || 'bottom-right') as WatermarkPosition,
            opacity: parsed.watermark.opacity || 50,
            size: 32,
          } : undefined;
          const finalUrl = buildWeservUrl(imageUrl, smartOp, smartParams, smartFormat, wmOpts);
          const lines: string[] = ['处理后URL:'];
          lines.push(`  ${finalUrl}`);
          if (parsed.explanation) lines.push(`说明: ${parsed.explanation}`);
          lines.push('复制URL到浏览器预览效果');
          return { code: FieldCode.Success, data: lines.join('\n') };
        }
        const fallbackUrl = buildWeservUrl(imageUrl, 'resize', '800,0', format);
        return { code: FieldCode.Success, data: `处理后URL:\n  ${fallbackUrl}\n已按默认参数处理` };
      }

      const wmType = formItemParams.watermarkType as WatermarkType | undefined;
      const watermarkOptions = op === 'watermark' || wmType ? {
        type: (wmType || 'text') as WatermarkType,
        text: formItemParams.watermarkText || '',
        imageUrl: formItemParams.watermarkImageUrl || '',
        position: (formItemParams.watermarkPosition || 'bottom-right') as WatermarkPosition,
        opacity: parseInt(formItemParams.watermarkOpacity) || 50,
        size: parseInt(formItemParams.watermarkSize) || 32,
      } : undefined;

      const processedUrl = buildWeservUrl(imageUrl, op, params, format, watermarkOptions);
      const lines: string[] = ['处理后URL:'];
      lines.push(`  ${processedUrl}`);
      lines.push('复制URL到浏览器预览效果');
      return { code: FieldCode.Success, data: lines.join('\n') };
    } catch (err: any) {
      return { code: FieldCode.Error, data: `处理异常: ${err.message || '未知错误'}` };
    }
  },
});

export default basekit;
