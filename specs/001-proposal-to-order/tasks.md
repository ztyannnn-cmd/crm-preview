# Tasks：提报成单多人共享业务测试版

**功能目录**：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order`  
**任务文件目标**：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/tasks.md`  
**生成日期**：2026-10-20  
**状态**：2026-10-20已完成T001—T006、T009及T075；总计95项，已完成8项、未完成87项。本批仅完成T006数据结构定义和T075环境台账，见[batch-t006-t075.md](verification/batch-t006-t075.md)；下一批满足依赖的是T007，本批不生成迁移、不自动继续。  
**输入**：用户提供的 `001-proposal-to-order.zip`；其中原 `tasks.md` 为0字节。  
**输入ZIP SHA-256**：`a88c6d54caa58e3f7c7b12d947f6d4367605a72f73ff1f70cab5cbdcf3656678`

## 1. 使用范围与已核对结论

本清单初次离线生成时依据同目录的 [spec.md](spec.md)、[plan.md](plan.md)、[data-model.md](data-model.md)、[contracts/api.md](contracts/api.md)、[research.md](research.md)、[quickstart.md](quickstart.md)、[validation.md](validation.md)、[evidence.md](evidence.md) 和 [deployment-compatibility.md](deployment-compatibility.md) 编写，并阅读现有检查清单/哈希记录；当时没有访问用户Mac源码或运行CRM测试。2026-10-20本机第一批另获明确授权，已实际核对源码、运行隔离测试并完成T001—T003，见三项任务下方执行证据与verification目录；仍未连接数据库或云服务。

初次离线交付只补全任务文件；本批T001—T003另按授权更新api/data-model/quickstart并新增verification证据。其他任务要求实施的模块、测试、迁移仍是后续工作，不表示已创建。历史审查JSON与输入摘要保留原时点，不改写成当前运行结果。

业务Q1—Q3已定案；5个用户故事均为P1，覆盖FR-001—FR-021、AC-01—AC-30、SC-001—SC-008。FR-005/016/018/019等保留源规格“默认验收说明”的属性，不冒称用户逐条独立批准，也不因此重复业务问答。依据为spec的“Assumptions/本轮决策结论”和evidence的“第3步最终交接”。

技术路线沿用已提供的第5步方案：原生ES Modules前端、Node24/Fastify/Prisma6/MySQL、小规模workspace JSON桥接加关系约束、同源会话、优先验证现有Windows路线。版本号来自上传方案，实际锁文件及兼容性在T001/T003/T078/T079核验；本清单不表示这些组合已运行通过。

历史193/193、16/16和文档审查16/16仅是资料记载。旧review JSON中的`tasks_exists:false`、`plan_exists:false`是其日期对应的阶段状态，不是当前文件是否存在的实时检查。`source-review.json`早于PM增量，stage5基线也不能代替现机读盘；不要改写历史记录使其看起来“本轮通过”。

## 2. 路径、执行和完成规则

| 用途 | 绝对路径/约定 |
|---|---|
| 前端与规格Git根 | `/Users/yan/codex/solbridge工作流/crm-preview` |
| 相邻后端实施根 | `/Users/yan/codex/solbridge工作流/crm-backend` |
| 本功能规格与任务目录 | `/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order` |
| 后续脱敏验证证据目录（拟新增） | `/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification` |
| 原本机预览 | `http://127.0.0.1:8897`；默认保留demo，shared显式启用 |

前端无`package.json`与原生静态结构并不冲突；npm命令以核实后的后端脚本为准。不得把父目录的Next.js项目当成本CRM前端，也不初始化父目录仓库或移动两个项目目录。实际适用指令与功能指针由T001核对，不能只凭`main`判断功能目录无效。

任务采用`- [ ] T编号 [P可选] [US编号可选] 描述 + 文件`格式。所有路径指实施目标：文档已记载的源码须T001核实，`money.mjs`、`api-client.mjs`、`src/auth/`、各service/测试/ops/verification等为规划新增或调整位置；若已有同职责模块，优先复用并把任务路径同步为实际位置，不创建重复架构。

- 按每项“依赖”执行，不要求某阶段全部结束才能开始另一个无冲突任务。任务编号用于追踪，不等于每项必须串行。
- `[P]`只表示所列依赖满足后，与不同文件/隔离数据上的任务可并行；`app.mjs`、`model.mjs`、`src/crm.ts`、Prisma schema等共享文件由单一负责人整合，不能多任务同时覆盖。
- 只有实际产物和完成标准都有证据才能改成`[x]`。一项中仍有待验证部分就保持`[ ]`，在证据中写部分结果/阻塞，不用“已有代码”推定完成。
- 测试依赖来自本功能明确验收要求；模型/注入接口、真实MySQL、真实SSO/独立员工浏览器、恢复/发布证据分别记录，不互相替代。
- X门禁分“材料未齐/材料就绪/实际验证通过”；任务注明X是执行该外部动作前所需材料及授权范围。验证结果由相应任务产出，不能循环要求先有本任务的通过证据才能开始本任务。最终T091汇总实际通过状态。
- 已有授权覆盖的动作继续执行，不为每项重复申请许可；本任务文件不自行扩大到新的云资源、费用、生产数据、外部消息或发布范围。
- 外部未齐只挂起相应任务并继续其余可做工作。T048数量补正若需局部补充依据，只影响该动作及相应验收；其他审核报价、常规成单、底座和实库工作继续。

## 3. 实施前应对齐的具体事项

以下是本次文档交叉核对结果；处理位置在T001/T002及对应任务，当前未修改原规格。技术补全不得变成重新询问已确认业务或扩大权限。

| 事项 | 本清单处理口径 | 来源与落点 |
|---|---|---|
| 历史“等Q3/不生成plan/tasks”与当前阶段 | 使用spec最终结论和evidence第3步最终交接；保留旧记录的时点，不把历史阶段边界当本轮阻塞 | spec“本轮决策结论”；evidence“第3步最终交接/第4步方案记录”；T001/T002/T095 |
| “唯一开发目录”与相邻后端 | crm-preview是前端/规格根；后端在相邻crm-backend实施，保持目录不动 | plan“Project Structure/连接与复用边界”；T001 |
| 管理员预开通员工缺少创建入口 | 首管理员由显式引导建立；其他员工补受控管理员预开接口/工具，禁止公开注册和按姓名/邮箱认领 | api“身份与管理”；T002/T015/T021 |
| 通用禁传role与管理员配置role | 业务命令禁止授权字段；管理员管理路由只接收声明字段并防自改业务角色绕过 | api通用约定与access路由；T002/T011/T021/T023 |
| 通用CSRF/幂等与登录前绑定 | 正式命令用session+CSRF+幂等；登录前使用Origin、一次性邀请、nonce/state及防重放，逐路由明确例外 | api bind/start/callback；T002/T019—T022 |
| 拒审后“重新占claim”歧义 | 拒审待处理仍在途，复审保留/核对同一claim；明确结束/成单才释放，不重开终态 | spec重复矩阵/状态表，data-model §4；T002/T037/T044/T067 |
| submission-context版本来源 | 明确返回creator/project有效分配版本和本人draft版本/absent；不以全局revision代替 | api查询与提报，data-model §3；T002/T025/T034/T038 |
| 数量补正版本/确认映射 | T002本机已找到明确依据：纯条数补正保留原方案ID和当前合法客户确认、不加PM再审；共享实现升聚合version、清旧拆分并校验合计1—100。不是未决业务问题，不允许跨方案旧确认 | model.mjs correctVideoQuantity、package.test.mjs数量补正专项、固定预览工作流；T002已对齐，T048/T051待实现验证 |
| createOrder空body与请求最终方案比对 | 新共享兼容入口显式提供versionId；只有可信完整历史映射时才兼容空body，缺依据422、已知不符409，不猜当前版 | api createOrder/新key复用，data-model §3/4；T002/T055/T059 |
| OAuth字段重复 | OAuthAttempts中browserBindingHash只定义一次 | data-model §2；T002/T006 |
| 首次环境/readiness/admin循环 | 显式迁移和初始化环境/workspace/指定employee→基础readiness→一次性真实admin绑定；启动不seed，首次绑定不依赖已有admin session | data-model §2/6、quickstart §2/3；T015/T016/T066/T082/T086 |
| 验收与首次部署顺序 | 先在已授权范围准备受控隔离验收环境，再真实验收，最后开放已验收测试版本；X10分别记录对应窗口 | quickstart §4/5、validation末段；T075/T082/T089/T092 |

## 4. 阶段与独立验收

| 阶段 | 任务 | 数量 | 可检查成果 |
|---|---|---:|---|
| A：实施入口与契约对齐 | T001—T004 | 4 | 核对本机实际源码与历史差异；固化工程口径，不重新询问已确认Q1—Q3。 |
| B：共享数据、金额、命令与API基础 | T005—T018 | 14 | 先建立可注入、可验证的共享底座；外部云账号未齐不阻塞这些实现。 |
| C：US4：可信身份、共享接入与权限（P1） | T019—T033 | 15 | US4基础能力先于业务入口。此阶段使用隔离注入测试；真实员工SSO和共享验收在阶段I。 |
| D：US1：运营提报与草稿（P1） | T034—T042 | 9 | 独立验收：草稿→正式提报→审核PM可见；无需推进报价或视频交付。 |
| E：US2：审核、复审与报价协作（P1） | T043—T052 | 10 | 独立验收：通过/拒审/复审、正式报价与反馈、方案变化；无需建单。 |
| F：US3：完整且唯一成单（P1） | T053—T060 | 8 | 独立验收：已确认提报生成两条原创视频订单，核对权限、金额、终态与防重。 |
| G：US5：PM自提与已有视频权限兼容（P1） | T061—T065 | 5 | 独立验收：本人自提免审、双侧报价、合法成单、既有本人视频到验收；不扩建视频模块。 |
| H：真实MySQL、故障、浏览器与组合验证 | T066—T074 | 9 | X02材料齐备后，按每项代码依赖提前开始；不必等云域名、飞书或全部UI完成。 |
| I：受控验收环境、Windows、真实SSO与业务验收 | T075—T089 | 15 | T075材料整理可提前并行；其余按具体门禁推进。先准备受控测试环境，再执行真实验收。 |
| J：验收闭合、最终测试发布与交接 | T090—T095 | 6 | 发布与已验收候选制品对应；只在既有授权覆盖的测试窗口执行。 |

**最小完整交付范围**：五个P1故事均包含在本轮共享业务测试版内，US5不能自动降级为后续可选。内部可以先交付“底座可验证”“草稿提交可用”等阶段成果，但只有真实共享、权限、成单、PM自提、故障和环境证据齐全后才能宣称本轮验收完成。PM已有视频流程只做必要兼容回归，不扩大为通用视频重构。

## 5. 可执行任务

### 阶段A：实施入口与契约对齐

核对本机实际源码与历史差异；固化工程口径，不重新询问已确认Q1—Q3。

- [x] T001 核对本机双目录、适用指令和当前源码基线。文件：`/Users/yan/codex/solbridge工作流/crm-preview/AGENTS.md`、`/Users/yan/codex/solbridge工作流/crm-preview/.specify/feature.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/checks/stage5-source-baseline.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/source-baseline.md`。

  完成标准：在本机读取实际适用的 AGENTS/项目指令，确认功能指针、前端 Git 根、相邻后端及各自源码/测试/迁移位置；记录实际分支、未提交差异与文件摘要。历史 main/a6122e5、43份哈希和后端未纳管仅作对照；保留用户已有修改，路径不符时只报告具体差异，不重建目录、不重装 Spec Kit。ZIP 不包含这些实际源码，不能以本文代替核验。

  依赖：无；实施入口。追溯：本机基线与文档可信性。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：[source-baseline.md](verification/source-baseline.md)及[source-baseline.json](verification/source-baseline.json)。实际前端main/a6122e5、后端非Git、功能指针均已核实；历史基线原件保留，业务文件执行前后摘要见本批integrity记录。

