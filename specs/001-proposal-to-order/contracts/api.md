# HTTP接口契约（规划，尚未实现）

推荐同源`/api`，业务前缀`/api/v1`。保留现有能力命名，不把当前全400/直接返回model对象当成最终契约。
业务命令不得发送actor/role/ownerId/selfManagedPmId等授权字段；出现未声明字段422。仅已认证admin的员工管理接口可接收其schema声明的role/分配字段，不能据此改写操作者身份或给自己改业务角色。JSON Schema关闭金额强制数字转换与静默移除额外字段。

2026-10-20 T002本机对齐：本文描述待实施共享契约，现有`src/crm.ts`仍返回旧model形状、业务错误统一400，不代表下列路由/版本/字段已实现。代码与验证依据见[contract-alignment.md](../verification/contract-alignment.md)。

## 通用约定

- Cookie会话；身份见`/api/auth/me`，业务workspace由会话有效成员关系决定，跨workspace请求404。
- 正式会话下的写请求：`Content-Type: application/json`、`X-CSRF-Token`、`Idempotency-Key`（UUID）、`X-Request-Id`可选；登录前绑定/回调采用下方独立保护，不能要求尚不存在的正式会话或CSRF token。
- 已存在目标写入带`If-Match: "proposal:<id>:<version>"`等ETag；首次草稿`If-None-Match: *`，已有草稿用返回ETag。
- 新正式提报无目标ETag，但body必须含`creatorVersion/projectVersion`、`draftPrecondition`必须为已读草稿{id,version}或明确{absent:true}；避免提交时覆盖新资料。
- 所有金额输入/输出decimal strings，禁止JSON number。示例`cost:"100.01"`。币种仅当前支持集合，不换汇。
- GET响应`Cache-Control: no-store`，敏感DTO不得被共享缓存；ETag仅版本并发令牌，不允许CDN缓存私有数据。
- 成功统一`{data, meta:{requestId,versions}, warnings:[]}`；DTO字段按资源schema白名单生成，历史金额也须在记录权限范围内。
- 错误统一`{error:{code,message,fields?,requestId,retryable},operationKey?}`，不带他人记录详情、数据库信息或密钥。

## 身份与管理

| 方法/路径 | 请求与结果 | 权限 |
|---|---|---|
| GET /api/auth/feishu/start | 服务器保存一次性state与浏览器绑定，跳转当前官方授权入口；safeReturn只许本站白名单 | 未登录可发起 |
| GET /api/auth/feishu/callback | 校验code/state/browser绑定，服务端换身份；仅允许测试app/租户；已绑定且启用员工签正式会话；有效邀请对应未绑定身份仅建立pending绑定态，无业务权限 | 不接受外部传role或自动开通 |
| GET /api/auth/me | employeeId、姓名、role、workspace、分配摘要、csrfToken；不返回sessionHash/飞书token | 已登录 |
| POST /api/auth/logout | 撤销服务端会话、清Cookie及内存数据 | 当前身份，CSRF |
| GET /api/v1/admin/employees | 测试范围人员、状态和分配，不返回凭证 | 仅admin |
| POST /api/v1/admin/employees | displayName、role、enabled、projectAssignments、directPmId；employeeId/company/workspace由可信服务端生成或确定；重复key复用原结果，不按姓名/邮箱认领飞书身份 | 仅已认证admin；预开员工不等于已绑定或已有业务会话 |
| PUT /api/v1/admin/employees/:id/access | enabled/role/projectAssignments/directPmId，If-Match员工版本；审计并撤销受影响会话 | 仅admin管理，不可给自己改业务角色绕过禁代业务 |
| POST /api/auth/bind/start | body携带一次性inviteToken，校验Origin与有效邀请，绑定浏览器nonce并开始飞书授权；token不进URL/日志 | 无正式会话，只能发起绑定 |
| GET /api/auth/binding-status | 由短期pending Cookie返回本人绑定待处理/已确认/失效状态，不返回业务数据 | 仅pending绑定态 |
| GET /api/v1/admin/pending-bindings | 预开通员工与经飞书验证身份摘要、版本，供管理员核实 | 仅admin |
| POST /api/v1/admin/identity-bindings/:pendingId/approve | If-Match；校验真实管理员、员工启用、邀请/证明未过期、身份唯一；事务内建立映射并消费邀请 | 仅admin；不能替对方签发session |
| POST /api/v1/admin/identity-bindings/:pendingId/reject | 原因，撤销pending与邀请，重新发邀请走新token | 仅admin |
| POST /api/v1/admin/identity-invitations | 服务器生成一次性短期绑定凭据，指向预开通employee；登录后管理员核对实名绑定 | 仅admin，不发送外部消息；凭据交付由用户安排 |

