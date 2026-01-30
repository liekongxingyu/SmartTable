import { STAPI } from "../core/st-api.js";

/**
 * 提取器 - 支持增量更新（AI 可见现有数据）
 */
export const Extractor = {
  async extract(
    systemPrompt,
    promptBody,
    fieldsMap,
    customApi = null,
    maxContext = 15,
    currentTables = {},
    categories = [],
  ) {
    console.log(`[SmartTable] 开始数据提取流程 (上下文深度: ${maxContext})...`);
    const context = STAPI.getContext();
    const chat = context?.chat || [];
    if (chat.length === 0) return null;

    // 获取最近的对话内容作为"素材"
    const recentChat = chat
      .slice(-maxContext)
      .map((m) => `${m.is_user ? "User" : "Character"}: ${m.mes}`)
      .join("\n");

    // 构造 JSON Schema
    const properties = {};
    const required = [];
    for (const [id, fields] of Object.entries(fieldsMap)) {
      const fieldProps = {};
      const keys = [];
      fields.forEach((f) => {
        fieldProps[f.key] = { type: "string", description: f.name };
        keys.push(f.key);
      });
      properties[id] = {
        type: "array",
        items: { type: "object", properties: fieldProps, required: keys },
      };
      required.push(id);
    }

    const jsonSchema = {
      name: "SmartTableData",
      strict: true,
      value: {
        $schema: "http://json-schema.org/draft-04/schema#",
        type: "object",
        properties,
        required,
      },
    };

    // 构建表格现有数据的展示（根据 aiVisible 配置）
    let tableContextSection = "";
    categories.forEach((cat) => {
      const tableId = cat.id;
      const existingRows = currentTables[tableId] || [];

      if (cat.aiVisible !== false && existingRows.length > 0) {
        // AI 可见模式：展示现有数据
        const maxRows = cat.aiMaxRows || 0;
        const visibleRows =
          maxRows > 0 ? existingRows.slice(0, maxRows) : existingRows;
        tableContextSection += `\n## ${cat.title} (Current State - ${visibleRows.length}/${existingRows.length} records shown)\n`;
        tableContextSection += `${JSON.stringify(visibleRows, null, 2)}\n`;
      } else {
        // AI 不可见模式：不展示数据
        tableContextSection += `\n## ${cat.title} (Append Only Mode - no existing data shown)\n`;
      }
    });

    // 拼接完整的提示词
    const promptTexts = `${systemPrompt}

=== CHAT CONTEXT (Recent ${maxContext} messages) ===
${recentChat}

=== CURRENT TABLE STATES (for AI reference) ===${tableContextSection}

=== UPDATE INSTRUCTIONS ===
${promptBody}

CRITICAL RULES - READ CAREFULLY:

For tables marked "Current State" (AI can see existing data):
  ⚠️ INCREMENTAL UPDATE MODE - You only need to return CHANGED or NEW records
  ⚠️ If a record hasn't changed, DO NOT include it in your response
  ⚠️ To UPDATE an existing record: return a record with the SAME key (first field) but modified values
  ⚠️ To ADD a new record: return a record with a NEW key value
  ⚠️ The system will automatically merge your updates with existing data by matching keys
  
  Example: 
  - Existing data: [{"id":"1","status":"pending"}, {"id":"2","status":"done"}]
  - If task 1's status changed to "done": return [{"id":"1","status":"done"}]
  - If you want to add task 3: return [{"id":"3","status":"new"}]
  - If both: return [{"id":"1","status":"done"}, {"id":"3","status":"new"}]

For tables marked "Append Only Mode" (no existing data shown):
  - Return ONLY the NEW records you want to add this round.
  - Do NOT try to include old records (you can't see them anyway).

If nothing changed for a table: Return empty array []

Output ONLY valid JSON. No explanations.`;

    // 情况 A: 用户配置了独立 API
    if (customApi && customApi.endpoint && customApi.key) {
      try {
        console.log("[SmartTable] 🔵 尝试使用独立 API...");
        const payload = {
          messages: [{ role: "user", content: promptTexts }],
          model: customApi.model || "gpt-3.5-turbo",
          reverse_proxy: customApi.endpoint.replace(/\/+$/, ""),
          proxy_password: customApi.key,
          chat_completion_source: "openai",
          max_tokens: 3000,
          json_schema: jsonSchema,
        };

        console.log("[SmartTable] 📤 发送独立 API 请求...");
        const response = await STAPI.customGenerate(payload);
        console.log("[SmartTable] ✅ 独立 API 请求成功，返回数据");

        const aiResult =
          typeof response.content === "object"
            ? response.content
            : JSON.parse(response.content);

        console.log("[SmartTable] 🔵 独立 API 路径完成，不再尝试主 API");
        return this.mergeResults(aiResult, currentTables, categories);
      } catch (e) {
        console.error(
          "[SmartTable] ❌ 独立 API 请求失败，准备回退:",
          e.message,
        );
        toastr.warning("独立 API 请求失败，正在尝试使用酒馆主 API...");
        // 继续执行下面的主 API 逻辑
      }
    } else {
      console.log("[SmartTable] 🟡 未配置独立 API，将使用酒馆主 API");
    }

    // 情况 B: 回退到 generateRaw
    try {
      console.log("[SmartTable] 🟢 正在使用酒馆主 API 提取...");
      console.log("[SmartTable] 📤 发送主 API 请求...");
      const result = await STAPI.generate(promptTexts, jsonSchema);
      if (!result) {
        console.log("[SmartTable] ⚠️ 主 API 返回空结果");
        return null;
      }
      console.log("[SmartTable] ✅ 主 API 请求成功，返回数据");
      const aiResult = typeof result === "string" ? JSON.parse(result) : result;
      return this.mergeResults(aiResult, currentTables, categories);
    } catch (e) {
      console.error("[SmartTable] ❌ 所有 API 尝试均失败:", e);
      return null;
    }
  },

  /**
   * 合并 AI 返回结果与现有数据
   * @param {Object} aiResult AI 返回的 JSON
   * @param {Object} currentTables 现有表格数据
   * @param {Array} categories 表格配置（包含 aiVisible 等）
   */
  mergeResults(aiResult, currentTables, categories) {
    const merged = {};

    for (const tableId in aiResult) {
      const cat = categories.find((c) => c.id === tableId);
      if (!cat) {
        merged[tableId] = aiResult[tableId];
        continue;
      }

      const aiReturned = aiResult[tableId] || [];
      const existing = currentTables[tableId] || [];

      if (cat.aiVisible !== false) {
        // AI 可见模式：增量合并（基于主键）
        const aiReturned = aiResult[tableId] || [];
        const existing = currentTables[tableId] || [];

        // 获取主键字段（使用第一个字段作为唯一标识）
        const primaryKeyField = cat.fields?.[0]?.key;

        if (!primaryKeyField) {
          // 如果没有定义字段，则直接追加
          merged[tableId] = [...aiReturned, ...existing];
          console.log(
            `[SmartTable] [${cat.title}] 无主键字段，使用追加模式：新增 ${aiReturned.length} 条，总计 ${merged[tableId].length} 条`,
          );
        } else {
          // 基于主键的智能合并
          const mergedMap = new Map();

          // 1. 先加载所有现有数据
          existing.forEach((row) => {
            const keyValue = row[primaryKeyField];
            if (keyValue !== undefined) {
              mergedMap.set(keyValue, row);
            }
          });

          // 2. AI 返回的数据覆盖或新增
          aiReturned.forEach((row) => {
            const keyValue = row[primaryKeyField];
            if (keyValue !== undefined) {
              mergedMap.set(keyValue, row); // 相同key覆盖，新key追加
            }
          });

          // 3. 转回数组（AI返回的新数据排在前面）
          const updatedKeys = new Set(
            aiReturned.map((r) => r[primaryKeyField]),
          );
          const newOrUpdated = Array.from(mergedMap.values()).filter((r) =>
            updatedKeys.has(r[primaryKeyField]),
          );
          const unchanged = Array.from(mergedMap.values()).filter(
            (r) => !updatedKeys.has(r[primaryKeyField]),
          );

          merged[tableId] = [...newOrUpdated, ...unchanged];

          const addedCount = aiReturned.filter(
            (r) =>
              !existing.some((e) => e[primaryKeyField] === r[primaryKeyField]),
          ).length;
          const updatedCount = aiReturned.length - addedCount;

          console.log(
            `[SmartTable] [${cat.title}] 增量合并模式 (主键: ${primaryKeyField})：新增 ${addedCount} 条，更新 ${updatedCount} 条，保留 ${unchanged.length} 条，总计 ${merged[tableId].length} 条`,
          );
        }
      } else {
        // AI 不可见模式：追加新条目到最前面
        const newRows = aiResult[tableId] || [];
        const existingRows = currentTables[tableId] || [];
        merged[tableId] = [...newRows, ...existingRows];
        console.log(
          `[SmartTable] [${cat.title}] 追加模式：新增 ${newRows.length} 条，总计 ${merged[tableId].length} 条`,
        );
      }
    }

    return merged;
  },
};
