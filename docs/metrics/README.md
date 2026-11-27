# 指标口径

[生成脚本](../../scripts/cli-metrics.mjs)读取 Git 树中的文件。运行文件包含 `src/` 下的 TypeScript 和插件清单，以及根目录的可选插件配置。Phase 1 的 `src/index.ts` 归入装配处，其余 Phase 1 运行代码归入内核。Phase 2 的 `src/host/` 归入装配处，`src/plugins/` 归入插件。VS Code 扩展的 TypeScript 和清单单列。样例、测试、锁文件、依赖目录及构建产物均排除。

行数含空行与注释。圈复杂度通过 TypeScript AST 统计。每个具体函数或方法起始值为 1，加上条件、循环、`catch`、三元表达式、逻辑运算及每个非默认 `case`。模块顶层仅计分支。JSON 的圈复杂度为 0。

仓库的 Phase 1 基线标签是 `phase1-final`，对应题面中的 `final`。[指标报告](final.md)使用当前 Phase 2 运行源码所在的提交 `3964c4b` 生成。打上最终标签后，在仓库根目录用以下命令按标签重新生成。

```sh
npm run metrics -- phase1-final p2 docs/metrics/final.md
```

脚本接受两个 Git 提交或标签。框架完成时的首份报告可用 `git show 9e872c3:docs/metrics/framework.md` 查看。
