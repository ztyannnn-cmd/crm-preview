# T006 / T075 实施、结构审查与验证记录

日期：2026-10-20，Asia/Shanghai。仅执行T006数据结构定义和T075本机材料台账，不执行T007。本批未生成或应用迁移，未db push/seed/初始化、连接数据库、修改云配置、部署或调整Git仓库，也未安装/升级依赖。

## 任务完成情况

| 任务 | 交付与证据 | 状态 |
|---|---|---|
| T006 | schema保留原CrmWorkspaceState四个存储字段，只增加ORM反向关系；新增12个环境/公司/工作区/身份/分配/会话逻辑model。原生二进制ID、非空唯一键、含公司/工作区的复合外键及SQL-only交接明确；本机Prisma6.19.3 validate一次通过 | 数据结构定义完成；不是数据库约束建立完成 |
| T075 | [environment-gates.md](environment-gates.md)逐项登记X01—X10的责任角色、材料/验证独立状态、证据与观察时间、阻塞范围、可继续工作和下一材料；X10拆分受控验收准备及最终开放窗口 | 台账完成；没有将任一X门禁标为实际通过 |

已有T001—T005/T009完成状态保留；本批两项标准满足后进度为8/95，其余87项未完成。没有借本批授权开始T007或执行环境动作。

## 变更文件

- 后端`/Users/yan/codex/solbridge工作流/crm-backend/prisma/schema.prisma`：仅结构定义。
- 功能目录`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/data-model.md`：补结构映射、当前记录设计和T007边界。
- 同目录`tasks.md`：保留95个编号与原勾选，回填T006/T075证据并给T007追加本批交接说明。
- 同目录`verification/environment-gates.md`、本文及batch-t006-t075-before/schema-review/integrity.json、batch-t006-t075-logs/：新增台账、结构审查、前后摘要及命令日志。

未改app/model、上一批配置与金额代码、任一既有测试/断言、package.json/锁文件、构建tsconfig或prisma/migrations目录。没有重新生成Prisma Client；类型检查仍基于已有Client，不能当作新增model的运行时调用验证。

## Schema设计说明

### 标识、公司/工作区和旧桥接

- 新增实体ID及跨表引用使用Bytes/VARBINARY(64)，按原始字节区分大小写、尾部字节；不依赖数据库默认字符排序。外部身份provider/appId/tenantKey/openId分别为VARBINARY(16/128/128/128)，四元组全非空且联合唯一，最大键宽400字节。显示名/label是普通文本，不能据姓名自动认领外部身份。
- API/业务ID仍为字符串，后续T008/身份服务须做严格、可逆UTF-8编码与字节长度校验：不自动trim/转小写/Unicode归一化，不静默截断，非法编码拒绝。环境UUID显式映射16字节网络序；哈希为32字节原始摘要，不是将64字符hex作为32字节写入。当前没有执行这些新表的读写或对旧浏览器数据转换。
- Companies为身份归属元数据；Workspaces和Employees均带companyId及复合候选键。WorkspaceAccess同时引用同公司的workspace和employee；ProjectAssignment、TeamRelations、邀请、会话沿同一三元成员键引用；pending还引用相同公司/工作区/员工的邀请，OAuth可选邀请也限定在相同工作区。
- Workspaces.stateId以唯一关系映射现有CrmWorkspaceState.id，不复制payload或重建业务表。旧id/revision/payload/updatedAt定义原样保留；新增反向workspace字段只是ORM关系，不是第二份业务存储。stateId不能由客户端任意选择，T008/T010在可信workspace上下文中解析。
- 项目实体继续位于所属workspace JSON中，不为了外键新建第二套项目业务模型。因此campaignId是否真实属于该payload须T008/T025在同一事务内校验；复合FK只保证身份/成员关系的公司与工作区，不代替JSON项目和业务授权判断。

### 当前有效分配和直属关系

| 实体 | 关键约束定义 | 历史与有效性 |
|---|---|---|
| WorkspaceAccess | PK(companyId,workspaceId,employeeId)，均非空 | 一条稳定成员记录，停用/恢复更新同键，不追加第二条有效成员；enabled默认false |
| ProjectAssignment | PK(companyId,workspaceId,employeeId,campaignId,duty)，均非空 | 每项职责一个当前槽位，可停用/原键恢复；不将enabled或可空end时间放进唯一键 |
| TeamRelations | PK(companyId,workspaceId,operatorId)，均非空；operator/directPm分别引用相同工作区成员 | 一个运营在该工作区最多一条当前指针；effectiveTo虽可空，但不在唯一键；更换PM更新当前指针 |
| ExternalIdentities | UNIQUE(provider,appId,tenantKey,openId)，原生二进制、全非空 | 映射冲突拒绝，不能按邮箱/姓名合并 |
| PendingBindings | invitationId非空唯一，并与邀请的公司/工作区/员工复合关联 | 每邀请最多一个pending；审批后的外部身份冲突由ExternalIdentities唯一键兜底 |

