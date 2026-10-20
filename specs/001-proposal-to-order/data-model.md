# 数据模型、金额与一致性设计

2026-10-19设计；2026-10-20 T007补齐schema及离线增量SQL，尚未应用迁移或实库验证。业务规则以[spec](spec.md)为准，接口见[contracts/api.md](contracts/api.md)。

## 1. 权威数据与关联

共享模式的业务权威是MySQL中的`CrmWorkspaceState.payload`（显式初始化的隔离测试工作区）；
身份、会话与分配关系则以独立关系表为权威，不以payload或浏览器USERS为权威。
唯一性投影是payload对应业务事实的数据库约束索引，不是另一套可独立编辑的数据源。
只能由命令事务更新两者；导入/维护也必须复用该路径。投影不一致拒写并告警，不能悄悄以任一方覆盖另一方。

```text
Workspace → Company/Employees/Identity/Session/Assignments
Workspace.payload:
  creators → accounts
  campaigns → defaultPM / members / permittedPMs
  proposalDrafts(owner,creator,campaign) → fields
  collaborations(proposal) → proposalVersions → items / quotes / feedback / confirmations
  proposal → orders(0..1) → deliveryItems(1..100) → existing draft/review/publication data
```

旧业务ID、关联和历史字段保留；方案/报价/确认新增时保留版本；不为了接后端创建另一套Submission/Package副本。
employeeId在新测试样例中可映射稳定内部UUID，旧模拟名字不自动绑定飞书身份。
项目分配/直属关系从关系表装配只读运行上下文供model使用，不能由payload旧members反向授权。

## 2. 最小关系表

所有workspace业务键含workspaceId，ID字段使用明确二进制比较，唯一规则不能依赖默认不区分大小写排序规则。
下表列逻辑约束；T006完成身份结构定义，T007补齐六个投影/版本/操作/审计model及SQL。物理约束建立和真实MySQL证明仍留T066/T082，详见本节分批边界与[migration-review.md](verification/migration-review.md)。

| 表 | 关键字段 | 约束与职责 |
|---|---|---|
| EnvironmentIdentity | singleton id、environment=test、environmentUuid、schemaVersion | 连接后核对UUID和test，错库立即拒绝；不是只比库名 |
| Workspaces | id、companyId、label、stateSchemaVersion | 测试工作区明示隔离，不能由请求任意workspaceId切换 |
| Employees | id、companyId、displayName、role、enabled、authVersion | role仅operator/pm/admin；角色/停用变更递增authVersion并撤销会话 |
| ExternalIdentities | employeeId、provider、appId、tenantKey、openId | UNIQUE(provider,appId,tenantKey,openId)，禁止邮箱自动认领；只接受当前测试app/tenant |
| WorkspaceAccess / ProjectAssignment | workspaceId、employeeId、campaignId、职责 | 有效分配唯一；管理员无需运营项目分配也可管理/查看 |
| TeamRelations | workspaceId、operatorId、directPmId、effectiveFrom/To | 显式直属来源，不从项目PM推断；一个运营当前直属关系唯一 |
| IdentityInvitations | employeeId、tokenHash、expiresAt、consumedAt | 仅定位预开通员工，不赋予角色；建议30分钟，管理员可撤销重发 |
| PendingBindings | invitationId、employeeId、appId/tenantKey/openId、proofAt、expiresAt、status | 同一invitation一条待处理绑定，保存飞书验证身份而非token；无业务会话权限 |
| OAuthAttempts | invitationId、browserBindingHash、stateHash、expiresAt、consumedAt、safeReturnPath | 一次性校验、建议5分钟；回调路径只允许本应用 |
| Sessions | tokenHash、employeeId、authVersion、createdAt、lastActiveAt、expiresAt、revokedAt、csrfHash | 明文凭证不入库；权限变化即时撤销；后台轮询不续空闲时间 |
| CrmWorkspaceState | id、revision、payload、updatedAt | 复用已有表；revision仅业务/配置写成功后递增，GET不写 |
| DraftKey | workspaceId、ownerId、creatorId、campaignId、draftId | PK前4项，UNIQUE(workspaceId,draftId)；不同owner可各存一份 |
| ActiveProposalClaim | workspaceId、creatorId、campaignId、proposalId | PK前3项，UNIQUE(workspaceId,proposalId)；只有未成单且未明确结束的正式提报占用 |
| ProposalOrderLink | workspaceId、proposalId、orderId | PK(workspaceId,proposalId)，UNIQUE(workspaceId,orderId)，保证一提报一单 |
| RecordVersion | workspaceId、aggregateType、aggregateId、version | PK前三项；每次聚合成功变更+1；与payload版本一致 |
| Operations | workspaceId、actorId、idempotencyKey、requestHash、resourceRefs、resultCode、committedAt | UNIQUE前三项；只保存已提交结果，持久保留键/哈希/资源引用，避免到期后旧请求再次创建 |
| AuditEvents | id、workspaceId、actorId、action、aggregateId、beforeVersion、afterVersion、requestId、at、changeSummary | 与业务同事务追加；禁止保存会话/飞书token或密钥；读取仍检查金额/记录权限 |

