/**
 * 配置导入导出器
 */
export const ConfigExporter = {
  /**
   * 导出全局配置（不包括表数据，只包括设置和schema）
   * @param {Object} config - 全局配置对象
   * @returns {Object} 导出的配置对象
   */
  exportConfig(config) {
    return {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      config: {
        api: config.api,
        global: config.global,
        schema: config.schema,
      },
    };
  },

  /**
   * 导出为 JSON 文件并下载
   * @param {Object} config - 全局配置对象
   * @param {String} filename - 文件名（默认: smart-table-config.json）
   */
  downloadConfig(config, filename = "smart-table-config.json") {
    const exportData = this.exportConfig(config);
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
    console.log(`[ConfigExporter] 配置已导出: ${filename}`);
  },

  /**
   * 从 JSON 字符串导入配置
   * @param {String} jsonStr - JSON 字符串
   * @returns {Object|null} 解析后的配置对象，失败返回 null
   */
  importConfig(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);

      // 验证版本
      if (!data.version) {
        throw new Error("配置文件缺少版本号");
      }

      // 验证必要字段
      if (!data.config || !data.config.schema) {
        throw new Error("配置文件格式错误");
      }

      console.log(`[ConfigExporter] 导入配置成功，版本: ${data.version}`);
      return data.config;
    } catch (e) {
      console.error("[ConfigExporter] 导入配置失败:", e);
      return null;
    }
  },

  /**
   * 从文件导入配置
   * @param {File} file - 上传的文件对象
   * @returns {Promise<Object|null>} 解析后的配置对象
   */
  async importFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const config = this.importConfig(e.target.result);
        resolve(config);
      };
      reader.onerror = () => {
        console.error("[ConfigExporter] 文件读取失败");
        resolve(null);
      };
      reader.readAsText(file);
    });
  },

  /**
   * 合并导入的配置到现有配置
   * @param {Object} currentConfig - 当前配置
   * @param {Object} importedConfig - 导入的配置
   * @param {Object} options - 合并选项
   * @returns {Object} 合并后的配置
   */
  mergeConfig(currentConfig, importedConfig, options = {}) {
    const {
      overwriteApi = true,
      overwriteGlobal = true,
      overwriteSchema = false, // 默认不覆盖 schema，而是追加
    } = options;

    const merged = JSON.parse(JSON.stringify(currentConfig));

    if (overwriteApi && importedConfig.api) {
      merged.api = importedConfig.api;
    }

    if (overwriteGlobal && importedConfig.global) {
      merged.global = importedConfig.global;
    }

    if (importedConfig.schema) {
      if (overwriteSchema) {
        // 完全覆盖
        merged.schema = importedConfig.schema;
      } else {
        // 追加（避免 ID 冲突）
        const existingIds = new Set(merged.schema.map((s) => s.id));
        importedConfig.schema.forEach((newSchema) => {
          if (!existingIds.has(newSchema.id)) {
            merged.schema.push(newSchema);
          } else {
            console.warn(`[ConfigExporter] 跳过重复的表格 ID: ${newSchema.id}`);
          }
        });
      }
    }

    return merged;
  },

  /**
   * 仅导出 schema（表配置）
   * @param {Array} schema - 表配置数组
   * @returns {Object} 导出对象
   */
  exportSchemaOnly(schema) {
    return {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      type: "schema-only",
      schema,
    };
  },

  /**
   * 下载 schema 配置
   * @param {Array} schema - 表配置数组
   */
  downloadSchemaOnly(schema) {
    const exportData = this.exportSchemaOnly(schema);
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "smart-table-schema.json";
    a.click();

    URL.revokeObjectURL(url);
    console.log("[ConfigExporter] Schema 已导出");
  },
};
