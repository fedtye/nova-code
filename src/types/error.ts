// Error code enum
export type ErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_INVALID'
  | 'API_KEY_MISSING'
  | 'API_KEY_INVALID'
  | 'MODEL_UNAVAILABLE'
  | 'MODEL_TIMEOUT'
  | 'MODEL_RATE_LIMITED'
  | 'MODEL_QUOTA_EXCEEDED'
  | 'MODEL_INVALID_RESPONSE'
  | 'INPUT_TOO_LONG'
  | 'INVALID_INPUT'
  | 'UNKNOWN_ERROR';

// Error level
export type ErrorLevel = 'info' | 'warning' | 'error' | 'critical';

// Nova error class
export class NovaError extends Error {
  readonly code: ErrorCode;
  readonly level: ErrorLevel;
  readonly recoverable: boolean;
  readonly suggestion?: string;
  readonly cause?: Error;

  constructor(options: {
    code: ErrorCode;
    message: string;
    level?: ErrorLevel;
    recoverable?: boolean;
    suggestion?: string;
    cause?: Error;
  }) {
    super(options.message, options.cause ? { cause: options.cause } : undefined);
    this.name = 'NovaError';
    this.code = options.code;
    this.level = options.level ?? 'error';
    this.recoverable = options.recoverable ?? true;
    this.suggestion = options.suggestion;
    this.cause = options.cause;
  }

  // Format user-friendly error message
  toUserString(): string {
    let output = `\n❌ 错误: ${this.message}\n`;
    if (this.suggestion) {
      output += `💡 建议: ${this.suggestion}\n`;
    }
    return output;
  }
}

// User-friendly error messages
export const ERROR_MESSAGES: Record<ErrorCode, { message: string; suggestion: string }> = {
  CONFIG_NOT_FOUND: {
    message: '配置文件不存在',
    suggestion: '运行 `nova setup` 初始化配置'
  },
  CONFIG_INVALID: {
    message: '配置文件格式错误',
    suggestion: '检查 ~/.nova/config.json 或运行 `nova setup` 重新配置'
  },
  API_KEY_MISSING: {
    message: 'Anthropic API Key 未配置',
    suggestion: '运行 `nova setup` 输入你的 API Key，或设置环境变量 ANTHROPIC_API_KEY'
  },
  API_KEY_INVALID: {
    message: 'API Key 无效或已过期',
    suggestion: '访问 https://console.anthropic.com/ 获取新的 API Key，然后运行 `nova setup` 更新'
  },
  MODEL_UNAVAILABLE: {
    message: '模型服务暂时不可用',
    suggestion: '请稍后重试，或检查网络连接'
  },
  MODEL_TIMEOUT: {
    message: '模型请求超时',
    suggestion: '网络可能较慢，请稍后重试，或运行 `nova doctor` 检查网络'
  },
  MODEL_RATE_LIMITED: {
    message: 'API 请求频率超限',
    suggestion: '请稍后重试，或减少请求频率'
  },
  MODEL_QUOTA_EXCEEDED: {
    message: 'API 配额已用尽',
    suggestion: '访问 https://console.anthropic.com/ 查看配额或升级套餐'
  },
  MODEL_INVALID_RESPONSE: {
    message: '模型返回了无效响应',
    suggestion: '这是一个临时问题，请稍后重试'
  },
  INPUT_TOO_LONG: {
    message: '输入内容超出模型上下文长度限制',
    suggestion: '请缩短输入内容，或使用 `/clear` 清空对话历史'
  },
  INVALID_INPUT: {
    message: '输入无效',
    suggestion: '请检查你的输入内容'
  },
  UNKNOWN_ERROR: {
    message: '发生了未知错误',
    suggestion: '请稍后重试，如问题持续请报告 Bug'
  }
};