首个管理员用受控一次性引导绑定身份，不开放公开注册。身份绑定凭据一次性、只保存hash、不允许通过其指定或修改角色。未绑定身份的飞书回调只允许在有效邀请上下文下建立短期pending态（建议10分钟）；未知身份无邀请提示联系管理员，不自动建员工。
管理员核对后原子批准/消费邀请，pending会话失效；员工重新走SSO后才签正式CRM会话。已有外部身份与不同员工冲突时拒绝，不自动合并。首个管理员例外只能在一次性受控引导中绑定事先指定employee，同样校验飞书证明和绑定token，完成后关闭引导入口。
被停用、未开通、非本租户认证成功仍不能进CRM。是否申请通讯录读取不影响首轮：管理员可维护名册并受控绑定，不默认申请广泛通讯录权限。

### 路由保护与首次初始化例外（T002）

| 路由组 | 会话与请求保护 | 版本/防重口径 |
|---|---|---|
| 正式业务与admin管理写接口 | 有效正式session、Origin、CSRF；admin管理仍受声明字段与禁止自改业务角色约束 | Idempotency-Key；已有聚合If-Match，新建使用对应创建前提 |
| POST /api/auth/logout | 当前正式session、Origin、CSRF；仅撤销自己的会话 | Idempotency-Key防重；无需读取员工/业务ETag |
| POST /api/auth/bind/start | 无正式session；校验同源Origin、一次性邀请与浏览器nonce，创建一次性state | 不要求正式CSRF/业务Idempotency-Key；邀请/pending唯一约束及state一次性防重放 |
| GET /api/auth/feishu/start、callback | start绑定浏览器并限制safeReturn；callback校验code/state、浏览器绑定、测试app/tenant及精确回调；不要求跨站回调带本站Origin | 消费一次性OAuthAttempt；回调重放拒绝，不能用业务幂等键换取重复登录授权 |
| GET /api/auth/binding-status | 仅短期pending Cookie，可读本人绑定状态，不能读业务 | 只读、不消耗业务版本 |
| 首管理员引导 | 受控`bootstrap-test.ts`预建指定employee和绑定token hash；真实飞书证明与一次性引导令牌共同校验，不要求已有admin session | 不开放公开注册/任意employee授权；完成映射后关闭引导，员工重新SSO才取得正式session |

员工预开、首次管理员初始化与权限更改均是后续T015/T021实现工作，本批只对齐契约。初始化→基础readiness→真实首次绑定→重新SSO→权限验收的顺序见quickstart；readiness200本身不授予任何业务权限。

## 查询与必要资料接口

| 路径 | 返回/行为 |
|---|---|
| GET /api/v1/bootstrap | 当前身份范围的creators、campaigns、proposals、orders、deliveries、本人drafts、相关显示姓名与服务端capabilities/versions；保持app渲染所需形状，绝不发全payload |
| GET /api/v1/proposals?cursor&limit&q&campaignId&status | 默认50/最多100，查询前定scope，数量统计同scope；运营仅本人、审核PM按指派、直属PM按明确直属只读、admin测试全范围 |
| GET /api/v1/proposals/:id | 可见详情、当前方案及合法历史、两侧金额、capabilities和ETag；不可见统一404 |
| GET /api/v1/drafts | 仅本人；不以管理员全业务查看扩大私人未提交草稿读取 |
| GET /api/v1/orders/:id /deliveries/:id /deliveries | 按源提报/订单现任归属过滤；原有视频流程的DTO与权限保持 |
| GET /api/v1/creators /creators/:id /projects | 必要基础库与可参与项目；不夹带无权查看的合作/报价 |
| PATCH /api/v1/creators/:id | 现有资料编辑规则＋ETag；共享档案更新不覆盖提交快照 |
| POST /api/v1/creators | 复用既有新增/查重，保留单独存档与提报的区分；不做采集/批量导入 |
| GET /api/v1/creators/:id/submission-context?campaignId | 可提报项目/审核名单、creatorVersion、projectVersion、本人draft的id/version或明确absent前提、当前方案versionId（如有）、是否有在途/既有合作的允许性与安全提示；不泄漏他人详情 |

bootstrap允许初期服务端把所有**当前可见**小规模记录组装成兼容投影；大列表分页用于规模增长。
所有接口只返回白名单，不能通过项目对象内嵌数组、历史事件、错误或统计泄漏他人金额。只读直属PM收到相同可见金额但capabilities全写为false。

