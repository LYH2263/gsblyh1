# InsightBoard 数据质量巡检与修复工作台 — 交付说明

## 一、新增/修改文件清单

### 后端（`backend/src/`）

| 文件 | 说明 |
|------|------|
| `quality/inspection-task.entity.ts` | 巡检任务实体（queued/running/done/failed 四态） |
| `quality/inspection-report.entity.ts` | 巡检报告实体（质量分、分类计数、问题明细 JSON） |
| `quality/dto/query-issues.dto.ts` | 问题列表查询 DTO（rule 筛选 + 分页） |
| `quality/quality.service.ts` | 核心逻辑：任务调度、四类规则引擎、修复操作、复检 |
| `quality/quality.controller.ts` | REST API 控制器（9 个端点） |
| `quality/quality.module.ts` | NestJS 模块注册 |
| `app.module.ts` | 注册 QualityModule 及两个新实体 |

### 前端（`frontend/src/`）

| 文件 | 说明 |
|------|------|
| `types/models.ts` | 新增 InspectionTask / InspectionReport / QualityIssue 等类型 |
| `api/quality.ts` | 质量模块 API 客户端（9 个接口方法） |
| `stores/quality.ts` | Pinia store：任务轮询、报告获取、问题分页筛选、修复操作（**状态逻辑与视图分离**） |
| `pages/QualityPage.vue` | 巡检工作台主视图（评分、分类统计、问题表、修复操作、复检） |
| `pages/ExplorePage.vue` | 修改：增加「状态」列，对最新报告中的问题行打 ⚠ 警告标 |
| `pages/DatasetsPage.vue` | 修改：操作列增加「质量巡检」入口链接 |
| `layout/AppLayout.vue` | 修改：侧边栏/移动端导航增加「质量巡检」菜单项 |
| `router/index.ts` | 修改：新增 `/app/datasets/:id/quality` 和 `/app/quality` 路由 |

---

## 二、新增路由

### 前端路由

| 路径 | 组件 | 说明 |
|------|------|------|
| `/app/datasets/:id/quality` | QualityPage.vue | 指定数据集的质量巡检页 |
| `/app/quality` | QualityPage.vue | 质量巡检页（自动选中当前数据集） |

### 后端 API 端点（所有端点均需 JWT 鉴权，前缀 `/api`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/quality/datasets/:id/inspections` | 发起巡检，返回 `{ taskId }` |
| GET | `/quality/inspections/:taskId` | 查询任务状态（queued/running/done/failed） |
| GET | `/quality/inspections/:taskId/report` | 获取完成的巡检报告 |
| GET | `/quality/inspections/:taskId/issues` | 分页获取问题明细（支持 `rule` 参数筛选） |
| GET | `/quality/datasets/:id/reports/latest` | 获取数据集最新报告（无报告返回 null） |
| GET | `/quality/datasets/:id/flagged-records` | 获取最新报告中所有问题记录 ID（供探索页标记） |
| POST | `/quality/datasets/:id/fix/missing` | 缺失字段填默认值，body: `{ recordIds: number[] }` |
| POST | `/quality/datasets/:id/fix/amounts` | 异常金额修正，body: `{ recordIds: number[] }` |
| POST | `/quality/datasets/:id/fix/duplicates` | 批量删除重复记录，body: `{ recordIds: number[] }` |

---

## 三、任务与报告接口数据结构

### InspectionTask（任务）

```json
{
  "id": 1,
  "userId": 1,
  "datasetId": 3,
  "status": "done",          // queued | running | done | failed
  "errorMessage": null,      // failed 时有值
  "reportId": 1,             // done 时有值
  "createdAt": "2026-07-24T10:00:00.000Z",
  "updatedAt": "2026-07-24T10:00:01.000Z"
}
```

### InspectionReport（报告）

```json
{
  "id": 1,
  "userId": 1,
  "datasetId": 3,
  "taskId": 1,
  "qualityScore": 72,          // 0-100 整数
  "totalRecords": 100,
  "issueCounts": {
    "missing": 5,
    "abnormalAmount": 3,
    "futureDate": 1,
    "duplicate": 2
  },
  "issues": [
    { "recordId": 10, "rule": "missing", "field": "category,region", "summary": "字段缺失：category、region" },
    { "recordId": 11, "rule": "abnormal_amount", "field": "amount", "summary": "异常金额：-500（应 > 0 且 ≤ 10000000）" },
    { "recordId": 12, "rule": "future_date", "field": "date", "summary": "未来日期：2027-01-01（晚于今日）" },
    { "recordId": 13, "rule": "duplicate", "summary": "重复组合键：date+category+region+channel 与同数据集更早记录重复" }
  ],
  "createdAt": "2026-07-24T10:00:01.000Z"
}
```

### 分页响应（/issues 端点）

```json
{
  "items": [/* QualityIssue[] */],
  "total": 11,
  "page": 1,
  "pageSize": 10
}
```

---

## 四、四类巡检规则要点

| 规则 | rule 值 | 检测条件 | 修复方式 |
|------|---------|----------|----------|
| **字段缺失** | `missing` | `category` / `region` / `channel` 为空或纯空白；`date` 为空、纯空白或不符合 `YYYY-MM-DD` 格式 | 填充默认值：category→`未分类`，region→`未知地区`，channel→`未知渠道`，date→`1970-01-01` |
| **异常金额** | `abnormal_amount` | `amount ≤ 0` 或 `amount > 10,000,000` | 取 `Math.abs(amount)`；若结果为 0 则设为 `0.01`；若超过上限则截断为 `10,000,000` |
| **未来日期** | `future_date` | `date` 是合法 `YYYY-MM-DD` 且晚于当天零点（运行时 `new Date()` 截断到日） | 无自动修复，标记为需人工修正 |
| **重复组合键** | `duplicate` | 同一数据集内，`date + category + region + channel` 完全相同；按 `id` 升序，除最早一条外其余均标为重复 | 批量删除标记的重复记录（二次确认弹窗） |