新增表与state必须在同一个数据库/事务连接；不以Redis或进程内锁承担唯一性。
身份分配变更也先锁workspace再锁employee/session（统一顺序）；业务命令在事务内重查身份有效性，避免权限撤销与提交竞态。
第一次管理员由受控一次性引导绑定指定身份；不能靠“首位登录者自动成为管理员”。

### T006结构定义与T007边界（2026-10-20）

`crm-backend/prisma/schema.prisma`已定义上述身份/分配实体及Companies元数据，保留原CrmWorkspaceState的四个存储字段；Workspaces通过唯一stateId关系映射旧JSON行，不另建业务payload。新增ID/外部身份标识使用Bytes/VARBINARY逐字节比较，摘要使用Binary(32)，环境UUID使用Binary(16)网络字节序；它们不是要直接返回前端的Buffer DTO。字符串ID与字节的显式编码、长度和拒绝静默截断由T008/相关服务落实。

公司/工作区/员工使用复合候选键和外键，WorkspaceAccess同时校验工作区与员工属于同公司；分配、直属关系、邀请和会话均从相同三元成员关系引用，pending再与同邀请/员工/工作区关联。外部身份四元组各字段非空、原生二进制且联合唯一，不依赖默认排序规则。

WorkspaceAccess/ProjectAssignment是可停用并原键恢复的当前记录，唯一键不含enabled或可空结束时间；TeamRelations以公司＋工作区＋operatorId为主键，只有一条当前指针，effectiveTo不进入唯一键。变更前后历史由后续AuditEvents同事务保存，不将旧关系追加成第二条“当前”记录。有效成员/角色、项目是否存在于相同workspace JSON、状态和收权仍须后续服务校验；FK不等于业务授权。

Prisma不能表达的单行环境CHECK、正版本/时间CHECK及旧String桥接ID的二进制NO PAD排序规则已明确交接T007，详见[batch-t006-t075.md](verification/batch-t006-t075.md)。历史桥接SQL声明utf8mb4_unicode_ci，只是源码事实，不是已核实的数据库状态。此处仅取得schema离线校验和设计审查，不代表约束已建立或真实MySQL验证通过；尚未生成迁移/Client、应用schema或连接数据库。

### T007增量SQL定义与应用边界（2026-10-20）

`202610200001_shared_constraints/migration.sql`以已有桥接表为起点，完整新增上批12张身份/环境表和本批6张约束表；没有再次CREATE CrmWorkspaceState、导入旧payload或初始化人员。旧桥接id保持VARCHAR(64)字符及原值，只在未来经核验的应用中与Workspaces.stateId同用utf8mb4_0900_bin。新表明确InnoDB，所有标识与关系使用原生字节类型、完整唯一键和RESTRICT。目标须MySQL8.0.17+且核实NO PAD、CHECK、严格模式与历史/数据；实际版本尚未核验，不能把“8.0”截图当已满足。

六个新增model都保存companyId；直接复合引用workspace，或经同公司/工作区WorkspaceAccess引用owner/actor。workspace.id本身全局唯一，业务自然键仍严格使用上表所列workspaceId范围。RecordVersion.aggregateType及AuditEvents.aggregateType为VARBINARY(32)，用于区分聚合；类型注册表与payload适配留T008。审计id按(workspaceId,id)唯一，beforeVersion可空表示新建，afterVersion必填；CHECK只约束正数及递增，精确+1和payload一致性仍由事务服务实现。

Operations.idempotencyKey将合法UUID显式解码为16字节网络序；requestHash是32字节摘要，不持久化原请求或敏感响应，resourceRefs仅资源引用、resultCode仅结果分类，不设TTL删除防重键。AuditEvents.requestId为最多128字节，changeSummary只写脱敏必要变更；服务须同事务追加、按权限读取，未来运行账号按表限制审计/Operation更新删除权限，schema本身不证明追加不可变。

