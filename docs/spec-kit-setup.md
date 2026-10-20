# SOLBRIDGE CRM Spec Kit 接入记录

日期：2026-10-19。仅工具与文档接入，无业务开发、迁移、数据库连接或部署。

## 开发入口与边界

推荐后续唯一 CRM Git 入口：`/Users/yan/codex/solbridge工作流/crm-preview`。
分支 `main`，HEAD `a6122e5dfe657074c1700715e206e3754a53e41f`，为主工作树；
本轮没有提交、切分支、stash、合并或清理原有修改。
此处有更新的 V0.6.1 实现，且相邻后端复用此处 model，优先于旧模拟工作树。

- 父目录 `/Users/yan/codex/solbridge工作流` 自身无 Git；其 Next.js 建联工具不在本轮范围。
- 后端 `/Users/yan/codex/solbridge工作流/crm-backend` 不在 CRM Git 根内，版本管理方式待定。
- 项目镜像 `/Users/yan/.codex/.chatgpt-projects/g-p-6aafb09413008191bd4a1636f21a6109` 是聊天材料目录。
- 独立工作树位于镜像下 `video-delivery-worktree`，分支 `frontend/video-delivery-v06`，HEAD 同上；
  包含独立模拟视频交付，不等同于主工作副本的 V0.6.1。保留不动。
- 同一份《项目现状与需求说明》从镜像同步到本仓库 docs；后续以本仓库版本维护，镜像旧版保留作历史。

## 四项验证状态

| 项目 | 结果与依据 |
|---|---|
| CLI 可用 | 已验证。`./scripts/specify version`：1.2.1 / Python 3.12.15 / Darwin arm64。系统 PATH 未改，使用项目入口或绝对路径 |
| 项目初始化 | 已完成。`integration status --json` 返回 ok，默认 codex，缺失文件 0、非法路径 0；10 个技能文件和共享模板/脚本存在 |
| 当前会话技能识别 | 文件已安装，可显式读取并执行；本轮实际读取 constitution 技能并完成流程。当前会话系统提供的 Available skills 清单未出现 speckit-*，不能声称已自动识别；且聊天 cwd 是父目录。须在 CRM Git 根新开会话或重载客户端，检查技能选择器是否出现这些名称；未验证此 UI 结果 |
| 项目原则 | 已填写 1.0.0，五项原则及治理章节，无未替换占位符。模板解析成功；无 extensions.yml hooks；仅修改项目 constitution，未改官方模板 |

## 版本、来源与安装位置

- 官方稳定版本：Spec Kit / specify-cli **1.2.1**，对应 GitHub release `v1.2.1`（非预发布）。
- 渠道：官方支持的 PyPI 包 `specify-cli==1.2.1`。先尝试固定 tag GitHub 源码安装，拉取无进展后中止，
  改用相同版本的官方 PyPI 渠道，成功安装；不是把工具默认版本当作来源证明。
- uv **0.13.1**：`/Users/yan/codex/solbridge工作流/.crm-devtools/bootstrap/bin/uv`。
- specify：`/Users/yan/codex/solbridge工作流/.crm-devtools/bin/specify`。
- 工具环境：父目录 `.crm-devtools/uv-tools/specify-cli`；托管 Python：`.crm-devtools/python`；
  缓存 `.crm-devtools/cache`。与 CRM Node 依赖隔离，不改 shell 配置，不在生产安装。
- 项目入口：`/Users/yan/codex/solbridge工作流/crm-preview/scripts/specify`。
- 集成：`.agents/skills/`、`.specify/integration.json`、`init-options.json` 及 integrations manifests。
- 原则：`.specify/memory/constitution.md`；模板 `.specify/templates/`；脚本 `.specify/scripts/bash/`。
- 规格根：`/Users/yan/codex/solbridge工作流/crm-preview/specs`；接入时仅含说明，现有功能为 `001-proposal-to-order/spec.md`，未创建计划或任务。
- 保留官方 `.specify/.gitignore`，忽略本机 `feature.json` 与本地适配器配置；接入阶段无功能指针，第 3 步已建立并核对现有功能指针。

初始化前检查：不存在同名 .specify、.agents、specs、AGENTS.md 文件，已有源码快照已保存。
之后才用 `specify init --here --force --non-interactive --integration codex --script sh --ignore-agent-tools`。
`--force` 仅用于已备份、检查无冲突的非空目录；`--ignore-agent-tools` 因运行于桌面会话，
不把未检测 Codex CLI 二进制当作桌面技能识别证明。初始化使用已安装包内置资源，无需再下载模板。
未安装 Git 扩展，避免工具自动创建分支或提交；未执行 specify/plan/tasks/implement。

## 可恢复基线和本轮文件

