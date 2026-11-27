# Phase 1 CLI 回归基线

在仓库根目录执行 `npm test`。首次运行前用 `npm ci` 安装依赖。

| 输入会话 | 覆盖范围 |
| --- | --- |
| [cli-1.txt](cli-1.txt) | Phase 1 §6 典型会话，含树输出、撤销与重做、保存、读入和缺失 ID 警告。 |
| [flowchart-phase1.txt](flowchart-phase1.txt) | Phase 1 §6.1 版本 A，覆盖 `in` 嵌套、容器整体移动、中文文本与 SVG 保存。 |
| [phase1-commands.txt](phase1-commands.txt) | 补齐 `help`、`canvas`、`show`、`scale`、`addto`、`front`、`back`、`ungroup`，并检查历史锁、失败读入后仍可重做、成功读入后历史清空。 |

[`input/`](input/) 存放读入用的 SVG。[`expected/`](expected/) 存放各会话的标准输出和保存生成的 SVG。测试为每个会话创建独立的临时工作目录，检查退出状态、标准错误，以及输出与 SVG 的逐字节一致性。

预期文件从 Git 标签 `phase1-final`（`d1e8578d5f42276c8b7734821cda6233f672645c`）导出并编译后实测采集。Phase 2 题面用 `final` 指代该基线。§6.1 版本 A 的树缩进对齐和 `stroke=black` 以实际回放结果为准。会话使用管道输入，输出包含启动横幅。仓库固定这些文本和 SVG 的行尾为 LF。

## Phase 2 命令插件会话

[command-plugins.txt](command-plugins.txt) 覆盖未初始化时的 `dir`、空画布和嵌套图形的 `stats`、撤销和重做，以及从子目录读入 SVG。[预期标准输出](expected/command-plugins.stdout.txt)包含 `dir` 的排序结果和 `read` 后的历史锁回显。测试在同一个固定临时目录下分别用代码和配置装配回放，子目录里的 `other.svg` 来自 [input/other.svg](input/other.svg)，标准输出由测试进程从管道采集。

## Phase 2 复合图形会话

[flowchart-box.txt](flowchart-box.txt) 复现 Phase 1 §6.1 版本 B，覆盖节点创建、分组、整体移动、属性处理、树标签和保存。默认的 [双标签输出](expected/flowchart-box.modified-star.stdout.txt) 用于两种装配的逐字节比较。[仅启用 box 时的输出](expected/flowchart-box.stdout.txt) 用于单独禁用星号的回归验证。两者生成同一份 [SVG](expected/flowchart-box.svg)。预期树沿用 CLI 的全树对齐和绘制属性显示，因此连线行包含 `stroke=black`。
