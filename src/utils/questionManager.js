/**
 * 题目管理器
 * 负责题目的CRUD、图片存储（IndexedDB）和默认题目加载
 */
import { DIMENSIONS } from '../domain/dimensions.ts';
import { FINE_GRAINED_FRAMEWORK } from '../domain/fineGrainedFramework.ts';

const DB_NAME = 'cognitive_assessment_questions';
const DB_VERSION = 1;
const STORE_NAME = 'questions';
const IMAGE_STORE_NAME = 'images';

/**
 * 题目数据模型
 * {
 *   id: string,
 *   category: 'attention' | 'memory' | 'comprehension' | 'execution',
 *   subCategory: string,       // 子维度（如"视觉注意"）
 *   ageGroup: 'all' | '5-7' | '8-14',
 *   type: 'image-choice',      // 题目类型
 *   title: string,             // 题目描述/指导语
 *   imageId: string,           // 引用 images store 中的图片 ID
 *   options: number,           // 选项数量（如5个）
 *   correctAnswer: number,     // 正确选项索引（0-based）
 *   timeLimit: number,         // 作答时间限制（秒），0表示不限时
 *   difficulty: number,        // 难度 1-5
 *   order: number,             // 排序
 *   createdAt: number
 * }
 */

class QuestionManager {
    constructor() {
        this.db = null;
        this._initPromise = null;
    }

    /**
     * 生成候选 ID（兼容老数据中字符串/数字混用的键）
     */
    _getCandidateIds(id) {
        const ids = [id];

        if (typeof id === 'string' && /^\d+$/.test(id)) {
            ids.push(Number(id));
        } else if (typeof id === 'number' && Number.isFinite(id)) {
            ids.push(String(id));
        }

        return Array.from(new Set(ids));
    }

    /**
     * 初始化 IndexedDB
     */
    async init() {
        if (this.db) return this.db;
        if (this._initPromise) return this._initPromise;

        this._initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('category', 'category', { unique: false });
                    store.createIndex('subCategory', 'subCategory', { unique: false });
                    store.createIndex('ageGroup', 'ageGroup', { unique: false });
                    store.createIndex('category_sub', ['category', 'subCategory'], { unique: false });
                }

                if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
                    db.createObjectStore(IMAGE_STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => {
                console.error('IndexedDB 打开失败:', event.target.error);
                reject(event.target.error);
            };
        });

        return this._initPromise;
    }

    /**
     * 存储图片到 IndexedDB
     * @param {File|Blob} file
     * @returns {Promise<string>} 图片 ID
     */
    async saveImage(file) {
        await this.init();
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const tx = this.db.transaction(IMAGE_STORE_NAME, 'readwrite');
                const store = tx.objectStore(IMAGE_STORE_NAME);
                store.put({
                    id,
                    data: reader.result,
                    name: file.name || 'upload',
                    type: file.type || 'image/jpeg',
                    size: file.size,
                    createdAt: Date.now()
                });
                tx.oncomplete = () => resolve(id);
                tx.onerror = () => reject(tx.error);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * 获取图片数据（Data URL）
     * @param {string} imageId
     * @returns {Promise<string|null>}
     */
    async getImage(imageId) {
        if (!imageId) return null;
        await this.init();

        return new Promise((resolve) => {
            const tx = this.db.transaction(IMAGE_STORE_NAME, 'readonly');
            const store = tx.objectStore(IMAGE_STORE_NAME);
            const request = store.get(imageId);
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => resolve(null);
        });
    }

    /**
     * 删除图片
     */
    async deleteImage(imageId) {
        if (!imageId) return;
        await this.init();

        return new Promise((resolve) => {
            const tx = this.db.transaction(IMAGE_STORE_NAME, 'readwrite');
            const store = tx.objectStore(IMAGE_STORE_NAME);
            store.delete(imageId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    }

    /**
     * 添加题目
     * @param {object} question 题目数据
     * @returns {Promise<string>} 题目 ID
     */
    async addQuestion(question) {
        await this.init();
        const id = question.id || 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const record = {
            ...question,
            id,
            createdAt: question.createdAt || Date.now()
        };

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(record);
            tx.oncomplete = () => resolve(id);
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * 获取单个题目
     */
    async getQuestion(id) {
        await this.init();
        const candidateIds = this._getCandidateIds(id);

        for (const candidateId of candidateIds) {
            const found = await new Promise((resolve) => {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(candidateId);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            });

            if (found) {
                return found;
            }
        }

        return null;
    }

    /**
     * 按类别获取题目列表
     * @param {string} category 维度
     * @param {string} [subCategory] 子维度
     * @param {string} [ageGroup] 年龄组
     * @returns {Promise<Array>}
     */
    async getQuestionsByCategory(category, subCategory, ageGroup) {
        await this.init();

        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.index('category').getAll(category);

            request.onsuccess = () => {
                let results = request.result || [];
                if (subCategory) {
                    results = results.filter(q => q.subCategory === subCategory);
                }
                if (ageGroup) {
                    results = results.filter(q => q.ageGroup === 'all' || q.ageGroup === ageGroup);
                }
                results.sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(results);
            };
            request.onerror = () => resolve([]);
        });
    }

    /**
     * 获取所有题目
     */
    async getAllQuestions() {
        await this.init();

        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result || [];
                results.sort((a, b) => (a.order || 0) - (b.order || 0));
                resolve(results);
            };
            request.onerror = () => resolve([]);
        });
    }

    /**
     * 更新题目
     */
    async updateQuestion(id, updates) {
        const existing = await this.getQuestion(id);
        if (!existing) return null;

        const stableId = existing.id ?? id;
        const updated = { ...existing, ...updates, id: stableId };
        return this.addQuestion(updated);
    }

    /**
     * 删除题目
     */
    async deleteQuestion(id) {
        await this.init();
        const candidateIds = this._getCandidateIds(id);

        // 先获取题目信息，删除关联图片
        const question = await this.getQuestion(id);
        if (question?.imageId) {
            await this.deleteImage(question.imageId);
        }

        // 删除所有的选项图片
        if (question?.optionImageIds && Array.isArray(question.optionImageIds)) {
            for (const optId of question.optionImageIds) {
                if (optId) {
                    await this.deleteImage(optId);
                }
            }
        }

        return new Promise((resolve) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            candidateIds.forEach(candidateId => store.delete(candidateId));
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    }

    /**
     * 获取各维度题目统计
     */
    async getStats() {
        const all = await this.getAllQuestions();
        const knownCategories = [
            ...DIMENSIONS.map(d => d.key),
            ...FINE_GRAINED_FRAMEWORK.map(d => d.key),
        ];
        const stats = {};

        knownCategories.forEach(category => {
            stats[category] = { total: 0, subs: {} };
        });

        all.forEach(q => {
            if (!stats[q.category]) {
                stats[q.category] = { total: 0, subs: {} };
            }
            stats[q.category].total++;
            stats[q.category].subs[q.subCategory] = (stats[q.category].subs[q.subCategory] || 0) + 1;
        });

        return stats;
    }
}

export const questionManager = new QuestionManager();
