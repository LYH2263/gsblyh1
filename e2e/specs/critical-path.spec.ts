import { expect, test } from '@playwright/test';

test('critical path: register -> create dataset -> import csv -> dashboard', async ({
  page
}) => {
  const username = `e2e_${Date.now()}`;
  const password = '123456';

  await page.goto('/register');

  const authInputs = page.locator('.auth-card input');
  await authInputs.nth(0).fill(username);
  await authInputs.nth(1).fill(password);
  await page.getByRole('button', { name: '注册' }).click();

  await expect(page).toHaveURL(/\/app\/datasets/);

  await page.getByRole('button', { name: '新建数据集' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('input').first().fill(`E2E Dataset ${Date.now()}`);
  await dialog.locator('textarea').fill('playwright trace smoke flow');
  await dialog.getByRole('button', { name: '创建' }).click();

  await page.getByRole('button', { name: '导入/录入' }).first().click();
  await expect(page).toHaveURL(/\/import/);

  const csvText = [
    'date,category,amount,region,channel',
    '2026-02-01,Food,120,North,Online',
    '2026-02-02,Book,180,South,Offline'
  ].join('\n');

  await page.locator('textarea').first().fill(csvText);
  await page.getByRole('button', { name: '导入数据' }).click();

  await page.getByRole('button', { name: '查看仪表盘' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const kpiCards = page.locator('.kpi-card');
  await expect(kpiCards.nth(0)).toContainText('300.00');
  await expect(kpiCards.nth(1)).toContainText('2');
});