- [x] T002 固化契约例外、首次初始化顺序及局部版本口径。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/contracts/api.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/data-model.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/quickstart.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/contract-alignment.md`。

  完成标准：按本文“实施前对齐事项”逐项记录结论：管理员预开员工入口；业务禁传授权字段与管理路由 role 白名单；登录前 Origin/邀请/nonce/state 例外；草稿/项目版本来源；拒审仍占在途；去重 OAuth 字段；首次初始化→readiness→首管理员绑定；先受控验收环境后真实验收。对数量补正、兼容 createOrder 的请求方案版本核对本机代码/测试，明确聚合 version 与方案 versionId；没有依据时仅挂起受影响动作，不替用户新增业务决定。保留历史审查原件，追加当前结论。

  依赖：T001。追溯：FR-003、FR-006、FR-008、FR-011、FR-012、FR-017、FR-018、FR-020。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：[contract-alignment.md](verification/contract-alignment.md)逐项记录11个对齐事项，api/data-model/quickstart已同步。数量补正及兼容createOrder均有明确工程口径，没有要求重新回答Q1—Q3；后续共享实现仍保持未完成。

- [x] T003 记录现有前后端回归结果与可用命令。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/app.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/pm-self-managed.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/package.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/baseline-tests.md`。

  完成标准：先核对本机测试脚本及数据隔离，再运行现有前端 node:test 和后端 npm test/typecheck，并记录命令、版本、退出码及失败原因；保留已有视频/PM专项。前端没有 package.json 不补 npm 项目；test:integration 尚未建立不能直接调用。历史193/16不作为本轮通过结果；基线失败归因后只阻塞相关变更，不擅自重置源码或业务数据。

  依赖：T001。追溯：FR-020、FR-021。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：[baseline-tests.md](verification/baseline-tests.md)记录实际命令/隔离范围/版本，前端193/193、后端16/16、typecheck通过，三条命令退出码均0；原始log及命令JSON保存在verification。不是引用历史数字，也不是共享/实库/SSO验收。

- [x] T004 [P] 建立隔离角色、工作区与业务夹具。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/fixtures/shared-workspace.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/test-fixtures.mjs`。

  完成标准：提供运营A/B、实际审核PM、直属只读PM、自提PM、admin及第二工作区的稳定合成身份、项目分配、草稿/报价/确认样例；测试身份只由测试进程依赖注入，不生成公开登录路由；与用户浏览器记录、真实人员和正式配置完全分开。

  依赖：T002、T003。追溯：FR-001、FR-017、FR-020、AC-14、AC-18、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：两工作区、六种角色/明确分配、独立草稿/报价/同版确认/PM自提样例已交付；旧夹具函数保留。新增4项前端及4项后端夹具测试通过，测试身份仅经测试进程注入，新增TS夹具独立类型检查通过。详见[批次记录](verification/batch-t004-t005-t009.md)。

### 阶段B：共享数据、金额、命令与API基础

先建立可注入、可验证的共享底座；外部云账号未齐不阻塞这些实现。

- [x] T005 [P] 实现显式共享配置与默认拒绝连接的环境门禁。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/config.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/.env.test.example`、`/Users/yan/codex/solbridge工作流/crm-backend/scripts/check-config.ts`。

  完成标准：落实 quickstart 中 APP_ENV/CRM_MODE/DB_CONNECT_ENABLED、目标库/用户/环境UUID、schema、Origin、TLS、session等配置；默认仍拒绝 production、错误目标及未显式启用的DB连接。示例仅放变量名和无敏感占位值；运行/迁移凭据分离，shared配置失败明确报不可用。

  依赖：T002、T003。追溯：FR-001、FR-016、FR-020、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：配置解析/目标与完整性校验、脱敏错误及无敏感模板已实现；29项配置测试与显式合成CLI检查通过。DB请求只是配置意图，connectionAllowed恒false；完整shared也无net/TLS连接且ready503。配置脚本及新增测试独立类型检查通过，真实就绪仍待T016。详见[批次记录](verification/batch-t004-t005-t009.md)。

- [x] T006 定义环境、工作区、员工、身份、会话与分配关系表。文件：`/Users/yan/codex/solbridge工作流/crm-backend/prisma/schema.prisma`。

  完成标准：按 data-model §2 定义 EnvironmentIdentity、Workspaces、Employees、ExternalIdentities、WorkspaceAccess/ProjectAssignment、TeamRelations、邀请/pending/OAuth/session逻辑实体；实际命名复用已有模型。ID比较明确大小写/二进制语义，外部身份四元组唯一，当前直属关系唯一；会话/邀请/state只存hash，OAuth浏览器绑定字段去重。

  依赖：T005。追溯：FR-001、FR-017、FR-020、AC-13、AC-14、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：已定义12个身份/环境/公司/工作区逻辑model并保留旧桥接四个存储字段；新增ID/身份四元组使用原生二进制，全非空当前槽位键及公司/工作区复合FK明确，凭证仅hash、OAuth浏览器字段不重复、无默认admin。Prisma6.19.3在无.env临时目录用合成URL一次validate通过；207/50回归及两类类型检查通过。Prisma无法表达的CHECK和旧String ID排序规则有完整T007落实/验证交接，不宣称数据库约束已建立。见[批次记录](verification/batch-t006-t075.md)。

- [ ] T007 增加业务约束投影、版本、幂等和审计的增量迁移。文件：`/Users/yan/codex/solbridge工作流/crm-backend/prisma/schema.prisma`、`/Users/yan/codex/solbridge工作流/crm-backend/prisma/migrations/`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/migration-review.md`。

  完成标准：先核对源码中实际已有SQL迁移，复用 CrmWorkspaceState；增量加入 DraftKey、ActiveProposalClaim、ProposalOrderLink、RecordVersion、Operations、AuditEvents。业务唯一键均含workspaceId；不新建第二套47张业务表、不自动DROP。迁移文件须可审查并记录适用前置；此任务编写/评审，无须先取得X02。实际目标库迁移历史在T066/T082应用前核验，已有授权演练库时可提前只读检查。

  依赖：T006。追溯：FR-003、FR-006、FR-012、FR-018、FR-019、FR-020、AC-04、AC-12、AC-15、AC-16、AC-17、AC-18、AC-26。外部条件：无外部账号/云条件门禁。

  T006交接（尚未实施T007）：同时承接[batch-t006-t075.md](verification/batch-t006-t075.md)的SQL-01—04：旧CrmWorkspaceState.id/Workspaces.stateId一致的二进制NO PAD规则、环境单行/test/正版本与时间CHECK、原生字节类型/复合FK及strict模式；先核实既有数据/实际迁移历史和MySQL支持，禁止按默认ci或含NULL的普通unique冒充目标约束。本批没有生成迁移文件或SQL。

- [ ] T008 定义共享payload版本与真实人员上下文适配。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/state-schema.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.d.mts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`。

  完成标准：共享payload保留已有ID/嵌套结构，明确草稿、达人、提报、订单、视频、身份分配的独立版本；方案versionId与并发version分开。身份/项目/直属关系从关系表注入，固定USERS、payload旧members与模拟姓名不参与服务端授权。新共享金额权威使用整数分字符串，旧demo字段仅兼容读取，不启动批量转换旧浏览器数据。

  依赖：T007。追溯：FR-001、FR-005、FR-017、FR-018、FR-020、FR-021。外部条件：无外部账号/云条件门禁。

- [x] T009 [P] 实现跨前后端复用的精确金额模块。文件：`/Users/yan/codex/solbridge工作流/crm-preview/money.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/money.d.mts`、`/Users/yan/codex/solbridge工作流/crm-preview/money.test.mjs`。

  完成标准：先验证十进制字符串再转BigInt分；拒绝JSON number、空/指数/符号混入/三位小数/越界，允许合法100、100.0并统一两位显示；总额>0，分项≥0，技术上限按有符号BIGINT分。提供比较、求和、差额、格式化，UI不得经Number丢分；单测覆盖大整数和边界。金额上限/币种使用既有支持集合，不新增换汇。

  依赖：T002、T003。追溯：FR-004、FR-009、FR-013、FR-014、AC-03、AC-11、AC-25、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：独立money模块/声明/10项金额测试与后端类型消费验证通过，覆盖原始字符串拒绝、BigInt范围/溢出、大数、负差额、零分项和JSON整数分字符串；未全面接入旧业务流。最终前端207/207、后端50/50及两类类型检查通过。详见[批次记录](verification/batch-t004-t005-t009.md)。

- [ ] T010 拆分Repository只读快照与受控事务写入。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/prisma-crm-repository.ts`。

  完成标准：GET在一致只读快照内读取权限/状态/版本，不取写锁、不更新revision；写入workspace行锁后按统一顺序重查employee/session/分配。克隆工作副本，payload、投影、版本、审计和Operation必须同连接事务提交；锁内不调用飞书/外网。落实短事务/超时配置，禁止全payload HTTP回写与旧写路径绕行。

  依赖：T007、T008。追溯：FR-001、FR-017、FR-018、FR-019、AC-13、AC-15、AC-16、AC-17、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T011 [P] 实现路由Schema、错误类型及安全DTO基础。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/schemas.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/http-errors.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`。

  完成标准：统一成功/warnings/versions及错误fields/requestId结构；金额禁强制转数字，额外字段明确422，业务actor/role/owner/selfManaged字段拒绝。定义401/403/404/409/422/428/429/503映射、no-store、ETag和分页上限；DTO仅白名单，不直接序列化模型/数据库异常。管理和登录前路由例外按T002逐路由定义。

  依赖：T002、T008、T009。追溯：FR-004、FR-013、FR-016、FR-017、FR-018、AC-03、AC-10、AC-14、AC-15、AC-17、AC-27。外部条件：无外部账号/云条件门禁。

- [ ] T012 实现聚合版本、依赖版本与原子命令管道。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/command-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`。

  完成标准：按身份→workspace→可见性→动作/金额侧→版本→状态/金额→事务处理；身份由可信依赖传入并在锁内重查。检查If-Match、首次草稿If-None-Match、creator/project版本及draftPrecondition；成功仅提升受影响聚合版本，缺版本428、旧版本409；不因无关workspace revision产生假冲突。具体策略由T023接入后才可对真实会话开放。

  依赖：T010、T011。追溯：FR-003、FR-016、FR-017、FR-018、FR-019、AC-02、AC-10、AC-15、AC-17、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T013 实现持久幂等、操作查询与结果不明恢复协议。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/command-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/operation-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`。

  完成标准：Operations按workspace+actor+key唯一，hash含method/path/规范body/版本头及依赖版本，排除Cookie/CSRF/requestId；命中先于版本检查，同内容复用、异内容409。只持久化提交结果/资源引用，响应重新鉴权生成DTO；未查到Operation不等于没有在飞请求。可证明回滚的死锁最多2次同key重试，业务版本冲突不自动重试，结果未知503 OUTCOME_UNKNOWN。建单新key复用由T055实现。

  依赖：T012。追溯：FR-012、FR-016、FR-019、AC-12、AC-16、AC-17。外部条件：无外部账号/云条件门禁。

- [ ] T014 实现payload与投影一致性检查。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/state-integrity.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/prisma-crm-repository.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/scripts/check-state-integrity.ts`。

  完成标准：核对草稿自然键、在途claim、订单唯一关系、聚合版本、数量/金额合计与审计关联；每次事务写保持一致，已检测不一致拒写并给脱敏诊断，不静默清空或拿任意一方覆盖另一方。提供只读检查入口供初始化、恢复与readiness使用。

  依赖：T010、T013。追溯：FR-003、FR-006、FR-012、FR-013、FR-014、FR-018、FR-019、FR-020。外部条件：无外部账号/云条件门禁。

- [ ] T015 编写显式测试环境初始化与受控首管理员引导。文件：`/Users/yan/codex/solbridge工作流/crm-backend/scripts/bootstrap-test.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/bootstrap-admin.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/package.json`。

  完成标准：仅对已核实的隔离test库，由受控工具原子建立EnvironmentIdentity、合成workspace/payload/投影/版本及事先指定首admin employee；已有workspace拒绝覆盖，启动过程不seed。一次性绑定token只存hash，必须结合真实外部身份验证，用后关闭；首次引导不要求已有管理员session，不自动把第一位登录者设为管理员。此处编写工具，运行见T066/T082/T086。

  依赖：T007、T014。追溯：FR-017、FR-020、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T016 接通真实数据库readiness与服务关闭钩子。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/app.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/config.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/server.ts`。

  完成标准：显式test启用后验证CURRENT_USER、DATABASE、MySQL版本、最小GRANT、环境UUID/schema/migration、投影一致性及实际Prisma TLS配置，失败ready503；未初始化不假ready。基础readiness不依赖已有SSO验收，真实登录另设发布门槛。提供排空/连接关闭/维护状态钩子供Windows服务验证，日志不含凭据；仅保留信号处理不能算服务停止通过。

  依赖：T005、T014、T015。追溯：FR-001、FR-016、FR-019、FR-020、AC-13、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

