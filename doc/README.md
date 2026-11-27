# SVG 编辑器 CLI（Lab1 Phase 1）

**作者**：23300220005 许颖忱

**云端仓库地址**：https://github.com/HydrogenC/SoftwareDesignPJ1

在 REPL 中创建和编辑 SVG 图形，支持分组、树形查看、SVG 读写以及 undo/redo。

## 架构方案

### 模块划分

| 目录 | 职责 |
| --- | --- |
| `src/svg/` | 领域模型。`Shape` 定义 id、变换、属性、渲染和 SVG 序列化接口；`Container` / `Group` / `Document` 实现复合结构；叶子类只处理自己的几何。`EditorError` 是统一业务异常。 |
| `src/registry/` | `ShapeFactory` 负责“类型名 → 图形类”。CLI 创建和 SVG 读入共用它，但参数来源不同，因此分为 `create` 与 `fromSvg` 两条入口。 |
| `src/io/` | `SvgReader` / `SvgWriter`。容错解析、缺 id 补全与警告、属性转换、转义和落盘都在这里；`node:fs` 只出现在这一层。 |
| `src/commands/` | 一个命令一个 `Command` 子类，自带 `execute` 和逆操作。`CommandContext` 持有当前文档、路径及注入的 factory / reader / writer / tree 渲染函数。 |
| `src/cli/` | 交互外壳：`LineParser` 拆行，`CommandRouter` 按命令名构造对象，`CommandHistory` 管 undo/redo 栈和 IO 锁，`TreeFormatter` 排版，`Repl` 读写终端。 |
| `src/index.ts` | 唯一的组装点，把共享 factory 和各层对象接起来。 |

![模块依赖图](architecture.png)

图源：[architecture.puml](architecture.puml)

### 设计模式

**Command（规范要求）**。所有编辑、显示和文档命令都继承 `Command`，由子类实现 `execute()` 和 `undo()`，`redo()` 默认重新执行。基类用 `kind`、`resetsHistory`、`locksHistory` 描述命令类别，`CommandHistory` 只根据这些元信息压栈、清栈和上锁。undo 的语义跟着命令走，历史层不需要知道 `move` 和 `group` 的差别。

**Composite**。`Shape` 是统一接口，`Container` 递归处理子节点，`Group` 和 `Document` 都是容器。`move` / `scale` / `set` / `delete` 对叶子和容器一视同仁；能否收子看 `asContainer()`，遍历看 `children`，没有 `instanceof` 或按 tag 的分支。

**Factory 与两处按名分派**。`ShapeFactory` 把类型名映射到类，CLI 和 SVG 读入都走它。规范允许的两处按名分派就是 `CommandRouter` 的命令表和 `ShapeFactory` 的类型表，其余地方靠多态，例如每种图形自己拼几何属性和 SVG 属性。

**Template Method 与依赖注入**。`Command` 基类负责参数检查、数字解析和回显格式，子类只写业务；`SvgReader` 接收 `ShapeFactory`，`CommandContext` 接收 reader/writer/factory/renderTree，`Repl` 接收 router，对象统一在 `index.ts` 组装。

### 依赖方向

允许的依赖：

- `svg/`：只依赖自身。
- `registry/` → `svg/`。
- `io/` → `svg/`、`registry/`（只有 reader 需要工厂建形状）。
- `commands/` → `svg/`、`registry/`、`io/`（io 仅在 `CommandContext` 里作为注入的服务类型出现）。
- `cli/` → `commands/`、`svg/`。
- `index.ts` → 以上全部。

禁止反向依赖和循环：`svg/` 不能依赖 `registry/`、`io/`、`commands/`、`cli/`；`registry/` 和 `io/` 不能依赖 `commands/`、`cli/`；`commands/` 不能依赖 `cli/`。这样领域模型不受 IO 和交互方式影响，换解析器时不用动模型和命令。

`CommandRouter` 的命令表和 `ShapeFactory` 的类型表已标注为待重构：前者后续可改为注册表，后者在插件阶段改为外部注册 `ShapeProvider`。

### 变化点假设

1. **新增图形类型（包括后续的 `box` 插件）**：加一个 `Shape` 子类和一条工厂表项，命令层不用改。工厂表目前硬编码，没有提前做插件注册，因为本阶段没有插件生命周期和加载顺序的要求。
2. **新增命令或别名**：加一个 `Command` 子类和一条路由表项。命令数量还少，集中表比元数据驱动更直观；等别名、权限或参数差异多起来再抽注册表。
3. **SVG 格式或解析容忍度变化**：只改 `io/`。模型和命令只认 `Document` / `Shape`，不碰 XML。
4. **撤销模型变化**：目前是“每个命令自带逆操作”。如果以后出现难以逆运算的批量操作，会在该命令内部用 Memento 保存必要状态，而不是把历史层改成全量快照；全量快照更占内存，也会让命令语义变模糊。
5. **属性集合或展示格式扩展**：`set` 白名单和展示逻辑分散在各图形类里。属性少时这样改动局部、也符合多态；如果属性或输出格式明显增多，再考虑属性 schema 或 visitor，现在不提前抽象。
6. **寻址方式**：id 是规范确定的契约，没有为结构路径寻址留接口。真要做会波及所有命令，现阶段不值得预埋。

