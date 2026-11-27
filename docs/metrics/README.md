# 指标口径

[生成脚本](../../scripts/cli-metrics.mjs)读取 Git 树中的文件。运行文件包含 `src/` 下的 TypeScript 和插件清单，以及根目录的可选插件配置。Phase 1 的 `src/index.ts` 归入装配处，其余 Phase 1 运行代码归入内核。Phase 2 的 `src/host/` 归入装配处，`src/plugins/` 归入插件。VS Code 扩展的 TypeScript 和清单单列。样例、测试、锁文件、依赖目录及构建产物均排除。

行数含空行与注释。圈复杂度通过 TypeScript AST 统计。每个具体函数或方法起始值为 1，加上条件、循环、`catch`、三元表达式、逻辑运算及每个非默认 `case`。模块顶层仅计分支。JSON 的圈复杂度为 0。

在仓库根目录用以下命令生成 [M2 首份报告](framework.md)。`--worktree` 通过临时 Git 索引创建候审文件树，仓库的暂存区保持原样。

```sh
npm run metrics -- phase1-final --worktree docs/metrics/framework.md
```

也可以传入提交哈希或标签。最终交付时传入 `phase1-final` 和 `p2`。已有基线标签的名称是 `phase1-final`。