当前槽位设计避免MySQL普通UNIQUE允许多个NULL导致的多条“在职/有效”记录。历史不靠复制当前行保存：T007增加AuditEvents，T021/T025在workspace→employee/session统一锁顺序下原子写前后值、更新版本和撤销会话。FK无法判断员工role或enabled是否符合具体职责，这仍由T020/T023/T025操作时检查，不能把结构关系误写成授权已生效。

### 凭证、OAuth和管理员

Sessions仅有tokenHash/csrfHash，邀请仅有tokenHash，pending短期Cookie仅有pendingTokenHash，OAuth仅有stateHash/browserBindingHash，均为Binary(32)。没有明文Cookie、邀请token、OAuth code、access/refresh token或密码字段；browserBindingHash只定义一次。哈希列的类型不证明调用方真的执行了hash，T019/T020/T022须验证实际写入只有摘要、日志无明文，并原子消费一次性记录。

Employees.role必填且无默认角色，enabled默认false；不存在“首位登录自动admin”的默认值或运行代码。指定首admin仍只能由后续T015受控引导，真实飞书证明/一次性令牌绑定完成后重新SSO，schema校验不创建人员或会话。

## Prisma不能表达或本批不建立的约束：T007交接

| 编号 | 明确落实方案（后续工作，本批不生成SQL迁移） | 后续证据/阻塞范围 |
|---|---|---|
| SQL-01 旧String桥接ID | 源码历史migration声明utf8mb4_unicode_ci，不能当作二进制ID约束。T007先检查实际迁移历史/列字符集、数据与映射；为CrmWorkspaceState.id及Workspaces.stateId规划相同的二进制NO PAD排序规则，候选utf8mb4_0900_bin必须先核实实际MySQL版本、可用性与PAD_ATTRIBUTE。保留旧ID字节，不自动trim/折叠/重编号；不可安全落实时阻塞共享桥接迁移，不回退默认ci或PAD SPACE规则 | T007迁移评审明确列级定义及兼容FK/unique；T066/T070实库用A/a、尾空格/编码样例核对比较语义、约束和查询结果。当前未查实际DB排序规则 |
| SQL-02 环境单行和合法版本 | EnvironmentIdentity默认id=1不等于单行约束；后续迁移须加id=1、environment=test及schemaVersion≥1的强制CHECK；Workspaces.stateSchemaVersion、authVersion/关系version等正版本同样明确CHECK。MySQL须确认8.0.16+且检查实际强制执行，不把被忽略的CHECK当通过 | T007在计划内明确命名检查，T066实际SHOW CREATE/元数据与非法行插入拒绝证据；尚未建立 |
| SQL-03 时间和状态基本约束 | 迁移评审明确TeamRelations.effectiveTo为空或不早于effectiveFrom，邀请/OAuth/session/pending等有效期与起点/证明时刻一致的CHECK；不得把这些检查当作自动过期/消费或收权逻辑 | T007记录具体列与版本支持；T066/T070正负样例。原子消费、当前role/enabled/authVersion校验及会话失效仍归T019—T025 |
| SQL-04 字节/严格模式和复合FK | 新表必须保持本schema的VARBINARY/BINARY、全非空关键键、公司/工作区复合FK与Restrict策略；在实际目标核对strict SQL模式、完整键与原生类型，禁止截断、替换成默认ci VARCHAR，或只靠ORM/进程锁 | T007提供可审查原生约束定义；T066真实跨公司/跨工作区插入拒绝、四元组和当前槽位两连接竞争、错误digest/ID长度处理证据 |
| APP-01 JSON/角色与审计 | JSON中的campaign有效性、职责与员工role匹配、启停/authVersion以及旧payload不反向授权，不能用普通外键或静态CHECK证明；由T008/T020/T023/T025同事务检查，当前槽位变更同事务追加T007审计 | T067/T070权限/撤权竞争与版本证据；此处明确为后续服务完成标准，不假报数据库层可跨表CHECK |

