import { parse } from '@babel/parser';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const groups = ['内核', '装配处', '插件', 'VS Code 扩展'];
const functions = new Set([
  'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
  'ClassMethod', 'ClassPrivateMethod', 'ObjectMethod',
]);
const branches = new Set([
  'IfStatement', 'ForStatement', 'ForOfStatement', 'ForInStatement', 'WhileStatement',
  'DoWhileStatement', 'CatchClause', 'ConditionalExpression', 'LogicalExpression',
]);
const moduleRoles = [
  ['src/plugins/builtin/commands/', '内置命令与逆操作'],
  ['src/plugins/builtin/shapes/', '内置图形模型'],
  ['src/plugins/builtin/', '内置插件声明与注册'],
  ['src/plugins/', '可选插件'],
  ['src/host/', 'CLI 装配与插件加载'],
  ['src/extensions/', '扩展点契约、注册表与属性事务'],
  ['src/commands/', '命令协议与会话状态'],
  ['src/cli/', '终端交互、分发、历史或树渲染'],
  ['src/registry/', '图形构造与反序列化分发'],
  ['src/io/', 'SVG 读写'],
  ['src/svg/', 'SVG 领域模型'],
  ['vscode-svg/src/', 'VS Code 文件装饰与大纲'],
];
const fileRoles = {
  'src/index.ts': 'CLI 入口与组合根',
  'src/api.ts': '插件公开 API',
  'plugins.config.json': '可选插件清单',
  'src/cli/CommandHistory.ts': '编辑执行、撤销重做与 IO 锁',
  'src/cli/CommandRouter.ts': '按注册名分发命令',
  'src/cli/LineParser.ts': 'CLI 语句分词与引号',
  'src/cli/Repl.ts': '交互循环和错误输出',
  'src/cli/TreeFormatter.ts': '树结构排版与行尾标签',
  'src/host/PluginHost.ts': '激活、清单验证和注册事务',
  'src/host/PluginConfigLoader.ts': '配置验证、模块解析与动态导入',
  'src/host/createEditor.ts': '构建 CLI 会话及服务',
  'src/extensions/AttributeEdit.ts': '属性分派、事务记录与恢复',
  'src/io/SvgReader.ts': '解析 SVG、分配 ID 和构造子树',
  'src/io/SvgWriter.ts': '输出 SVG 和文件写入',
  'src/svg/Document.ts': '画布、节点索引和结构编辑',
  'src/plugins/stats/StatsPlugin.ts': '注册命令并按类型统计叶子和容器',
  'src/plugins/dir/DirPlugin.ts': '注册目录命令并排序、格式化条目',
  'src/plugins/dir/DirectoryAccess.ts': '目录访问契约与 Node.js 文件系统适配器',
  'src/plugins/box/Box.ts': '复合图形模型与子部件结构约束',
  'src/plugins/box/BoxPlugin.ts': '框体创建与读回、属性处理和类型标签',
  'src/plugins/modified-star/ModifiedStarPlugin.ts': '保存基准与树行未保存标记',
  'vscode-svg/package.json': '扩展激活条件与 SVG 编辑器默认关联',
  'vscode-svg/src/extension.ts': '注册两项扩展能力并管理订阅',
  'vscode-svg/src/SvgFileDecorationProvider.ts': '识别 SVG 文件并返回 Explorer 徽标',
  'vscode-svg/src/SvgDocumentSymbolProvider.ts': '转换解析结果为带源码范围的大纲节点',
  'vscode-svg/src/SvgOutlineParser.ts': '解析 XML 层级并记录源码位置',
};

function git(args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function group(path) {
  if (path.startsWith('vscode-svg/')) return 'VS Code 扩展';
  if (path.startsWith('src/plugins/')) return '插件';
  if (path === 'src/index.ts' || path === 'plugins.config.json' || path.startsWith('src/host/')) return '装配处';
  return '内核';
}

function role(path) {
  if (Object.hasOwn(fileRoles, path)) return fileRoles[path];
  if (path.endsWith('package.json')) return '包与扩展声明';
  return moduleRoles.find(([prefix]) => path.startsWith(prefix))?.[1] ?? 'CLI 源码';
}

function complexity(source) {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript'] });
  function count(node) {
    if (Array.isArray(node)) return node.reduce((sum, item) => sum + count(item), 0);
    if (typeof node?.type !== 'string') return 0;
    const decision = branches.has(node.type) || (node.type === 'SwitchCase' && node.test !== null);
    const here = Number(functions.has(node.type)) + Number(decision);
    return here + Object.values(node).reduce((sum, child) => sum + count(child), 0);
  }
  return count(ast);
}

function measure(tree) {
  const paths = git(['ls-tree', '-r', '--name-only', '-z', tree, '--', 'src', 'vscode-svg/src', 'vscode-svg/package.json', 'plugins.config.json']).split('\0');
  return paths.filter(path => path.endsWith('.ts') || path.endsWith('/package.json') || path === 'plugins.config.json')
    .map(path => {
      const source = git(['show', `${tree}:${path}`]);
      return {
        path, group: group(path), role: role(path),
        lines: source === '' ? 0 : source.replace(/\r?\n$/, '').split('\n').length,
        cc: path.endsWith('.ts') ? complexity(source) : 0,
      };
    });
}

function delta(before, after) {
  const change = after - before;
  return change > 0 ? `+${change}` : String(change);
}

function report(beforeRef, afterRef) {
  const before = measure(git(['rev-parse', `--verify`, `${beforeRef}^{tree}`]).trim());
  const after = measure(git(['rev-parse', '--verify', `${afterRef}^{tree}`]).trim());
  const lines = [
    '# CLI 重构指标',
    '',
    `基线 \`${beforeRef}\`，目标 \`${afterRef}\`。`,
    '',
    '| 分类 | 基线行数 | 目标行数 | 增量 | 基线圈复杂度 | 目标圈复杂度 | 增量 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const name of [...groups, 'CLI 合计']) {
    const include = file => name === 'CLI 合计' ? file.group !== 'VS Code 扩展' : file.group === name;
    const sum = (files, field) => files.filter(include).reduce((total, file) => total + file[field], 0);
    const beforeLines = sum(before, 'lines');
    const afterLines = sum(after, 'lines');
    const beforeCc = sum(before, 'cc');
    const afterCc = sum(after, 'cc');
    lines.push(`| ${name} | ${beforeLines} | ${afterLines} | ${delta(beforeLines, afterLines)} | ${beforeCc} | ${afterCc} | ${delta(beforeCc, afterCc)} |`);
  }
  lines.push('', '## 运行文件与职责', '', '| 分类 | 文件 | 职责 | 基线行数 / 圈复杂度 | 目标行数 / 圈复杂度 |', '| --- | --- | --- | ---: | ---: |');
  const oldFiles = new Map(before.map(file => [file.path, file]));
  const newFiles = new Map(after.map(file => [file.path, file]));
  const metric = file => file ? `${file.lines} / ${file.cc}` : '—';
  for (const path of [...new Set([...oldFiles.keys(), ...newFiles.keys()])].sort()) {
    const file = newFiles.get(path) ?? oldFiles.get(path);
    lines.push(`| ${file.group} | \`${path}\` | ${file.role} | ${metric(oldFiles.get(path))} | ${metric(newFiles.get(path))} |`);
  }
  return lines.join('\n') + '\n';
}

const [before = 'phase1-final', after = 'p2', output] = process.argv.slice(2);
const result = report(before, after);
if (output === undefined) process.stdout.write(result);
else writeFileSync(output, result);