## 过程记录

- 先出架构、我审核，再分层实现，没有让 AI 一口气生成整个项目。开工前 AI 把关键设计点列成决策清单（`Shape` 基类的职责边界、Composite 的公共原语、命令与历史的划分、模块划分、tree/show 展示口径），我逐条审核；前四项确认后才进入编码，展示口径一项授权 AI 自行决定。
- 模块划分来回过一轮：AI 给出分层方案（`app/` 编排 + `repl/` 交互）和合并方案，我选了合并——`app/` 实际只会做几行转发，合并进 `cli/` 后由 `index.ts` 装配。方案在开工前定稿。
- 实现按依赖拓扑自底向上分层推进：`svg/` 基类与叶子类 → `Container` / `Document` 原语 → `commands/` → `cli/` 组装。每完成一层先停下来审核（例如“审核通过，请继续实现 svg/ 包下的其他子类”），确认后才进入下一层。
- git 历史按同样节奏分成四次提交（脚手架、svg 基类、命令类、CLI 与组装），没有一次性大提交。
- 每层都配合编译和回放验证。AI 产出里被查出过几处问题：`exactOptionalPropertyTypes` 下不能给可选字段赋 `undefined`，绘制属性改成显式 `string | undefined`；`SvgReader` 构造函数漏传 `ShapeFactory`；`GroupCommand` / `UngroupCommand` 有 import 和类型引用问题。都是编译期发现并修掉的。
- 回放规范第 6 节的组合命令时，`addto node1` 一度报找不到 node1。追查后是脚本前面的 `ungroup` + `redo` 先把 node1 删掉了，不是实现问题；组合场景的验证脚本本身也要审查。

## 一致性自查

1. **模块划分**：实际目录为 `svg/`、`registry/`、`io/`、`commands/`、`cli/` 和 `index.ts`，与最终方案一致。实施前有过一次模块合并（`app/` + `repl/` → `cli/`），已记入修订记录。
2. **依赖方向**：抽查了各目录的 import。`svg/` 没有对外依赖；`node:fs` 只在 `io/`；`commands/` 没有 import `cli/`；没有发现循环依赖。`io/SvgReader` 依赖 `registry/ShapeFactory` 是设计内的，用来在解析时创建具体图形，不算违反方向规则。
3. **按名分派**：只有 `CommandRouter` 和 `ShapeFactory` 两处，已在架构方案中标注为待重构；其他地方没有按 tag 的 switch。
4. **修订记录**：
   - 模块方案：`app/`、`repl/` 合并为 `cli/`，装配集中到 `index.ts`。原因：少一层纯转发。
   - 展示口径：tree/show 输出全部已设置的绘制属性，与规范中一处手写样例不同。原因：保持同一显示规则。

## 质量保证手段

- 静态检查与构建：`npm run typecheck`、`npm run build` 均通过。TypeScript 启用了 `strict`、`noUncheckedIndexedAccess`、`noImplicitOverride`、`exactOptionalPropertyTypes`；编译产物也用 `node dist/index.js` 实际启动过。
- 规范回归：把规范第 6 节的完整对话逐条回放，对照 banner、tree 对齐、命令回显、undo/redo 结果和 save 后的历史锁，输出与题面一致。
- 组合与边界场景：覆盖了 group 跨父节点、ungroup/addto/front/back 的撤销、canvas 改尺寸后的锁、read 缺 id 的自动编号与警告、未知标签跳过、实体转义、save/read 往返，以及文档中列出的错误消息。
- 可视验证：生成了 `examples/minimal.svg`、`examples/demo.svg`、`examples/flowchart.svg`，用浏览器打开确认结构正确。
- Phase 1 回归基线可用 `npm test` 自动验证。会话、输入 SVG 和预期输出均已固化在 [doc/transcript](transcript/README.md)。

## Phase 2 · VS Code SVG 扩展

### 构建和启动

在安装了 Node.js、npm 和 VS Code 的环境中，从仓库根目录运行以下命令。`code` 需在 PATH 中。

```sh
npm --prefix vscode-svg ci
npm --prefix vscode-svg run build
code "--extensionDevelopmentPath=$PWD/vscode-svg" "$PWD/vscode-svg/demo"
```

