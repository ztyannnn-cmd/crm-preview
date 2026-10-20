# 启动配置、环境准备与验证指南

本指南是**未来实施完成后的验收运行约定**；2026-10-20第5步同步Windows与环境观察，本轮未执行安装、迁移、云连接或部署。环境材料见[evidence.md](evidence.md)，Windows具体差异与外部门禁X01—X10见[deployment-compatibility.md](deployment-compatibility.md)，执行任务以[tasks.md](tasks.md)为准。
当前P0配置禁止DB连接，直接运行现有服务只得到健康骨架；下述新开关/路由不能假称现在已有。

## 1. 需由账号/环境管理者准备

| 项目 | 状态/建议 | 放行条件 |
|---|---|---|
| 飞书测试应用 | 用户同意可重新开应用 | 企业管理员配置应用可用范围、发布/审批、最小身份权限、精确HTTPS回调；保留测试与正式app隔离 |
| 测试人员 | 用户指定CRM测试管理员提供 | 至少运营A/B、实际审核PM、直属只读PM、自提PM（可复用人员）、admin；受控邀请→飞书认证pending绑定→管理员确认→员工重新SSO的身份闭环完成，角色和项目分配可核验 |
| 已购阿里云数据库 | 截图摘要观察RDS MySQL8.0基础系列2核2GB、广州A，运行；库/账号列表未列记录不证明无数据 | DB管理员核对现有用途/内核/容量，准备独立测试库、运行/迁移账号及最小GRANT；同VPC之外仍须最小来源、TLS、CA/主机名和真实连接（X03/X04） |
| ECS | 截图摘要观察Windows2022 x64、2核4GiB、广州A；与RDS同VPC；到期2026-11-15，额度提示待核实 | 公司管理员确认现有用途、管理员/工具权限、容量、可用管理通道后收敛22/3389来源，并核对续费/实际余额欠费。先做Windows原生平台演练，不默认重装/购买（X01） |
| HTTPS域名 | solbridgemedia.com；候选crm-test.solbridgemedia.com未最终启用；当前RAM列表空，用户称可能已有授权 | 公司管理员代查管理账号/有效权限、现有解析、备案适用性/状态、最终子域名及HTTPS证书；不要求个人获得域名权限，空列表不证明未注册/无权限。先前公开查询是历史时点摘要，现时结论需重新只读查询（X06） |
| 备份/恢复 | 快照二/四/六16:00、保留7天；日志7天、PITR关、释放不保留，未恢复 | 对照每日＋发布前目标核对调整、保留/释放策略、独立副本、费用与隔离恢复实测；看到完成快照不算恢复通过（X05） |
| 私有Git/CI | 权限未核实 | 后端私有仓库和配对构建权限；本轮不初始化仓库/推送 |

不需要把密码、app secret、连接串粘贴聊天。应用/云/仓库权限和实际预算须由相应管理员提供；选择现有资源不等于新增成本必为零。
上述条件分别放行对应任务。域名/DNS未确认不阻塞本机模型、API、权限夹具、UI以及独立MySQL开发验证；真实飞书/公网HTTPS/远程共享与测试发布分别等待X06/X07等条件，不把模拟身份冒充真实登录。

## 2. 配置变量（仅名称，真实值走受控渠道）

