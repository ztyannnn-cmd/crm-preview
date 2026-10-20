# Implementation Plan: 提报成单共享测试版

**Branch**: 实际 `main`（HEAD a6122e5，含既有未提交修改） | **Date**: 2026-10-19；环境修订2026-10-20 | **Spec**: [已确认业务规格](spec.md)

**Input**: 现有 specs/001-proposal-to-order。第4步于2026-10-19完成；2026-10-20按用户第5步授权修订环境方案并生成任务。本轮不实施业务代码、不安装依赖、不迁移、不创建/推送仓库、不改云配置、不部署。
**Status**: 第5步方案修订输入已同步；实施任务及交接状态以 [tasks.md](tasks.md) 与检查记录为准。环境接入前置不等同于已具备部署条件。

## Summary

保留现有原生前端、设计系统和model业务流；由Fastify提供同源登录、限权查询和业务命令，MySQL保存共享测试状态。
首轮采用**现有JSON状态桥接＋关系型身份/唯一性约束**：复用现有事务Repository及嵌套业务实体，不重建47张业务表；
数据库用小型约束投影保护草稿唯一、单份在途、一提报一单。所有写入走同一事务及版本校验，禁止任意整库回写。
这是小规模测试的过渡模型，非最终全量规范化数据库；权威和同步规则见 [数据模型](data-model.md)。

推荐公司飞书企业自建测试应用登录，管理员预开通CRM测试身份并分配角色。用户已表示可重新开应用；
2026-10-20用户提供的截图摘要已观察到RDS MySQL 8.0及Windows Server 2022 ECS，二者同广州可用区A、同VPC；未证明测试库/账号、TLS或实际连接已就绪。推荐先验证现有Windows原生路线，优先复用，不默认重装或购买。事实与时间边界见 [evidence.md](evidence.md)，平台差异见 [deployment-compatibility.md](deployment-compatibility.md)。

## Technical Context

- **Language/Version**：沿用前端ES Modules/HTML/CSS；后端Node 24.x、TypeScript，Fastify 5.12.7、Prisma 6.19.3锁定，不借规划升级。
- **Primary Dependencies**：复用当前依赖；未来仅补Fastify 5兼容的`@fastify/cookie`（>=10的兼容系列，实施时锁补丁版本）。OAuth用Node内置fetch/crypto，暂不引入JWT/Redis/React。Windows测试发布建议IIS＋URL Rewrite/ARR与受控服务包装器；这些属于后续系统工具，不是本轮已安装能力。Linux Nginx仅保留为条件性备选。
- **Storage**：推荐MySQL 8.0/8.4 InnoDB，共享测试用`solbridge_crm_test`与专用账号；先核对已购实例，不假定已购“数据表”等于可写测试MySQL。开发/CI用独立MySQL，不能借用正式库。
- **Testing**：沿用node:test、Fastify inject、TypeScript检查；补真实MySQL集成和双浏览器会话测试，见 [验证矩阵](validation.md)。历史193/16只代表隔离测试。
- **Target Platform**：优先评估现有Windows Server 2022 x64 ECS＋同地域同VPC RDS MySQL 8.0；IIS同域HTTPS静态前端＋受控反代API，Node仅回环4101。须先完成Windows精确版本构建/服务/反代/TLS演练及服务器用途、管理员、账务门禁。Linux/systemd/Nginx命令不适用于该Windows实例，不把重装、WSL或新实例列作默认条件。开发预览保持127.0.0.1:8897。
- **Project Type**：现有静态web应用＋单服务；不拆微服务，不使用浏览器全库同步，不双写LocalStorage与共享库。
- **Performance Goals**：设计容量为一家公司单测试工作区、5—20名测试人员、同时2—5个写请求；通常操作可见结果目标p95≤2秒，锁冲突明确重试。此为待实测的工程目标，不是既有性能结论。
- **Constraints**：短事务（目标≤1秒、超时5秒），不得持锁调用飞书/网络；单工作区JSON行锁会串行写，超过目标再拆按项目/聚合存储，不在本轮提前分布式化。
- **Scale/Scope**：主线提报→审核报价→成单；保留已经授权的PM本人视频到验收权限和已合入流程，复用对应API，不扩建视频模块。测试数据显式准备，不导入原浏览器记录。

## Constitution Check

| 原则 | 研究前检查 | 设计后结果 |
|---|---|---|
| 首轮成单、保留视频责任边界 | 已确认spec，无需重问 | 通过：仅最小集成、既有视频兼容，不重写视频 |
| 多人持久、可信权限 | 现状未满足，属于差距 | 通过：服务端会话/DTO/数据库权威，具体方案不假报实现 |
| 测试正式隔离 | 不能确认已购库即测试库 | 通过：环境标识、独立库/账号/应用、禁自动导入 |
| 增量复用 | 原前端/模型/Repository已有 | 通过：保留结构和历史，引入受控适配层与约束投影 |
| 区分事实、确认、建议 | 技术栈此前无确认原文 | 通过：本文件为工程推荐，业务取spec；外部资源待核验 |