### 质量评分算法

```
qualityScore = round((无问题记录数 / 总记录数) × 100)
```
无问题记录数 = 总记录数 − 涉及至少一个问题的去重记录数。

---

## 五、前端架构说明

- **视图与状态逻辑分离**：
  - [QualityPage.vue](file:///d:/Asolo4/众测723/gsblyh1/frontend/src/pages/QualityPage.vue) — 纯视图层，负责模板渲染、用户交互事件绑定
  - [quality.ts](file:///d:/Asolo4/众测723/gsblyh1/frontend/src/stores/quality.ts) — Pinia store 封装所有任务轮询、API 调用、分页状态、修复操作
  - [quality.ts](file:///d:/Asolo4/众测723/gsblyh1/frontend/src/api/quality.ts) — 底层 API 客户端

- **数据隔离**：所有后端接口强制校验 `userId`，任务和报告按用户 + 数据集隔离，用户无法访问他人数据。

- **空态/错误态覆盖**：
  - 无数据集 → 提示先创建数据集
  - 空数据集 → 后端返回 400，前端 ElMessage 提示
  - 尚未巡检 → 引导发起巡检
  - 巡检排队/运行中 → 圆形进度展示
  - 巡检失败 → 错误信息 + 重试按钮
  - 无质量问题 → 绿色成功提示
  - 探索页 → 当前页有问题记录时顶部黄色警告条 + 每行状态列标记

---

## 六、验证步骤与预期结果

### 前置条件
- 后端依赖已安装（`cd backend && npm install`）
- 前端依赖已安装（`cd frontend && npm install`）
- 后端运行在 `http://localhost:3000`（`npm run dev`）
- 前端运行在 `http://localhost:5173`（`npm run dev`，Vite 代理 `/api` → `localhost:3000`）

### 步骤 1：登录
1. 浏览器打开 `http://localhost:5173`
2. 使用演示账号登录（demo / demo123，或自行注册）
3. **预期**：跳转到「数据集」页

### 步骤 2：准备测试数据
1. 点击「新建数据集」，名称填 `测试集A`，创建
2. 点击「导入/录入」，使用 CSV 导入以下数据（包含各种质量问题）：

```csv
date,category,amount,region,channel
2026-07-20,电子,1500,华东,线上
2026-07-20,电子,1500,华东,线上
2026-07-21,服装,-200,华南,线下
,食品,300,华北,线上
2026-07-19,,800,,线下
2027-12-01,家居,500,西南,线上
2026-07-22,图书,0,东北,线下
2026-07-22,图书,20000000,西北,线上
```
3. **预期**：提示导入成功 8 条

### 步骤 3：发起巡检
1. 在数据集列表点击「质量巡检」，或从侧边栏进入
2. 确认数据集选择为「测试集A」，点击「发起巡检」
3. **预期**：
   - 按钮显示「巡检中…」，页面显示圆形进度（排队中→运行中）
   - 约 1-2 秒后结果展示：质量评分（预计约 50-70 分区间）
   - 四个统计卡片显示：字段缺失 ≥ 2、异常金额 ≥ 3、未来日期 1、重复记录 1

### 步骤 4：按规则筛选
1. 点击「字段缺失」统计卡片或筛选按钮
2. **预期**：问题表仅显示 rule=missing 的记录，分页刷新
3. 点击「全部」恢复显示所有问题

### 步骤 5：修复 - 填充默认值
1. 勾选字段缺失的记录（表格复选框）
2. 点击「填充默认值」按钮
3. 在确认弹窗中点击「确认填充」
4. **预期**：ElMessage 提示「已修复 N 条记录」

### 步骤 6：修复 - 修正金额
1. 勾选异常金额的记录
2. 点击「修正金额」→ 确认
3. **预期**：提示「已修复 N 条记录」

### 步骤 7：修复 - 删除重复（二次确认）
1. 仅勾选重复记录（非重复记录时「删除重复」按钮禁用）
2. 点击「删除重复」
3. **预期**：弹出危险操作确认弹窗（红色按钮、⚠️ 提示不可恢复）
4. 点击「确认删除」
5. **预期**：提示「已删除 1 条重复记录」

### 步骤 8：复检
1. 点击底部「修复后复检」按钮
2. **预期**：
   - 巡检重新执行
   - 修复后的问题应减少（缺失/异常金额/重复的问题已修复，但未来日期标记为需人工修正仍存在）
   - 质量评分显著提升（预计 80+ 分）
   - 若所有可修复问题已处理，仅剩未来日期 1 条

### 步骤 9：探索页警告标记
1. 点击「数据探索」按钮进入探索页
2. **预期**：
   - 顶部出现黄色警告条："最新巡检报告中，当前页有 X 条记录存在质量问题"
   - 表格新增「状态」列，有问题的行显示「⚠ 质量问题」标签，正常行显示「✓ 正常」
3. 点击警告条中的「前往巡检页修复」链接
4. **预期**：跳转回质量巡检页

### 步骤 10：数据隔离验证
1. 退出当前账号，注册/登录另一个账号
2. 进入质量巡检页
3. **预期**：看不到前一账号的数据集；若新建同名数据集，巡检报告独立

### 步骤 11：空态验证
1. 新建一个空数据集（不导入数据）
2. 进入质量巡检页，选中该空数据集，点击「发起巡检」
3. **预期**：ElMessage 错误提示「该数据集暂无数据，无法启动巡检」，页面保持初始引导态
