# CLI 回放会话

在仓库根目录运行 `npm test`。首次运行前用 `npm ci` 安装依赖。

## Phase 1

| 输入 | 检查内容 |
| --- | --- |
| `cli-1.txt` | 题面 §6 的会话。检查树输出、撤销重做、保存、读入和缺少 ID 的警告。 |
| `flowchart-phase1.txt` | §6.1 版本 A。检查 `in` 嵌套、容器整体移动、中文文本和 SVG 保存。 |
| `phase1-commands.txt` | 补测 `help`、`canvas`、`show`、`scale`、`addto`、`front`、`back` 和 `ungroup`。读入失败后仍可重做，成功读入后旧历史清空。 |

读入所需的 SVG 放在 `input/`，预期标准输出和保存的 SVG 放在 `expected/`。每个会话在独立的临时目录运行，测试检查退出状态和标准错误，并逐字节比较输出与 SVG。

基线来自编译后的 `phase1-final`（`d1e8578d5f42276c8b7734821cda6233f672645c`），对应 Phase 2 题面中的 `final`。版本 A 的树缩进和 `stroke=black` 以该版本的实测结果为准。测试用 `--no-plugins` 和空插件配置分别回放。会话通过管道输入，输出含启动横幅。TXT 和 SVG 文件使用 LF 行尾。

## Phase 2 命令插件

`command-plugins.txt` 检查打开文档前的 `dir`、空画布和嵌套图形的 `stats`、撤销重做以及从子目录读入 SVG。测试在同一个临时目录回放两种装配方式，目录内的 `other.svg` 取自 `input/other.svg`。`expected/command-plugins.stdout.txt` 记录了排序结果和读入后的历史锁。

## Phase 2 复合图形

`flowchart-box.txt` 回放 §6.1 版本 B，检查创建、分组、整体移动、属性设置、树标签和保存。两种装配都与 `expected/flowchart-box.modified-star.stdout.txt` 比较，关闭星号时使用 `expected/flowchart-box.stdout.txt`。两种设置保存的结果都与 `expected/flowchart-box.svg` 相同。预期输出包含全树对齐和连线的 `stroke=black`。
