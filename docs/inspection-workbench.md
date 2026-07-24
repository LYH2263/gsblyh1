# 数据质量巡检与修复工作台 — 交付说明

## 一、新增/修改文件

### 后端（NestJS + TypeORM + SQLite）

| 文件 | 说明 |
| --- | --- |
| `backend/src/inspections/inspection-task.entity.ts` | 巡检任务实体（user+dataset 隔离，状态 queued/running/done/failed） |
| `backend/src/inspections/inspection-report.entity.ts` | 巡检报告实体（质量分、分类计数、明细 JSON） |
| `backend/src/inspections/rules.engine.ts` | 四类规则引擎 + 质量分计算（纯函数，独立于状态/持久化逻辑） |
| `backend/src/inspections/inspections.service.ts` | 任务提交/异步执行/状态查询/报告查询/问题分页/三类修复 |
| `backend/src/inspections/inspections.controller.ts` | 路由层 |
| `backend/src/inspections/inspections.module.ts` | 模块装配 |
| `backend/src/inspections/dto/*.ts` | 问题筛选、修复入参 DTO |
| `backend/src/inspections/rules.engine.spec.ts` | 规则引擎单测（5 用例） |
| `backend/test/inspections.e2e-spec.ts` | 巡检→报告→修复→复检全链路 e2e |
| `backend/src/app.module.ts` | 注册实体与 InspectionsModule |
| `backend/src/records/records.service.ts`、`dto/bulk-import.dto.ts` | 新增 `lenient` 宽松导入模式（允许脏数据入库，供巡检发现），默认严格不变 |

### 前端（Vue 3 + Pinia + Element Plus）

| 文件 | 说明 |
| --- | --- |
| `frontend/src/pages/InspectionPage.vue` | **巡检工作台视图**（分数/进度、分类统计、问题表、修复对话框） |
| `frontend/src/stores/inspections.ts` | **任务/报告状态逻辑**（提交、轮询、筛选、修复）——与视图分文件 |
| `frontend/src/api/inspections.ts` | 巡检接口封装 |
| `frontend/src/config/inspectionRules.ts` | 四类规则元数据（标签、描述、颜色） |
| `frontend/src/types/models.ts` | 巡检相关类型 |
| `frontend/src/router/index.ts` | 新增路由 `/app/datasets/:id/inspection` |
| `frontend/src/layout/AppLayout.vue` | 侧栏/移动端新增「质量巡检」导航 |
| `frontend/src/pages/ExplorePage.vue` | 对仍在最新报告中的问题行打警告标（行高亮 + 感叹号 + 提示条） |
| `frontend/src/pages/ImportPage.vue` | 新增「宽松导入」勾选与「数据质量巡检」入口 |

> 未新增任何第三方 npm 依赖，完全沿用现有技术栈。

## 二、任务与报告接口（Base `/api`，均需 `Authorization: Bearer <token>`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/datasets/:id/inspections` | 发起巡检/复检，返回 `{ taskId, status }` |
| GET | `/inspections/tasks/:taskId` | 查询任务状态（queued/running/done/failed，failed 带 error） |
| GET | `/datasets/:id/inspections/latest` | 数据集最新报告；含 `score/totalRecords/issueRecords/categoryCounts/issueRecordIds`，无则返回 `null` |
| GET | `/inspections/reports/:reportId/issues?rule=&page=&pageSize=` | 问题明细，按规则筛选 + 分页；每条含 `recordId/rule/summary/record` |
| POST | `/inspections/reports/:reportId/fix/missing` | 缺失字段填默认值（可传 `recordIds` 及各字段默认值） |
| POST | `/inspections/reports/:reportId/fix/amount` | 异常金额改绝对值（负值转正；>1e7 截断到 1e7） |
| POST | `/inspections/reports/:reportId/fix/delete` | 重复记录批量删除（`recordIds` 必填） |

**隔离**：任务/报告实体均带 `userId + datasetId`，所有查询与修复先校验数据集归属，跨用户/跨数据集不可访问。

**状态流转**：提交即写入 `queued` 并返回 taskId → 异步置 `running` → 执行规则并持久化报告后置 `done`（写入 reportId）；异常置 `failed` 并记录 error。前端轮询 `getTask` 观察流转。

