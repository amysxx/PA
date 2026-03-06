/**
 * 统一存储适配器
 * 优先使用 IndexedDB，自动降级到 localStorage
 * 提供与 localStorage 相同的同步 API + 异步批量操作
 */

const DB_NAME = 'PassCognitiveDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

class StorageAdapter {
    constructor() {
        this.db = null;
        this.useIndexedDB = false;
        this.cache = new Map(); // 内存缓存，保证同步读取
        this._initPromise = this._init();
    }

    /**
     * 初始化：尝试打开 IndexedDB，失败则降级到 localStorage
     */
    async _init() {
        try {
            this.db = await this._openDB();
            this.useIndexedDB = true;
            // 将 IndexedDB 中所有数据载入内存缓存
            await this._loadAllToCache();
            console.log('✓ 存储引擎: IndexedDB');
        } catch (e) {
            this.useIndexedDB = false;
            // localStorage 模式：将所有 pass_ 开头的 key 载入缓存
            this._loadLocalStorageToCache();
            console.log('✓ 存储引擎: localStorage (降级)');
        }
    }

    /**
     * 等待初始化完成
     */
    async ready() {
        return this._initPromise;
    }

    _openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                return reject(new Error('IndexedDB not supported'));
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            request.onsuccess = () => resolve(request.result);
        });
    }

    async _loadAllToCache() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    this.cache.set(cursor.key, cursor.value);
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    _loadLocalStorageToCache() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pass_')) {
                try {
                    this.cache.set(key, localStorage.getItem(key));
                } catch (e) { /* ignore */ }
            }
        }
    }

    // ========= 同步 API（从内存缓存读取）=========

    /**
     * 同步获取数据（从内存缓存）
     */
    getItem(key) {
        return this.cache.get(key) ?? null;
    }

    /**
     * 同步写入数据（写入缓存 + 异步持久化）
     */
    setItem(key, value) {
        this.cache.set(key, value);
        this._persist(key, value);
    }

    /**
     * 同步删除数据
     */
    removeItem(key) {
        this.cache.delete(key);
        this._remove(key);
    }

    /**
     * 获取所有 key
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * 获取指定前缀的所有 key
     */
    keysWithPrefix(prefix) {
        return this.keys().filter(k => k.startsWith(prefix));
    }

    // ========= 异步持久化 =========

    _persist(key, value) {
        if (this.useIndexedDB) {
            this._idbPut(key, value).catch(() => {
                // IndexedDB 写入失败则降级到 localStorage
                this._localStoragePut(key, value);
            });
        } else {
            this._localStoragePut(key, value);
        }
    }

    _remove(key) {
        if (this.useIndexedDB) {
            this._idbDelete(key).catch(() => {
                try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
            });
        } else {
            try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        }
    }

    _idbPut(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    _idbDelete(key) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    _localStoragePut(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn('存储写入失败:', key, e.message);
        }
    }

    // ========= 数据迁移 =========

    /**
     * 将 localStorage 数据迁移到 IndexedDB
     * @returns {Promise<number>} 迁移的条目数
     */
    async migrateToIndexedDB() {
        if (!this.useIndexedDB) return 0;

        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('pass_')) {
                const value = localStorage.getItem(key);
                await this._idbPut(key, value);
                this.cache.set(key, value);
                count++;
            }
        }

        // 迁移完成后清除 localStorage 中的旧数据
        if (count > 0) {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pass_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        }

        return count;
    }

    /**
     * 获取存储使用信息
     */
    getStorageInfo() {
        return {
            engine: this.useIndexedDB ? 'IndexedDB' : 'localStorage',
            itemCount: this.cache.size,
            keys: this.keys()
        };
    }
}

export const storage = new StorageAdapter();