| 分组 | 变量名称 | 用途 |
|---|---|---|
| 环境与入口 | APP_ENV、CRM_MODE、APP_ORIGIN、HOST、PORT、RELEASE_ID、STATE_SCHEMA_VERSION | test/shared、允许Origin、loopback服务、配对版本 |
| DB门禁 | DB_CONNECT_ENABLED、DATABASE_URL、EXPECTED_DB_NAME、EXPECTED_DB_USER、EXPECTED_ENVIRONMENT_UUID、DB_TLS_CA_PATH、DB_TLS_VERIFY、WORKSPACE_ID | 仅在核对目标后开启；变量是待实施约定，须真正传给Prisma6的可信CA与显式sslaccept=strict，错误CA/主机名必须同栈失败，不能关闭TLS校验 |
| 迁移 | MIGRATOR_DATABASE_URL | 与运行账号分离，仅迁移作业可读取 |
| 飞书 | FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_TENANT_KEY、FEISHU_REDIRECT_URI、FEISHU_OAUTH_SCOPES | 服务端配置；scopes按当前测试应用核对最小身份集合 |
| 会话 | SESSION_COOKIE_NAME、SESSION_MAX_AGE_SECONDS、SESSION_IDLE_SECONDS、SESSION_TOKEN_PEPPER、CSRF_SECRET | 默认建议8h/2h；随机凭据仅Cookie；pepper与CSRF材料不进前端 |
| 一次性引导 | BOOTSTRAP_ADMIN_EMPLOYEE_ID、BOOTSTRAP_ADMIN_BIND_TOKEN_HASH | 只在受控初始化阶段启用，用后撤销；不得自动授权首位登录者 |

OAuth端点选定后由服务器配置/适配器固定官方域名，不允许客户端指定任意换码URL。
远程Cookie用`__Host-crm_test_session`（Secure/HttpOnly/Path=/、无Domain）；本机HTTP若已获授权测试运行只用独立dev Cookie，不能把远程安全配置降级。
pending绑定态不是业务登录态，不能读业务或调用写命令；首个管理员受控引导完成后关闭引导能力。
真实SSO验收在HTTPS测试入口完成；本机8897若未获飞书回调登记，仅运行demo及自动注入测试，不以角色切换器冒充真实登录。

### T005已实现的离线配置能力（2026-10-20）

`src/config.ts`现可解析demo/shared及上述环境、数据库目标/UUID/schema、Origin、TLS声明、session、飞书与可选首管理员引导配置；缺省demo、回环地址、DB连接请求为false。shared限定test，完整配置也只代表语法/目标声明有效：`database.connectionAllowed`固定false、未创建数据库客户端，当前ready仍503。实际账号、CA/主机名、迁移和投影检查仍归T016及真实环境任务。

shared要求显式库/运行账号、UUID、schema、workspace、release、Origin、严格TLS/绝对CA路径、session材料和飞书配置。远程Origin须HTTPS；本机HTTP仅允许127.0.0.1并使用独立开发Cookie。session工程默认8小时/空闲2小时，密钥材料至少32字符、占位值拒绝，空闲期不能大于绝对有效期。以上是配置校验，尚未建立真实会话。CA路径可为POSIX或Windows绝对路径，本批不读取CA文件，真实Prisma TLS仍需实测。

运行进程不需要迁移凭据，不在普通运行配置中提供`MIGRATOR_DATABASE_URL`。离线检查若显式提供，校验同隔离库/主机/端口、不同账号及严格TLS，结果不保留或输出迁移连接串；实际最小GRANT另验。

仅使用内置合成环境的检查命令（在crm-backend执行）：

```sh
npm run check:config -- --synthetic
```

该脚本不加载.env，也不采用继承环境中的数据库/密钥配置；无`--synthetic`时拒绝检查。输出仅白名单摘要，`connectionAttempted/grantsVerified/tlsVerified/schemaVerified/projectionsVerified`均false；不能将退出码0解释为真实环境ready。`.env.test.example`仅列无敏感占位值，直接使用占位密钥应报脱敏错误；本批测试通过显式合成对象完成。

### T002首次启动顺序（设计对齐，尚未执行）

1. 在后续已授权的隔离目标核对库/账号/网络/TLS及已有migration，再应用演练通过的必要增量；不靠普通服务启动seed。
2. 用未来`crm-backend/scripts/bootstrap-test.ts`受控创建环境UUID、合成workspace/payload/约束投影/版本、指定首admin employee与一次性绑定token hash；不要求已有admin session，已有目标拒绝覆盖。
3. 接通服务并验证基础readiness：数据库身份、TLS、schema和投影齐备才200；未绑定首管理员也不能绕过上述检查。ready200仅表示基础设施就绪，不代表用户已登录或可以开放共享验收。
4. 已准备HTTPS/飞书测试回调后，由指定首admin完成真实外部证明＋一次性令牌绑定；关闭引导，重新SSO签正式session。不得将首位来访者自动授权为admin。
5. 已认证admin通过`POST /api/v1/admin/employees`预开其他员工，配置受控role/项目/直属关系；邀请→飞书pending→管理员确认→员工重新SSO。业务命令仍禁止传授权字段。
6. 真实SSO/权限/双会话验收在受控隔离候选环境完成；证据齐备后才在已授权窗口开放第8步测试版本。准备验收环境与最终开放是两个门槛，不循环要求“先有已验收版本才能准备验收环境”。

