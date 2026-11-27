# Phase 2 迭代报告

![Phase 1 到 Phase 2 的 CLI 架构对比](architecture-comparison.png)

[对比图 PlantUML 源文件](architecture-comparison.puml) · [Phase 1 模块图源文件](architecture.puml) · [Phase 2 模块图源文件](architecture-phase2.puml)

## 架构变化

Phase 1 的命令路由和图形工厂各持有一张内置类型表。Phase 2 把这些实现移到内置插件。CLI 宿主把代码或配置选定的插件送入同一条注册流程，核验清单后提交。命令路由、图形工厂、树渲染和属性事务通过注册表调用实现。入口文件保留代码装配名单，配置加载器只解析模块路径和清单。

四个扩展点实际承担了不同的工作。`stats` 通过命令扩展点遍历领域模型，`dir` 通过目录访问适配器读取当前目录。`box` 组合矩形和文本，通过属性处理器把设置纳入同一次撤销事务。两个树标签各自读取不可变视图，树渲染器按注册顺序追加标签。

内置实现移入插件后，内核的行数和圈复杂度均下降。新增的可选能力和注册、校验、回滚等机制增加了 CLI 的总量。最终报告按内核、装配处和插件给出文件职责与计数，VS Code 扩展单列。[最终指标](../docs/metrics/final.md) · [计数口径](../docs/metrics/README.md)

## 装配差异复核

以 `8844109` 为基线、`401e9d6` 为 `box` 接入来源，可用下列命令建立两份独立的复验工作树。代码方式只取新增插件目录和 `src/index.ts`，配置方式只取新增插件目录和 `plugins.config.json`。

```sh
git worktree add --detach ../box-code-demo 8844109
git worktree add --detach ../box-config-demo 8844109
git -C ../box-code-demo restore --source 401e9d6 --staged --worktree -- src/index.ts src/plugins/box
git -C ../box-config-demo restore --source 401e9d6 --staged --worktree -- plugins.config.json src/plugins/box
git -C ../box-code-demo diff --cached --name-status
git -C ../box-config-demo diff --cached --name-status
git -C ../box-code-demo diff --cached --exit-code -- src ':(exclude)src/index.ts' ':(exclude)src/plugins/box'
git -C ../box-config-demo diff --cached --exit-code -- src ':(exclude)src/plugins/box'
```

两份复验版本分别构建后，在相同初始目录回放版本 B 会话。标准输出和保存的 SVG 与原 `box` 基线逐字节一致。最终仓库的默认代码与配置装配还共同加载 `modified-star`，对应双标签版本的基线。[会话及预期输出](transcript/README.md)

从框架节点 `9e872c3` 到标签节点 `3964c4b` 检查运行文件，新增插件目录之外的变化集中在 `src/index.ts` 和 `plugins.config.json`。`package.json` 在命令插件节点增加 `precli`，使 `npm run cli` 使用编译入口，避免宿主和插件分别加载不同的 `Command` 基类。

收尾时从 `package.json` 和锁文件移除了切换到编译入口后闲置的 `tsx` 开发依赖。

## 交付验收

| 范围 | 验收结果 |
| --- | --- |
| Phase 1 兼容性 | 禁用可选插件后，三份会话的标准输出和保存的 SVG 与 `phase1-final` 基线逐字节一致。 |
| Phase 2 CLI | 36 项测试通过，覆盖目录替身和真实适配器、双装配回放、加载失败与注册回滚、复合图形约束和标签状态。 |
| VS Code | 3 项解析测试和真实 Extension Development Host 测试通过。另在 VS Code 1.103.2 中复验文件徽标、源码定位、未保存编辑刷新以及不完整 XML 后恢复。 |

CLI 和 VS Code 扩展分别在从 Git 导出的干净目录运行 `npm ci` 和 `npm test`，使用 Node.js 26.13.1 与 npm 11.20.0。[扩展操作与截图](README.md#在真实-vs-code-中验收) · [扩展点清单和启动方式](README.md#phase-2--cli-插件框架) · [设计决策](cli-plugin-adr.md)
