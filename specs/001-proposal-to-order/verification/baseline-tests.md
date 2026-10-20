# T003 本机隔离测试基线

执行日期：2026-10-20，Asia/Shanghai。仅执行现有测试与无输出类型检查；没有安装依赖、运行服务、连接真实MySQL/飞书、执行迁移或操作浏览器。

## 运行前隔离核对

- 前端六份`*.test.mjs`使用`completeFixture`/`createPreviewData`等合成对象；UI测试通过`node:vm`注入document/localStorage替身，不读写用户浏览器。
- 后端`tests/app.test.ts`/`tests/crm.test.ts`导入buildApp；通过Fastify inject执行，不listen。TestRepository使用structuredClone和内存事务，x-test-session只由测试进程authenticate适配器识别，不是公开登录路由。
- 配置测试传入显式测试对象；DATABASE_URL仅有合成字符串，inspectDatabasePlan不创建连接。没有导入执行server.ts或实例化真实Prisma Repository。
- `package.json`的test/typecheck无前后置生命周期脚本；未调用dev、start:test、build或test:integration。后者当前并不存在。

## 实际命令与结果

| 工作目录 | 实际命令 | 结果 | 退出码 | 原始记录 |
|---|---|---|---:|---|
| `/Users/yan/codex/solbridge工作流/crm-preview` | `node --test app.test.mjs model.test.mjs package.test.mjs pm-self-managed.test.mjs regional.test.mjs video-v06.test.mjs` | 193测试，193通过，0失败/跳过 | 0 | [frontend-node-test.log](frontend-node-test.log)、[命令与时间](frontend-node-test.json) |
| `/Users/yan/codex/solbridge工作流/crm-backend` | `npm test`，展开为`node --import tsx --test tests/*.test.ts` | 16测试，16通过，0失败/跳过 | 0 | [backend-npm-test.log](backend-npm-test.log)、[命令与时间](backend-npm-test.json) |
| 同上 | `npm run typecheck`，展开为`tsc -p tsconfig.json --noEmit` | 通过，无诊断 | 0 | [backend-typecheck.log](backend-typecheck.log)、[命令与时间](backend-typecheck.json) |

三条命令并行执行于不同读取范围，分别记录退出码；均在2026-10-20 14:24:16 +08:00开始，约0.75/0.72/0.97秒结束。实际运行Node v24.19.0、npm 11.17.0；已安装Fastify5.12.7、@prisma/client/Prisma6.19.3、tsx4.19.4、TypeScript5.8.3、@types/node24.19.2，与锁定依赖一致，见[runtime-versions.json](runtime-versions.json)。

## 结论与边界

T003已完成；本批没有失败测试或测试执行阻塞。此处193/16是**本轮实际重新运行的结果**，并附当前源码基线及完整日志，不引用旧数字代替执行。

- PM自提六项前端专项及后端既有一项专项包含在上述结果中；不重复相加计数。
- typecheck的tsconfig只include `src/**/*.ts`，未对tests做完整类型检查；npm test使用tsx执行测试。
- 现有测试还包含旧管理员交接/纠错等行为；通过表示保留当前基线，不代表已符合共享测试版的新权限/金额/在途/版本契约。差距已在T002记录并归后续任务。
- 未运行真实MySQL并发、SSO、远程浏览器、Windows、恢复或发布检查。仓库另有backup:test脚本，本批按T003指定的前端node:test、后端npm test/typecheck执行，未把其计入“全部后端测试已执行”。
- 已通过的隔离基线允许继续T004角色夹具、T005共享配置、T009金额模块；真实MySQL的X02及云/域名/飞书门槛只约束对应后续工作。

源码与锁文件执行前后逐项摘要核对见[batch-001-003-integrity.json](batch-001-003-integrity.json)。