## 三、四类规则要点

| 规则 key | 判定 | 摘要示例 |
| --- | --- | --- |
| `missing_field` 字段缺失 | date / category / region / channel 任一为空（trim 后空串） | `字段缺失：category、region` |
| `abnormal_amount` 异常金额 | `amount ≤ 0` 或 `amount > 1e7`（含非有限数） | `异常金额：-50（应为 0 < amount ≤ 10000000）` |
| `future_date` 未来日期 | `date` 字符串晚于今天（YYYY-MM-DD 比较） | `未来日期：2026-07-29（今天 2026-07-24）` |
| `duplicate_key` 重复组合键 | 同数据集 `date+category+region+channel` 相同的分组内，按 id 升序保留最早一条，其余全部标重复 | `重复组合键：2020-01-01/Food/North/Online` |

**质量分**：`score = round(健康记录数 / 记录总数 × 100)`，范围 0–100；健康记录 = 未命中任何规则的记录。无记录视为 100 分。同一记录命中多条规则只计一次「问题记录」，但在分类计数与明细中分别体现。

## 四、验证步骤与预期结果（登录后：巡检 → 修复 → 复检）

前置：`pnpm install` 后启动（Node 20）：`pnpm --filter insightboard-backend dev` 与 `pnpm --filter insightboard-frontend dev`；用测试账号 `test_user / test123456` 登录。

1. **准备含问题数据**：进入某数据集「导入/录入」页，勾选 **宽松导入**，粘贴以下 CSV 后点「导入数据」：
   ```
   date,category,amount,region,channel
   2020-01-01,Food,100,North,Online
   2020-01-02,,200,South,Offline
   2020-01-03,Book,-50,East,Online
   2099-01-01,Toy,300,West,Offline
   2020-01-01,Food,999,North,Online
   ```
   预期：提示「导入成功，共 5 条」。

2. **发起巡检**：点「数据质量巡检」进入工作台 → 点「发起巡检」。
   预期：先显示进度/「巡检进行中」，随后展示报告——质量分 < 100；分类统计中 **字段缺失 1、异常金额 1、未来日期 1、重复组合键 1**。

3. **按问题筛选**：点击「异常金额」分类芯片。
   预期：问题表仅显示金额为 -50 的记录，规则标签为「异常金额」，分页/总数随筛选更新。

4. **修复—缺失填默认值**：切到「字段缺失」→「填默认值修复本页」，确认。
   预期：提示「已修复 1 条记录，请复检确认」。

5. **修复—异常金额改绝对值**：切到「异常金额」→「改绝对值修复本页」。
   预期：提示「已修复 1 条记录」（-50 → 50）。

6. **修复—重复批量删除**：切到「重复组合键」→ 勾选重复行 →「批量删除选中」→ **二次确认弹窗**点「删除」。
   预期：提示「已删除 N 条记录」；取消则不删除。

7. **复检**：点「重新巡检 / 复检」。
   预期：生成新报告，质量分升高；字段缺失=0、异常金额=0、重复组合键=0，仅剩 **未来日期 1**（未修复）。

8. **探索页警告标**：进入「数据探索」页。
   预期：顶部黄色提示条显示「仍有 N 条问题记录」；未来日期那条记录所在行高亮，首列显示警告标（悬停提示「该记录存在数据质量问题」）；点「前往修复」跳回工作台。

9. **空态/错误态**：
   - 未巡检的数据集打开工作台 → 显示「尚未巡检」空态；
   - 全部问题修复后复检 → 显示「数据质量良好」成功态；
   - 任务失败 → 显示红色错误态与 error 信息。

## 五、测试结果

- 后端单测：`4 suites / 10 tests` 全通过（含规则引擎 5 用例）。
- 后端 e2e：`inspections.e2e-spec.ts` 与 `records-bulk.e2e-spec.ts` 全通过，覆盖巡检→报告→筛选→三类修复→复检链路。
- 后端 `tsc -p tsconfig.build.json` 编译通过；前端 `vue-tsc` 对新增文件无类型错误。
- 说明：当前 shell 为 Node v16，前端 `vite build` 与部分 element-plus 类型声明依赖 Node 20，需在 Node 20 环境运行（见 `.nvmrc`）。