登录前bind/start采用Origin＋一次性邀请/nonce/state，不要求不存在的正式session/CSRF；callback校验state与浏览器绑定。正式会话写入才统一使用CSRF和幂等键，逐路由例外见[api契约](contracts/api.md)。以上工具/路由均为后续任务，本批未修改运行配置或创建账号。

## 3. 实施后的本机启动路径

1. 检出同一release manifest的两个仓库SHA，保持相邻目录；不要拿未提交HEAD当可发布基线。
2. 在构建/开发阶段按锁文件安装后端依赖并生成匹配平台Prisma Client；本轮不执行这些命令。
3. 准备与目标MySQL版本一致的独立本机/CI实例，显式建隔离环境标识和测试工作区，验证schema/约束投影；迁移步骤须在后续授权范围内执行。
4. 在`crm-backend`运行现有`npm test`、`npm run typecheck`；新增实库套件入口预计`npm run test:integration`，实现时建立，当前没有此脚本。
5. 后端由未来接入后的`npm run dev`在test配置下监听4101；必须真实注入authenticate/repository，ready只有环境身份、迁移、权限、连接通过才200。
6. `python3 '/Users/yan/codex/solbridge工作流/crm-preview/scripts/preview.py'`保留8897。未来新增CRM_MODE=shared时仅将本机`/api`及`/health`受控代理到4101，提供共享启动配置，不读写旧业务key；默认demo不变，不自动切模式。
7. 访问`http://127.0.0.1:8897/__preview__`核对源码、mode、release和原key；shared错误不能回退demo数据。不要换localhost判断“数据丢失”。

Python代理只允许固定loopback upstream与限定路径/HTTP方法，控制body大小/超时、正确转发Set-Cookie和Origin；不能成为任意URL代理。
不在共享模式暴露源码私密目录或本地.env。云端不运行Python开发服务器。

## 4. 同事共享测试发布

推荐先验证现有Windows2022原生路线：IIS＋URL Rewrite/ARR静态允许清单与`/api`、`/health`固定反代Fastify，后端回环4101；RDS只允许必要ECS私网来源并验证CA/主机名TLS。模块是否存在/可安装、服务包装器和最小Windows服务账号均待X01核查；本轮不安装。
只对同事开放该HTTPS域名，不把本机8897或MySQL端口暴露公网。静态包按文件允许清单，不包含.git、specs、备份、测试截图或任何.env。
API与session不缓存，写请求校验Origin/CSRF；IIS/ARR只允许受控代理头，应用启用对应trustProxy范围；验证Set-Cookie、原始Host/Origin、HTTPS识别和上游故障503，不能因反代吞错而返回页面假成功。
云端`/__preview__`仅返回release/mode，不公开开发机路径。旧localStorage值绝不自动上传；共享初始样例是显式synthetic workspace。

若已购库含正式业务：独立测试库与最小授权仅是逻辑隔离，仍共享实例资源/故障域；有余量并经云管理员同意才复用。
禁止测试账号访问正式schema，测试进程不能读取正式配置；若隔离不足才提出专用实例预算，不本轮创建。
应用账号只读写测试业务表，无DDL；迁移账号独立；连接后核对CURRENT_USER/DATABASE/版本、grant、环境UUID与schemaVersion再放行。

