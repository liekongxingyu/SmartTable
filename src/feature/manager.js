import { STAPI } from "../core/st-api.js";
import { Storage } from "../core/storage.js";
import { Extractor } from "./extractor.js";
import { Renderer } from "../ui/renderer.js";
import { Modal } from "../ui/modal.js";
import { TableInjector } from "./injector.js";
import { DataCleaner } from "./cleaner.js";

/**
 * 智能表格管理类
 */
export class SmartTableManager {
  constructor() {
    this.defaultConfig = {
      api: { endpoint: "", key: "", model: "" },
      global: {
        contextDepth: 15,
        systemPrompt:
          "You are a professional data analyst. Analyze the following conversation and extract structured information for the tracking tables.",
        defaultTableMaxRows: 10, // 默认给 AI 看多少条表格数据
      },
      schema: [],
    };
    this.defaultChatData = {
      tables: {},
      lastUpdatedIndices: {},
      baseFloor: 0,
      snapshots: [], // 快照数组：[{ messageIndex, tables, timestamp }, ...]
    };
  }

  init() {
    const eventSource = STAPI.getEventSource();
    const eventTypes = STAPI.getEventTypes();

    console.log("[SmartTable] 正在初始化事件监听...");
    console.log("[SmartTable] 可用事件类型:", Object.keys(eventTypes));

    // 监听 AI 回复事件（用于自动提取）
    const eventsToTry = [
      "CHARACTER_MESSAGE_RENDERED",
      "MESSAGE_RECEIVED",
      "CHAT_CHANGED",
    ];

    let eventBound = false;
    for (const eventName of eventsToTry) {
      if (eventTypes[eventName]) {
        eventSource.on(eventTypes[eventName], () => {
          console.log(
            `[SmartTable] 检测到事件: ${eventName}，检查是否需要更新...`,
          );
          this.onChatUpdated();
        });
        console.log(`[SmartTable] 已绑定事件: ${eventName}`);
        eventBound = true;
        break;
      }
    }

    if (!eventBound) {
      console.warn("[SmartTable] 未找到合适的事件类型，自动更新可能无法工作");
    }

    // 监听 prompt 准备完成事件，直接修改 messages 数组
    if (eventTypes.CHAT_COMPLETION_PROMPT_READY) {
      eventSource.on(eventTypes.CHAT_COMPLETION_PROMPT_READY, (eventData) => {
        if (!eventData.dryRun) {
          // 只在实际生成时注入
          console.log(
            "[SmartTable] CHAT_COMPLETION_PROMPT_READY 触发，注入表格...",
          );
          this.injectTablesIntoChat(eventData.chat);
        }
      });
      console.log(
        "[SmartTable] 已绑定表格注入事件: CHAT_COMPLETION_PROMPT_READY",
      );
    }

    // 监听消息删除事件，自动回滚表格数据
    if (eventTypes.MESSAGE_DELETED) {
      eventSource.on(eventTypes.MESSAGE_DELETED, (messageIndex) => {
        const currentChatLength = STAPI.getContext()?.chat?.length || 0;
        console.log(
          `[SmartTable] 检测到消息删除，尝试回滚...`,
          `\n   删除的消息索引: ${messageIndex}`,
          `\n   当前聊天长度: ${currentChatLength}`,
        );
        this.rollbackToSnapshot(messageIndex);
      });
      console.log("[SmartTable] 已绑定消息删除回滚事件");
    }

    // 监听重新生成事件，回滚表格数据
    if (eventTypes.MESSAGE_SWIPED) {
      eventSource.on(eventTypes.MESSAGE_SWIPED, (messageIndex) => {
        const currentChatLength = STAPI.getContext()?.chat?.length || 0;
        console.log(
          `[SmartTable] 检测到重新生成，尝试回滚...`,
          `\n   重新生成的消息索引: ${messageIndex}`,
          `\n   当前聊天长度: ${currentChatLength}`,
        );
        this.rollbackToSnapshot(messageIndex);
      });
      console.log("[SmartTable] 已绑定重新生成回滚事件");
    }

    console.log("[SmartTable] 初始化完成");
  }