以上是完整的设计交接，不是已执行T007；本批没有新增migration、生成SQL、db push、seed或运行初始化。T006完成范围是逻辑/Prisma结构定义、约束表达与无法表达项的明确落实方案及校验；实际约束建立和实库证明分别由T007及后续真实MySQL任务取得。

## 实际离线验证与回归

| 工作目录 | 实际命令 | 数量/结果 | 退出码 | 记录 |
|---|---|---|---:|---|
| 临时隔离目录/private/tmp/solbridge-t006-schema-mt014ugd | `/usr/local/bin/node /Users/yan/codex/solbridge工作流/crm-backend/node_modules/prisma/build/index.js validate --schema /private/tmp/solbridge-t006-schema-mt014ugd/schema.prisma` | schema一次校验通过；源文件与临时副本SHA-256相同 | 0 | [prisma-validate.json](batch-t006-t075-logs/prisma-validate.json)、[日志](batch-t006-t075-logs/prisma-validate.log) |
| `/Users/yan/codex/solbridge工作流/crm-preview` | `node --test app.test.mjs model.test.mjs money.test.mjs package.test.mjs pm-self-managed.test.mjs regional.test.mjs shared-fixtures.test.mjs video-v06.test.mjs` | **207/207**，0失败/跳过，包含上一批新增测试 | 0 | [frontend.json](batch-t006-t075-logs/frontend.json)、[日志](batch-t006-t075-logs/frontend.log) |
| `/Users/yan/codex/solbridge工作流/crm-backend` | `npm test` → `node --import tsx --test tests/*.test.ts` | **50/50**，0失败/跳过 | 0 | [backend.json](batch-t006-t075-logs/backend.json)、[日志](batch-t006-t075-logs/backend.log) |
| 同上 | `npm run typecheck` → `tsc -p tsconfig.json --noEmit` | src类型检查通过，无诊断 | 0 | [src-typecheck.json](batch-t006-t075-logs/src-typecheck.json) |
| 同上 | 下列独立无输出类型检查 | 上批新增TS测试/夹具/配置脚本均通过，无诊断 | 0 | [isolated-typecheck.json](batch-t006-t075-logs/isolated-typecheck.json) |
| 同上 | `npm run check:config -- --synthetic` | connectionRequested/Allowed/Attempted均false；真实TLS/schema/投影标志均false、readiness=not_ready | 0 | [synthetic-config.json](batch-t006-t075-logs/synthetic-config.json) |

独立类型检查完整命令：

```sh
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --esModuleInterop --skipLibCheck tests/fixtures/shared-workspace.ts tests/shared-workspace.test.ts tests/config.test.ts tests/money-types.test.ts scripts/check-config.ts
```

Prisma校验于2026-10-20 15:34:04 +08:00执行；回归与类型/配置检查于15:38:57 +08:00执行，全部使用本机已安装依赖。Prisma使用源码字节相同的临时schema，cwd与schema目录均无.env，子进程环境只给PATH、合成DATABASE_URL及禁更新提示/自动安装选项；未调用dotenv加载、migrate/diff/db push/generate，校验后移除临时目录。合成URL使用127.0.0.1:1，validate不执行数据库操作；日志没有“Environment variables loaded”。安装版本6.19.3见[schema-review.json](batch-t006-t075-schema-review.json)。其余测试仍使用显式合成环境、内存Repository和Fastify inject；没有减少、跳过或弱化旧测试。

离线结构审查记录13个model、关键唯一键全非空/二进制、OAuth字段去重、哈希列、无默认admin和桥接四列保留，见同一schema-review.json。它属于设计检查，不能代替数据库行为测试。

## 证据分层与停止交接

1. **本批已取得**：schema validate通过、离线结构审查、207/50回归和两类类型检查、完整X台账。
2. **本批未取得**：真实库表/索引/FK/CHECK已建立的证据；原始历史SQL是否实际应用也未连接核对。
3. **本批未取得**：真实MySQL并发/唯一性/回滚、RDS TLS/账号/环境身份、SSO、Windows或发布证明。CA/配置正确只是声明，连接关闭与ready503保持原状。

没有阻塞本批两项完成的未决业务或结构问题。SQL-only/服务交接项的实际建立与验证仍未完成，并明确约束后续迁移/共享放行；X01—X10材料与授权窗口仍按台账等待责任人确认。本批没有联系管理员或索取明文凭据。

下一批满足既定依赖的任务只有T007：先完成增量迁移的编写/评审并承接SQL-01—04，再按其完成条件进入T008等。此处仅建议，不生成迁移、不自动开始T007，不把“可开始设计”解释成获准应用迁移或部署。