在 Extension Development Host 的 Explorer 中打开 [example.svg](../vscode-svg/demo/example.svg)，展开下方的 Outline。扩展默认将 `.svg` 关联到文本编辑器，VS Code 中显式设置的用户或工作区关联优先。如果工作区把 SVG 关联到 Image Preview，可将 `workbench.editorAssociations` 中的 `"*.svg"` 设为 `"default"`，让打开文件和大纲跳转都使用文本编辑器。[VS Code 默认设置](https://code.visualstudio.com/docs/reference/default-settings)

### 在真实 VS Code 中验收

使用 VS Code 1.103.2。实现前在原生 Outline 中观察到 `Shape.ts` 的 `Point` 下列出字段，点击 `x` 跳到声明；默认环境打开 SVG 源码时，大纲显示没有符号。

| 操作 | 实际结果 |
| --- | --- |
| 查看 Explorer | 只有 `example.svg` 显示 `[]`，`folder.svg` 目录和 `plain.txt` 无标记。示例 SVG 的名称和磁盘内容保持原样。[文件标记截图](images/vscode-svg-badge.jpg) |
| 展开 Outline，点击 `rect#start` | 显示根 `svg`、`g#flowchart`、`g#entry` 和其下的 `rect#start`、`text`。点击矩形后光标跳到第 5 行第 8 列的标签名。[源码定位截图](images/vscode-svg-outline.jpg) |
| 在编辑器把 `id="start"` 改为 `id="begin"` | 未保存时，大纲已更新为 `rect#begin`。[编辑刷新截图](images/vscode-svg-outline-updated.jpg) |
| 暂时删除末尾 `</svg>` 的 `>`，再撤销 | 不完整时大纲清空，撤销后重新显示完整树，编辑器仍可继续操作。[不完整 XML 截图](images/vscode-svg-outline-incomplete.jpg) |

`npm --prefix vscode-svg test` 运行解析测试，覆盖嵌套、无 id 节点、UTF-16 源码偏移以及不完整 XML 后重新解析。真实宿主测试还会从 VS Code 请求符号，验证默认文本编辑器、未保存编辑后的符号刷新和文件类型。下面是 PowerShell 下的运行命令，使用独立测试配置目录。

```powershell
$svgTestProfile = Join-Path ([IO.Path]::GetTempPath()) "svg-outline-test-$([guid]::NewGuid())"
code --user-data-dir "$svgTestProfile" --extensions-dir "$svgTestProfile/extensions" --verbose "--extensionDevelopmentPath=$PWD/vscode-svg" "--extensionTestsPath=$PWD/vscode-svg/test/extension-host.cjs"
```

测试成功时，日志显示 `SVG Extension Host assertions passed`，宿主退出码为 0。

### 宿主、接口与对象职责

- **注册与回调。** VS Code 在启动完成后调用扩展的 `activate`。扩展把两个 provider 和注册返回的 `Disposable` 加入 `context.subscriptions`，由宿主管理释放。渲染文件项时，VS Code 通过 `FileDecorationProvider` 请求装饰。打开或者编辑匹配的文本时，原生大纲通过 `DocumentSymbolProvider` 请求符号。层级展示、展开和点击后的跳转由 VS Code 负责。[VS Code 扩展 API](https://code.visualstudio.com/api/references/vscode-api)
- **Decorator。** VS Code 把原有文件项和 provider 返回的 `FileDecoration` 元数据组合起来渲染。标记提供方只读取文件类型，返回额外的徽标。经典 Decorator 和被包装对象实现相同的组件接口，可通过层层包裹参与原操作。这里文件项仍由宿主持有，provider 实现的是独立的回调接口，装饰发生在宿主的渲染阶段。
- **Adapter。** `FileDecorationProvider` 是宿主需要的接口，`workspace.fs.stat` 是现成的文件元数据服务，`SvgFileDecorationProvider` 把 URI 和文件类型适配为 `FileDecoration`。同样，`SvgDocumentSymbolProvider` 组合 `SvgOutlineParser`，把解析结果和源码偏移转换为 `DocumentSymbol` 的父子关系、完整范围和标签名定位范围。

### Phase 1 复用评估

[SvgReader](../src/io/SvgReader.ts) 的内部 XML 解析器能识别嵌套，但需要抽取为独立模块并增加源码偏移，才能用于原生大纲。扩展采用独立的 Saxes 解析器来保留 XML 层级和位置。CLI 读回的 `#fill` 会跳过未注册的图形并给无 id 元素补 id。大纲直接展示源码中的元素，并保留它们的 id 缺失状态，因此与编辑器的 `Document`、`Shape` 模型分开。两者都沿有序子节点构造层级。CLI [TreeFormatter](../src/cli/TreeFormatter.ts) 输出含分支线与对齐的字符串，大纲则需要原生 `DocumentSymbol` 树和源码范围。

### AI 建议检查记录

初版根据 API 设计了 `DocumentSymbol.selectionRange` 并通过宿主测试，但实际点击原生大纲时打开了 VS Code 的 SVG 图片预览。根据界面结果修正扩展清单，由扩展贡献 SVG 的文本编辑器默认关联。随后在宿主测试中加上默认编辑器检查，并在界面重新点击 `rect#start` 确认跳到源码。