  /**
   * 直接注入表格到 chat messages 数组（基于 depth 深度）
   * depth 的工作原理与世界书一致：
   * - depth = 0: 插入到最后一条消息之后
   * - depth = 1: 插入到倒数第2条消息之前
   * - depth = N: 插入到倒数第N+1条消息之前
   */
  injectTablesIntoChat(chatMessages) {
    const config = Storage.getGlobalConfig(this.defaultConfig);
    const chatData = Storage.getChatData(this.defaultChatData);

    const injectables = TableInjector.buildInjectableContent(
      config.schema,
      chatData.tables,
    );

    console.log(`[SmartTable] 找到 ${injectables.length} 个可注入表格`);

    if (injectables.length === 0) {
      return;
    }

    // 按表格分组注入（每个表格独立注入，根据各自的 depth）
    injectables.forEach((injectable) => {
      const depth = injectable.depth || 0;
      const content = `=== 以下是已记录的信息，注意，只是给你背景信息作为参考，你的回复中不要包含任何表格/数据库 ===

${injectable.content}

=== 已记录信息完毕 ===`;

      // 计算注入位置：从后往前数 depth 条消息
      // depth=0: 插入到最后 (chatMessages.length)
      // depth=1: 插入到倒数第2条之前 (chatMessages.length - 1)
      // depth=N: 插入到倒数第N+1条之前 (chatMessages.length - N)
      const insertPosition = Math.max(0, chatMessages.length - depth);

      chatMessages.splice(insertPosition, 0, {
        role: "system",
        content: content,
      });

      console.log(
        `✅ [SmartTable] 已注入表格到位置 ${insertPosition} (depth=${depth}, 总消息数=${chatMessages.length})`,
      );
    });
  }

  async onChatUpdated() {
    const config = Storage.getGlobalConfig(this.defaultConfig);
    const chatData = Storage.getChatData(this.defaultChatData);
    const currentIdx = Math.max(0, (STAPI.getContext()?.chat?.length || 1) - 1);
    const baseFloor = chatData.baseFloor || 0;

    console.log(
      `[SmartTable] onChatUpdated 被调用 - 消息总数: ${currentIdx}条 (UI显示第${currentIdx}楼), 起始楼层: ${baseFloor}`,
    );

    if (config.schema.length === 0) {
      console.log("[SmartTable] 没有配置任何表格，跳过自动更新");
      return;
    }

    const categories = config.schema.filter((cat) => {
      // 如果从未更新过，则使用 baseFloor 作为起点
      const lastIdx = chatData.lastUpdatedIndices[cat.id] || baseFloor;
      const floorsPassed = currentIdx - lastIdx;
      const shouldUpdate = floorsPassed >= (cat.freq || 3);

      console.log(
        `[SmartTable] [${cat.title}] 检查更新条件: 上次更新=${lastIdx}, 已过=${floorsPassed}层, 频率=${cat.freq || 3}, AI启用=${cat.aiEnabled !== false}, 应更新=${shouldUpdate}`,
      );

      // 必须同时满足：AI 启用 && 达到更新频率
      return cat.aiEnabled !== false && shouldUpdate;
    });

    if (categories.length > 0) {
      console.log(
        `[SmartTable] 准备更新 ${categories.length} 个表格:`,
        categories.map((c) => c.title),
      );
      await this.refreshSelectedCategories(categories, config, chatData);
    } else {
      console.log("[SmartTable] 没有表格需要更新");
    }
  }

  async manualRefreshAll() {
    const config = Storage.getGlobalConfig(this.defaultConfig);
    const chatData = Storage.getChatData(this.defaultChatData);
    await this.refreshSelectedCategories(config.schema, config, chatData);
  }

  async refreshSelectedCategories(categories, config, chatData) {
    const context = STAPI.getContext();
    const currentIdx = Math.max(0, (context?.chat?.length || 1) - 1);

    // 过滤：只处理启用了 AI 的表
    const aiEnabledCategories = categories.filter(
      (cat) => cat.aiEnabled !== false,
    );
    if (aiEnabledCategories.length === 0) {
      console.log("[SmartTable] 没有启用 AI 的表需要更新");
      return;
    }

    // 获取全局设置
    const globalDepth = config.global?.contextDepth || 15;
    const globalSystemPrompt =
      config.global?.systemPrompt || "Task: Update tracking tables.";

    const fieldsMap = {};
    const instructions = [];
    aiEnabledCategories.forEach((cat) => {
      fieldsMap[cat.id] = cat.fields || [];
      instructions.push(
        `- [${cat.title}]: ${cat.prompt || "Update latest data."}`,
      );
    });

    // 传递当前表格数据给 Extractor，让 AI 能看见
    const result = await Extractor.extract(
      globalSystemPrompt,
      instructions.join("\n"),
      fieldsMap,
      config.api,
      globalDepth,
      chatData.tables, // 新增：传递现有表格数据
      aiEnabledCategories, // 新增：传递完整的 category 对象（包含 aiVisible 等配置）
    );

    if (result) {
      Object.keys(result).forEach((key) => {
        chatData.tables[key] = result[key];
        chatData.lastUpdatedIndices[key] = currentIdx;
      });

      // 自动推进起始楼层到当前位置
      chatData.baseFloor = currentIdx;

      // 🧹 清理超出限制的数据
      chatData.tables = DataCleaner.cleanTables(chatData.tables, config.schema);

      await Storage.saveChatData(chatData);

      // 🔄 创建快照（保存修改后的状态）
      this.createSnapshot(chatData, currentIdx);

      console.log(`[SmartTable] 更新完成，起始楼层已推进至 ${currentIdx}`);

      // 立即更新注入的 Prompt
      this.updateInjectedPrompt();
    }
  }