BINARY会将短值补零，不能以存储后长度CHECK代替输入校验。T008及身份/命令服务须在写入前验证UUID/摘要原始长度、字符串的严格可逆UTF-8及最大字节数，不trim/折叠/截断。新ID的64字节限制不用于截断旧桥接64字符ID。SQL中32条CHECK和列排序规则不由Prisma表达，后续生成差异必须保留；真实索引竞争、外键/CHECK拒绝和迁移中断恢复仍待实库演练。

## 3. payload字段与版本边界

- proposal：保留creatorId/campaignId/ownerId/reviewPmId/submittedBy及提交快照，新增`version`；`selfManagedPmId`仅服务器创建PM自提时写。
- proposalVersion：items与稳定顺序、币种、两侧金额记录、正式报价轮次、客户还价、达人回价及当前版本确认。三方金额不能互相替代。
- order：proposalId、最终versionId、双方确认/价格快照、稳定videoOrdinal；建单后不按达人资料更新回写条件。
- delivery：orderId/proposalId及既有视频字段/状态；保留PM自提标记，明确负责运营/自提PM。未来交接不在首轮新建工作台。
- 历史快照无记录则显示缺失，不合成确认。旧视频状态不倒退。

版本校验的最小聚合：草稿、达人档案、提报、订单、单条视频、身份分配。
报价/审核/方案/确认/拆分共用proposal版本。视频独立内容动作只升video版本；共享订单准备资料修改需订单版本并升受影响video版本。
成单校验并提升proposal版本，新增order及视频版本为1；不要求无关提报版本跟随全局revision变动。
正式提交须传draftPrecondition={id,version}或{absent:true}；事务内发现本人对应草稿与该前提不符即409，不消费、不覆盖新草稿。
正式提交还校验creatorVersion和项目分配版本，防止旧资料表单把他人刚修改的档案覆盖；提交时资料补充与快照/提报创建同事务。

### T002本机版本对齐（2026-10-20）

`RecordVersion.version`是聚合并发版本；`proposalVersions[].id`是业务方案ID，其内部`version`是方案序号；`CrmWorkspaceState.revision`仅为工作区提交序号。三个编号不能互相替代。submission-context从同一只读一致快照返回creatorVersion、projectVersion、本人草稿id/version或absent；projectVersion取该项目配置/有效分配的聚合版本，审核名单、成员或影响提报的配置变化必须同事务递增。不能用一次无关业务写入造成全工作区表单过期。

现有`model.mjs`的correctVideoQuantity及`package.test.mjs`专项明确：已接受方案在建单前纯补正视频条数，保持原方案ID/序号、两侧总额和客户确认；保留原状态，负责运营或自提PM本人操作，不增加PM再审、不从报价文本推算数量。共享实现应校验当前方案ID、proposal聚合If-Match、项数不变、各项及合计1—100、理由和实际变化，成功递增proposal聚合版本并写before/after审计、清除旧拆分；不能沿用另一方案确认。当前原型尚未明确清除旧拆分、无共享聚合version，列T048剩余实现，不改写spec的已确认例外。

兼容createOrder应显式传最终方案versionId。当前原型只校验记录内确认、未消费请求的方案ID，不能把空body或旧ETag当作具有完整可信方案历史；若未来保留空body适配，必须从持久历史唯一恢复原请求最终方案，无依据422、已知方案不符409；不能取当前方案猜测。

## 4. 命令事务与请求结果不明

1. 验证请求schema/Origin/CSRF及会话，取得可信actor；开启事务，按workspace主键锁`FOR UPDATE`。
2. 事务内重查员工/authVersion/分配与记录可见性；admin业务写直接拒绝。
3. 查Operations：requestHash包含规范化method/path/body、If-Match/If-None-Match和所有依赖版本，排除Cookie/CSRF/requestId；相同actor+key且hash一致返回原资源引用/结果；不同hash返回409。**幂等命中早于版本检查**。
4. 对建单命令，先在当前授权内检查已存在order；若对应同一proposal及请求最终方案版本，返回原order并记录该新key的复用结果，不再建单/升聚合版本/新增有效建单审计；方案不匹配则409。其它无幂等结果的写入才检查If-Match/依赖版本；不匹配409，保留输入、重新查询，不能自动套新版本覆盖。
5. clone当前payload，执行统一金额校验、策略/当前状态、已有model白名单业务动作，得到完整工作副本。
6. 按动作维护DraftKey/ActiveProposalClaim/ProposalOrderLink与RecordVersion；写payload、审计及Operation结果；全部提交或全部回滚。
7. 响应只重建当前授权DTO；幂等重放也重查现权限，不能把存储的历史全量响应发给已失权人员。