creatorVersion取达人聚合RecordVersion；projectVersion取测试工作区该项目配置/有效分配的聚合版本，任何影响提报权限或审核名单的变动同步递增；draft版本取本人自然键对应草稿的RecordVersion。它们均不是workspace全局revision；返回的absent前提同样须事务内重新验证。项目版本变化不改写历史提交人的身份或提报快照。

## 提报、草稿和业务动作

| 方法/路径 | body与条件 | 成功结果 |
|---|---|---|
| PUT /api/v1/creators/:id/draft | campaignId、fields（允许不完整）；首次If-None-Match、后续If-Match；自然键为本人+达人+项目 | 草稿DTO及版本；同key重放不覆盖新内容 |
| POST /api/v1/creators/:id/submit | campaignId、profilePatch、creatorVersion/projectVersion、draftPrecondition（{id,version}或{absent:true}）、items、currency、cost、rights、cooperationNotes；运营reviewPmId，PM自提clientQuoteDraft | 新提报/编号/版本；profile补充、快照、消费草稿、在途claim同事务 |
| POST /api/v1/work/:id/:action | 明确动作schema＋目标ETag，不接受任意model方法名 | 更新后安全DTO、版本、当前待办、warnings |
| GET /api/v1/operations/:key | 查当前actor在当前workspace的该key | 已提交的resourceRefs/resultCode；重建当前可见DTO；未见提交结果404，不代表所有在飞请求失败 |

若事务发现本人草稿存在而请求声称absent，或草稿ID/版本不匹配，返回409，不消费另一会话新存草稿；没有草稿却传旧草稿前提同样409。

正式提报示例（字段示意，ID/版本来自服务器）：

```json
{
  "campaignId":"campaign-test","creatorVersion":2,"projectVersion":1,"draftPrecondition":{"absent":true},
  "profilePatch":{"contact":"creator@example.test","country":"美国","language":"英语","creatorType":"生活方式"},
  "items":[{"platform":"YouTube","type":"dedicated","quantity":2,"publicationPlatforms":["YouTube"]}],
  "currency":"USD","cost":"100.01","clientQuoteDraft":"150.01",
  "rights":"","cooperationNotes":""
}
```

PM自提reviewPm/owner/selfManagedPm服务器从登录身份写；用户不能借同一payload切换成别人的PM自提。
服务器模型适配字段cost→minor，不能把字符串先转Number再调用旧签名。

### action白名单与字段

| action | 字段 | 可写角色/状态 |
|---|---|---|
| approve / reject | clientQuoteDraft、note / reason | 仅分配审核PM、待审核运营提报；PM自提无此步骤；admin拒绝 |
| reopenSubmission / acknowledgeRejection | reason＋新的合作方案 / 空对象 | 本人运营处理未通过；拒审待处理仍占原claim，复审核对并保留同一claim；明确结束才释放，终态不重开 |
| clientQuote | amount、note | 实际负责PM（含自提本人）正式报价；草稿不能替代正式轮次 |
| customerOffer / creatorQuoteReply | amount、note | 客户侧审核PM；达人侧负责运营或自提PM。登记/正式提交后移交 |
| packageRevision / editCustomerProposal | items/currency/cost/rights/note，按侧严格允许 | 实质变更生成新版并清旧确认，运营回审、PM自提免审；普通审核PM不能改运营达人价 |
| correctVideoQuantity | versionId、quantities、reason；并带proposal If-Match | 当前已接受方案建单前由负责运营/自提PM本人补正；项数不变、每项整数1—100且合计1—100、理由必填、必须实际改变；仅改数量，保留同一方案versionId及客户确认、不增加PM再审；提报聚合version递增、旧拆分失效 |
| customerAccept | acceptedClientPrice、quoteDetails | 负责PM登记客户接受当前方案；非正/精度非法拒绝 |
| split | side=cost/clientPrice、amounts[] | 负责运营达人侧/审核PM客户侧；自提PM两侧；版本/合计一致 |
| confirmAndCreateOrder | confirmCreatorAccepted=true，最终确认的versionId | 负责运营/自提PM；客户接受且当前方案成立，事务内完成达人确认＋订单/视频/终态，返回orderId及重复标志 |
| createOrder | versionId（最终方案ID） | 仅兼容已存在双方同版确认的记录；同样身份/版本/幂等；不能绕过正式报价和确认。空body仅可在完整可信历史映射下兼容，否则422，不猜当前版 |
| deliveryBrief / briefSent / preparation / preparationPm | 沿现有视频字段白名单；订单共用项附orderVersion | 保留原负责运营/审核PM及自提PM本人权限，拒绝admin代业务 |
| scriptDraft/Submit/Link/RevisionDone/Send/Return/Pass/Remark、video对应现有动作、publish/returnPublish/accept | 现有合法链接/反馈/发布字段 | 复用既有流程和权限，不新增独立PM初审；完成视频只读 |

