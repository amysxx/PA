/**
 * 全局状态管理（多用户版，含 IndexedDB/LocalStorage 持久化）
 */
import { userManager } from './userManager.js';
import { saveTestHistory } from './utils/dataHistory.js';
import { storage } from './utils/storageAdapter.js';
import { DIMENSIONS } from './domain/dimensions.ts';

function createDefaultProgressState() {
    return Object.fromEntries(
        DIMENSIONS.map(dimension => [
            dimension.key,
            {
                completed: false,
                subTests: new Array(dimension.subTests.length).fill(false)
            }
        ])
    );
}

function createDefaultResultsState() {
    return Object.fromEntries(
        DIMENSIONS.map(dimension => [
            dimension.key,
            {
                scores: new Array(dimension.subTests.length).fill(0),
                totalScore: 0,
                details: new Array(dimension.subTests.length).fill(null)
            }
        ])
    );
}

const defaultState = {
    user: {
        name: '',
        age: null,
        gender: '',
        birthDate: '',
        ageGroup: ''
    },
    testProgress: createDefaultProgressState(),
    testResults: createDefaultResultsState(),
    startTime: null
};

class Store {
    constructor() {
        const loaded = this.load();
        this.state = this.normalizeState(loaded || JSON.parse(JSON.stringify(defaultState)));
        this.listeners = [];
    }

    normalizeState(state) {
        const base = JSON.parse(JSON.stringify(defaultState));
        const merged = {
            ...base,
            ...state,
            user: { ...base.user, ...(state?.user || {}) },
            testProgress: { ...base.testProgress, ...(state?.testProgress || {}) },
            testResults: { ...base.testResults, ...(state?.testResults || {}) },
        };

        DIMENSIONS.forEach(dimension => {
            const key = dimension.key;
            const expectedLen = dimension.subTests.length;

            const progress = merged.testProgress[key] || { completed: false, subTests: [] };
            const progressSubs = Array.from({ length: expectedLen }, (_, i) => Boolean(progress.subTests?.[i]));
            merged.testProgress[key] = {
                ...progress,
                subTests: progressSubs,
                completed: progressSubs.every(Boolean),
            };

            const result = merged.testResults[key] || { scores: [], totalScore: 0, details: [] };
            const scores = Array.from({ length: expectedLen }, (_, i) => Number(result.scores?.[i] || 0));
            const details = Array.from({ length: expectedLen }, (_, i) => result.details?.[i] || null);
            merged.testResults[key] = {
                ...result,
                scores,
                details,
                totalScore: scores.reduce((sum, item) => sum + (item || 0), 0),
            };
        });

        return merged;
    }

    /**
     * 获取当前用户的存储 Key
     */
    getStorageKey() {
        const userId = userManager.getCurrentUserId();
        return userId ? userManager.getStorageKey(userId) : 'pass_assessment_data';
    }

    load() {
        try {
            const data = storage.getItem(this.getStorageKey());
            if (data) {
                return typeof data === 'string' ? JSON.parse(data) : data;
            }
            // 降级：尝试从 localStorage 直接读取（首次启动时缓存可能未就绪）
            const lsData = localStorage.getItem(this.getStorageKey());
            return lsData ? JSON.parse(lsData) : null;
        } catch (e) {
            return null;
        }
    }

    save() {
        try {
            const data = JSON.stringify(this.state);
            storage.setItem(this.getStorageKey(), data);
        } catch (e) {
            console.warn('无法保存数据:', e.message);
        }
    }

    get(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.state);
    }

    set(key, value) {
        const keys = key.split('.');
        let obj = this.state;
        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save();
        this.notify();
    }

    setUser(user) {
        this.state.user = { ...this.state.user, ...user };
        this.state.user.ageGroup = this.getAgeGroup(this.state.user.age);
        this.save();
        this.notify();
    }

    getAgeGroup(age) {
        // 对齐中国教育阶段
        if (age >= 5 && age <= 7) return '5-7岁组';   // 幼儿园/小学1年级
        if (age >= 8 && age <= 11) return '8-11岁组';  // 小学2-5年级
        if (age >= 12 && age <= 14) return '12-14岁组'; // 初中1-3年级
        if (age >= 15 && age <= 18) return '15-18岁组'; // 高中1-3年级
        return '未知';
    }

    /**
     * 根据出生日期计算年龄
     */
    calculateAge(birthDate) {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    setTestResult(dimension, subTestIndex, score, detail) {
        const results = this.state.testResults[dimension];
        if (!results) return;
        results.scores[subTestIndex] = score;
        results.details[subTestIndex] = detail;
        results.totalScore = results.scores.reduce((a, b) => a + (b || 0), 0);

        const progress = this.state.testProgress[dimension];
        if (!progress) return;
        progress.subTests[subTestIndex] = true;
        progress.completed = progress.subTests.every(Boolean);

        this.save();
        this.notify();
    }

    getCompletedCount() {
        return Object.values(this.state.testProgress).filter(p => p.completed).length;
    }

    getCompletedSubTestCount() {
        let count = 0;
        DIMENSIONS.forEach(dim => {
            const p = this.state.testProgress[dim.key];
            if (p) count += p.subTests.filter(Boolean).length;
        });
        return count;
    }

    getTotalSubTestCount() {
        return DIMENSIONS.reduce((sum, item) => sum + item.subTests.length, 0);
    }

    isAllCompleted() {
        return DIMENSIONS.every(dim => this.state.testProgress[dim.key]?.completed === true);
    }

    getOverallScores() {
        const maxPerDim = 100;
        return DIMENSIONS.map(({ key }) => {
            const d = key;
            const total = this.state.testResults[d].totalScore;
            return Math.min(Math.round(total), maxPerDim);
        });
    }

    /**
     * 将当前测评结果保存到历史记录
     * 应在所有维度测试完成后调用
     */
    saveCurrentTestToHistory() {
        const userId = userManager.getCurrentUserId();
        if (!userId) return null;

        const duration = this.state.startTime
            ? Date.now() - this.state.startTime
            : 0;

        const record = saveTestHistory(
            userId,
            this.state.testResults,
            this.state.user.ageGroup,
            duration
        );

        return record;
    }

    /**
     * 切换到指定用户的数据
     */
    switchUser(userId) {
        userManager.login(userId);
        this.state = this.load() || JSON.parse(JSON.stringify(defaultState));
        this.notify();
    }

    /**
     * 加载指定用户的数据（只读，不切换登录状态）
     */
    loadForUser(userId) {
        try {
            const key = userManager.getStorageKey(userId);
            const data = storage.getItem(key);
            if (data) {
                return typeof data === 'string' ? JSON.parse(data) : data;
            }
            const lsData = localStorage.getItem(key);
            return lsData ? JSON.parse(lsData) : JSON.parse(JSON.stringify(defaultState));
        } catch (e) {
            return JSON.parse(JSON.stringify(defaultState));
        }
    }

    /**
     * 当前用户退出后重置状态
     */
    logout() {
        userManager.logout();
        this.state = JSON.parse(JSON.stringify(defaultState));
        this.notify();
    }

    reset() {
        this.state = JSON.parse(JSON.stringify(defaultState));
        this.save();
        this.notify();
    }

    subscribe(fn) {
        this.listeners.push(fn);
    }

    notify() {
        this.listeners.forEach(fn => fn(this.state));
    }
}

export const store = new Store();