  /**
   * 创建快照 - 在修改表格数据之前调用
   * @param {Object} chatData - 当前聊天数据
   * @param {Number} messageIndex - 当前消息索引
   */
  createSnapshot(chatData, messageIndex) {
    if (!chatData.snapshots) {
      chatData.snapshots = [];
    }

    const currentChatLength = STAPI.getContext()?.chat?.length || 0;

    console.log(
      `📸 [SmartTable] 准备创建快照`,
      `\n   保存的 messageIndex: ${messageIndex}`,
      `\n   当前聊天实际长度: ${currentChatLength}`,
      `\n   最后一条消息的索引应该是: ${currentChatLength - 1}`,
    );

    // 深拷贝当前表格数据
    const snapshot = {
      messageIndex,
      tables: JSON.parse(JSON.stringify(chatData.tables)),
      lastUpdatedIndices: JSON.parse(
        JSON.stringify(chatData.lastUpdatedIndices),
      ),
      baseFloor: chatData.baseFloor,
      timestamp: new Date().toISOString(),
    };

    chatData.snapshots.push(snapshot);
    console.log(
      `📸 [SmartTable] 创建快照完成 - 快照总数: ${chatData.snapshots.length}`,
    );

    // 保留最近 3 个快照，避免存储过大
    const MAX_SNAPSHOTS = 3;
    if (chatData.snapshots.length > MAX_SNAPSHOTS) {
      const removed = chatData.snapshots.shift();
      console.log(
        `🗑️ [SmartTable] 删除最旧快照 - 消息索引: ${removed.messageIndex}`,
      );
    }
  }

  /**
   * 回滚到指定消息索引之前的快照
   * @param {Number} targetMessageIndex - 被删除或重新生成的消息索引
   */
  async rollbackToSnapshot(targetMessageIndex) {
    const chatData = Storage.getChatData(this.defaultChatData);

    console.log(
      `🔍 [SmartTable] 回滚请求: 目标消息索引 = ${targetMessageIndex}`,
    );
    console.log(
      `📦 [SmartTable] 当前快照列表:`,
      chatData.snapshots?.map((s) => `#${s.messageIndex}`),
    );

    if (!chatData.snapshots || chatData.snapshots.length === 0) {
      console.log("⚠️ [SmartTable] 没有可用的快照，无法回滚");
      return;
    }

    // 找到目标索引的快照或之前最近的快照
    // 逻辑：当删除消息 N 时，我们应该回滚到消息 N-1 时的状态
    // 所以查找 messageIndex < targetMessageIndex 的最后一个快照
    let targetSnapshot = null;
    for (let i = chatData.snapshots.length - 1; i >= 0; i--) {
      if (chatData.snapshots[i].messageIndex < targetMessageIndex) {
        targetSnapshot = chatData.snapshots[i];
        break;
      }
    }

    if (!targetSnapshot) {
      console.log(
        `⚠️ [SmartTable] 未找到消息索引 ${targetMessageIndex} 之前的快照，无法回滚`,
      );
      return;
    }

    console.log(
      `🎯 [SmartTable] 找到目标快照: #${targetSnapshot.messageIndex}`,
    );

    // 恢复快照数据
    chatData.tables = JSON.parse(JSON.stringify(targetSnapshot.tables));
    chatData.lastUpdatedIndices = JSON.parse(
      JSON.stringify(targetSnapshot.lastUpdatedIndices),
    );
    chatData.baseFloor = targetSnapshot.baseFloor;

    // 删除目标快照之后的所有快照（包括目标索引及之后的）
    const originalLength = chatData.snapshots.length;
    chatData.snapshots = chatData.snapshots.filter(
      (s) => s.messageIndex < targetMessageIndex,
    );

    await Storage.saveChatData(chatData);

    console.log(
      `⏪ [SmartTable] 回滚完成 - 恢复到消息索引 ${targetSnapshot.messageIndex} 的快照`,
      `\n   删除了 ${originalLength - chatData.snapshots.length} 个快照`,
      `\n   剩余快照:`,
      chatData.snapshots.map((s) => `#${s.messageIndex}`),
    );

    toastr.info(`表格数据已回滚至消息 #${targetSnapshot.messageIndex}`);
  }

