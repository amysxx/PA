/**
 * 多用户管理器
 * 负责用户的创建、切换、删除和列表管理
 * 使用统一存储适配器（支持 IndexedDB / localStorage）
 */
import { storage } from './utils/storageAdapter.js';

const USERS_KEY = 'pass_users';
const CURRENT_USER_KEY = 'pass_current_user';
const USER_DATA_PREFIX = 'pass_user_';
const ADMIN_PASSWORD = 'admin123';

class UserManager {
    /**
     * 获取所有用户列表
     * @returns {Array<{id: string, name: string, age: number, gender: string, ageGroup: string, createdAt: number}>}
     */
    getUsers() {
        try {
            const data = storage.getItem(USERS_KEY) || localStorage.getItem(USERS_KEY);
            if (!data) return [];
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            return [];
        }
    }

    /**
     * 保存用户列表
     */
    saveUsers(users) {
        storage.setItem(USERS_KEY, JSON.stringify(users));
    }

    /**
     * 创建新用户
     * @param {{name: string, age: number, gender: string, ageGroup: string}} info
     * @returns {string} 新用户 ID
     */
    createUser(info) {
        const id = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const users = this.getUsers();
        const user = {
            id,
            name: info.name,
            age: info.age,
            gender: info.gender,
            birthDate: info.birthDate || '',
            ageGroup: info.ageGroup || '',
            createdAt: Date.now()
        };
        users.push(user);
        this.saveUsers(users);
        // 自动登录该用户
        this.login(id);
        return id;
    }

    /**
     * 登录（切换到）指定用户
     */
    login(userId) {
        storage.setItem(CURRENT_USER_KEY, userId);
    }

    /**
     * 退出当前用户
     */
    logout() {
        storage.removeItem(CURRENT_USER_KEY);
    }

    /**
     * 获取当前登录用户 ID
     * @returns {string|null}
     */
    getCurrentUserId() {
        return storage.getItem(CURRENT_USER_KEY) || localStorage.getItem(CURRENT_USER_KEY) || null;
    }

    /**
     * 获取当前登录用户信息
     * @returns {object|null}
     */
    getCurrentUser() {
        const id = this.getCurrentUserId();
        if (!id) return null;
        return this.getUsers().find(u => u.id === id) || null;
    }

    /**
     * 判断是否已登录
     */
    isLoggedIn() {
        return !!this.getCurrentUserId();
    }

    /**
     * 获取管理状态
     */
    isAdmin() {
        return sessionStorage.getItem('admin_session') === 'true';
    }

    /**
     * 设置管理状态
     */
    setAdmin(isAdmin) {
        if (isAdmin) {
            sessionStorage.setItem('admin_session', 'true');
        } else {
            sessionStorage.removeItem('admin_session');
        }
    }

    /**
     * 更新用户信息（在用户列表中）
     */
    updateUser(userId, updates) {
        const users = this.getUsers();
        const idx = users.findIndex(u => u.id === userId);
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...updates };
            this.saveUsers(users);
        }
    }

    /**
     * 删除用户及其所有测评数据
     */
    deleteUser(userId) {
        let users = this.getUsers();
        users = users.filter(u => u.id !== userId);
        this.saveUsers(users);
        // 删除该用户的测评数据
        storage.removeItem(USER_DATA_PREFIX + userId);
        // 如果删除的是当前登录用户，退出登录
        if (this.getCurrentUserId() === userId) {
            this.logout();
        }
    }

    /**
     * 获取用户的存储 Key
     */
    getStorageKey(userId) {
        return USER_DATA_PREFIX + (userId || this.getCurrentUserId());
    }

    /**
     * 获取指定用户的测评数据
     */
    getUserData(userId) {
        try {
            const key = this.getStorageKey(userId);
            const data = storage.getItem(key) || localStorage.getItem(key);
            if (!data) return null;
            return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            return null;
        }
    }

    /**
     * 验证管理员密码
     */
    verifyAdmin(password) {
        return password === ADMIN_PASSWORD;
    }

    /**
     * 迁移旧数据（如果存在单用户旧数据，迁移到多用户结构）
     */
    migrateOldData() {
        const oldKey = 'pass_assessment_data';
        const oldData = localStorage.getItem(oldKey) || storage.getItem(oldKey);
        if (!oldData) return;

        try {
            const parsed = typeof oldData === 'string' ? JSON.parse(oldData) : oldData;
            if (parsed.user && parsed.user.name) {
                // 创建用户并迁移数据
                const id = 'u_migrated_' + Date.now();
                const users = this.getUsers();
                users.push({
                    id,
                    name: parsed.user.name,
                    age: parsed.user.age,
                    gender: parsed.user.gender,
                    ageGroup: parsed.user.ageGroup || '',
                    createdAt: Date.now()
                });
                this.saveUsers(users);
                // 存储测评数据到新 key
                storage.setItem(USER_DATA_PREFIX + id, typeof oldData === 'string' ? oldData : JSON.stringify(oldData));
            }
            // 清理旧 key
            localStorage.removeItem(oldKey);
            storage.removeItem(oldKey);
        } catch (e) {
            console.warn('旧数据迁移失败', e);
        }
    }
}

export const userManager = new UserManager();
