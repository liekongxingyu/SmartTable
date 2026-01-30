/**
 * ST-API - 抽象封装层，对齐 @[开发参考文档]
 */
export const STAPI = {
    getContext() {
        if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
            return SillyTavern.getContext();
        }
        return null;
    },

    getEventSource() {
        return this.getContext()?.eventSource;
    },

    getEventTypes() {
        const ctx = this.getContext();
        return ctx?.eventTypes || ctx?.event_types || {};
    },

    /**
     * 调用官方 generateRaw (当前活动 API)
     */
    async generate(prompt, jsonSchema = null) {
        const context = this.getContext();
        if (!context || !context.generateRaw) throw new Error('Official generateRaw not found');
        return await context.generateRaw({ prompt, jsonSchema });
    },

    /**
     * 调用官方 ChatCompletionService (支持独立 API)
     * 遵循 Writing-Extensions.md 与 custom-request.js 逻辑
     */
    async customGenerate(payload, options = {}) {
        const context = this.getContext();
        // 从 context 中获取 Service 类
        const CCS = context.ChatCompletionService;
        if (!CCS) throw new Error('ChatCompletionService not available in context');

        console.log('[SmartTable] 正在通过官方 ChatCompletionService 发起独立请求...');
        // processRequest 会处理 payload 并通过酒馆后端转发
        return await CCS.processRequest(payload, options);
    },

    getMetadata() { return this.getContext()?.chatMetadata || {}; },
    async saveMetadata() { if (this.getContext()?.saveMetadata) return await this.getContext().saveMetadata(); },
    getGlobalSettings() { return this.getContext()?.extensionSettings || {}; },
    async saveGlobalSettings() { if (this.getContext()?.saveSettingsDebounced) return await this.getContext().saveSettingsDebounced(); }
};