  updateInjectedPrompt() {
    // 预留：用于强制刷新注入的 prompt
    // 目前注入是在 CHAT_COMPLETION_PROMPT_READY 事件中完成的
    console.log("[SmartTable] updateInjectedPrompt 被调用（当前为空实现）");
  }

  show() {
    const config = Storage.getGlobalConfig(this.defaultConfig);
    const chatData = Storage.getChatData(this.defaultChatData);
    const currentFloor = Math.max(
      0,
      (STAPI.getContext()?.chat?.length || 1) - 1,
    );
    const baseFloor = chatData.baseFloor || 0;

    Renderer.toggle(
      { config, tables: chatData.tables, currentFloor, baseFloor },
      this.getCallbacks(config, chatData),
    );
  }

  getCallbacks(config, chatData) {
    const refreshUI = (ri) => {
      const freshData = Storage.getChatData(this.defaultChatData);
      const currentFloor = Math.max(
        0,
        (STAPI.getContext()?.chat?.length || 1) - 1,
      );
      const baseFloor = freshData.baseFloor || 0;
      ri.refresh(
        { config, tables: freshData.tables, currentFloor, baseFloor },
        this.getCallbacks(config, freshData),
      );
    };

    return {
      onTabSwitch: () => {
        // 切换标签页时，返回最新的完整数据
        const freshChatData = Storage.getChatData(this.defaultChatData);
        const currentFloor = Math.max(
          0,
          (STAPI.getContext()?.chat?.length || 1) - 1,
        );
        const baseFloor = freshChatData.baseFloor || 0;
        return {
          config,
          tables: freshChatData.tables,
          currentFloor,
          baseFloor,
        };
      },
      onUpdateSchema: (sch, ri) => {
        config.schema = sch;
        Storage.saveGlobalConfig(config);
        // 切换标签页后确保数据同步
        if (ri) refreshUI(ri);
      },
      onManualRefresh: async (ri) => {
        await this.manualRefreshAll();
        refreshUI(ri);
      },
      onSaveSettings: async (allSettings) => {
        config.api = allSettings.api;
        config.global = allSettings.global;
        await Storage.saveGlobalConfig(config);
        toastr.success("全局设置已生效");
      },
      onSetBaseFloor: async (floor, ri) => {
        chatData.baseFloor = floor;

        // 重置所有表的上次更新位置为起始楼层
        // 这样从起始楼层开始重新计数
        config.schema.forEach((cat) => {
          chatData.lastUpdatedIndices[cat.id] = floor;
        });

        await Storage.saveChatData(chatData);
        toastr.success(`起始楼层已设为 ${floor}，所有表格更新计数已重置`);

        // 刷新 UI 以更新"已过楼层"显示
        refreshUI(ri);
      },
      onAddRow: (tid, ri) => {
        const table = config.schema.find((t) => t.id === tid);
        if (!table) return;

        Modal.show(
          `新增: ${table.title}`,
          table.fields,
          null,
          async (newRow) => {
            if (!chatData.tables[tid]) chatData.tables[tid] = [];
            chatData.tables[tid].unshift(newRow);
            await Storage.saveChatData(chatData);

            const currentIdx = Math.max(
              0,
              (STAPI.getContext()?.chat?.length || 1) - 1,
            );
            this.createSnapshot(chatData, currentIdx);

            refreshUI(ri);
          },
        );
      },
      onEditRow: (tid, ridx, rowData, ri) => {
        const table = config.schema.find((t) => t.id === tid);
        if (!table) return;

        Modal.show(
          `编辑: ${table.title}`,
          table.fields,
          rowData,
          async (updatedRow) => {
            chatData.tables[tid][ridx] = updatedRow;
            await Storage.saveChatData(chatData);

            const currentIdx = Math.max(
              0,
              (STAPI.getContext()?.chat?.length || 1) - 1,
            );
            this.createSnapshot(chatData, currentIdx);

            refreshUI(ri);
          },
        );
      },
      onDeleteRow: async (tid, ridx, ri) => {
        if (chatData.tables[tid]) {
          chatData.tables[tid].splice(ridx, 1);
          await Storage.saveChatData(chatData);

          const currentIdx = Math.max(
            0,
            (STAPI.getContext()?.chat?.length || 1) - 1,
          );
          this.createSnapshot(chatData, currentIdx);

          refreshUI(ri);
          toastr.success("已删除数据");
        }
      },
    };
  }
}