初始化前快照：`/Users/yan/codex/solbridge工作流/docs/tooling-backups/20261019-speckit/`：
`crm-before-init.tar.gz`、`manifest.json`、`git-status.txt`。覆盖 104 个既有源码/文档文件，
不含 .git、Node 依赖和 .env；它是源码恢复快照，不是浏览器业务数据或数据库备份。
恢复时先解压到独立目录核对差异，不直接覆盖当前工作区。

本轮项目文件：AGENTS.md、docs/项目现状与需求说明.md、本文、scripts/specify、specs/README.md，
以及 Spec Kit 生成的 .agents/skills 和 .specify 树。完整文件清单见 `spec-kit-files.txt`。
工具安装和源码备份在父目录内，均未移动已有文件；无自动提交或远程同步。

## 使用入口与下一阶段

终端：在 CRM Git 根运行 `./scripts/specify version` 或 `./scripts/specify integration status --json`。
Finder：按 Command+Shift+G，输入上述 CRM 根路径；隐藏目录用 Command+Shift+. 显示。

Codex 技能安装名称：`$speckit-constitution`、`$speckit-specify`、`$speckit-clarify`、
`$speckit-plan`、`$speckit-tasks`、`$speckit-analyze`、`$speckit-checklist`、
`$speckit-implement`、`$speckit-converge`、`$speckit-taskstoissues`。
这是官方 Codex 集成调用形式；当前会话自动识别仍待上表所述验证。

下一步建议指令：
> 在 /Users/yan/codex/solbridge工作流/crm-preview 使用已安装的 speckit-specify 与 speckit-clarify，
> 读取项目原则、需求说明及原 CRM/关联后端实际代码，制定“提报成单功能规格”。
> 目标为提报→审核报价→生成订单的多人共享持久化测试版，使用隔离测试数据。
> 核对已有实现与缺口，澄清字段、权限、报价、状态、并发成单及失败恢复规则。
> 本阶段仅完成业务规格与澄清，不生成技术计划、任务、不实施代码、迁移或部署。

后续前置：先核实客户端识别技能；无法自动识别时可明确读取对应 SKILL.md 执行并报告限制。
测试身份来源、可信权限、报价细则和后端 Git 边界不阻碍工具接入，但必须在相应规格/方案阶段解决。
指南中的后端技术栈、单草稿唯一性和具体字段规则没有取得此前用户确认原文，继续标为建议或待确认。

## 官方核对来源

- [稳定版本 v1.2.1](https://github.com/github/spec-kit/releases/tag/v1.2.1)
- [安装：官方 GitHub 与 PyPI 渠道](https://github.github.io/spec-kit/installation.html)
- [Codex 集成、技能目录与状态检查](https://github.github.io/spec-kit/reference/integrations.html)
- [已有项目接入与增量规划](https://github.github.io/spec-kit/guides/existing-projects.html)
- [OpenAI Skills 文档](https://learn.chatgpt.com/docs/build-skills)

本记录依据本机实际输出；网页能力说明不替代本机验证。

接入阶段历史核验（不是当前工作副本状态声明）：104 个基线文件 SHA-256 全部未变；集成状态 ok、缺失/非法/受管修改 0；
10 个技能文件存在；constitution 无未填占位符；无 feature.json；入口 shell 语法与 git diff --check 通过。
本轮未重跑业务测试，因为没有修改业务实现；历史测试结论仍保持原证据及版本限制。
建议提交说明（未执行）：`docs: adopt Spec Kit and CRM constitution v1.0.0`。

第 3 步更新（2026-10-19）：specify/clarify 技能文件已显式读取并执行，当前会话自动识别仍未验证。功能目录为 specs/001-proposal-to-order；本机 feature.json 已指向该目录并核验。尚无技术计划/开发任务，未重复安装工具。

第 3 步收尾：继续显式读取现有 speckit-clarify，自动识别仍未验证，不重复安装。当前功能指针核验通过。PM 责任和成交条件已确认，不再作为待定；其他权限、草稿/重复提报、运营审核报价与金额拆分待澄清。仅同步规格及说明。

收尾澄清进度：Q1其他角色/测试管理员分工、Q2正式字段/草稿/再次合作已被用户接受；Q3审核报价/金额组待回答。当前21项需求、26个验收场景，所有编号映射已检查；本轮28个业务源码/测试文件哈希无变动，没有生成plan/tasks。

最终收尾：Q3已采纳整组规则（负Margin提示不拦截），Q1—Q3均已解决。现有spec已确认，21项需求、30个验收场景，规格质量清单16/16；可进入第4步技术方案，本轮不生成plan/tasks，不把文档通过当作共享测试版已实现。

第4步（2026-10-19）：当前会话仍未自动列出speckit-plan，显式读取后按setup-plan完成研究/设计产物；按技能要求使用只读研究代理。当前功能未变，未生成tasks.md、未重复安装工具。plan检查结果见功能目录checklists/plan-review.md。