无未解释原则违例。constitution中“本次只完成前两步”是接入阶段历史描述，用户已依次明确授权第4步及本轮第5步；不据此停在旧阶段。

## Project Structure

### Documentation (this feature)

```text
specs/001-proposal-to-order/
  spec.md                  # 已确认业务，不复制进方案
  evidence.md              # 历史与当前差距
  plan.md                  # 本技术方案
  research.md              # 决策、替代与官方依据
  data-model.md            # 权威关系、约束、并发、金额
  contracts/api.md         # 请求/响应、版本、错误与权限
  quickstart.md            # 配置、环境门禁、验证启动和回滚
  validation.md            # FR/AC到组件/接口/验证方式
  deployment-compatibility.md # Windows差异、验证与外部条件
  tasks.md                 # 第5步任务、依赖和阶段
  checklists/plan-review.md
```

### Source Code (repository root)

```text
/Users/yan/codex/solbridge工作流/
  crm-preview/             # 前端Git根，唯一开发目录，不移动
    app.mjs / model.mjs / index.html / preview-bootstrap.mjs
    design-system/         # 保留
    scripts/preview.py     # 保留8897，未来仅补明确模式与同源代理
    specs/001-proposal-to-order/
  crm-backend/             # 相邻后端，未来原位单独纳入私有Git
    src/app.ts / config.ts / server.ts / crm.ts / prisma-crm-repository.ts
    prisma/schema.prisma / migrations/
    tests/
```

**Structure Decision**：前后端路径不动，后端继续相对引用同次发布的前端model.mjs。未来新增浏览器`api-client.mjs`、后端auth/policy/DTO/command模块为适配层，不迁移整套UI。

## 连接与复用边界

| 位置 | 复用 | 必须调整 |
|---|---|---|
| app.mjs表单、列表、抽屉、草稿/未保存保护 | 保留渲染和布局 | 事件处理改async命令；业务成功才刷新投影，不先本地变更再整库上传 |
| model.mjs | 方案/报价/成单/视频状态转换及历史结构 | 角色规则收紧、在途与重提修正、整数金额、注入真实人员目录，禁使用固定USERS作服务端权威 |
| src/crm.ts / buildApp | 业务动作白名单和可注入依赖 | DTO/权限/JSON Schema、真实auth、细分错误/版本/幂等，不保留任意导出调用或客户端actor |
| PrismaCrmRepository | 行锁与工作副本提交模式 | 分离读写、投影和审计同事务、聚合version、幂等；GET不能继续写revision |
| config/server | 默认拒绝production及错误配置 | 后续显式启用test连接和依赖注入；检查数据库身份/环境UUID/权限/TLS/迁移版后ready，保留失败关闭门禁 |
| 浏览器数据 | 原key和值原样保留 | shared模式完全不读写业务key，不运行seed/upgrade；demo仍保留原预览模式 |

UI启动使用受控`mode=demo/shared`配置：8897默认既有demo；进入shared必须明确模式、登录及服务就绪。shared失败不回落demo或模拟成功。
shared仅保留浏览器筛选/位置等偏好及不含业务正文的pending operation句柄（key/目标/请求hash），按workspace＋真实employeeId隔离；退出清内存投影，不删旧业务key。任何保存、资料编辑、拆分、审核、报价、建单、既有视频操作均改为后端命令。

## 可信身份与权限

飞书只证明身份，CRM数据库决定启停、operator/pm/admin角色、项目参与、直属PM及审核名单。
管理员先绑定飞书身份并分配；不按姓名/邮箱自动升级角色。回调state一次有效、服务端换码；未绑定员工需有效邀请后进入无业务权限的pending绑定态，经管理员确认并消费邀请，再次SSO才签正式session；
会话凭证只在HttpOnly Cookie，DB保存hash，登录后轮换；建议最长8小时、空闲2小时（工程默认，非新增业务审批规则）。
每次请求检查员工状态/authVersion及当前分配，权限变动撤销会话；非GET验证Origin＋CSRF token，登录回调只用state且防重放。

服务端顺序：身份→workspace→记录可见性→操作与金额侧权限→版本→业务状态→金额→事务提交。
列表、搜索、详情、统计与错误均在服务端按同一范围筛选，再用DTO字段白名单输出；不把无权记录传前端隐藏。
同项目他人合作仅允许spec规定的存在提示，不泄漏人名、价格、文档或可打开ID。
管理员只准身份/分配管理与读测试业务；命令策略首先拒绝admin业务写，不能只去按钮。
PM自提写权限要求可信身份role=pm且ownerId/selfManagedPmId/reviewPmId三者同时匹配；标记从服务器建提报产生，客户端不得传入或改写。
直属只读不因同role/项目获得审核权；员工管理禁止管理员给自己改成运营以绕过禁止代业务（如需身份变更，由另一个管理员按审计流程执行）。

## 共享写入、金额及并发