confirmCreator等历史兼容入口如保留，必须受相同成交前置限制；不会在首轮新增成单前任意跳步按钮。
共享测试首轮不注册`price/correct-pricing`、交接、取消恢复及其它超范围写动作；查询可保留历史。

### 聚合版本、方案ID与兼容建单（T002）

If-Match中的`proposal:<id>:<version>`是RecordVersion并发令牌；body的`versionId`是`proposalVersions[].id`，二者不能互相替代。运营实质方案变更新增方案并清旧确认；纯条数录入补正是已有例外，沿用同一方案ID和合法客户确认，记录before/after/理由/操作者并使旧拆分失效，不能顺带变更平台、类型、权益、币种或两侧总额。当前代码的分项校验、拆分失效方式仍需T048补齐，不以本次文档对齐标记实现完成。

现有model的createOrder不读取请求versionId且先返回既有订单；旧If-Match也没有可信历史映射，不能直接据此开启共享空body兼容。新共享调用应显式传versionId；缺失且无法由持久、可审计的原请求/聚合历史唯一恢复时422，提供的方案与既有订单不符时409。同方案已成单且仍有当前权限时可先返回原单reused，即使If-Match旧；未成单才按通常聚合版本规则校验。相同Idempotency-Key而body/版本头变化仍409。接口/模型专项用例由T055/T059完成。

建单成功示例：

```json
{
  "data":{"orderId":"order-test","proposalId":"proposal-test","deliveryIds":["video-1","video-2"],"reused":false},
  "meta":{"requestId":"request-test","versions":{"proposal":8,"order":1}},
  "warnings":[{"code":"NEGATIVE_MARGIN","margin":"-10.00","currency":"USD","blocking":false}]
}
```

对于新key的重复建单，先授权并核对已存在订单的proposal/最终方案相符，再返回reused=true；此情况不因旧If-Match而再次建单或增加有效成单审计；其它方案冲突409。

Idempotency-Key同内容重放可返回当前合法资源状态而非旧敏感快照；同key换amount/version字段或动作409。requestHash包括method/path、规范JSON body和If-Match/If-None-Match及依赖版本；不包含Cookie、CSRF或X-Request-ID，使同身份重新登录后的原key同内容重试可用。

## 错误码与客户端恢复

| HTTP / code | 含义 | 前端处理 |
|---|---|---|
| 401 AUTH_REQUIRED/SESSION_EXPIRED | 未登录、停用或会话失效 | 不模拟成功，保留未提交输入在当前页内存，登录后获取新状态核对，不自动重放 |
| 403 FORBIDDEN/CSRF_INVALID | 无操作权限/CSRF | 保留输入，刷新权限；无查看权资源使用404而非泄漏存在 |
| 404 NOT_FOUND | 不存在/不可见，或操作查询暂未提交 | 无跨权限打开入口；查询operation未见结果可同key重试 |
| 409 VERSION_CONFLICT | ETag/依赖版本过期 | 保留输入并展示可见最新值，人工核对后新key提交；不覆盖 |
| 409 ACTIVE_PROPOSAL_EXISTS/OWNERSHIP_UNCLEAR | 单份在途/归属未明确 | 安全提示，不返回他人金额/文档 |
| 409 IDEMPOTENCY_KEY_REUSED / INVALID_STATE | 同key不同请求/不合法状态 | 不换key自动重试；核对当前状态 |
| 422 VALIDATION_ERROR / MONEY_PRECISION | 字段/数量/金额精度非法 | fields定位到输入，金额不静默取整 |
| 428 VERSION_REQUIRED | 应带If-Match却缺失 | 重新读取版本后由用户核对，不静默补版本覆盖 |
| 429 RATE_LIMITED | 登录/写频率保护 | Retry-After，可重试；不能造成重复动作 |
| 503 DB_UNAVAILABLE / LOCK_TIMEOUT / OUTCOME_UNKNOWN | 不可用、锁等待或提交结果不明 | 保留输入与key，先查原operation，仍不明则同key同内容重试 |

服务端审计记录真实actor/requestId/版本与必要变更；日志脱敏，不记录Cookie/飞书code/token/密码。
