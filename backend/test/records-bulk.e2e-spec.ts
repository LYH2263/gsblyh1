import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/bootstrap';

describe('Records Bulk Import (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';

    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('imports csvText and queries records', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'demo',
        password: '123456'
      })
      .expect(201);

    const token = registerResponse.body.data.token;

    const datasetResponse = await request(app.getHttpServer())
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '销售数据',
        description: '测试导入'
      })
      .expect(201);

    const datasetId = datasetResponse.body.data.id;

    const csvText = `date,category,amount,region,channel\n2026-01-01,Food,100,North,Online\n2026-01-02,Book,200,South,Offline`;

    const bulkResponse = await request(app.getHttpServer())
      .post(`/api/datasets/${datasetId}/records/bulk`)
      .set('Authorization', `Bearer ${token}`)
      .send({ csvText })
      .expect(201);

    expect(bulkResponse.body.code).toBe(0);
    expect(bulkResponse.body.data.insertedCount).toBe(2);

    const listResponse = await request(app.getHttpServer())
      .get(`/api/datasets/${datasetId}/records?page=1&pageSize=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.code).toBe(0);
    expect(listResponse.body.data.total).toBe(2);
    expect(listResponse.body.data.items).toHaveLength(2);

    const recordId = listResponse.body.data.items[0].id;

    const removeResponse = await request(app.getHttpServer())
      .delete(`/api/records/${recordId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(removeResponse.body.code).toBe(0);
    expect(removeResponse.body.data.id).toBe(recordId);

    const listAfterDelete = await request(app.getHttpServer())
      .get(`/api/datasets/${datasetId}/records?page=1&pageSize=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listAfterDelete.body.code).toBe(0);
    expect(listAfterDelete.body.data.total).toBe(1);
  });
});
