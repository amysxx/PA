import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const seedUserId = 'u_seed_001';

function buildSeedData() {
  return {
    user: {
      name: '初始化用户',
      age: 10,
      gender: '男',
      birthDate: '2016-01-01',
      ageGroup: '8-14岁组',
    },
    testProgress: {
      attention: { completed: false, subTests: [false, false, false] },
      memory: { completed: false, subTests: [false, false, false] },
      comprehension: { completed: false, subTests: [false, false, false] },
      execution: { completed: false, subTests: [false, false, false] },
      spatial: { completed: false, subTests: [false, false, false] },
      processing: { completed: false, subTests: [false, false] },
    },
    testResults: {
      attention: { scores: [0, 0, 0], totalScore: 0, details: [null, null, null] },
      memory: { scores: [0, 0, 0], totalScore: 0, details: [null, null, null] },
      comprehension: { scores: [0, 0, 0], totalScore: 0, details: [null, null, null] },
      execution: { scores: [0, 0, 0], totalScore: 0, details: [null, null, null] },
      spatial: { scores: [0, 0, 0], totalScore: 0, details: [null, null, null] },
      processing: { scores: [0, 0], totalScore: 0, details: [null, null] },
    },
    startTime: null,
  };
}

test('initialize local storage seed data and export storage state', async ({ page, context }) => {
  await page.goto('/');
  const seedData = buildSeedData();

  await page.evaluate(
    ({ userId, payload }) => {
      localStorage.clear();
      localStorage.setItem(
        'pass_users',
        JSON.stringify([
          {
            id: userId,
            name: payload.user.name,
            age: payload.user.age,
            gender: payload.user.gender,
            birthDate: payload.user.birthDate,
            ageGroup: payload.user.ageGroup,
            createdAt: Date.now(),
          },
        ]),
      );
      localStorage.setItem('pass_current_user', userId);
      localStorage.setItem(`pass_user_${userId}`, JSON.stringify(payload));
    },
    { userId: seedUserId, payload: seedData },
  );

  const authDir = path.resolve('tests/.auth');
  fs.mkdirSync(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, 'seed-state.json') });

  const usersRaw = await page.evaluate(() => localStorage.getItem('pass_users'));
  expect(usersRaw).toBeTruthy();
  const users = JSON.parse(usersRaw);
  expect(users.length).toBe(1);
  expect(users[0].id).toBe(seedUserId);
});

