# 研究记录与技术决策

2026-10-19｜基于已确认spec与本机代码，只读研究；未安装/连接云或数据库。
当前会话Available skills未自动列出speckit-plan，已显式读取项目技能，运行setup-plan取得同一功能目录。
按该技能要求并行研究身份、数据库、部署；研究代理均只读，无文件修改。无extensions.yml/hook。

| 决策 | 推荐及理由 | 考虑过的替代 |
|---|---|---|
| 前端结构 | 保留ES Modules与现有设计系统，仅引入API client/async事件适配，不重写界面 | React/Next重建无必要，父目录Next是另一建联工具 |
| 共享存储 | 现有workspace JSON＋关系型约束投影，身份关系独立规范化；对小规模业务最少改动且能实库唯一保护 | 纯JSON仅应用校验缺数据库唯一兜底；首轮全规范化会扩大范围。过渡方案全部写入必须同事务，不是最终生产扩展承诺 |
| 并发 | workspace短事务锁＋聚合版本＋幂等结果；只读路径独立 | 仅禁按钮不防并发；仅行锁不防旧页面覆盖；仅随机requestId不等于幂等 |
| 身份 | 测试专用飞书企业自建应用，服务端用户身份映射＋CRM opaque session，数据库决定角色 | 浏览器role/x-test-session不可做真实身份；自建密码登录会增加密码重置/限流管理，作为飞书审批不可用时另授权备选 |
| 会话 | 随机32字节不透明凭据、DB存hash、Cookie HttpOnly/Secure/SameSite=Lax；Origin+CSRF | 无需JWT/Redis；身份/权限改动即时失效更直接。8h绝对/2h空闲是工程建议，不当成此前用户确认 |
| 钱 | HTTP十进制字符串、JSON整数分字符串、BigInt计算；明确精度校验 | Number+Math.round会吞掉三位小数，已与spec冲突；本轮不引入decimal依赖 |
| MySQL | 兼容8.0/8.4、InnoDB；优先核对已购阿里云实例，开发/CI与目标版本一致 | 不因旧文档推荐PostgreSQL改换现有Prisma MySQL路径；不假定已购产品就是RDS MySQL |
| 版本管理 | 前后端保持同级双私有仓库＋配对release manifest | 初始化父目录会混入无关工具；submodule/目录迁移改变现有布局，无首轮收益 |
| 测试部署（2026-10-20修订） | 先在现有Windows 2022 x64上验证Node24/Fastify/Prisma精确锁版本；建议IIS＋URL Rewrite/ARR同源HTTPS和受控Windows服务 | 旧Linux＋Nginx方案仅在公司提供既有Linux资源或单独批准预算后启用；不默认重装/购买/WSL；不公开本机8897或数据库公网 |

## 官方能力核对

以下来源核对日期为2026-10-19。官方产品能力与我们选定的工程策略分别陈述，未以文档存在替代本机集成验证。

