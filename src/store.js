/**
 * 全局状态管理（多用户版，含 LocalStorage 持久化）
 */
import { userManager } from './userManager.js';

const defaultState = {
    user: {
        name: '',
        age: null,
        gender: '',
        ageGroup: ''
    },
    testProgress: {
        planning: { completed: false, subTests: [false, false, false] },
        attention: { completed: false, subTests: [false, false, false] },
        simultaneous: { completed: false, subTests: [false, false, false] },
        successive: { completed: false, subTests: [false, false, false] }
    },
    testResults: {
        planning: { scores: [], totalScore: 0, details: [] },
        attention: { scores: [], totalScore: 0, details: [] },
        simultaneous: { scores: [], totalScore: 0, details: [] },
        successive: { scores: [], totalScore: 0, details: [] }
    },
    startTime: null
};

class Store {
    constructor() {
        this.state = this.load() || JSON.parse(JSON.stringify(defaultState));
        this.listeners = [];
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
            const data = localStorage.getItem(this.getStorageKey());
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    save() {
        try {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(this.state));
        } catch (e) {
            console.warn('无法保存数据到 LocalStorage');
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
        if (age >= 5 && age <= 6) return '幼儿组';
        if (age >= 7 && age <= 9) return '小学低年级组';
        if (age >= 10 && age <= 12) return '小学高年级组';
        if (age >= 13 && age <= 15) return '初中组';
        if (age >= 16 && age <= 17) return '高中组';
        return '未知';
    }

    setTestResult(dimension, subTestIndex, score, detail) {
        const results = this.state.testResults[dimension];
        results.scores[subTestIndex] = score;
        results.details[subTestIndex] = detail;
        results.totalScore = results.scores.reduce((a, b) => a + (b || 0), 0);

        const progress = this.state.testProgress[dimension];
        progress.subTests[subTestIndex] = true;
        progress.completed = progress.subTests.every(Boolean);

        this.save();
        this.notify();
    }

    getCompletedCount() {
        return Object.values(this.state.testProgress).filter(p => p.completed).length;
    }

    isAllCompleted() {
        return Object.values(this.state.testProgress).every(p => p.completed);
    }

    getOverallScores() {
        const dims = ['planning', 'attention', 'simultaneous', 'successive'];
        const maxPerDim = 100;
        return dims.map(d => {
            const total = this.state.testResults[d].totalScore;
            return Math.min(Math.round(total), maxPerDim);
        });
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
            const data = localStorage.getItem(userManager.getStorageKey(userId));
            return data ? JSON.parse(data) : JSON.parse(JSON.stringify(defaultState));
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
