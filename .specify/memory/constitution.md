<!-- Sync Impact Report
Version: unfilled scaffold -> 1.0.0 (initial project adoption)
Principles: five template placeholders replaced with confirmed scope, shared testing,
data isolation, incremental changes, and evidence classification.
Sections added: 技术与工程边界; 阶段与验证; Governance.
Removed: example-only placeholder content. No dependent templates modified.
Follow-up: permission/quote/state details and backend Git boundary in stage 3.
-->
# SOLBRIDGE CRM Constitution

## Core Principles

### I. 首轮围绕提报成单

首轮必须围绕“提报 → 审核报价 → 生成订单”。视频制作、发布和验收闭环留到后续轮次。
订单与已有交付对象的必要关联影响必须明确列出，不得据此扩大为视频模块重写。
依据：用户在 2026-10-19 本聊天中的明确确认。

### II. 多人共享、持久保存、可信权限

业务测试版必须让不同同事在授权范围内操作同一份测试记录，刷新和重新建立会话后仍能读取结果。
不得仅依赖每位用户自己的 LocalStorage。身份及记录操作权限必须由可信服务端校验，
不得将浏览器角色选择器当成真实身份。角色细则以确认后的功能规格为准。
依据：用户在 2026-10-19 本聊天中的明确确认。

### III. 测试与正式环境隔离

测试数据、配置、身份和存储必须与正式环境隔离，使用明确的隔离测试记录。
涉及既有记录前必须识别来源、导出并校验，明确处理范围；不能将演示种子视为权威业务记录。
迁移和部署必须遵守当时授权的阶段范围，本次工具接入不执行这些动作。

### IV. 保留有效实现并增量修改

必须先核对代码与验证证据，复用已有有效实现、技术栈和设计规范，保留其他任务的修改。
跨模块变更必须记录影响、兼容边界和必要验证，不因引入 Spec Kit 重建整个 CRM。
当前目录不切分、合并或清理；本轮只处理 CRM，不处理父目录的 Next.js 建联工具。

### V. 事实、确认、建议与未决问题分别记录

文档必须区分代码事实、用户明确确认、建议和待确认事项。指南或历史文档中的
“已确认”字样不能替代可核对的用户确认依据；代码行为也不能自动升级成业务规则。
权限、状态转换、关键金额和成单一致性必须有对应验收依据；模拟、隔离测试与真实集成结果分别报告。

## 技术与工程边界

当前 CRM Git 根是 `/Users/yan/codex/solbridge工作流/crm-preview`，原生 ES Modules/HTML/CSS。
关联后端在同级 `crm-backend`，已有 Node.js/TypeScript/Fastify/Prisma/MySQL 代码；
阿里云 RDS 是历史设计方向，真实连接未验收。继续采用该方向属于建议，未取得此前用户确认原文，
不能写成已批准选型。旧 PostgreSQL 设计不得与当前 MySQL 实现混作同一方案。
同级后端尚不在 CRM Git 根内，其版本管理方式须在后续技术方案阶段明确。
Spec Kit 仅是开发工具，不是 CRM 运行依赖。

## 阶段与验证

按用户阶段顺序推进：需求确认、工具接入、功能规划、技术方案、任务拆分、开发、验收、
测试发布、反馈修复、正式上线。本次只完成前两步，不生成实现计划、任务或业务代码。
第 3 步用 specify/clarify 编写“提报成单功能规格”，澄清角色权限、报价与成单前置条件。
后续规格变更必须同步相关计划、任务和验证记录，保留历史实现证据和重要决策。
多人独立会话、持久保存、越权拒绝、重复成单和失败恢复应在真实集成环境中验证，
不得用页面存在、文件生成或内存串行测试替代完整业务验收。

## Governance

本文件首次采用版本 1.0.0，依据本聊天已确认要求与工具接入授权填写。
新原则及实质扩展升 MINOR，兼容性说明修订升 PATCH，原则删除或不兼容重定义升 MAJOR。
修改须注明依据、范围及日期；涉及业务、资金、权限或数据范围的未决事项先澄清，
不得由实现惯例自行定案。评审规格、计划及实现时检查是否符合本原则；偏离需记录理由并确认。
用户当前明确指令优先于本文件；具体字段与状态属于功能规格，不固化在项目原则中。

**Version**: 1.0.0 | **Ratified**: 2026-10-19 | **Last Amended**: 2026-10-19