`P2034`等可证明已回滚的死锁/串行冲突，服务器最多重试2次并加抖动，使用同一key；
业务版本冲突不重试。提交结果未知不能当作回滚，返回503 `OUTCOME_UNKNOWN`＋operation key查询提示，客户端保留key。
Operation不存在仅表示当前未见已提交结果，不能断言没有在飞请求；客户端查询后可用**同key同内容**重发，事务锁和唯一键协调。
不同key并发成单：已有订单优先按当前权限返回原order（幂等业务结果），不能再建一组；同key改内容仍409。
新提报用不同key表示新业务，但ActiveClaim仍拦截并行在途。明确结束或成单在同事务释放claim；
审核未通过但尚待负责人处理仍占claim；仅明确结束或成单释放。原记录复审核对并保留同一claim，不先释放再争抢；缺失或被另一份提报占用视为一致性/在途冲突，拒写并核查。历史结束/成单后的独立新提报须重新占claim，已有另一份在途则409。草稿不占claim，正式提交成功才消费本人对应草稿。

GET用只读一致快照读取状态、版本与权限，不取写锁、不更新revision；员工/分配快照也在同一读取一致性边界。
小规模首轮可每次读JSON、服务端筛选分页；不得提供下载全workspace或PUT全payload接口。

## 5. 金额规则

API金额是十进制**字符串**，例如`"100.01"`；拒绝空、非数值、科学计数法、符号混入及超过两位小数，禁止先Number后校验。
允许`100`、`100.0`等合法输入，标准响应固定2位；总额必须>0，分项可为0但不得负；技术上限为有符号BIGINT分范围，越界422，不静默截断。
JSON权威字段统一`costMinor/clientPriceMinor/amountMinor`十进制整数字符串，服务端BigInt运算，不把BigInt直接JSON.stringify。
逐个替换model内报价比较、继承、margin、拆分中的Number/Math.round；`initial/final/clientPrice`旧浮点兼容显示不是新共享模式权威。
API DTO提供固定2位decimal strings，UI格式化不能再用Number把大金额丢分；旧demo可继续兼容读原数据，不在启动时批量改写旧浏览器值。

分摊：T分/n条原创视频，q=T div n、r=T mod n；稳定ordinal前r条各q+1分，其余q分。达人侧/客户侧分别执行。
手动拆分必须n项、全部非负整数分且sum=T、绑定当前方案与总额；数量或价格变化使拆分失效，不能拿旧拆分硬成单。
默认与手动结果跟订单/视频一起写入；分发平台不增加n。
Margin=客户接受总价−最终有效达人价，允许负值；DTO附`NEGATIVE_MARGIN`非阻断warning并显示差额，不增加管理员批准门槛。

## 6. 测试初始化、兼容与回退

只显式初始化合成test workspace；同事务建立payload/约束投影/版本，重复初始化遇已有workspace拒绝，不seed覆盖。
不读取用户LocalStorage，不复用原业务人物姓名作真实身份绑定；成员由管理员明确配置。
迁移前备份和检查已有桥接migration是否应用，不把历史README“无迁移”当事实。
采用新增表/字段、保留旧payload的expand方式；不自动DROP。新共享状态schema升级后旧客户端不得写入。
若投影不一致暂停写入，从已校验备份或显式修复流程恢复，禁止后台静默清空/重算生产数据。

首次初始化由未来受控`bootstrap-test.ts`完成：在已核实隔离库显式建立环境标识、workspace/payload/约束投影/版本以及指定首admin employee和一次性绑定token hash；重复目标拒绝覆盖。初始化不要求已有CRM session，普通启动不执行初始化。其后基础readiness可检查DB/TLS/schema/投影；首次真实飞书证明＋引导令牌绑定指定admin，用后关闭引导，再次SSO才签正式session。其他员工由已认证admin预开、邀请和核对绑定。readiness、认证、授权、发布门槛分别检查，不互相形成初始化死循环。本批只固化设计，尚未运行初始化或迁移。
