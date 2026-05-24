/**
 * PhotoAtelier 单元测试框架
 * 基于 Jest 的测试工具集
 */

// 模拟 localStorage
global.localStorageMock = {
    store: {},
    getItem(key) {
        return this.store[key] || null;
    },
    setItem(key, value) {
        this.store[key] = String(value);
    },
    removeItem(key) {
        delete this.store[key];
    },
    clear() {
        this.store = {};
    }
};

// 模拟 DOM 元素
global.mockElement = (tagName = 'div', attributes = {}) => {
    return {
        tagName,
        attributes,
        style: {},
        classList: {
            classes: [],
            add(cls) { this.classes.push(cls); },
            remove(cls) { this.classes = this.classes.filter(c => c !== cls); },
            contains(cls) { return this.classes.includes(cls); }
        },
        innerHTML: '',
        textContent: '',
        value: '',
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        click: jest.fn(),
        focus: jest.fn()
    };
};

// 模拟 document
global.mockDocument = () => {
    const elements = new Map();
    return {
        getElementById: jest.fn((id) => {
            if (!elements.has(id)) {
                elements.set(id, global.mockElement('div', { id }));
            }
            return elements.get(id);
        }),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        createElement: jest.fn((tag) => global.mockElement(tag)),
        body: global.mockElement('body'),
        addEventListener: jest.fn()
    };
};

// 测试辅助函数
const TestUtils = {
    /**
     * 创建测试数据
     */
    createMockPlan: (overrides = {}) => ({
        id: 'test-plan-1',
        title: '测试方案',
        input: {
            theme: '日系清新人像',
            style: '日系',
            modelDesc: '身高165cm，偏瘦，瓜子脸，黑色长直发，白皙，清新甜美',
            scene: '户外',
            mood: '自然',
            duration: '2小时',
            people: '1'
        },
        sections: [
            { ti: '📍 地点推荐', c: ['公园草地', '咖啡馆'] },
            { ti: '🧍 摆姿指导', c: ['自然站立', '侧脸微笑'] },
            { ti: '💄 妆造建议', c: ['裸妆', '清透底妆'] }
        ],
        savedAt: new Date().toISOString(),
        ...overrides
    }),

    createMockSchedule: (overrides = {}) => ({
        id: 'test-schedule-1',
        date: '2025-06-15',
        title: '测试日程',
        time: '14:00',
        location: '朝阳公园',
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...overrides
    }),

    /**
     * 模拟 API 响应
     */
    mockApiResponse: (data, delay = 100) => {
        return new Promise((resolve) => {
            setTimeout(() => resolve({
                ok: true,
                json: () => Promise.resolve(data)
            }), delay);
        });
    },

    mockApiError: (message, delay = 100) => {
        return new Promise((_, reject) => {
            setTimeout(() => reject(new Error(message)), delay);
        });
    },

    /**
     * 等待函数
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * 断言辅助
     */
    expectToBeDefined: (value, name) => {
        if (value === undefined || value === null) {
            throw new Error(`${name} 未定义`);
        }
    },

    expectToEqual: (actual, expected, name) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${name} 不匹配: 期望 ${JSON.stringify(expected)}, 实际 ${JSON.stringify(actual)}`);
        }
    },

    expectToContain: (array, item, name) => {
        if (!array.includes(item)) {
            throw new Error(`${name} 不包含 ${item}`);
        }
    },

    expectToBeTrue: (value, name) => {
        if (value !== true) {
            throw new Error(`${name} 期望为 true, 实际为 ${value}`);
        }
    }
};

module.exports = TestUtils;