- [ ] T017 验证底座的金额、Schema、版本、幂等和环境失败分支。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/command-service.test.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/config.test.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/schema.test.ts`。

  完成标准：利用隔离注入依赖验证非法金额、额外字段、缺/旧版本、同key异内容、重登后同key、无权重放DTO、读请求不写revision及错环境/TLS配置不ready。测试明确标为模型/API级；数据库锁、唯一约束和真正TLS拒绝须留给实库/平台任务。

  依赖：T004、T009、T011、T013、T014、T016。追溯：FR-013、FR-016、FR-017、FR-018、FR-019、FR-020、AC-03、AC-10、AC-14、AC-15、AC-16、AC-17、AC-18、AC-27。外部条件：无外部账号/云条件门禁。

- [ ] T018 [P] 建立浏览器异步API client与版本/操作句柄。文件：`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.test.mjs`。

  完成标准：封装同源JSON请求、CSRF、ETag/If-None-Match、请求key及operations查询，保留原始金额字符串，正确解析warnings和HTTP错误。调用者必须显式核对冲突后生成新请求；结果未知保留原key/hash，不将自动换key当重试；不持久化业务请求正文。

  依赖：T011、T013。追溯：FR-001、FR-016、FR-018、FR-019、AC-13、AC-15、AC-16、AC-17。外部条件：无外部账号/云条件门禁。

### 阶段C：US4：可信身份、共享接入与权限（P1）

US4基础能力先于业务入口。此阶段使用隔离注入测试；真实员工SSO和共享验收在阶段I。

- [ ] T019 [P] [US4] 实现飞书身份适配器与一次性登录证明。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/feishu.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/oauth.ts`。

  完成标准：实施时核对测试应用对应当前官方端点、最小scope和回调，服务端固定可信域名；一次性state/browser nonce防重放，安全return白名单，校验app/tenant。用可注入provider完成离线测试；不得把tenant token当用户身份、按姓名/邮箱认领或记录code/token。真实SSO由T085/T086验收。

  依赖：T004、T006、T011。追溯：FR-001、FR-017、FR-020、AC-13、AC-14、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T020 [P] [US4] 实现正式session、CSRF、到期与撤销。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/session.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/csrf.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/session.test.ts`。

  完成标准：随机凭据仅HttpOnly Cookie、库内hash，登录轮换；远程Secure/Path=/无Domain，dev Cookie独立。工程默认绝对8h/空闲2h可配置，后台轮询不续空闲；每请求检查enabled/authVersion及分配。正式写验证Origin+CSRF，logout撤销并清Cookie；预会话流程按T002采用对应保护而不伪造正式session。

  依赖：T004、T005、T006、T011。追溯：FR-001、FR-016、FR-017、FR-020、AC-13、AC-14、AC-17、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T021 [US4] 实现管理员预开员工、邀请与权限配置入口。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/admin/employees.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/admin/identity-invitations.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`。

  完成标准：按T002补全管理员创建预开通员工的受控接口/工具，并实现列表、access更新、邀请生成/撤销/过期；只有admin可管理，不提供公开注册。role/project/directPM从明确输入校验，禁止管理员给自己改成业务角色绕过禁代业务；邀请仅定位员工且不携带可自选权限。凭据不进URL/日志，不自动发送外部消息。

  依赖：T015、T019、T020。追溯：FR-017、FR-020、AC-18、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T022 [US4] 完成pending绑定、管理员核对与重新SSO闭环。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/auth/bindings.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/admin/identity-bindings.ts`。

  完成标准：有效邀请+飞书证明仅建立无业务权限pending态；管理员核对后事务内校验唯一身份/过期/员工有效，消费邀请，失效pending，员工重新SSO才签正式session。拒绝/撤销、身份冲突、无邀请未知人员均拒绝自动开通/合并；首admin仅走T015指定的一次性例外。

  依赖：T019、T020、T021。追溯：FR-001、FR-017、AC-13、AC-14、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T023 [US4] 统一记录范围、角色、金额侧与自提权限策略。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/policy.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/model.d.mts`。

  完成标准：覆盖负责运营、实际审核PM、显式直属只读PM、无归属同事、admin和本人自提PM；管理员业务写统一拒绝，读权不赋写权。自提仅可信role=pm且owner/selfManagedPm/reviewPm匹配，服务器生成标记，不能客户端伪造。模型/命令共同收紧admin旧代提报/报价/拆分能力，禁止旧方法绕过；本人草稿不向admin开放。

  依赖：T008、T012、T020、T021。追溯：FR-002、FR-007、FR-009、FR-012、FR-017、FR-021、AC-14、AC-19、AC-20、AC-21、AC-22、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T024 [US4] 实现按权限过滤的共享查询与DTO投影。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/query-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`。

  完成标准：bootstrap、列表/搜索/统计、提报/订单/视频详情、历史/审计、operations均先定scope再投影；无权资源404，不在嵌套项目/历史/错误中泄漏姓名/金额/文档/可打开ID。分页默认50最大100，capabilities与写策略一致；草稿仅本人，直属PM可见金额但所有业务写false。不开放整workspace导出/PUT。

  依赖：T010、T011、T013、T023。追溯：FR-001、FR-005、FR-017、AC-02、AC-13、AC-14、AC-23。外部条件：无外部账号/云条件门禁。

- [ ] T025 [US4] 保证角色、项目、直属关系变动即时生效。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/admin/employees.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/policy.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/prisma-crm-repository.ts`。

  完成标准：access变动在统一workspace→employee/session锁顺序下更新有效分配/相关project版本、authVersion及撤销会话，记录审计；业务命令锁内重查，收权提交后旧请求不得继续写。历史提交/审核操作者不改写，不从旧payload成员反向恢复权限。

  依赖：T021、T023、T024。追溯：FR-017、FR-018、FR-019、AC-14、AC-15、AC-17、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T026 [US4] 将认证、策略、命令与路由在应用入口真实接通。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/app.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/server.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/package.json`、`/Users/yan/codex/solbridge工作流/crm-backend/package-lock.json`。

  完成标准：按现有锁版本集成Fastify兼容cookie插件并固定具体版本；buildApp/server在测试环境的真实运行路径显式注入session认证和Prisma Repository，业务路由必须经过统一授权、CSRF、Schema与命令管道。x-test-session/浏览器角色切换仅测试进程可用，不进入发布包；登录和写操作有限流/Retry-After，错误脱敏，未ready不接受业务写。

  依赖：T016、T019、T020、T022、T024、T025。追溯：FR-001、FR-016、FR-017、FR-019、FR-020、AC-13、AC-14、AC-17、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T027 [US4] 建立demo/shared显式启动与登录状态。文件：`/Users/yan/codex/solbridge工作流/crm-preview/preview-bootstrap.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/index.html`、`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：8897默认保留原demo；shared显式配置、真实身份和ready成功后仅加载安全bootstrap。shared启动不读写原业务LocalStorage、不seed/upgrade/上传旧值，失败不回退demo；退出清内存投影。仅筛选偏好和不含业务正文的pending key/目标/hash可按workspace+employee隔离保存。

  依赖：T018、T024、T026。追溯：FR-001、FR-016、FR-017、FR-020、AC-13、AC-14、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

- [ ] T028 [US4] 给8897预览增加受控同源API代理。文件：`/Users/yan/codex/solbridge工作流/crm-preview/scripts/preview.py`。

  完成标准：明确shared开关，只向固定127.0.0.1:4101代理/api、/health限定方法，控制body/超时并正确转发Set-Cookie/Origin；不开放任意URL代理或私密目录。/__preview__本机核对来源/mode/release，保留127.0.0.1:8897和原key；云端使用另行受控入口，不发布Python开发服务器。

  依赖：T018、T026、T027。追溯：FR-001、FR-016、FR-020、AC-13、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

- [ ] T029 [US4] 将共享UI读写切为异步命令和服务端投影。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：保留现有页面/抽屉/设计系统，将shared下保存、资料、草稿、审核、报价、拆分、建单及既有视频事件接入统一async适配器；成功响应后刷新授权投影，不先改本地再整库上传。capabilities用于界面可操作性，服务端继续独立鉴权；未接通的写动作不可回落旧本地save。各故事任务补齐具体动作。

  依赖：T018、T024、T027、T028。追溯：FR-001、FR-016、FR-017、FR-020、AC-13、AC-14、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

- [ ] T030 [US4] 实现冲突、失效登录和未知结果的输入保护。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：401在当前页内存保留输入，重登后核对最新记录而不自动重放；403/404不泄漏对象；409/428展示可见最新值供人工核对；422定位字段；429遵守Retry-After；503结果不明保留原key并查Operation，同key同内容才能安全重试。保留保存/放弃/继续编辑的离页保护，失败不显示成功或推进状态。

  依赖：T013、T018、T029。追溯：FR-016、FR-018、FR-019、AC-03、AC-10、AC-15、AC-16、AC-17。外部条件：无外部账号/云条件门禁。

- [ ] T031 [US4] 增加最小测试人员和待绑定管理界面。文件：`/Users/yan/codex/solbridge工作流/crm-preview/admin-users.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`。

  完成标准：沿用设计组件，提供预开员工、启停/角色/项目/直属分配、邀请与pending核对入口；仅admin可达，字段变更使用版本/幂等/CSRF，冲突保留输入。管理界面不出现代提报/代报价/代建单能力；邀请交付由用户安排，不新增自动通知。

  依赖：T021、T022、T025、T029、T030。追溯：FR-017、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T032 [P] [US4] 验证完整策略矩阵和已注册身份/查询接口。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/policy-matrix.test.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/auth.test.ts`。

  完成标准：用策略单测逐个角色/动作/金额侧及跨workspace验证允许/拒绝；已注册身份/管理/查询接口另做HTTP伪造字段、错误泄漏、pending无业务权、身份唯一/邀请重放、admin自改角色和会话撤销测试。尚未实现的提报/报价/成单/视频HTTP矩阵分别由T042/T052/T059/T064完成，最终T089汇合；此处不声称未来端点或真实SSO已通过。

  依赖：T004、T022、T024、T025、T026。追溯：FR-001、FR-002、FR-007、FR-009、FR-012、FR-017、FR-020、FR-021、AC-14、AC-18、AC-20、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T033 [P] [US4] 验证共享模式隔离、错误恢复和管理UI事件。文件：`/Users/yan/codex/solbridge工作流/crm-preview/shared-mode.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/admin-users.test.mjs`。

  完成标准：用隔离浏览器/VM真实事件路径验证shared不读写业务key、不seed、不回落demo，退出清内存；覆盖401/409/422/503输入保护、pending句柄隔离、管理员入口及失败状态。原demo回归仍通过；不得拿注入模拟会话声称真实多人共享已验收。

  依赖：T027、T028、T029、T030、T031。追溯：FR-001、FR-016、FR-017、FR-018、FR-019、FR-020、AC-13、AC-14、AC-15、AC-17、AC-18、AC-23、AC-24。外部条件：无外部账号/云条件门禁。

### 阶段D：US1：运营提报与草稿（P1）

独立验收：草稿→正式提报→审核PM可见；无需推进报价或视频交付。

- [ ] T034 [US1] 补齐必要达人资料与submission-context接口。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/creator-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`。

  完成标准：复用现有达人新增/查重/资料编辑与项目选择，不扩采集或批量导入；GET/PATCH遵守scope/ETag，最新资料与提交快照分开。submission-context返回可参与项目/有效审核名单、creatorVersion、project分配版本及本人草稿id/version或absent；仅给最小安全在途提示，不给他人明细。

  依赖：T023、T024、T025、T026。追溯：FR-002、FR-004、FR-005、FR-006、FR-017、FR-018、AC-02、AC-04、AC-08、AC-14、AC-25、AC-26。外部条件：无外部账号/云条件门禁。

