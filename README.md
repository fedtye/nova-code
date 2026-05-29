# Nova Agent

智能开发助手 CLI 工具，基于 Anthropic Claude API。

## 功能

- **REPL 对话模式** - 交互式多轮对话
- **单行查询** - 快速回答单个问题
- **流式输出** - 实时展示 AI 响应
- **配置向导** - 简单的设置流程
- **环境自检** - 诊断工具

## 安装

```bash
npm install
```

要求 Node.js >= 18。

## 快速开始

1. 首次使用需要配置 API Key：
```bash
npm run dev setup
```

2. 进入对话模式：
```bash
npm run dev
```

## 使用

### 命令行

| 命令 | 说明 |
|------|------|
| `npm run dev` | 进入 REPL 对话模式 |
| `npm run dev -- -q "<query>"` | 单行查询 |
| `npm run dev -- setup` | 配置向导 |
| `npm run dev -- doctor` | 环境自检 |
| `npm run dev -- -v, --version` | 显示版本号 |
| `npm run dev -- -h, --help` | 显示帮助 |

### REPL 命令

在 REPL 模式下可用：

| 命令 | 说明 |
|------|------|
| `/exit`, `/quit` | 退出 REPL |
| `/clear` | 清空对话上下文 |
| `/history` | 显示对话历史 |
| `/config` | 显示当前配置 |

### 示例

```bash
# 进入交互模式
npm run dev

# 单行查询
npm run dev -- -q "帮我写一个快速排序"
```

## 开发

| 脚本 | 说明 |
|------|------|
| `npm run build` | 编译 TypeScript |
| `npm run watch` | 监听文件变化并编译 |
| `npm test` | 运行测试 |

## 许可证

MIT
