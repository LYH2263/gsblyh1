import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/bootstrap';

describe('Inspections (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let datasetId: number;

  const authGet = (url: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);
  const authPost = (url: string, body?: object) =>
    request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body ?? {});

  const waitForReport = async (): Promise<any> => {
    for (let i = 0; i < 40; i += 1) {
      const res = await authGet(`/api/datasets/${datasetId}/inspections/latest`);
      if (res.body.data) {
        return res.body.data;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('report not ready');
  };

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    const { AppModule } = await import('../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    const reg = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'inspector',
        password: '123456'
      });
    token = reg.body.data.token;

    const ds = await request(app.getHttpServer())
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '巡检数据集' });
    datasetId = ds.body.data.id;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('runs full inspect -> report -> fix -> re-inspect flow', async () => {
    // 宽松导入含四类问题的数据
    const today = new Date();
    const future = new Date(today.getTime() + 5 * 86400000)
      .toISOString()
      .slice(0, 10);
    const csvText = [
      'date,category,amount,region,channel',
      // 正常
      '2020-01-01,Food,100,North,Online',
      // 字段缺失（category 空）
      '2020-01-02,,200,South,Offline',
      // 异常金额（负）
      '2020-01-03,Book,-50,East,Online',
      // 未来日期
      `${future},Toy,300,West,Offline`,
      // 重复组合键（与第一条相同）
      '2020-01-01,Food,999,North,Online'
    ].join('\n');

    const imp = await authPost(
      `/api/datasets/${datasetId}/records/bulk`,
      { csvText, lenient: true }
    );
    expect(imp.body.data.insertedCount).toBe(5);

    // 发起巡检
    const submit = await authPost(`/api/datasets/${datasetId}/inspections`);
    expect(submit.body.data.taskId).toBeDefined();
    expect(['queued', 'running']).toContain(submit.body.data.status);

    const report = await waitForReport();
    expect(report.categoryCounts.missing_field).toBe(1);
    expect(report.categoryCounts.abnormal_amount).toBe(1);
    expect(report.categoryCounts.future_date).toBe(1);
    expect(report.categoryCounts.duplicate_key).toBe(1);
    expect(report.score).toBeLessThan(100);

    const reportId = report.id;

    // 按规则筛选问题
    const issues = await authGet(
      `/api/inspections/reports/${reportId}/issues?rule=abnormal_amount&page=1&pageSize=10`
    );
    expect(issues.body.data.total).toBe(1);
    expect(issues.body.data.items[0].rule).toBe('abnormal_amount');

    // 修复：缺失字段填默认值
    const fixMissing = await authPost(
      `/api/inspections/reports/${reportId}/fix/missing`,
      {}
    );
    expect(fixMissing.body.data.affected).toBe(1);

    // 修复：异常金额改绝对值
    const fixAmount = await authPost(
      `/api/inspections/reports/${reportId}/fix/amount`,
      {}
    );
    expect(fixAmount.body.data.affected).toBe(1);

    // 修复：重复批量删除
    const dupIssues = await authGet(
      `/api/inspections/reports/${reportId}/issues?rule=duplicate_key`
    );
    const dupId = dupIssues.body.data.items[0].recordId;
    const fixDelete = await authPost(
      `/api/inspections/reports/${reportId}/fix/delete`,
      { recordIds: [dupId] }
    );
    expect(fixDelete.body.data.affected).toBe(1);

    // 复检
    await authPost(`/api/datasets/${datasetId}/inspections`);
    const report2 = await (async () => {
      for (let i = 0; i < 40; i += 1) {
        const res = await authGet(
          `/api/datasets/${datasetId}/inspections/latest`
        );
        if (res.body.data && res.body.data.id !== reportId) {
          return res.body.data;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error('re-inspect report not ready');
    })();

    // 缺失/异常/重复已修复，仅剩未来日期
    expect(report2.categoryCounts.missing_field).toBe(0);
    expect(report2.categoryCounts.abnormal_amount).toBe(0);
    expect(report2.categoryCounts.duplicate_key).toBe(0);
    expect(report2.categoryCounts.future_date).toBe(1);
    expect(report2.score).toBeGreaterThan(report.score);
  }, 60000);
});
