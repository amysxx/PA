import { test, expect } from '@playwright/test';

// 辅助函数：导航到 hash 路由并等待渲染+动画完成
async function navigateTo(page, hash) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    if (hash && hash !== '/') {
        await page.evaluate((h) => { window.location.hash = h; }, hash);
    }
    // 等待DOM更新和入场动画完成
    await page.waitForTimeout(1500);
}

// 辅助函数：创建一个测试用户并登录
async function createAndLoginUser(page, name = '测试小朋友', age = '10', gender = '男') {
    await navigateTo(page, '/user-info');
    await page.fill('#input-name', name);
    await page.fill('#input-age', age);
    await page.locator(`.gender-option[data-gender="${gender}"]`).click();
    await page.click('#btn-submit');
    await page.waitForURL(/#\/test-select/);
    await page.waitForTimeout(1000);
}

// ==================== 首页测试 ====================
test.describe('首页', () => {
    test('应正确加载并显示标题', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.home-title')).toHaveText('智趣认知乐园');
    });

    test('应显示四个认知维度特征卡片', async ({ page }) => {
        await page.goto('/');
        const cards = page.locator('.home-feature-card');
        await expect(cards).toHaveCount(4);
    });

    test('点击"开始测评"应跳转到登录页', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.click('#btn-start');
        // 等待动画完成
        await page.waitForTimeout(1500);
        await expect(page.locator('#btn-create')).toBeVisible();
    });
});

// ==================== 登录页测试 ====================
test.describe('登录页', () => {
    test('应显示创建新用户按钮和管理员入口', async ({ page }) => {
        await navigateTo(page, '/login');
        await expect(page.locator('#btn-create')).toBeVisible();
        await expect(page.locator('#btn-admin')).toBeVisible();
    });

    test('无用户时应显示空状态提示', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await navigateTo(page, '/login');
        await expect(page.locator('text=还没有用户')).toBeVisible();
    });

    test('点击创建新用户应跳转到用户信息页', async ({ page }) => {
        await navigateTo(page, '/login');
        await page.click('#btn-create');
        await page.waitForTimeout(500);
        await expect(page.locator('#input-name')).toBeVisible();
    });

    test('管理员密码错误应提示错误', async ({ page }) => {
        await navigateTo(page, '/login');
        await page.click('#btn-admin');
        await page.waitForTimeout(300);
        await page.fill('#admin-password', 'wrong');
        await page.click('#btn-admin-confirm');
        await expect(page.locator('#admin-error')).toContainText('密码错误');
    });

    test('管理员密码正确应跳转到管理员页面', async ({ page }) => {
        await navigateTo(page, '/login');
        await page.click('#btn-admin');
        await page.waitForTimeout(300);
        await page.fill('#admin-password', 'admin123');
        await page.click('#btn-admin-confirm');
        await page.waitForTimeout(500);
        await expect(page.locator('h1')).toContainText('用户管理');
    });
});

// ==================== 用户创建与登录流程 ====================
test.describe('用户创建与登录', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    test('创建新用户后应自动跳转到测试选择页', async ({ page }) => {
        await createAndLoginUser(page);
        await expect(page.locator('.navbar')).toContainText('测试小朋友');
    });

    test('创建用户后再次访问登录页应显示该用户', async ({ page }) => {
        await createAndLoginUser(page, '小明', '8', '男');
        await navigateTo(page, '/login');
        await expect(page.locator('.user-avatar-name')).toContainText('小明');
    });

    test('点击已有用户头像应直接登录', async ({ page }) => {
        await createAndLoginUser(page, '小红', '12', '女');
        await navigateTo(page, '/login');
        await page.locator('.user-avatar-card').first().click();
        await page.waitForTimeout(1000);
        await expect(page.locator('h1')).toContainText('选择测评项目');
    });
});

// ==================== 退出与切换 ====================
test.describe('退出与切换', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await createAndLoginUser(page, '测试用户', '10', '女');
    });

    test('点击退出应回到登录页', async ({ page }) => {
        await page.click('#btn-logout');
        await page.waitForTimeout(1500);
        await expect(page.locator('#btn-create')).toBeVisible();
    });

    test('点击切换用户应回到登录页', async ({ page }) => {
        await page.click('#btn-switch-user');
        await page.waitForTimeout(1500);
        await expect(page.locator('#btn-create')).toBeVisible();
    });

    test('退出后未登录访问测试选择页应重定向到登录页', async ({ page }) => {
        await page.click('#btn-logout');
        await page.waitForTimeout(500);
        await page.evaluate(() => { window.location.hash = '/test-select'; });
        await page.waitForTimeout(1500);
        await expect(page.locator('#btn-create')).toBeVisible();
    });
});

// ==================== 管理员页面测试 ====================
test.describe('管理员页面', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await createAndLoginUser(page, '管理测试', '9', '男');
    });

    test('应显示用户列表', async ({ page }) => {
        await navigateTo(page, '/admin');
        await expect(page.locator('.admin-table')).toBeVisible();
        await expect(page.locator('.admin-table tbody tr')).toHaveCount(1);
        await expect(page.locator('.admin-table')).toContainText('管理测试');
    });

    test('查看用户详情应弹出弹窗', async ({ page }) => {
        await navigateTo(page, '/admin');
        await page.locator('.btn-mini-view').first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('#detail-modal')).toBeVisible();
        await expect(page.locator('#detail-modal')).toContainText('管理测试');
    });

    test('删除用户应有确认弹窗', async ({ page }) => {
        await navigateTo(page, '/admin');
        await page.locator('.btn-mini-delete').first().click();
        await page.waitForTimeout(500);
        await expect(page.locator('#delete-modal')).toBeVisible();
        await expect(page.locator('#delete-name')).toContainText('管理测试');
    });

    test('确认删除后用户应消失', async ({ page }) => {
        await navigateTo(page, '/admin');
        await page.locator('.btn-mini-delete').first().click();
        await page.waitForTimeout(500);
        await page.click('#btn-delete-confirm');
        await page.waitForTimeout(500);
        await expect(page.locator('text=暂无用户数据')).toBeVisible();
    });

    test('退出管理员应回到登录页', async ({ page }) => {
        await navigateTo(page, '/admin');
        await page.click('#btn-exit-admin');
        await page.waitForTimeout(1500);
        await expect(page.locator('#btn-create')).toBeVisible();
    });
});

// ==================== 用户信息页表单验证 ====================
test.describe('用户信息页', () => {
    test.beforeEach(async ({ page }) => {
        await navigateTo(page, '/user-info');
    });

    test('应显示姓名、年龄和性别表单', async ({ page }) => {
        await expect(page.locator('#input-name')).toBeVisible();
        await expect(page.locator('#input-age')).toBeVisible();
        await expect(page.locator('.gender-option')).toHaveCount(2);
    });

    test('未填写姓名时应显示错误提示', async ({ page }) => {
        await page.click('#btn-submit');
        await expect(page.locator('#form-error')).toContainText('请输入你的名字');
    });

    test('年龄超出范围应显示提示', async ({ page }) => {
        await page.fill('#input-age', '3');
        await expect(page.locator('#age-error')).toContainText('5-17岁');
    });
});

// ==================== 导航测试 ====================
test.describe('导航', () => {
    test('用户信息页应有返回首页链接', async ({ page }) => {
        await navigateTo(page, '/user-info');
        const backLink = page.locator('a[href="#/"]');
        await expect(backLink).toBeVisible();
        await backLink.click();
        await expect(page.locator('.home-title')).toHaveText('智趣认知乐园');
    });
});
