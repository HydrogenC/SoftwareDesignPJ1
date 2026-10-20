# SVG 编辑器 CLI（Lab1 Phase 1）

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

- 先定 `Shape` 基类的职责，再按依赖顺序从 `svg/` 往上实现。Composite 的 `attach` / `asContainer` / `anchor` 是在写命令前敲定的，避免后面在命令里到处做强转和类型判断。
- 讨论模块方案时，最初考虑过拆 `app/`（流程编排）和 `repl/`（交互）；评估后发现 `app/` 只会做几行转发，决定合并进 `cli/`，由 `index.ts` 装配。这个修订在实施前完成，最终目录与上文一致。
- 展示口径做过一次取舍：规范里手写的 tree/show 样例没有列全已设置的绘制属性。我选择统一输出全部已设置属性，保证同类图形显示规则一致；这是有意偏差，记在修订记录里。
- 类型检查抓到过几个问题：`exactOptionalPropertyTypes` 下不能给可选字段赋 `undefined`，绘制属性改成显式 `string | undefined`；`SvgReader` 的构造函数需要 `ShapeFactory`，最初漏传，后来在 `index.ts` 共享同一个工厂；`GroupCommand` / `UngroupCommand` 也有 import 和类型引用问题。都是编译期发现并修掉的。
- 回放组合命令时，`addto node1` 一度报找不到 node1。追查后是脚本前面的 `ungroup` + `redo` 先把 node1 删掉了，不是实现问题。组合场景不能只看单条命令是否成功。

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
- 局限：没有引入自动化测试框架，回归目前靠脚本化 REPL 回放和人工比对。当前命令集不大还能接受；如果继续加插件和命令，下一步应该补命令级集成测试。
