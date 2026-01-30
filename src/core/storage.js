import { STAPI } from "./st-api.js";

const EXT_KEY = "smart_table_v2";

/**
 * 存储管理器 - 负责区分“全局配置”与“聊天数据”
 */
export const Storage = {
  /**
   * 获取全局配置（分类、API、频率等）
   * 无论换哪个角色，这些设置都是一样的
   */
  getGlobalConfig(defaultConfig) {
    const settings = STAPI.getGlobalSettings();
    if (!settings[EXT_KEY]) {
      settings[EXT_KEY] = JSON.parse(JSON.stringify(defaultConfig));
    } else {
      // 确保新加的全局字段（如 global）如果不存在则初始化
      for (const key in defaultConfig) {
        if (!Object.prototype.hasOwnProperty.call(settings[EXT_KEY], key)) {
          settings[EXT_KEY][key] = JSON.parse(
            JSON.stringify(defaultConfig[key]),
          );
        }
      }
    }
    return settings[EXT_KEY];
  },

  /**
   * 保存全局配置
   */
  async saveGlobalConfig(config) {
    const settings = STAPI.getGlobalSettings();
    settings[EXT_KEY] = config;
    await STAPI.saveGlobalSettings();
  },

  /**
   * 获取当前聊天的具体表格数据
   * 不同聊天、不同角色的内容是独立的
   */
  getChatData(
    defaultData = { tables: {}, lastUpdatedIndices: {}, baseFloor: 0 },
  ) {
    const metadata = STAPI.getMetadata();
    if (!metadata[EXT_KEY]) {
      metadata[EXT_KEY] = JSON.parse(JSON.stringify(defaultData));
    } else {
      // 确保新加的字段（如 baseFloor）如果不存在则初始化
      for (const key in defaultData) {
        if (!Object.prototype.hasOwnProperty.call(metadata[EXT_KEY], key)) {
          metadata[EXT_KEY][key] = JSON.parse(JSON.stringify(defaultData[key]));
        }
      }
    }
    return metadata[EXT_KEY];
  },

  /**
   * 保存当前聊天的具体表格数据（保存至聊天文件 Meta）
   */
  async saveChatData(data) {
    const metadata = STAPI.getMetadata();
    metadata[EXT_KEY] = data;
    await STAPI.saveMetadata();
  },
};
