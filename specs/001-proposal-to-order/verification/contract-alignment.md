# T002 契约、初始化和版本对齐

日期：2026-10-20。依据本机现有源码与测试，完成文档对齐；不修改业务代码、不运行迁移、初始化、真实登录或环境配置。Q1—Q3沿用最终确认，不新增业务问题。

## 逐项结论

| 对齐事项 | 本机事实与定位 | 固化的共享设计及后续任务 |
|---|---|---|
| 管理员预开员工入口 | `crm-backend/src/crm.ts`没有员工管理路由；只有可注入authenticate，不存在真实admin会话实现 | api补`POST /api/v1/admin/employees`；只允许已认证admin预开，employeeId/company/workspace由服务端确定；首admin另走受控引导。T015/T021实施 |
| 业务禁传role与管理字段例外 | 当前接口Body:any、直接交给model；尚无统一字段schema | 普通业务拒actor/role/owner/selfManaged标记；admin管理schema可声明role/分配字段，不能给自己改业务角色绕过禁代业务。T011/T021/T023实施 |
| 登录前请求保护 | 当前没有飞书、邀请、Cookie或CSRF路由 | bind/start用同源Origin、邀请、nonce/state；callback校验code/state/浏览器绑定和测试app/tenant，不能要求不存在的正式session/CSRF。正式会话写请求才统一CSRF/幂等。api已补路由保护表，T019—T022实施 |
| 草稿和项目版本来源 | 当前只有workspace revision；model草稿按本人自然键，未持久维护聚合RecordVersion | submission-context返回creator聚合版本、项目配置/有效分配版本及本人草稿id/version或absent，统一快照读取；提交事务内重新验证，不使用全局revision代替。T007/T012/T025/T034/T038实施 |
| 拒审后claim | `model.mjs`的reject仅转不予提报；acknowledgeRejection显式设置结束；复审为原记录追加方案 | 拒审待处理仍占原claim，原记录复审核对并保留，结束/成单才释放；新轮次另占claim。缺失或冲突拒写并核查，不释放后重新竞争。T037/T044/T067实施/验证 |
| OAuth重复字段 | 原data-model的OAuthAttempts列重复browserBindingHash | 已删除重复列，保留单一浏览器绑定hash；T006建模时实现 |
| 首次初始化顺序 | `server.ts`只buildApp(loadConfig())，未注入CRM；ready固定503；schema只有CrmWorkspaceState | 明确受控初始化环境/workspace/指定employee→基础DB/TLS/schema/投影readiness→真实首admin绑定→重新SSO→其他员工开通与权限验收。初始化不依赖已存在admin session，ready不授予业务权限。T015/T016/T066/T082/T086实施 |
| 聚合version与方案versionId | `model.mjs`的proposalVersions包含id与方案序号；订单保存versionId；尚无共享RecordVersion | ETag是聚合并发版本；versionId是业务方案ID；workspace revision仅提交序号。方案变更/报价/审核/拆分等升聚合版本，不能要求每次都新建业务方案 |
| 数量补正例外 | `model.mjs:436`只改当前方案items数量、保留方案ID/客户确认并写quantityCorrections；`package.test.mjs:559`专项明确“不重开PM确认”，核对补正前后ID/确认不变，成单生成4条视频。`docs/开发与预览工作流.md`亦明确运营自行补正且不加PM再审 | 已有业务依据充分，**不再列为待确认业务阻塞**。同一方案纯数量补正保留合法当前确认，升proposal聚合version、理由/前后值留痕，旧拆分失效；项数不变，每项和总计1—100。平台/类型/权益/币种/两侧总额变化走实质方案变更。现有代码未明确清掉旧拆分、未共享版本化，仍由T048完成及验证 |
| 兼容createOrder请求方案 | `model.mjs:558/574`的两个建单函数先返回已存在订单；新建时比较记录内确认ID，但不校验请求data.versionId。现有HTTP也无If-Match/Operation/完整请求版本历史 | 新共享调用显式versionId；空body不能仅凭旧ETag或当前方案推测，只有未来持久可信历史能唯一映射才兼容，否则422。显式方案不符409；同方案已成单在当前授权后返回原单，未成单再校验聚合版本。同key改body/头仍409。T055/T059实施 |
| 受控验收与最终发布顺序 | 当前尚无共享测试入口；已有Windows环境观察只证明材料现状 | 先在获授权隔离环境准备候选版本，再做真实SSO/业务验收，最后开放已验收测试版本；不是先发布给同事才能验收。quickstart已明确T075/T082/T089/T092顺序，X10按具体窗口放行 |

## 本批修订

- `contracts/api.md`：补员工预开接口、逐路由认证例外、版本来源、claim、数量补正与兼容建单口径。
- `data-model.md`：OAuth字段去重，明确三类版本、claim生命周期、数量补正与首次初始化顺序。
- `quickstart.md`：补首次启动/绑定/验收/开放顺序；没有提供或执行实际迁移、云配置命令。
- `tasks.md`：回填本机核对结果与T001—T003证据，保留95个任务编号及后续未完成项。

## 完成标准与局限

T002所列事项已逐项得出工程口径；没有未解决的业务规格冲突。数量补正与createOrder的剩余工作是明确的后续实现/验证差距，不阻塞T004/T005/T009。

当前`src/crm.ts`仍包含旧交接/纠错写路由、全400、无严格DTO/金额字符串/聚合版本；当前Repository GET仍写revision。它们须由既有后续任务收紧，不因本批文档对齐而改称满足共享规格。真实MySQL、飞书与Windows证据均未取得。

依据验证：阅读现有代码/专项测试，并运行本批前端193/193、后端16/16及typecheck，见[baseline-tests.md](baseline-tests.md)。这些是旧隔离实现回归，不能证明未来共享契约已经实现。