- [ ] T035 [US1] 修正草稿首次初始化、本人唯一和版本保存。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/proposal-draft-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`。

  完成标准：saveProposalDraft首次保存确保集合挂回状态；自然键为workspace+本人+达人+项目，允许不完整且不同人各存一份。首次If-None-Match、更新If-Match，事务维护DraftKey与草稿版本；查询恢复仅本人，同key重放不覆盖另一会话的新内容。

  依赖：T010、T012、T013、T023、T034。追溯：FR-002、FR-003、FR-018、AC-01、AC-02、AC-04、AC-15、AC-25。外部条件：无外部账号/云条件门禁。

- [ ] T036 [US1] 按正式字段实现提交校验且保留可选项。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/schemas.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/proposal-service.ts`。

  完成标准：逐项校验有效邮箱、国家、语言、达人类型、项目、平台/视频类型、总原创数量1—100、支持币种、正的达人总价；运营选择项目内有效审核PM，PM自提需正的对客价草稿。权益/备注可空、草稿可不完整；原始金额先走T009，不静默取整。字段错误422保留输入，无残留正式记录。

  依赖：T009、T011、T023、T034、T035。追溯：FR-004、FR-016、FR-021、AC-02、AC-03、AC-19、AC-25、AC-27。外部条件：无外部账号/云条件门禁。

- [ ] T037 [US1] 对齐单份在途及历史结束/成交后的再次合作。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/proposal-service.ts`。

  完成标准：repeatPermission先检查所有未成单且未明确结束正式提报，再检查历史归属：结束未成单仅原负责人、成交仅当前唯一负责人可新提，旧视频未验收不阻止；无/多归属拒绝猜测。拒审待处理仍占claim；新合作独立编号/方案，草稿不占claim也不互相阻止。

  依赖：T023、T035、T036。追溯：FR-003、FR-006、FR-008、FR-017、AC-04、AC-06、AC-14、AC-26。外部条件：无外部账号/云条件门禁。

- [ ] T038 [US1] 原子提交资料快照、正式提报、占位与草稿消费。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/proposal-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/command-service.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`。

  完成标准：正式submit核对creator/project版本和draftPrecondition；同事务补资料、保留提交人/时间/编号/条件快照、创建提报版本和ActiveClaim、消费对应草稿。草稿absent与实际不符、版本变更或占位冲突409且全部回滚；不覆盖新档案/新草稿。PM自提标记由服务器建立，不伪造审核事件。

  依赖：T012、T013、T014、T034、T035、T036、T037。追溯：FR-002、FR-003、FR-004、FR-005、FR-006、FR-018、FR-019、FR-021、AC-01、AC-02、AC-03、AC-04、AC-15、AC-17、AC-19、AC-25、AC-26。外部条件：无外部账号/云条件门禁。

- [ ] T039 [US1] 接通提报表单、草稿恢复及正式提交事件。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：打开表单先取最新context/版本，角色对应字段和审核名单来自服务端；不完整保存草稿、重登恢复、失败保留输入，正式提交成功后才转详情/待办。达人单独存档与正式提报保持区别；数量/必填/币种错误定位，重复/归属不明只显示安全提示。

  依赖：T029、T030、T034、T035、T038。追溯：FR-002、FR-003、FR-004、FR-006、FR-016、AC-01、AC-02、AC-03、AC-04、AC-17、AC-25、AC-26。外部条件：无外部账号/云条件门禁。

- [ ] T040 [US1] 展示可见提报、审核待办和不可覆盖的提交快照。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`。

  完成标准：列表/详情读取共享DTO，展示唯一编号、当前负责人、审核人、实际提交人、时间和快照；最新达人资料单独展示，历史无快照明确缺失。审核PM能看到分配记录，未授权人员无法通过搜索/详情/计数获得明细。

  依赖：T024、T038、T039。追溯：FR-001、FR-005、FR-017、AC-02、AC-08、AC-13、AC-14。外部条件：无外部账号/云条件门禁。

- [ ] T041 [P] [US1] 验证US1模型边界与重复合作矩阵。文件：`/Users/yan/codex/solbridge工作流/crm-preview/proposal-submission.test.mjs`。

  完成标准：覆盖所有必填逐一缺失、数量0/101、可选为空、首次草稿、不同owner、历史成交+在途、已结束原负责人、多归属、旧视频未验收及新编号不覆盖历史；复用现有测试所需夹具，避免仅镜像实现。

  依赖：T004、T035、T036、T037、T038。追溯：FR-002、FR-003、FR-004、FR-005、FR-006、AC-01、AC-02、AC-03、AC-04、AC-25、AC-26。外部条件：无外部账号/云条件门禁。

- [ ] T042 [P] [US1] 验证US1接口和真实UI事件的失败原子性。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/proposals.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/proposal-ui.test.mjs`。

  完成标准：用注入身份执行US1独立验收：草稿→正式提交→审核PM可见，无需报价/交付；补新资料/新草稿并发版本前提、接口422/409、提交失败不消费草稿、快照不可被后续资料覆盖、字段外传权限拒绝。记录AC-01—04/25—26隔离结果，实库唯一性待T067。

  依赖：T032、T033、T034、T038、T039、T040。追溯：FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-016、FR-017、FR-018、FR-019、AC-01、AC-02、AC-03、AC-04、AC-14、AC-15、AC-17、AC-25、AC-26。外部条件：无外部账号/云条件门禁。

### 阶段E：US2：审核、复审与报价协作（P1）

独立验收：通过/拒审/复审、正式报价与反馈、方案变化；无需建单。

- [ ] T043 [US2] 对齐审核通过/未通过及报价草稿。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`。

  完成标准：仅实际审核PM处理待审运营提报；通过可保存对客价草稿但不占正式轮次，未通过原因必填并保留审核历史；PM自提没有审核步骤/假通过事件，admin业务写拒绝。审核成功更新明确下一待办。

  依赖：T009、T023、T038。追溯：FR-007、FR-008、FR-009、FR-017、FR-021、AC-05、AC-06、AC-14、AC-19、AC-23。外部条件：无外部账号/云条件门禁。

- [ ] T044 [US2] 对齐原记录复审和明确结束的占位行为。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`。

  完成标准：负责运营可补说明原记录复审、不限次数、不自行换审核人；拒审待处理/复审期间保留并核对原claim，只有明确结束或成单释放。reopenSubmission仅适用于未通过待处理，不重开已明确结束终态；异常缺claim走诊断而不静默绕过。

  依赖：T002、T037、T043。追溯：FR-006、FR-008、AC-04、AC-06、AC-26、AC-28。外部条件：无外部账号/云条件门禁。

- [ ] T045 [US2] 贯通分侧正式报价、达人回价和无限轮次。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`。

  完成标准：所有报价比较/继承改走整数分，不保留共享路径的Number/Math.round；运营只达人侧、审核PM只客户侧、自提PM本人两侧。正式报价记录方案/轮次/金额/币种/actor/时间，不设三轮或固定上限；保存草稿不冒充正式记录。正式达人回价成功后立即交负责PM。

  依赖：T009、T023、T043、T044。追溯：FR-009、FR-010、FR-013、FR-021、AC-05、AC-07、AC-20、AC-23、AC-28。外部条件：无外部账号/云条件门禁。

- [ ] T046 [US2] 区分客户还价、客户接受与待办移交。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`。

  完成标准：客户反馈关联当前方案和对应正式轮次；登记客户还价成功立即转达人侧，客户接受另存明确接受价及确认，不以还价/状态文字/报价草稿替代。失败不移交；本人自提由本人承接两侧责任；两侧金额与历史独立不互相覆盖。

  依赖：T045。追溯：FR-009、FR-010、FR-012、FR-013、FR-016、FR-021、AC-07、AC-10、AC-17、AC-21、AC-28。外部条件：无外部账号/云条件门禁。

- [ ] T047 [US2] 实现实质方案变更与旧确认/拆分失效。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`。

  完成标准：平台/类型/权益等实质变更形成新方案并保留旧历史；旧成交确认不能跨版使用，数量/价格变更使旧拆分失效。运营路径回审、PM自提仍免审；按侧白名单限制修改，普通审核PM不能改运营达人价。不得新增合同、终态重开或成交纠错。

  依赖：T043、T045、T046。追溯：FR-009、FR-011、FR-012、FR-014、FR-021、AC-08、AC-10、AC-20、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T048 [US2] 保留建单前条数补正例外并固定版本对应关系。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/schemas.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/quantity-correction.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/quantity-correction-ui.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/contracts/api.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/quantity-correction.md`。

  完成标准：按T002已核实的本机correctVideoQuantity和数量补正专项，完整交付该动作的模型、HTTP白名单/Schema、UI入口及接口/UI验证：纯数量补正沿用同一方案ID及当前合法客户确认、不新增PM再审，升proposal聚合version、记录理由/前后值、清旧拆分，校验项数不变及各项/合计1—100。不能借此改平台/类型/权益/币种/两侧总额或沿用另一方案旧确认，不从报价文本猜条数。当前没有待确认业务阻塞；本任务仍待共享实现/验证，AC-29整体验收不能假通过。

  依赖：T002、T011、T012、T013、T023、T026、T029、T030、T040、T047。追溯：FR-011、FR-012、FR-014、AC-08、AC-10、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T049 [US2] 注册审核报价及方案动作的严格接口白名单。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/schemas.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`。

  完成标准：逐个注册approve/reject、reopenSubmission/acknowledgeRejection、clientQuote、customerOffer/creatorQuoteReply、packageRevision/editCustomerProposal、customerAccept；每个动作有独立schema/状态/角色/侧权限/版本及返回待办。禁止动态调用任意model导出。数量补正correctVideoQuantity的路由和Schema完整归T048，本项完成不依赖该局部动作。

  依赖：T011、T012、T013、T026、T043、T044、T045、T046、T047。追溯：FR-007、FR-008、FR-009、FR-010、FR-011、FR-012、FR-016、FR-017、AC-05、AC-06、AC-07、AC-08、AC-10、AC-14、AC-17、AC-23、AC-28、AC-29。外部条件：无外部账号/云条件门禁。

- [ ] T050 [US2] 接通审核、议价、反馈和方案历史UI。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：分清报价草稿、正式报价、客户还价、客户接受和达人回价；去掉固定轮数误导文案，显示真实当前待办与操作人/时间/方案历史。状态仅随服务端成功响应推进，拒审原因/复审说明可见；实质变更后清晰提示确认/拆分失效，保留原设计系统。数量补正专用入口由T048接通，不属于本项完成条件。

  依赖：T029、T030、T039、T040、T049。追溯：FR-007、FR-008、FR-009、FR-010、FR-011、FR-016、AC-05、AC-06、AC-07、AC-08、AC-17、AC-28、AC-29。外部条件：无外部账号/云条件门禁。

- [ ] T051 [P] [US2] 验证US2无限复审/报价和方案变化规则。文件：`/Users/yan/codex/solbridge工作流/crm-preview/quotation.test.mjs`。

  完成标准：独立已提交夹具覆盖多次复审和超过3轮正式报价、草稿无正式记录、双方金额分开、提交成功才移交、拒审仍在途、明确结束不可重开、不换审核人；分别验证运营实质变更回审、自提免审和条数补正例外/旧拆分失效。

  依赖：T004、T043、T044、T045、T046、T047、T048。追溯：FR-006、FR-007、FR-008、FR-009、FR-010、FR-011、AC-05、AC-06、AC-07、AC-08、AC-28、AC-29。外部条件：无外部账号/云条件门禁。

- [ ] T052 [P] [US2] 验证US2接口权限、并发版本与UI输入恢复。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/quotations.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/quotation-ui.test.mjs`。

  完成标准：无需建单即可验证T049/T050所列审核报价及实质方案变更动作；逐个拒绝admin/无权人员/跨侧金额/旧版本，重放不重复记历史。UI错误、失效登录或保存失败保留输入且不移交；正式报价/客户反馈历史actor、时间、方案与轮次可追溯。数量补正的接口/UI验收归T048，完整AC-29还须T051；本项不得把未做补正写成通过。

  依赖：T032、T033、T049、T050。追溯：FR-007、FR-008、FR-009、FR-010、FR-011、FR-016、FR-017、FR-018、FR-019、AC-05、AC-06、AC-07、AC-08、AC-14、AC-15、AC-17、AC-23、AC-28、AC-29。外部条件：无外部账号/云条件门禁。

### 阶段F：US3：完整且唯一成单（P1）

独立验收：已确认提报生成两条原创视频订单，核对权限、金额、终态与防重。