权威、唯一键和命令算法详见 [data-model.md](data-model.md) 与 [API契约](contracts/api.md)。
外层命令服务负责幂等、版本、授权和投影；模型仅执行白名单动作；持锁期间再校验当前身份分配并提交整组订单、视频、终态、索引和审计。
金额入口必须先校验十进制字符串（最多两位小数）再换整数分，不用Number/Math.round吞掉非法精度。
默认分摊用整数商余数，按稳定videoOrdinal补1分；手动拆分同样按整数校验。负Margin返回非阻断warning并展示，不能变成另一个审批门槛。

## 已确认差距的处理位置

| 差距 | 推荐处理位置/结果 |
|---|---|
| 共享、登录、人员管理缺失 | auth/session与identity管理路由、shared API client；替换固定用户目录 |
| admin能代提报/审价/拆分/纠错 | policy＋model统一动作鉴权；所有普通业务命令拒admin，既有纠错/交接路由不注册到首轮共享写白名单 |
| 草稿第一份保存需核对初始化 | saveProposalDraft确保首次集合挂回，唯一键upsert；归属与项目校验 |
| 有历史成交时未统一拦在途、结束未成单被拦 | repeatPermission先全量在途claim，再判历史结束原负责人/成交唯一现任负责人 |
| 精度静默取整、负Margin无完整提示证据 | money模块原始字符串→分，模型比较/继承/分摊全用分；UI统一warning |
| 旧页面静默覆盖、重复成单结果不明 | RecordVersion、If-Match、Operation幂等及查询；单订单约束 |
| 复审/报价限制旧文案、历史确认适用性 | updateCoop/revisePackage/quote UI去固定轮数文案；保持补正例外；旧确认不跨版 |
| 接口全400、GET也事务写、业务量泄漏风险 | typed错误/DTO、读路径不变更revision；分页和字段授权 |
| PM已实现视频到验收、model全局USERS | 保留流程，换真实人员与同源命令；共享投影中没有其他运营的操作数据 |
| README/旧设计说无migration但已有桥接SQL | 以后迁移前先核对_schema/migration历史，不依据旧README重复建表；本轮不执行 |

## 版本管理、构建及测试发布

推荐**两个私有仓库、一个成套发布清单**，保持两个当前目录：前端保留现有Git，后端未来原位初始化单独私有Git，排除.env、备份与verification/private。
不是把父目录（含无关Next.js工具）一并纳入，也不移动后端到前端仓库；本轮仅建议，未初始化/提交/推送。
前端版本库保存release manifest，固定frontendCommit、backendCommit、契约/数据schema版本、Node与包锁hash。
CI必须按两组SHA检出为相邻目录，运行组合回归，再产生**一个不可变release包**；禁止任一端独立“最新发布”。
后端已有tsconfig仅编src，运行dist仍相对依赖前端model，因此包必须包含`release/crm-backend/dist`和`release/crm-preview/model.mjs`。
按目标Windows x64构建并生成匹配的Prisma引擎/Client（不拷贝本机Darwin node_modules），使用package-lock确定依赖；配对包保留相邻目录、Node精确版本、win-x64/Prisma引擎目标、两端+schema manifest和校验和，剔除真实配置、测试身份凭证、浏览器备份。Windows路径/空格/大小写与服务工作目录须实测。

部署推荐：经X01用途/管理员/管理通道/费用核验后，在现有Windows ECS先做非公网兼容性演练；IIS＋URL Rewrite/ARR提供HTTPS前端与`/api/*`、`/health/*`同源反代，Fastify test服务只listen127.0.0.1:4101，数据库走同VPC私网/TLS。服务包装器、最小Windows服务账号、停止/自动恢复和IIS切换回滚必须先验证；现有SIGINT/SIGTERM处理不证明Windows服务可优雅停止。
只暴露HTTPS；本机8897原预览不变，shared开发请求由本机代理至4101，不能把本机8897当同事共享入口。
域名/HTTPS/飞书配置未齐时，继续模型、接口、注入身份及独立本机/CI MySQL开发验证；只阻塞依赖公网入口的真实SSO、远程双会话与发布。若Windows演练失败，先记录原因与修复成本；只有公司确认已有可用Linux资源或批准新增预算后再评估Linux备选，不默认改现有系统或购买。
账号/配置、费用构成、备份回滚与运行门禁见 [quickstart.md](quickstart.md)。

## 验证和进入下一步

[validation.md](validation.md) 逐项覆盖FR-001—021、AC-01—30；原193/16继续作回归基线，不能代替真实MySQL及双会话SSO测试。
第5步可按既定架构拆任务；外部账号/环境准备列为依赖门禁，不把其未知转嫁为重问业务或模糊技术选择。
实际共享测试发布必须满足tasks中的X01/X03—X10对应门禁，并通过Windows平台验证、最小访问授权、严格TLS、每日备份与恢复演练、真实SSO及权限验证。已观察到同VPC，vpc:DescribeVpcAttribute的历史Forbidden.RAM不再是核对网络归属的必要阻塞。

## Complexity Tracking

无原则违例。暂存JSON加约束投影比全量规范化更小，但增加同步纪律：所有写入只能经同一事务适配器。
禁止直接SQL/旧接口绕过；投影校验失败立即拒写并报警。达到容量阈值后才评估按聚合规范化，不用过渡方案承诺生产扩展性。