- [Prisma ORM v6事务](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions)：交互事务、隔离级别、P2034重试、幂等/OCC；方案因此选短事务、聚合version和有限重试。该文档对应当前6.x，不直接照搬新版7.x配置。
- [MySQL锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html)、[唯一索引](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)：事务内锁与唯一约束承担最终竞争保护。独立ActiveClaim表避免依赖条件唯一索引/生成列的额外迁移兼容性。
- [Fastify请求校验与输出序列化](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)：用JSON Schema验证输入、明确响应白名单；异步身份/数据库检查放preHandler/服务层，不在Schema里访问数据库。
- [fastify-cookie官方兼容表](https://github.com/fastify/fastify-cookie)：Fastify5对应>=10的插件系列；未来实施锁定兼容版本，本轮无安装。
- [Node24 crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)：复用randomBytes/createHash/timingSafeEqual，不额外引入会话JWT库。身份授权码和会话凭据不能进日志。
- [飞书用户标识](https://open.feishu.cn/document/platform-overveiw/basic-concepts/user-identity-introduction/introduction)、[通用错误码](https://open.feishu.cn/document/server-docs/api-call-guide/generic-error-code)：open_id有应用作用域；用provider/appId/tenant/openId唯一映射，测试/正式不混身份，不用姓名/邮箱认领。
- [飞书官方登录集成方案](https://open.feishu.cn/solutions/detail/qrcode)：用户身份取得后由应用建立自身登录态；不把tenant_access_token当用户会话。
- [授权码](https://open.feishu.cn/document/authentication-management/access-token/obtain-oauth-code)、[用户访问凭证](https://open.feishu.cn/document/authentication-management/access-token/get-user-access-token)、[用户信息](https://open.feishu.cn/document/server-docs/authentication-management/login-state-management/get)：链接可打开，但部分动态正文机器读取为空。**没有声称精确端点/scope参数已全部核实**；实施前由新建测试应用控制台对应的当前官方登录示例核对最小身份scope、端点、精确回调。首轮不申请离线刷新、手机号、广泛通讯录或消息权限。
- [阿里云RDS连接条件](https://help.aliyun.com/zh/rds/apsaradb-rds-for-mysql/how-do-i-connect-to-an-apsaradb-rds-instance)：推荐同账号地域/VPC私网，白名单限应用来源，避免公网连接。实际账号网络未访问。
- [ECS计费组成](https://help.aliyun.com/zh/ecs/billing-overview)、[RDS计费组成](https://help.aliyun.com/zh/rds/product-overview/billable-items-billing-methods-and-pricing)：计算、存储、流量/备份等按实例和使用计费；没有规格/账单就不能给可靠固定月价。
- [RDS恢复](https://help.aliyun.com/zh/rds/apsaradb-rds-for-mysql/restore-full-data-of-an-apsaradb-rds-for-mysql-instance)：恢复目标/备份能力依实例配置；恢复新实例可能计费，须单独授权。不能用应用回滚代替数据恢复。
- [Nginx反代](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)：HTTPS单域反代到回环应用，统一Origin/Cookie；只信任受控代理，不能盲信公网X-Forwarded-*。

## 用户补充与外部接入门禁

2026-10-19用户答复可重新开飞书应用、已购数据库/数据表。2026-10-20用户补充的截图摘要已观察到RDS MySQL 8.0、Windows 2022 ECS及同VPC，取代此前产品/系统/网络归属未知；详细事实、限制与尚未核实项见 [evidence.md](evidence.md)。平台推荐因此修订为先做Windows原生兼容性验证，业务架构不变；域名、数据库身份/TLS/连接、备份恢复和账务仍分别受门禁。
没有再次要求用户决定技术栈，未索取密钥。可进入任务拆分；实际登录/部署前需这些外部材料，并核实动态官方参数。
无新增未决业务规则。Windows路线已有推荐而尚未实机验证，确切系统工具可用性/服务停止/Prisma TLS/目标性能列为技术风险及任务；必要时条件性回评Linux资源，不把待确认外部条件写成已解决。真实MySQL事务、网络/TLS和飞书登录仍必须实测。

## 第5步Windows差异复核（2026-10-20）

Decision：优先验证现有Windows2022原生Node24/Fastify/Prisma6路线；IIS＋URL Rewrite/ARR与锁定稳定服务包装器为候选系统工具。Rationale：现有业务代码无Linux专属依赖，优先复用服务器。Alternatives considered：Linux＋Nginx仅当公司有可用Linux资源或批准费用后启用；不默认重装、购买、WSL或Nginx/Windows平移。

官方Windows平台、服务/TLS差异和精确组合证据限制见[兼容性评估](deployment-compatibility.md)。该评估保存了2026-10-20只读来源：Node24平台表、Prisma系统要求/MySQL TLS、Fastify5.12 LTS、Microsoft IIS/SCM、WinSW稳定发行、Nginx Windows、RDS TLS与备份。平台被支持不等于本项目已测；必须补Windows构建/Client、服务停止/重启、IIS Cookie/Origin、同栈TLS错误CA/主机名拒绝及容量证据。

已解决的是文档路线差异；未解决的是实机验证和外部材料。当前RDS快照三次每周与既定每日备份有差距、PITR关闭且未恢复，不能宣称RPO/RTO已达标。详情和X01—X10范围映射均见兼容性评估。