- [ ] T053 [US3] 实现双侧整数分分摊与手动拆分校验。文件：`/Users/yan/codex/solbridge工作流/crm-preview/allocation.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/allocation.d.mts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`。

  完成标准：默认按最终原创数量和稳定videoOrdinal商余均分，100.01/150.01分两条为50.01+50.00及75.01+75.00，分发不增原创数。手动拆分必须当前方案/总额、n项非负分且sum精确相等；运营仅达人侧、审核PM仅客户侧、自提PM本人两侧。金额/数量变化后旧拆分不可用。

  依赖：T009、T023、T047。追溯：FR-009、FR-013、FR-014、AC-11、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T054 [US3] 统一成交前置、最终价格及建单后锁定。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/order-service.ts`。

  完成标准：只允许负责运营/自提PM基于当前方案的正式报价、客户明确接受与达人接受成单；订单继承最终有效达人价和客户接受价，同币种且两总额正。所有金额比较/继承用整数分；负Margin给非阻断warning及差额。普通改价/撤单/纠错入口不在首轮共享白名单，旧单独确认兼容入口同样不能跳步。

  依赖：T023、T046、T047、T053。追溯：FR-012、FR-013、FR-014、FR-015、FR-021、AC-09、AC-10、AC-12、AC-21、AC-23、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T055 [US3] 原子完成达人确认、订单、视频与提报终态。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/order-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/command-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/prisma-crm-repository.ts`。

  完成标准：confirmAndCreateOrder在同事务完成当前版达人确认、唯一订单、原创视频组、拆分/金额快照、终态、释放claim、版本、投影、审计和Operation。新key重复请求须先授权并比对请求最终方案，匹配返回原订单reused而不新增版本/有效建单审计；同key异内容仍409。兼容createOrder显式携带最终versionId，或仅在有可信完整聚合历史映射时兼容空body；缺方案依据422，已知方案不符409，不能套当前方案猜测。按T002同步契约。

  依赖：T010、T013、T014、T038、T054。追溯：FR-006、FR-012、FR-013、FR-014、FR-015、FR-019、AC-09、AC-10、AC-11、AC-12、AC-16、AC-17、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T056 [US3] 接通成单、拆分和只读订单/视频接口。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/schemas.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/dto.ts`。

  完成标准：注册split、confirmAndCreateOrder及受限createOrder兼容动作；返回orderId/proposalId/deliveryIds/版本/reused/NEGATIVE_MARGIN，权限与拆分侧在服务端核验。提报已成单仍可查，普通报价锁定；视频流转不反写提报终态。不注册交接、price/correct-pricing、取消恢复等越界动作。

  依赖：T024、T049、T053、T054、T055。追溯：FR-012、FR-013、FR-014、FR-015、FR-017、FR-019、AC-09、AC-10、AC-11、AC-12、AC-14、AC-16、AC-23、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T057 [US3] 贯通成交金额显示及负Margin非阻断提示。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/money.mjs`。

  完成标准：双方总价/分项/差额使用精确字符串格式化，客户接受价与客户报价/还价清楚区分；负Margin显示金额与币种且允许负责人继续确认/建单，不另加管理员审批。非法精度、币种不一致或非正总额字段定位，不能改写已保存结果。

  依赖：T009、T030、T050、T053、T054、T056。追溯：FR-009、FR-013、FR-014、FR-016、AC-11、AC-17、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T058 [US3] 接通拆分、建单和不可逆转的提报终态UI。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/api-client.mjs`。

  完成标准：按本人侧展示拆分编辑能力，提交前核对当前方案和达人接受；请求中防重复操作，网络结果未知用原operation查询。成功后显示原订单与已生成订单状态、锁普通改价；刷新/重试不新增，视频进度独立，不把提报改成视频验收状态。

  依赖：T030、T056、T057。追溯：FR-012、FR-013、FR-014、FR-015、FR-016、FR-019、AC-09、AC-10、AC-11、AC-12、AC-16、AC-17、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T059 [P] [US3] 验证US3金额、确认前置和幂等模型/API结果。文件：`/Users/yan/codex/solbridge工作流/crm-preview/order-pricing.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/orders.test.ts`。

  完成标准：覆盖双方确认缺失/旧版、无权成单、合法负Margin、三位小数/空/非正/币种不一致、0分子项、总和/侧权限、分发不增原创数，以及同/异key复用和一次有效审计。兼容createOrder另测同If-Match但方案不同、过期If-Match且同方案已成单、空body无可信映射；以两条原创订单查金额/数量/终态，隔离测试不代替T068真实10并发。

  依赖：T004、T053、T054、T055、T056。追溯：FR-009、FR-012、FR-013、FR-014、FR-015、FR-017、FR-019、AC-09、AC-10、AC-11、AC-12、AC-16、AC-23、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T060 [P] [US3] 验证US3界面提示、失败保护与视频独立终态。文件：`/Users/yan/codex/solbridge工作流/crm-preview/order-ui.test.mjs`。

  完成标准：用实际事件处理器验证负Margin看得到且不阻断、仅能拆本人侧、失败不残留确认/订单/视频、commit后丢响应能进入核对状态、重新查询仅原订单；推进合成视频状态后提报仍已成单。

  依赖：T033、T057、T058。追溯：FR-012、FR-013、FR-014、FR-015、FR-016、FR-019、AC-09、AC-10、AC-11、AC-12、AC-16、AC-17、AC-27、AC-30。外部条件：无外部账号/云条件门禁。

### 阶段G：US5：PM自提与已有视频权限兼容（P1）

独立验收：本人自提免审、双侧报价、合法成单、既有本人视频到验收；不扩建视频模块。

- [ ] T061 [US5] 复用并收紧PM本人自提的服务器身份边界。文件：`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/proposal-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/policy.ts`。

  完成标准：在既有PM自提实现上校验真实身份三字段一致，由服务器生成owner/reviewPM/selfManagedPM；本人草稿和双方价可用，免审核且无假approve事件。普通审核PM不能因此改其他运营达人价/建单/视频，客户端伪造标记拒绝；保留已有代码，只修共享接入差距。

  依赖：T023、T038、T043、T054。追溯：FR-002、FR-004、FR-007、FR-009、FR-012、FR-017、FR-021、AC-19、AC-20、AC-21、AC-22。外部条件：无外部账号/云条件门禁。

- [ ] T062 [US5] 接通PM自提正式报价、客户接受与本人建单。文件：`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/src/quotation-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/order-service.ts`。

  完成标准：本人保存两价仍待正式对客报价，正式报价后等待客户反馈，客户接受当前方案再由本人确认达人/建单；不转交运营，不把免审视为成交。本人方案变更免提报再审但旧确认失效，双方拆分各自合计正确，重登后读取共享结果。

  依赖：T045、T046、T047、T053、T055、T058、T061。追溯：FR-007、FR-009、FR-011、FR-012、FR-013、FR-014、FR-021、AC-19、AC-20、AC-21、AC-27、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T063 [US5] 把既有视频动作接到同源命令并保留本人责任。文件：`/Users/yan/codex/solbridge工作流/crm-backend/src/delivery-service.ts`、`/Users/yan/codex/solbridge工作流/crm-backend/src/crm.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/model.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/app.mjs`。

  完成标准：复用既有Brief/准备资料、脚本、成片、发布、退回与验收动作白名单，保留原运营/审核PM职责及自提PM本人到最终验收权；不新增通用视频工作流。单视频动作升视频版本，共用准备资料校验订单版本并升受影响视频版本；完成视频只读，admin不得代业务，提报终态不随视频改变。

  依赖：T023、T024、T029、T055、T056、T061、T062。追溯：FR-012、FR-015、FR-017、FR-018、FR-020、FR-021、AC-12、AC-14、AC-18、AC-22、AC-23。外部条件：无外部账号/云条件门禁。

- [ ] T064 [US5] 补跑PM专项模型/API及其他记录不扩权回归。文件：`/Users/yan/codex/solbridge工作流/crm-preview/pm-self-managed.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/video-v06.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/pm-self-managed.test.ts`。

  完成标准：核对并保留既有PM专项，增加真实人员上下文下自提免审、两侧报价、同版确认成单、本人视频至终验收和完成只读；本人实质方案变更免审但旧确认/拆分失效；对其他运营记录/伪造标记/管理员写逐一拒绝。保留原视频退回重提流程，不把历史193/16当本轮结果。

  依赖：T004、T061、T062、T063。追溯：FR-002、FR-007、FR-009、FR-011、FR-012、FR-015、FR-017、FR-020、FR-021、AC-12、AC-14、AC-19、AC-20、AC-21、AC-22、AC-23、AC-29。外部条件：无外部账号/云条件门禁。

- [ ] T065 [US5] 验证PM共享UI全链与视频兼容边界。文件：`/Users/yan/codex/solbridge工作流/crm-preview/pm-shared-ui.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/pm-compatibility.md`。

  完成标准：用合成记录独立执行AC-19—22：本人自提→正式报价→客户接受→达人确认/建单→既有视频最终验收，并核对他人记录不扩权、完成只读、提报已成单不改变。标明本机/注入测试结果；真实飞书会话证据由T089补齐，不能要求所有订单视频验收完才验收成单主线。

  依赖：T033、T061、T062、T063、T064。追溯：FR-001、FR-012、FR-015、FR-020、FR-021、AC-13、AC-18、AC-19、AC-20、AC-21、AC-22。外部条件：无外部账号/云条件门禁。

### 阶段H：真实MySQL、故障、浏览器与组合验证

X02材料齐备后，按每项代码依赖提前开始；不必等云域名、飞书或全部UI完成。

- [ ] T066 建立并执行独立MySQL集成测试入口。文件：`/Users/yan/codex/solbridge工作流/crm-backend/package.json`、`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/harness.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/mysql-environment.md`。

  完成标准：在与目标版本匹配的独立本机/CI MySQL8.0测试库核对隔离身份与授权，应用T007已审查增量迁移并显式执行T015初始化；创建实际test:integration脚本，用同一Prisma Repository及至少两条实际连接。记录版本/环境UUID/运行与迁移权限和日志，不使用SQLite/内存替代，不连接正式库。

  依赖：T007、T015、T016、T017、T026。追溯：FR-001、FR-003、FR-006、FR-012、FR-018、FR-019、FR-020、AC-13、AC-15、AC-16、AC-17、AC-18。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T067 验证真实草稿与在途唯一竞争。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/proposal-races.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/mysql-proposal-races.md`。

  完成标准：至少双连接验证同一owner首次草稿只一份、不同owner各一份；跨actor同达人同项目正式提交仅一在途；有历史成交仍先拦在途。拒审/复审占位保持，明确结束/成单释放与新提交竞态不出现双在途；草稿前提不匹配不消费新草稿。

  依赖：T035、T037、T038、T044、T055、T056、T066。追溯：FR-003、FR-006、FR-008、FR-018、FR-019、AC-01、AC-02、AC-04、AC-06、AC-15、AC-17、AC-25、AC-26、AC-28。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T068 验证同key与异key各10次真实并发建单。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/order-races.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/mysql-order-races.md`。

  完成标准：分别以同key/同内容和不同key向同提报发10个并发请求，重查实际库只一订单、一组正确原创视频、一次有效成单审计，双侧总和准确、终态一致。另测同key异内容409、不同最终方案409及重复成功不增加聚合版本；记录所有请求及唯一约束结果。

  依赖：T053、T055、T056、T066、T067。追溯：FR-012、FR-013、FR-014、FR-015、FR-019、AC-09、AC-10、AC-11、AC-12、AC-16、AC-27、AC-30。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T069 验证事务中断、commit后丢响应及原key恢复。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/fault-recovery.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/mysql-fault-recovery.md`。

  完成标准：仅在隔离库于确认后、视频写后、投影更新后注入异常/中断事务连接，重启后确认提交前故障全回滚；模拟已commit代理丢响应及请求仍在飞时查询不到Operation，同key同内容恢复仍只一组结果。区分已回滚可有限重试与提交未知，日志无敏感值。

  依赖：T066、T068。追溯：FR-012、FR-016、FR-019、AC-10、AC-12、AC-16、AC-17。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T070 验证版本冲突与管理员撤权竞态。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/version-permission-races.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/mysql-version-permissions.md`。

  完成标准：两人旧版写后者409；无关聚合变化不误冲突；项目审核名单/档案/本人草稿变动使旧提交前提失效。实际双连接竞争撤权与业务写，撤权提交后旧身份不得写；重登/撤权后旧Operation只返回当前可见DTO；GET不改变revision。

  依赖：T025、T066、T069。追溯：FR-003、FR-004、FR-016、FR-017、FR-018、FR-019、AC-02、AC-14、AC-15、AC-17、AC-24。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T071 贯通全部金额入口与审计历史的组合回归。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/integration/money-audit.test.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/money-audit.md`。

  完成标准：对初始价、对客草稿/正式报价、客户还价/接受价、达人回价、方案变更、拆分、建单逐个测大整数/非法精度/总额及币种；验证负Margin显示放行、稳定余分、0分子项、历史不被普通改价覆盖，正式审核/报价/确认/建单均有真实actor/时间/方案。

  依赖：T051、T052、T059、T060、T066、T070。追溯：FR-004、FR-005、FR-009、FR-010、FR-011、FR-012、FR-013、FR-014、FR-019、AC-03、AC-05、AC-07、AC-08、AC-09、AC-10、AC-11、AC-25、AC-27、AC-28、AC-29、AC-30。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T072 验证浏览器原数据保护与本机端到端共享接入。文件：`/Users/yan/codex/solbridge工作流/crm-preview/tests/shared-browser.test.mjs`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/browser-storage-regression.md`。

  完成标准：使用独立测试浏览器配置和合成哨兵覆盖原业务key（含solbridge-video-v06-preview-only），逐字比较shared前后并监测业务key读写、seed/upgrade/上传均未发生；保留demo回归。实API/独立测试DB中刷新、退出/重登测试会话、重启API后数据一致；明确这仍不替代真实员工SSO验收，不打开用户原业务浏览器记录试错。

  依赖：T028、T033、T042、T052、T060、T065、T066、T070。追溯：FR-001、FR-016、FR-020、FR-021、AC-01、AC-13、AC-17、AC-18、AC-19、AC-20、AC-21、AC-22。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T073 测量小规模目标负载与锁等待行为。文件：`/Users/yan/codex/solbridge工作流/crm-backend/tests/performance/shared-workspace.ts`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/performance-local.md`。

  完成标准：以5—20合成用户、同时2—5写请求测p95、事务耗时/等待、超时和错误；对照p95≤2秒、短事务目标≤1秒/超时5秒的工程目标，记录实际数据和平台。未达标先定位串行锁/查询/DTO瓶颈，不提前引入分布式重构；本机结果不代替Windows目标机容量。

  依赖：T066、T070、T071。追溯：FR-001、FR-016、FR-018、FR-019、AC-13、AC-15、AC-16、AC-17。外部条件：X02材料就绪且动作在既有授权范围内。

