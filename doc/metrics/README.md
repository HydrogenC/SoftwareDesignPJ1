# 指标口径

`scripts/cli-metrics.mjs` 从 Git 读取 `src/` 内的 TypeScript、插件清单和根目录的插件配置。`src/index.ts`、`src/host/` 和插件配置归入装配处，`src/plugins/` 归入插件，其余 CLI 文件归入内核。VS Code 扩展的源码和清单单列。样例、测试、锁文件、依赖和构建产物不计入。

行数包含空行和注释。脚本用 Babel 解析 TypeScript，每个有实现的函数或方法计 1，再计入条件、循环、`catch`、三元表达式、逻辑运算和非默认 `case`。模块顶层只计分支，JSON 的圈复杂度为 0。

`final.md` 比较 `phase1-final` 和 `3964c4b`。前者对应题面中的 `final`，后者是 Phase 2 运行代码所在的提交。打上 `p2` 后，可从仓库根目录按标签重新生成。

```sh
npm run metrics -- phase1-final p2 doc/metrics/final.md
```

脚本接受提交或标签。框架完成时的首份报告可用 `git show 9e872c3:docs/metrics/framework.md` 查看。