同VPC编号已观察到为vpc-7xvfmx7hsq2fjzgduhxde，历史VPC详情Forbidden.RAM不再阻塞核对网络归属。真实连通仍待X03/X04：当前白名单仅127.0.0.1且SSL未开，不能跳过授权与TLS。DB管理员核对启用TLS/强制TLS的版本支持与其他客户端影响，实际受保护RDS域名必须与证书匹配；成功后还须错误CA、可达但主机名不匹配、明文连接的负向证据，失败ready503。

Windows后续验收次序：管理员只读盘点→隔离Windows x64锁版本构建/Prisma Client→本机健康与离线回归→获授权的私网/TLS/实库冒烟→WinSW服务启停/异常恢复/重启持久→IIS同源HTTPS→真实SSO→第7步验收→第8步测试发布。当前server.ts只有SIGINT/SIGTERM，服务控制停止与排空必须新补验证。完整差异和交付物见兼容性评估，不把这些动作当作本轮授权执行。

## 5. 构建、备份与回滚

- 构建产物保留同级crm-preview/crm-backend布局，Node24精确版本、win-x64与匹配Prisma引擎、两个commit和包锁摘要进入manifest；不复制Darwin node_modules到Windows。无前端npm锁文件时明确记none，不能编造第二份依赖树。
- 历史浏览器数据按原key保留，用户要导出时先确认范围；现有导出工具前缀未必覆盖`solbridge-video-v06-preview-only`，不能直接声称旧工具已覆盖此key。
- 测试DB每日备份、发布前额外备份；现有二/四/六快照不满足每日目标，日志备份开启且PITR关闭不证明24h可恢复。7天保留、释放后不保留需单独对照目标核实。建议初始RPO≤24h/RTO≤4h，首次恢复演练实测后再承诺；保留至少一份受控独立副本，核对可恢复格式/失败域/费用并审计谁可恢复。
- 先备份→隔离库演练新增schema→组合测试→build→不可变新版本目录准备→维护停写/排空→成套切换Windows服务路径与IIS静态/反代配置→ready→真实登录与业务冒烟→解除维护。Windows文件占用、symlink权限和IIS/服务多项切换不默认原子，必须演练中断恢复并核对前后端releaseId；失败保持503。初次上线无旧版本可回时关闭共享入口，不能回落demo假成功。
- 旧版本保持与新schema兼容才允许切回**前后端配对包**；没有兼容性则停写、回到维护页并前向修复，不执行DROP/自动逆迁移。
- 数据误写先暂停写入，在另一隔离目标恢复备份，校验payload/投影、金额、订单唯一性与权限后切换；不覆盖唯一副本。恢复新RDS实例可能收费，必须另获资源授权。
- 服务启动、发布失败不得seed、清LocalStorage或吞连接错误；503必须真实反映不可用。

原Linux的apt/systemd/journalctl/Nginx/current切换命令不适用于本实例。只有公司另有可用Linux资源或批准预算/用途后，才重审Linux备选并形成相应命令与独立平台证据；不默认重装或新购现有服务器。

## 6. 费用与批准边界

仅列费用组成，不给无规格依据的月价：已有数据库仍可能增加存储/备份/负载，ECS含计算/盘/公网出网/快照；
域名/TLS、CI、备份存储/恢复目标按已有账户额度核对。首轮不要求LB/CDN/NAT/Redis/短信等附加服务。
依据：[ECS计费](https://help.aliyun.com/zh/ecs/billing-overview)、[RDS计费](https://help.aliyun.com/zh/rds/product-overview/billable-items-billing-methods-and-pricing)。
实际开资源前由云管理员给地域、规格、时长、出网、备份保留、当前折扣后的控制台报价及预算；本轮没有购买/创建或开通任何付费资源。

## 7. 放行验证

按[validation.md](validation.md)执行：真实飞书身份/停用、双浏览器共享与重启持久、完整角色矩阵、负Margin与精度、
双连接在途/成单竞争、旧版本冲突、提交后断网同key恢复、投影恢复和配对回滚。每项记录releaseId、DB环境、身份、输入与结果。
真实外部前置未齐全可完成第5步拆分，但不能把内存测试代为登录/共享测试环境已验收。