- [ ] T074 汇总本地实现证据并冻结待集成缺口。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/implementation-review.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/validation.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/tasks.md`。

  完成标准：逐个FR/AC记录本轮源码版本、实际命令、退出码、日志及未完成原因；回归、注入API、真实MySQL、浏览器和真实SSO分层标识。可确认本地已验证项；外部未完成保持待验。合并前核对既有未提交修改、范围和测试数据保护，未验证业务任务不靠历史数字勾选。

  依赖：T041、T042、T051、T052、T059、T060、T064、T065、T067、T068、T069、T070、T071、T072、T073。追溯：FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-007、FR-008、FR-009、FR-010、FR-011、FR-012、FR-013、FR-014、FR-015、FR-016、FR-017、FR-018、FR-019、FR-020、FR-021、AC-01、AC-02、AC-03、AC-04、AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、AC-11、AC-12、AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-19、AC-20、AC-21、AC-22、AC-23、AC-24、AC-25、AC-26、AC-27、AC-28、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

### 阶段I：受控验收环境、Windows、真实SSO与业务验收

T075材料整理可提前并行；其余按具体门禁推进。先准备受控测试环境，再执行真实验收。

- [x] T075 [P] 建立外部门禁材料与责任人台账。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/environment-gates.md`。

  完成标准：逐项X01—X10登记责任角色、材料状态、证据位置和阻塞任务；历史截图摘要只标2026-10-20时点，不宣称实时云状态。材料准备与实际验证分别记录；公司管理员可代查/代配，不索取聊天明文密钥。可与本地开发并行推进，域名/飞书缺失不阻塞模型/API/UI。X10分别记录受控验收环境准备和最终开放测试的已授权范围/窗口。

  依赖：T001、T002。追溯：FR-001、FR-017、FR-020、AC-13、AC-14、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

  执行证据（2026-10-20）：[environment-gates.md](verification/environment-gates.md)已完整登记X01—X10，责任角色与具体人/材料待确认分开、材料与实际验证分开；保留截图/DNS摘要时间边界，列明阻塞/可继续范围和下一材料。X10-A受控验收准备与X10-B最终开放的授权/窗口均待确认，未由本批开发授权推导。台账工作完成，十项X门禁均未标实际通过。

- [ ] T076 编写Windows配对构建、服务、IIS及恢复手册。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/`、`/Users/yan/codex/solbridge工作流/crm-preview/release/release-manifest.schema.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/quickstart.md`。

  完成标准：定义PowerShell命令/配置模板、精确Node与WinSW候选版本/校验、最小服务账号/NTFS ACL、绝对CA/配置路径、固定loopback4101、IIS静态允许清单/固定反代、停止排空、日志和维护503。写出无symlink/多项切换非原子的中断恢复步骤；先完成可审查脚本/手册，是否在ECS执行由对应已授权窗口和材料决定。

  依赖：T002、T016、T026、T028、T075。追溯：FR-001、FR-016、FR-019、FR-020、AC-13、AC-17、AC-18。外部条件：无外部账号/云条件门禁。

- [ ] T077 在授权范围内完成后端私有版本管理和配对基线。文件：`/Users/yan/codex/solbridge工作流/crm-backend/.gitignore`、`/Users/yan/codex/solbridge工作流/crm-preview/release/release-manifest.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/repository-pair.md`。

  完成标准：核对X09现有授权，后端原位单独纳管，审查忽略真实.env、凭据、备份和verification/private等；保留前后端相邻目录，不初始化父目录或夹带无关工具。仅提交本特性明确改动，保留用户其他工作；记录两端可重现SHA及干净的发布输入，工作区历史HEAD不直接当发布版本。

  依赖：T074、T075。追溯：FR-020、AC-18。外部条件：X09材料就绪且动作在既有授权范围内。

- [ ] T078 构建不可变Windows配对制品并核验内容。文件：`/Users/yan/codex/solbridge工作流/crm-preview/release/`、`/Users/yan/codex/solbridge工作流/crm-backend/scripts/build-release.ps1`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/release-build.md`。

  完成标准：按T077产出的两个SHA在Windows x64受控构建环境保持相邻目录，锁依赖、生成对应Prisma Client/引擎，运行组合类型/模型/API回归。独立获准Windows CI需X09；若选现有ECS构建，另须X01材料和相应授权。包包含后端dist及前端model全部运行时相对依赖（含money/allocation）；manifest记OS/arch/Node、两SHA、契约/schema/锁文件/产物hash，前端无锁文件记none。静态包不含specs/.git/.env/备份/凭据，不复制Darwin node_modules。

  依赖：T009、T053、T063、T074、T076、T077。追溯：FR-001、FR-020、FR-021、AC-13、AC-18、AC-22。外部条件：X09材料就绪且动作在既有授权范围内。

- [ ] T079 在现有Windows目标机核验平台与运行前提。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/windows-platform.md`、`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/verify-platform.ps1`。

  完成标准：X01材料齐备且相应动作已授权后，先盘点用途/现有服务/端口/容量/可用管理通道/工具许可；使用有摘要的受控源码快照/兼容性探针验证Windows2022 x64、锁定Node24/Fastify5.12.7/Prisma6.19.3组合、路径含空格及工作目录，无须等待X09或最终发布包。管理员核实管理来源/到期账务；失败记录原因/修复成本，不默认重装/WSL/购买。最终候选配对包在T078/T082另行复验，前置平台结果不冒充制品验收。

  依赖：T075、T076。追溯：FR-001、FR-020、AC-13、AC-18。外部条件：X01材料就绪且动作在既有授权范围内。

- [ ] T080 核验RDS独立账号、私网与同栈严格TLS。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/verify-rds.ps1`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/rds-connection-tls.md`。

  完成标准：DB/云管理员准备独立测试库、分离运行/迁移账号和最小ECS来源；核对用途/容量、CURRENT_USER/DATABASE/版本/脱敏GRANT。受保护DNS+可信CA+Prisma6显式strict实测连接成功；同栈错误CA、可达但证书名不符、缺TLS/明文须证明连接本身拒绝且ready503。此时未初始化的业务ready可仍503，T082后才验证200，不能拿缺schema造成的503冒充TLS负测。运行账号拒DDL/正式schema，不开数据库公网或关闭校验。

  依赖：T005、T016、T075、T079。追溯：FR-001、FR-016、FR-017、FR-020、AC-13、AC-14、AC-17、AC-18、AC-24。外部条件：X01、X03、X04材料就绪且动作在既有授权范围内。

- [ ] T081 落实每日备份、独立副本与迁移前恢复点。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/backup-policy-evidence.md`、`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/backup-runbook.md`。

  完成标准：按X05核定每日及发布前备份、保留/释放策略、独立可恢复副本格式/失败域/ACL/费用及责任人；实际执行并积累成功记录。原二/四/六快照、7天日志、PITR关不冒充每日可恢复；首次环境迁移前取得对应恢复点，空测试库也记录确证和回退方法。恢复能力须T087实测后才通过，不用快照条目替代。

  依赖：T075、T080。追溯：FR-001、FR-019、FR-020、AC-13、AC-17、AC-18。外部条件：X03、X05材料就绪且动作在既有授权范围内。

- [ ] T082 准备受控隔离验收环境并应用已审迁移。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/prepare-acceptance.ps1`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/acceptance-environment.md`。

  完成标准：在X10已涵盖的验收准备窗口，核对T078配对包、T080目标、T081恢复点和既有migration状态，先演练再应用必要expand迁移；用T015显式初始化合成工作区及指定admin employee，已有环境不覆盖。正确配置启动并验证环境/readiness、权限/投影/金额与关键实库冒烟；这是测试范围的受控验收环境准备，后续先真实验收再最终开放，不留“先验收才能首次部署”的循环。

  依赖：T007、T015、T016、T075、T078、T079、T080、T081。追溯：FR-001、FR-012、FR-013、FR-014、FR-017、FR-018、FR-019、FR-020、AC-09、AC-11、AC-13、AC-15、AC-16、AC-17、AC-18、AC-24。外部条件：X01、X03、X04、X05、X08、X09、X10材料就绪且动作在既有授权范围内。

- [ ] T083 验证Windows服务权限、启停排空与恢复。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/windows-service.md`。

  完成标准：在已授权验收环境使用经准入/校验的服务包装器和低权账号，实测开机自启、停止/排空、连接释放、异常恢复、API重启持久与NTFS ACL；配置/CA在静态根外，服务不能读取正式配置。包装器若强杀，需证明未提交事务回滚、已提交Operation可查；不能把SIGTERM代码存在视为通过。

  依赖：T016、T076、T079、T082。追溯：FR-001、FR-016、FR-019、FR-020、AC-13、AC-17、AC-18。外部条件：X01、X03、X04、X10材料就绪且动作在既有授权范围内。

- [ ] T084 验证HTTPS静态入口和IIS同源反代。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/iis-config/`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/https-proxy.md`。

  完成标准：管理员确认最终测试子域名、现有解析/备案适用性与证书后，固定反代/api与/health到回环4101；验证证书链/主机名、Host/Origin、Set-Cookie、Secure/HttpOnly、no-store、CSRF、body/超时、受控代理头和上游故障真实503。静态允许清单不含私密文件，远程/__preview__只给mode/release，前后端releaseId一致；不把8897公开。

  依赖：T075、T076、T078、T082、T083。追溯：FR-001、FR-016、FR-017、FR-020、AC-13、AC-14、AC-17、AC-18。外部条件：X01、X06、X09、X10材料就绪且动作在既有授权范围内。

- [ ] T085 配置并核验测试飞书应用与实际人员分配。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/feishu-configuration.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/test-role-matrix.md`。

  完成标准：企业/CRM测试管理员按现有授权提供测试app/tenant、最小身份scope、可用范围、最终HTTPS精确回调及受控secret引用，核验当前官方参数；明确运营A/B、审核PM、直属PM、自提PM、admin的员工/项目/直属分配。未知身份不自动建员工，不申请无关通讯录/消息权限，正式应用与测试分离。

  依赖：T019、T021、T022、T075、T084。追溯：FR-001、FR-017、FR-020、AC-13、AC-14、AC-18、AC-23、AC-24。外部条件：X06、X07、X08材料就绪且动作在既有授权范围内。

