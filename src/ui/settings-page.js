import { ConfigExporter } from "../core/config-exporter.js";

/**
 * 设置页面 - 负责全局 API 配置、全局逻辑配置与导入导出
 */
export const SettingsPage = {
  render(data) {
    const api = data.config.api || { endpoint: "", key: "", model: "" };
    const global = data.config.global || {
      contextDepth: 15,
      systemPrompt:
        "You are a professional data analyst. Analyze the following conversation and extract structured information for the tracking tables.",
    };

    return `
            <div style="animation: fadeIn 0.3s ease-out;">
                <h2 style="margin: 0 0 10px 0; font-weight: 300;">全局系统设置</h2>
                <p style="color: #888; margin-bottom: 30px;">在此配置插件的底层引擎与全局提取逻辑。</p>

                <!-- 导入导出区域 -->
                <div style="background: rgba(60,80,120,0.15); padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid rgba(85,136,255,0.2);">
                    <h3 style="margin-top: 0; font-size: 1em; color: #5588ff; margin-bottom: 15px;">
                        <i class="fa-solid fa-file-export" style="margin-right: 10px;"></i> 配置管理
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button id="st-export-config" style="background: rgba(85,136,255,0.2); color: #5588ff; border: 1px solid rgba(85,136,255,0.3); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fa-solid fa-download" style="margin-right: 8px;"></i>
                            导出完整配置
                        </button>
                        <button id="st-export-schema" style="background: rgba(85,136,255,0.2); color: #5588ff; border: 1px solid rgba(85,136,255,0.3); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fa-solid fa-table" style="margin-right: 8px;"></i>
                            仅导出表配置
                        </button>
                        <button id="st-import-config" style="background: rgba(255,170,0,0.15); color: #ffaa00; border: 1px solid rgba(255,170,0,0.3); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fa-solid fa-upload" style="margin-right: 8px;"></i>
                            导入配置（追加）
                        </button>
                        <button id="st-import-replace" style="background: rgba(255,100,100,0.15); color: #ff6464; border: 1px solid rgba(255,100,100,0.3); padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s;">
                            <i class="fa-solid fa-sync" style="margin-right: 8px;"></i>
                            导入配置（覆盖）
                        </button>
                    </div>
                    <input type="file" id="st-import-file" accept=".json" style="display: none;">
                    <p style="font-size: 0.7em; color: #666; margin-top: 10px; margin-bottom: 0;">
                        💡 提示：导出包含 API、全局设置和表格模板，不包含实际数据
                    </p>
                </div>

                <!-- 提取逻辑配置 -->
                <div style="background: rgba(40,40,50,0.3); padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="margin-top: 0; font-size: 1em; color: #5588ff; margin-bottom: 20px;">
                        <i class="fa-solid fa-brain" style="margin-right: 10px;"></i> 全局提取逻辑
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">全局上下文深度 (读取几条消息素材)</label>
                            <input type="number" id="st-global-context" min="1" max="100" value="${global.contextDepth}" 
                                style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">默认表格可见条数 (AI 最多看几条现有数据)</label>
                            <input type="number" id="st-global-maxrows" min="0" max="100" value="${global.defaultTableMaxRows || 10}" 
                                style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                            <p style="font-size: 0.7em; color: #555; margin-top: 5px;">* 此为新建表格时的默认值，单个表格可在模板页面单独设置。</p>
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">全局系统提示词 (System Prompt)</label>
                            <textarea id="st-global-prompt" 
                                style="width: 100%; height: 100px; background: #000; border: 1px solid #333; color: #ccc; padding: 12px; border-radius: 8px; font-size: 0.9em; resize: vertical;"
                                placeholder="在这里定义 AI 的全局行为准则...">${global.systemPrompt || ""}</textarea>
                            <p style="font-size: 0.7em; color: #555; margin-top: 5px;">* 这是发给 AI 的总指令，会放在所有表格逻辑之前。</p>
                        </div>
                    </div>
                </div>

                <!-- 独立 API 配置 -->
                <div style="background: rgba(40,40,50,0.3); padding: 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <h3 style="margin-top: 0; font-size: 1em; color: #5588ff; margin-bottom: 20px;">
                        <i class="fa-solid fa-cloud" style="margin-right: 10px;"></i> 独立后台 API (可选)
                    </h3>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">API 端点 (Base URL)</label>
                            <input type="text" id="st-api-endpoint" placeholder="https://api.openai.com/v1" value="${api.endpoint}" 
                                style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">API 密钥 (Secret Key)</label>
                            <input type="password" id="st-api-key" placeholder="sk-..." value="${api.key}" 
                                style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">指定模型 (Model ID)</label>
                            <input type="text" id="st-api-model" placeholder="gpt-4o" value="${api.model}" 
                                style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                        </div>
                        <button id="st-save-settings" style="background: #5588ff; color: #fff; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-top: 10px;">
                            保存全局配置
                        </button>
                    </div>
                </div>
            </div>
        `;
  },

  bindEvents(onSaveSettings, config, onUpdateSchema) {
    // 保存设置按钮
    $("#st-save-settings").on("click", () => {
      const settings = {
        api: {
          endpoint: $("#st-api-endpoint").val().trim(),
          key: $("#st-api-key").val().trim(),
          model: $("#st-api-model").val().trim(),
        },
        global: {
          contextDepth: parseInt($("#st-global-context").val()) || 15,
          defaultTableMaxRows: parseInt($("#st-global-maxrows").val()) || 10,
          systemPrompt: $("#st-global-prompt").val().trim(),
        },
      };
      onSaveSettings(settings);
    });

    // 导出完整配置
    $("#st-export-config").on("click", () => {
      ConfigExporter.downloadConfig(config);
      toastr.success("配置已导出");
    });

    // 仅导出表配置
    $("#st-export-schema").on("click", () => {
      ConfigExporter.downloadSchemaOnly(config.schema);
      toastr.success("表配置已导出");
    });

    // 导入配置（追加模式）
    $("#st-import-config").on("click", () => {
      $("#st-import-file").data("replace", false).click();
    });

    // 导入配置（覆盖模式）
    $("#st-import-replace").on("click", () => {
      if (
        !confirm(
          "⚠️ 覆盖模式将完全替换现有配置，确定继续？\n\n建议先导出备份！",
        )
      ) {
        return;
      }
      $("#st-import-file").data("replace", true).click();
    });

    // 文件选择处理
    $("#st-import-file").on("change", async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const replaceMode = $(this).data("replace");
      const importedConfig = await ConfigExporter.importFromFile(file);

      if (!importedConfig) {
        toastr.error("配置文件格式错误");
        return;
      }

      // 合并配置
      const merged = ConfigExporter.mergeConfig(config, importedConfig, {
        overwriteApi: replaceMode,
        overwriteGlobal: replaceMode,
        overwriteSchema: replaceMode,
      });

      // 更新配置
      config.api = merged.api;
      config.global = merged.global;
      config.schema = merged.schema;

      // 保存并刷新UI
      if (onSaveSettings) {
        onSaveSettings({ api: merged.api, global: merged.global });
      }
      if (onUpdateSchema) {
        onUpdateSchema(merged.schema);
      }

      const mode = replaceMode ? "覆盖" : "追加";
      toastr.success(`配置已${mode}导入，共${merged.schema.length}个表格`);

      // 清空文件输入
      $(this).val("");
    });

    // 按钮悬停效果
    $(
      "#st-export-config, #st-export-schema, #st-import-config, #st-import-replace",
    ).on("mouseenter", function () {
      $(this).css("transform", "translateY(-2px)");
      $(this).css("box-shadow", "0 4px 12px rgba(85,136,255,0.3)");
    });
    $(
      "#st-export-config, #st-export-schema, #st-import-config, #st-import-replace",
    ).on("mouseleave", function () {
      $(this).css("transform", "translateY(0)");
      $(this).css("box-shadow", "none");
    });
  },
};
