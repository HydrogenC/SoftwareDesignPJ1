# CLI 重构指标

基线 `phase1-final`，目标 `--worktree`。

| 分类 | 基线行数 | 目标行数 | 增量 | 基线圈复杂度 | 目标圈复杂度 | 增量 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 内核 | 2045 | 1368 | -677 | 430 | 331 | -99 |
| 装配处 | 20 | 312 | +292 | 1 | 120 | +119 |
| 插件 | 0 | 1064 | +1064 | 0 | 215 | +215 |
| VS Code 扩展 | 0 | 176 | +176 | 0 | 26 | +26 |
| CLI 合计 | 2065 | 2744 | +679 | 431 | 666 | +235 |

## 运行文件与职责

| 分类 | 文件 | 职责 | 基线行数 / 圈复杂度 | 目标行数 / 圈复杂度 |
| --- | --- | --- | ---: | ---: |
| 装配处 | `plugins.config.json` | 可选插件清单 | — | 3 / 0 |
| 内核 | `src/api.ts` | 插件公开 API | — | 13 / 0 |
| 内核 | `src/cli/CommandHistory.ts` | 编辑执行、撤销重做与 IO 锁 | 45 / 11 | 50 / 13 |
| 内核 | `src/cli/CommandRouter.ts` | 按注册名分发命令 | 69 / 7 | 32 / 9 |
| 内核 | `src/cli/LineParser.ts` | CLI 语句分词与引号 | 44 / 11 | 44 / 11 |
| 内核 | `src/cli/Repl.ts` | 交互循环和错误输出 | 33 / 9 | 33 / 9 |
| 内核 | `src/cli/TreeFormatter.ts` | 树结构排版与行尾标签 | 53 / 16 | 76 / 26 |
| 内核 | `src/commands/AddToCommand.ts` | 命令协议与会话状态 | 39 / 5 | — |
| 内核 | `src/commands/BackCommand.ts` | 命令协议与会话状态 | 35 / 5 | — |
| 内核 | `src/commands/CanvasCommand.ts` | 命令协议与会话状态 | 21 / 5 | — |
| 内核 | `src/commands/Command.ts` | 命令协议与会话状态 | 62 / 13 | 62 / 13 |
| 内核 | `src/commands/CommandBase.ts` | 命令协议与会话状态 | 0 / 0 | — |
| 内核 | `src/commands/CommandContext.ts` | 命令协议与会话状态 | 41 / 7 | 22 / 0 |
| 内核 | `src/commands/CreateCommand.ts` | 命令协议与会话状态 | 41 / 9 | — |
| 内核 | `src/commands/DeleteCommand.ts` | 命令协议与会话状态 | 31 / 5 | — |
| 内核 | `src/commands/EditorSession.ts` | 命令协议与会话状态 | — | 96 / 25 |
| 内核 | `src/commands/FrontCommand.ts` | 命令协议与会话状态 | 35 / 5 | — |
| 内核 | `src/commands/GroupCommand.ts` | 命令协议与会话状态 | 78 / 22 | — |
| 内核 | `src/commands/HelpCommand.ts` | 命令协议与会话状态 | 40 / 1 | — |
| 内核 | `src/commands/InitCommand.ts` | 命令协议与会话状态 | 19 / 6 | — |
| 内核 | `src/commands/MoveCommand.ts` | 命令协议与会话状态 | 47 / 9 | — |
| 内核 | `src/commands/ReadCommand.ts` | 命令协议与会话状态 | 18 / 3 | — |
| 内核 | `src/commands/SaveCommand.ts` | 命令协议与会话状态 | 17 / 4 | — |
| 内核 | `src/commands/ScaleCommand.ts` | 命令协议与会话状态 | 32 / 5 | — |
| 内核 | `src/commands/SetCommand.ts` | 命令协议与会话状态 | 42 / 6 | — |
| 内核 | `src/commands/ShowCommand.ts` | 命令协议与会话状态 | 12 / 3 | — |
| 内核 | `src/commands/TreeCommand.ts` | 命令协议与会话状态 | 12 / 2 | — |
| 内核 | `src/commands/UngroupCommand.ts` | 命令协议与会话状态 | 50 / 12 | — |
| 内核 | `src/extensions/AttributeEdit.ts` | 属性分派、事务记录与恢复 | — | 97 / 25 |
| 内核 | `src/extensions/AttributeHandler.ts` | 扩展点契约、注册表与属性事务 | — | 16 / 0 |
| 内核 | `src/extensions/CommandDefinition.ts` | 扩展点契约、注册表与属性事务 | — | 8 / 0 |
| 内核 | `src/extensions/PluginContext.ts` | 扩展点契约、注册表与属性事务 | — | 25 / 0 |
| 内核 | `src/extensions/Registrations.ts` | 扩展点契约、注册表与属性事务 | — | 21 / 1 |
| 内核 | `src/extensions/ShapeProvider.ts` | 扩展点契约、注册表与属性事务 | — | 23 / 0 |
| 内核 | `src/extensions/ShapeView.ts` | 扩展点契约、注册表与属性事务 | — | 23 / 1 |
| 内核 | `src/extensions/TreeDecorator.ts` | 扩展点契约、注册表与属性事务 | — | 12 / 0 |
| 内核 | `src/extensions/invokeExtension.ts` | 扩展点契约、注册表与属性事务 | — | 11 / 4 |
| 装配处 | `src/host/PluginConfigLoader.ts` | 配置验证、模块解析与动态导入 | — | 120 / 43 |
| 装配处 | `src/host/PluginHost.ts` | 激活、清单验证和注册事务 | — | 142 / 69 |
| 装配处 | `src/host/createEditor.ts` | 构建 CLI 会话及服务 | — | 24 / 2 |
| 装配处 | `src/index.ts` | CLI 入口与组合根 | 20 / 1 | 23 / 6 |
| 内核 | `src/io/SvgReader.ts` | 解析 SVG、分配 ID 和构造子树 | 212 / 58 | 231 / 64 |
| 内核 | `src/io/SvgWriter.ts` | 输出 SVG 和文件写入 | 54 / 12 | 54 / 12 |
| 插件 | `src/plugins/builtin/BuiltinPlugin.ts` | 内置插件声明与注册 | — | 72 / 8 |
| 插件 | `src/plugins/builtin/BuiltinShapeProvider.ts` | 内置插件声明与注册 | — | 93 / 29 |
| 插件 | `src/plugins/builtin/commands/AddToCommand.ts` | 内置命令与逆操作 | — | 36 / 5 |
| 插件 | `src/plugins/builtin/commands/BackCommand.ts` | 内置命令与逆操作 | — | 32 / 5 |
| 插件 | `src/plugins/builtin/commands/CanvasCommand.ts` | 内置命令与逆操作 | — | 20 / 5 |
| 插件 | `src/plugins/builtin/commands/CreateCommand.ts` | 内置命令与逆操作 | — | 39 / 9 |
| 插件 | `src/plugins/builtin/commands/DeleteCommand.ts` | 内置命令与逆操作 | — | 28 / 5 |
| 插件 | `src/plugins/builtin/commands/FrontCommand.ts` | 内置命令与逆操作 | — | 32 / 5 |
| 插件 | `src/plugins/builtin/commands/GroupCommand.ts` | 内置命令与逆操作 | — | 73 / 23 |
| 插件 | `src/plugins/builtin/commands/HelpCommand.ts` | 内置命令与逆操作 | — | 14 / 1 |
| 插件 | `src/plugins/builtin/commands/InitCommand.ts` | 内置命令与逆操作 | — | 17 / 6 |
| 插件 | `src/plugins/builtin/commands/MoveCommand.ts` | 内置命令与逆操作 | — | 45 / 9 |
| 插件 | `src/plugins/builtin/commands/ReadCommand.ts` | 内置命令与逆操作 | — | 18 / 3 |
| 插件 | `src/plugins/builtin/commands/RedoCommand.ts` | 内置命令与逆操作 | — | 9 / 1 |
| 插件 | `src/plugins/builtin/commands/SaveCommand.ts` | 内置命令与逆操作 | — | 16 / 4 |
| 插件 | `src/plugins/builtin/commands/ScaleCommand.ts` | 内置命令与逆操作 | — | 29 / 5 |
| 插件 | `src/plugins/builtin/commands/SetCommand.ts` | 内置命令与逆操作 | — | 48 / 9 |
| 插件 | `src/plugins/builtin/commands/ShowCommand.ts` | 内置命令与逆操作 | — | 12 / 3 |
| 插件 | `src/plugins/builtin/commands/TreeCommand.ts` | 内置命令与逆操作 | — | 12 / 2 |
| 插件 | `src/plugins/builtin/commands/UndoCommand.ts` | 内置命令与逆操作 | — | 9 / 1 |
| 插件 | `src/plugins/builtin/commands/UngroupCommand.ts` | 内置命令与逆操作 | — | 46 / 13 |
| 插件 | `src/plugins/builtin/package.json` | 包与扩展声明 | — | 10 / 0 |
| 插件 | `src/plugins/builtin/shapes/Circle.ts` | 内置图形模型 | — | 62 / 11 |
| 插件 | `src/plugins/builtin/shapes/Ellipse.ts` | 内置图形模型 | — | 69 / 12 |
| 插件 | `src/plugins/builtin/shapes/Group.ts` | 内置图形模型 | — | 15 / 3 |
| 插件 | `src/plugins/builtin/shapes/Line.ts` | 内置图形模型 | — | 71 / 12 |
| 插件 | `src/plugins/builtin/shapes/Rect.ts` | 内置图形模型 | — | 69 / 12 |
| 插件 | `src/plugins/builtin/shapes/Text.ts` | 内置图形模型 | — | 68 / 14 |
| 内核 | `src/registry/ShapeFactory.ts` | 图形构造与反序列化分发 | 170 / 31 | 49 / 23 |
| 内核 | `src/svg/Circle.ts` | SVG 领域模型 | 62 / 11 | — |
| 内核 | `src/svg/Container.ts` | SVG 领域模型 | 46 / 12 | 50 / 14 |
| 内核 | `src/svg/Document.ts` | 画布、节点索引和结构编辑 | 140 / 37 | 154 / 42 |
| 内核 | `src/svg/EditorError.ts` | SVG 领域模型 | 6 / 1 | 6 / 1 |
| 内核 | `src/svg/Ellipse.ts` | SVG 领域模型 | 69 / 12 | — |
| 内核 | `src/svg/Group.ts` | SVG 领域模型 | 15 / 3 | — |
| 内核 | `src/svg/Line.ts` | SVG 领域模型 | 71 / 12 | — |
| 内核 | `src/svg/Rect.ts` | SVG 领域模型 | 69 / 12 | — |
| 内核 | `src/svg/Shape.ts` | SVG 领域模型 | 147 / 34 | 160 / 38 |
| 内核 | `src/svg/Text.ts` | SVG 领域模型 | 68 / 14 | — |
| VS Code 扩展 | `vscode-svg/package.json` | 包与扩展声明 | — | 38 / 0 |
| VS Code 扩展 | `vscode-svg/src/SvgDocumentSymbolProvider.ts` | VS Code 文件装饰与大纲 | — | 30 / 7 |
| VS Code 扩展 | `vscode-svg/src/SvgFileDecorationProvider.ts` | VS Code 文件装饰与大纲 | — | 41 / 10 |
| VS Code 扩展 | `vscode-svg/src/SvgOutlineParser.ts` | VS Code 文件装饰与大纲 | — | 52 / 8 |
| VS Code 扩展 | `vscode-svg/src/extension.ts` | VS Code 文件装饰与大纲 | — | 15 / 1 |