- [ ] T086 执行真实SSO、首次绑定和即时撤权验收。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/sso-binding-acceptance.md`。

  完成标准：先完成指定首admin一次性真实身份绑定并关闭引导，再执行普通员工邀请→飞书pending→管理员确认→员工重新SSO。验证无邀请/跨租户/重复身份/过期/重放拒绝，pending无业务数据；启停、角色/项目收回后会话立即失效，前端篡改role无效。证据只保留脱敏身份/步骤/结果，不记录secret/token。

  依赖：T015、T020、T021、T022、T025、T026、T082、T084、T085。追溯：FR-001、FR-017、FR-020、AC-13、AC-14、AC-18、AC-23、AC-24。外部条件：X01、X03、X04、X06、X07、X08、X10材料就绪且动作在既有授权范围内。

- [ ] T087 实际恢复到独立目标并校验业务一致性。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/restore-drill.md`、`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/restore-runbook.md`。

  完成标准：按已授权隔离目标与费用范围恢复可用备份，保留原副本；核对payload、草稿/在途/订单投影、版本、审计、角色、金额和唯一性，ready及双会话读写正常。记录恢复点/丢失窗口/实际耗时/hash/操作者，目标RPO≤24h/RTO≤4h在实测后评价，未达标列整改。新收费目标仅在既有资源授权覆盖时创建，否则只挂起此任务。

  依赖：T014、T066、T081、T082、T083、T086。追溯：FR-001、FR-012、FR-013、FR-014、FR-017、FR-018、FR-019、FR-020、AC-09、AC-11、AC-12、AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-24。外部条件：X03、X04、X05、X08、X10材料就绪且动作在既有授权范围内。

- [ ] T088 演练配对切换中断、schema兼容及服务恢复。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/release.ps1`、`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/rollback.ps1`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/release-recovery-drill.md`。

  完成标准：受控演练维护停写→排空→成套切IIS静态/反代及服务路径→ready→冒烟；模拟Windows文件占用和多处切换中断，保持维护503且不混版。只有兼容schema才回切旧配对包，不兼容则前向修复；首次上线无旧包可回时关闭共享入口，不回落demo。数据恢复另用T087，禁止自动DROP/逆迁移。

  依赖：T076、T078、T082、T083、T084、T087。追溯：FR-001、FR-012、FR-016、FR-019、FR-020、AC-12、AC-13、AC-16、AC-17、AC-18。外部条件：X01、X05、X09、X10材料就绪且动作在既有授权范围内。

- [ ] T089 由真实人员逐项执行AC-01—30及共享权限矩阵。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/uat-ac-results.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/uat-permission-matrix.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/performance-windows.md`。

  完成标准：在同一已标识候选release的HTTPS隔离环境，运营与审核PM独立浏览器完成全链，每步刷新/退出重登及API重启仍一致；第三人直接请求也不泄漏。逐条AC含非法输入、冲突、10次成单、负Margin/分侧拆分/无限轮次、PM本人已有视频至验收及他人隔离；每格角色权限有结果。复测目标机容量，保留原key保护证据；未执行项写待验，不用截图界面/注入测试替代。

  依赖：T074、T082、T083、T084、T085、T086、T087、T088。追溯：FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-007、FR-008、FR-009、FR-010、FR-011、FR-012、FR-013、FR-014、FR-015、FR-016、FR-017、FR-018、FR-019、FR-020、FR-021、AC-01、AC-02、AC-03、AC-04、AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、AC-11、AC-12、AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-19、AC-20、AC-21、AC-22、AC-23、AC-24、AC-25、AC-26、AC-27、AC-28、AC-29、AC-30。外部条件：X01、X03、X04、X05、X06、X07、X08、X09、X10材料就绪且动作在既有授权范围内。

### 阶段J：验收闭合、最终测试发布与交接

发布与已验收候选制品对应；只在既有授权覆盖的测试窗口执行。

- [ ] T090 按SC-001—008闭合缺陷并固定验收候选版本。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/acceptance-summary.md`、`/Users/yan/codex/solbridge工作流/crm-preview/release/release-manifest.json`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/validation.md`。

  完成标准：汇总全部SC的实际结果和AC证据、角色矩阵、并发/金额/恢复/原数据保护/Windows目标性能；缺陷修复后仅重跑受影响项和必要组合回归。任何代码/契约/schema变化须更新配对制品与相关证据，不能让验收针对旧SHA。PM视频兼容仅验证已有职责，不要求所有订单视频交付完成。

  依赖：T074、T078、T089。追溯：FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-007、FR-008、FR-009、FR-010、FR-011、FR-012、FR-013、FR-014、FR-015、FR-016、FR-017、FR-018、FR-019、FR-020、FR-021、AC-01、AC-02、AC-03、AC-04、AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、AC-11、AC-12、AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-19、AC-20、AC-21、AC-22、AC-23、AC-24、AC-25、AC-26、AC-27、AC-28、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

- [ ] T091 完成测试发布材料和逐门禁放行检查。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/release-readiness.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/environment-gates.md`。

  完成标准：在具体配对候选版本上核对X01/X03—X10验证证据及X02本地实库结果，真实SSO/完整权限、严格TLS、每日备份/独立恢复、平台、金额/并发及回退均有证据；登记已授权最终开放窗口、责任人和实际资源成本。缺项写明阻塞范围并保留本地成果，不把待验改为通过或要求用户重答既定业务。

  依赖：T075、T080、T081、T086、T087、T088、T089、T090。追溯：FR-001、FR-017、FR-019、FR-020、AC-13、AC-14、AC-16、AC-17、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T092 在已授权窗口成套发布已验收的共享测试版本。文件：`/Users/yan/codex/solbridge工作流/crm-backend/ops/windows/release.ps1`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/test-release.md`。

  完成标准：使用T090固定制品，发布前额外备份与恢复点、维护停写/排空，核对已应用migration不重复执行；仅应用该版本已演练必要增量，成套切换两端，核验releaseId/环境/schema/ready后做真实登录和核心业务冒烟。失败保持503并按T088已验证方案恢复，成功才开放命名测试范围；不部署production或导入现有浏览器数据。

  依赖：T078、T088、T090、T091。追溯：FR-001、FR-012、FR-016、FR-019、FR-020、FR-021、AC-09、AC-12、AC-13、AC-17、AC-18、AC-21、AC-22。外部条件：X01、X03、X04、X05、X06、X07、X08、X09、X10材料就绪且动作在既有授权范围内。

- [ ] T093 复核发布后独立会话、权限和关键业务结果。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/post-release-smoke.md`。

  完成标准：在最终release用合成测试记录重查运营→审核报价→成单、PM自提、刷新/重登/API重启持久、负Margin提示、重复建单及无权人员HTTP拒绝；核对前后端版本、错环境不可写和原数据未导入。记录实际结果与残余限制，不能仅凭health200宣布业务可用。

  依赖：T092。追溯：FR-001、FR-012、FR-013、FR-015、FR-017、FR-020、FR-021、AC-09、AC-12、AC-13、AC-14、AC-18、AC-19、AC-20、AC-21、AC-22、AC-27。外部条件：X07、X08、X10材料就绪且动作在既有授权范围内。

- [ ] T094 交接测试运行、账号职责、备份和故障处理。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/quickstart.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/operations-handover.md`。

  完成标准：交付实际HTTPS入口、适用版本、命名测试范围、管理员/运维责任、监控/日志位置、每日备份检查、证书/会话/员工收权流程、到期账务提醒责任及故障/恢复步骤；凭据只给受控引用。说明本轮为小规模测试版和真实测得的恢复/性能范围，不扩充为生产容量承诺。

  依赖：T081、T087、T088、T093。追溯：FR-001、FR-017、FR-019、FR-020、AC-13、AC-14、AC-17、AC-18、AC-24。外部条件：无外部账号/云条件门禁。

- [ ] T095 追加当前完成记录并保留历史审查原件。文件：`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/tasks.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/evidence.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/checklists/implementation-review.md`、`/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/verification/handover-status.md`。

  完成标准：只对已执行且满足标准的任务勾选，附对应SHA/release/环境/日志与执行时间；未做或外部受阻任务维持未完成并记录原因。追加当前实施/验收/发布结论，保留旧source-review、stage5基线、final-review/plan-review的阶段含义，不伪造历史pass标记。交接清楚剩余工作及负责人。

  依赖：T090、T091、T092、T093、T094。追溯：FR-001、FR-002、FR-003、FR-004、FR-005、FR-006、FR-007、FR-008、FR-009、FR-010、FR-011、FR-012、FR-013、FR-014、FR-015、FR-016、FR-017、FR-018、FR-019、FR-020、FR-021、AC-01、AC-02、AC-03、AC-04、AC-05、AC-06、AC-07、AC-08、AC-09、AC-10、AC-11、AC-12、AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-19、AC-20、AC-21、AC-22、AC-23、AC-24、AC-25、AC-26、AC-27、AC-28、AC-29、AC-30。外部条件：无外部账号/云条件门禁。

## 6. 外部门禁与未齐时可继续的工作

下表沿用deployment-compatibility中X01—X10的含义，并明确材料准备与实际验证的先后。材料齐备不等于任务已验收；真实验证由表内任务完成后再关闭该门禁。所有当前状态均须本机/环境负责人核对，本文件没有将任一外部条件标为已满足。

| ID | 责任角色 | 需要的材料/决定 | 具体阻塞与验证落点 | 未齐仍可做 |
|---|---|---|---|---|
| X01 | 公司服务器管理员、账号/预算负责人 | Windows用途/现有负载/工具许可、可用管理通道和回退联系人、管理来源收敛方案、到期/实际账务 | 现有ECS平台、服务/IIS及运行演练；T079/T083/T084/T092 | 模型/API/UI、离线手册、合成夹具 |
| X02 | 开发/CI环境管理者 | 独立MySQL8.0实例、测试库/账号/环境UUID及执行权限 | 真实本机/CI并发、唯一性、故障与持久化；T066—T073 | 模型、注入API、前端事件测试 |
| X03 | 数据库管理员 | RDS用途/数据范围/容量盘点、独立测试库、运行/迁移分离账号与最小GRANT | RDS连接、实际迁移/持久化；T080/T082 | 本地开发与X02实库 |
| X04 | 云/数据库管理员 | 必要ECS私网来源、受保护主机名、可信CA、TLS配置及影响范围 | ECS→RDS、实际Prisma正负TLS证据；T080后放行相关云接入 | 本机API/UI、X02实库；不再等待VPC详情权限 |
| X05 | 数据库/运维/预算负责人 | 每日与发布前备份策略、保留/释放规则、独立副本/恢复目标/费用和责任人 | 备份恢复和发布验收；T081/T087/T088/T092 | 业务代码及独立实库功能验证 |
| X06 | 公司域名/DNS管理员 | 有效管理账号或代配、现有解析、备案适用性/状态、最终测试子域名和证书 | 公网HTTPS、真实回调、远程双会话；T084—T089/T092 | 本地开发与本地验证 |
| X07 | 飞书企业管理员/应用配置者 | 测试app/tenant、最小scope、可用范围、精确回调和受控secret引用 | 真实SSO与身份绑定；T085/T086/T089 | 认证适配器、仅测试进程的身份注入 |
| X08 | 用户指定CRM测试管理员 | 明确测试员工与角色/项目/直属关系、指定首管理员、绑定核对安排 | 真实员工初始化、绑定、权限矩阵；T082/T085/T086/T089 | 合成角色夹具与策略实现 |
| X09 | 仓库/CI管理员 | 仓库/CI权限、忽略审查、拟纳管基线及受控Windows构建环境；两端SHA由T077产出，构建证明由T078产出 | 实际后端纳管/推送、不可变制品；T077/T078及最终发布 | 本地快照、差异记录、代码与manifest设计 |
| X10 | 用户/测试负责人/运维 | 已授权动作范围、验收环境准备窗口、最终开放窗口、停写/回退责任 | 实际目标环境迁移/准备、切换/恢复演练、最终开放；T082—T084/T087—T088/T092 | 代码开发、离线/本机测试与验收准备材料 |

已有“同VPC”的截图摘要只解决网络归属判断，不能替代白名单、账号和TLS实测；不需要为了重新证明同VPC先获取历史缺失的DescribeVpcAttribute权限。域名/DNS空列表也不能直接推定需重新授权，可由公司管理员代查代配。原备份三次每周与每日目标的差距、Windows服务/精确组合、实际账务等均按最新材料核验，不根据历史摘要宣称已修复。

## 7. 覆盖矩阵

下表是任务到规格的**计划覆盖**，不是已通过率。每个编号须有自己的实际结果；汇总任务T074/T090/T095不能替代具体功能和验证任务。

### 7.1 功能需求到实现与验证

| 需求 | 主要实现任务 | 主要验证/验收任务 |
|---|---|---|
| FR-001 | T005、T010、T016、T019、T020、T024、T026、T027、T029 | T032、T033、T066、T072、T086、T089、T093 |
| FR-002 | T023、T034、T035、T038、T061 | T032、T041、T042、T064、T089 |
| FR-003 | T007、T012、T035、T038 | T041、T042、T067、T070、T089 |
| FR-004 | T009、T011、T034、T036、T038 | T041、T042、T070、T071、T089 |
| FR-005 | T008、T034、T038、T040 | T042、T071、T089 |
| FR-006 | T007、T037、T038、T044、T055 | T041、T042、T051、T067、T089 |
| FR-007 | T023、T043、T049、T050、T061、T062 | T032、T051、T052、T064、T089 |
| FR-008 | T037、T043、T044、T049、T050 | T051、T052、T067、T089 |
| FR-009 | T009、T023、T045、T046、T049、T053、T057、T062 | T032、T051、T052、T059、T064、T071、T089 |
| FR-010 | T045、T046、T049、T050 | T051、T052、T071、T089 |
| FR-011 | T047、T048、T049、T050、T062 | T051、T052、T064、T071、T089 |
| FR-012 | T013、T046、T054、T055、T056、T058、T061、T062、T063 | T059、T060、T064、T065、T068、T069、T089、T093 |
| FR-013 | T009、T045、T046、T053、T054、T055、T057 | T059、T060、T068、T071、T089 |
| FR-014 | T047、T048、T053、T055、T056、T058 | T059、T060、T068、T071、T089 |
| FR-015 | T054、T055、T056、T058、T063 | T059、T060、T064、T065、T089、T093 |
| FR-016 | T005、T011、T012、T013、T016、T018、T029、T030 | T017、T033、T042、T052、T060、T069、T072、T089 |
| FR-017 | T006、T019、T020、T021、T022、T023、T024、T025、T026、T031 | T032、T042、T052、T059、T064、T070、T080、T086、T089 |
| FR-018 | T007、T008、T012、T014、T018、T025、T030、T035、T038、T063 | T017、T042、T052、T067、T070、T087、T089 |
| FR-019 | T007、T010、T012、T013、T014、T016、T018、T030、T055 | T017、T068、T069、T070、T083、T087、T088、T089 |
| FR-020 | T005、T007、T008、T015、T016、T026、T027、T028、T063、T076、T078、T082、T092 | T017、T033、T066、T072、T080、T087、T089、T093 |
| FR-021 | T023、T038、T043、T054、T061、T062、T063 | T032、T064、T065、T089、T093 |

### 7.2 故事、验收场景与对应验证

| 故事（均P1） | 范围 | 独立AC覆盖 | 验证任务 |
|---|---|---|---|
| US1 | 运营提报/草稿 | AC-01、AC-02、AC-03、AC-04、AC-25、AC-26 | T041、T042、T067、T070、T089 |
| US2 | 审核/复审/报价 | AC-05、AC-06、AC-07、AC-08、AC-28、AC-29 | T051、T052、T071、T089 |
| US3 | 完整唯一成单 | AC-09、AC-10、AC-11、AC-12、AC-27、AC-30 | T059、T060、T068、T069、T071、T089 |
| US4 | 多人共享/权限/故障 | AC-13、AC-14、AC-15、AC-16、AC-17、AC-18、AC-23、AC-24 | T032、T033、T067、T068、T069、T070、T072、T080、T086、T087、T089 |
| US5 | PM自提及既有视频职责 | AC-19、AC-20、AC-21、AC-22 | T064、T065、T089、T093 |

### 7.3 成功标准与实际证据

| 成功标准 | 判定要求 | 证据任务 |
|---|---|---|
| SC-001 | 两名真实员工独立会话完成运营全链，每步刷新/重新登录后100%保留；API重启仍持久 | T072、T086、T089、T093 |
| SC-002 | 权限矩阵每个允许/禁止格有结果；列表/搜索/详情/历史/统计/错误及网络响应不越权或泄漏报价 | T032、T042、T052、T059、T064、T070、T086、T089 |
| SC-003 | 同key/异key分别10并发仅一单、一组正确数量视频；两侧金额分别精确等于总价 | T068、T089 |
| SC-004 | AC-03/10/15/17非法输入、旧确认/版本、冲突和失败无错误终态/半成品，保留可核对输入 | T042、T052、T059、T060、T069、T070、T089 |
| SC-005 | 正式审核/报价/确认/成单均可追溯actor、时间、适用方案，普通编辑不能覆盖历史 | T051、T052、T059、T068、T071、T089 |
| SC-006 | 本轮新增数据均可识别为隔离测试资料；正式业务数据/配置零改动，原浏览器值不导入或清理 | T017、T033、T066、T072、T080、T082、T089、T093 |
| SC-007 | 真实PM本人免审、双侧报价、合法成单并保留既有视频到验收权限；重登保留、他人记录不扩权 | T064、T065、T086、T089、T093 |
| SC-008 | AC-27—30负Margin提示放行、精度拒绝、无固定轮数、变更失效确认及分侧拆分逐项有明确结果 | T051、T052、T059、T060、T071、T089 |

## 8. 依赖、并行与第一批执行建议

主依赖由每项任务显式列出：本机核对与契约对齐后，建立数据/命令/金额底座；US4可信身份/共享入口为US1—US3/US5提供基础；各故事用独立夹具测试。X02准备好且T066所列代码依赖具备，即可搭真实MySQL套件，无需等域名/SSO或整套UI。T075门禁材料整理也可提前。

可以安排的并行组合（先满足各自依赖，使用不同文件和隔离测试数据）：

- T004角色夹具、T005配置、T009金额模块，以及T075材料台账。
- T010 Repository与T011 Schema/DTO基础。
- T019飞书provider与T020 session/CSRF。
- T032策略/身份接口测试与T033共享UI测试。
- T041与T042、T051与T052、T059与T060分别处理各自不同测试文件；相关实现稳定后再并行。

**三批已完成T001—T006、T009及T075**：本机基线、契约、合成夹具、离线配置、独立金额模块、身份数据结构与外部门禁台账均有实际记录，数量补正规则不再等待业务答复。本批总进度8/95；下一批已满足依赖的是T007增量迁移编写/评审，须承接T006的SQL-only约束设计；本次不生成迁移或自动进入T007。

T002已完成T048所需的规则/版本对齐；T048的共享模型/路由/UI/专门验证仍待实现。后续shared模式在T048未完成时不开放补正入口，不改动当前demo既有入口；T049/T050/T052其余动作及T053/T054常规分摊/成单可独立推进。T051及AC-29最终完成仍需T048的实现证据，T074/T089/T090不能隐藏该缺口。

### 可粘贴到本机Codex的起步指令

```text
请读取并执行以下任务文件中的第一批任务 T001—T003：
/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order/tasks.md

前端/规格目录：/Users/yan/codex/solbridge工作流/crm-preview
相邻后端目录：/Users/yan/codex/solbridge工作流/crm-backend

先核对真实源码、适用指令和已有未提交修改，再按任务记录契约对齐与现有回归结果。
tasks.md 已有完整内容，不要重新生成它，不要再次等待 Q1—Q3 答复。
文件中的历史测试/哈希/审查记录只是输入，不能直接把任务勾成完成。
外部域名、飞书、RDS 或 Windows 条件未齐只影响对应任务，不阻止本批本地核对。
完成后给出实际文件变更、测试命令与结果、仍有的局部阻塞，以及接下来可执行的任务编号。
```

## 9. 本次文档检查与证据记录要求

初次离线生成的静态检查记录：95个任务编号唯一且连续；依赖均指向已定义的前序任务、无环；每项有绝对目标路径和完成标准；五个故事标签及21个FR、30个AC、8个SC均有映射；X01—X10均有对应工作。当时所有95项未完成。2026-10-20本机三批仅将有实际记录的T001—T006、T009及T075勾选，其余87项保持未完成。

后续每项验证记录至少包含：任务/FR/AC编号、日期、执行人或测试身份角色、两端SHA/releaseId、数据库环境UUID（按需要脱敏）、命令/输入、预期、实际输出/退出码、日志位置、通过/失败/待验及原因。数据库并发需保留实际连接/请求与最终查询证据；权限验证要看HTTP响应内容；恢复需有实际目标和耗时。日志不保存连接串、密码、Cookie、飞书code/token或邀请明文。

本清单尚未完成覆盖全部95项的本机speckit-analyze复核；各批只执行所授权任务及其离线审查/隔离验证。本批T006/T075不代表数据库约束已建立、真实MySQL通过或X门禁关闭，也不宣称全部共享业务通过。未来有一致性分析授权时可按已安装技能形成报告，无需重装；报告不得自行修改历史业务确认或把待验变成通过。

本文件解决的是空任务清单和执行顺序问题。它不证明此前Codex重连/图片路径错误的根因已修复，也不表示应用现在已经具备多人共享登录、持久化或可发布条件。

## 10. 输入文档摘要校验

以下SHA-256来自本次解压后的原文档字节，用于确认此任务清单对应哪一份输入；不是用户Mac源码的当前校验结果。原`tasks.md`为0字节；原检查JSON仍保留其历史含义。

| 输入文件 | SHA-256 |
|---|---|
| `checklists/final-review.json` | `e7f25d1a4b65bec34726ee96d86c41690407fbd68f6551f78acf7257ed33c439` |
| `checklists/plan-review.json` | `b53531d5a07070412a8fd6d976e5bd857c47d41a427338ffbe178305de97ae5f` |
| `checklists/plan-review.md` | `e875f8f772c3015aacc63c8541b0f3362c51965b53e7911b3333d05154ceaa69` |
| `checklists/requirements.md` | `efe20625d27409a80b434bb21aef2924db5bd712ca47b80762e302e44717f87d` |
| `checks/stage5-source-baseline.json` | `d7ac883d8edf421896ee28dc50a908b11b0887bf7b9e6cef5c2f4ba70df7c801` |
| `contracts/api.md` | `0cc45ea077ceaa2e9f35f43e75f79d37f33801965db73032764e8fc504a56718` |
| `data-model.md` | `8bbda9a8b389cfe4c6dc3a69f478af8b67ba6926cda6b9c1006df1b912c8818e` |
| `deployment-compatibility.md` | `3bb6ec91cb9e31572708be3a4c9054e5f04890ec24ce90d5279a10d8227548ac` |
| `evidence.md` | `bae4d45aae8fc44665e054ec2d85c0ca2266597f6de9e991b1580a6bc6e11290` |
| `plan.md` | `6c8900b4367a14fe595f3da4f1c5b4114a4ab304b36125b6caa2a1d3ef3c2e69` |
| `quickstart.md` | `795aea6c1ea6ddb3222216662fe492c07574036a00019325de969642bfc993cf` |
| `research.md` | `81d50284e5e6a7a440bf13e36b687ca27c8a501e0700b5a4eb4c22a99d308c6a` |
| `source-review.json` | `12a5897da5707be9e34aca8783a674beace7466698f9b669c64fef649fc1a3ee` |
| `spec.md` | `088998e36052fc2f61d8a415289cefd4e9ba6a9afc5a7ee13059ecdb036aa3ca` |
| `tasks.md` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `validation.md` | `b1dfe8593ee0211726f91423a986071882b711716db2cc9c34e133ef63e03a07` |
