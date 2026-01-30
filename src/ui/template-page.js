/**
 * 模板页面 - 负责管理表格结构与 AI 配置
 */
export const TemplatePage = {
  render(data) {
    const schema = data.config.schema || [];

    return `
            <div style="animation: fadeIn 0.3s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                    <h2 style="margin: 0; font-weight: 300;">模板管理</h2>
                    <button id="st-add-table" style="background: rgba(85, 255, 85, 0.1); border: 1px solid rgba(85, 255, 85, 0.3); color: #55ff55; padding: 10px 20px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-plus"></i> 新建表格
                    </button>
                </div>

                <div id="st-schema-list" style="display: flex; flex-direction: column; gap: 30px;">
                    ${schema.map((table, idx) => this.renderTableCard(table, idx)).join("")}
                </div>
            </div>
        `;
  },

  renderTableCard(table, idx) {
    const aiEnabled = table.aiEnabled !== false;
    const aiVisible = table.aiVisible !== false;
    const aiMaxRows = table.aiMaxRows || 0;

    return `
            <div class="st-table-card" data-idx="${idx}" style="background: rgba(30,30,40,0.4); border-radius: 16px; padding: 25px; border: 1px solid rgba(255, 255, 255, 0.05);">
                <!-- Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <input type="text" class="st-table-title" value="${table.title}" 
                        style="background: transparent; border: none; color: #5588ff; font-size: 1.2em; font-weight: 600; outline: none; flex: 1;"
                        placeholder="表格名称">
                    <button class="st-delete-table" style="background: transparent; border: 1px solid #ff5555; color: #ff5555; width: 32px; height: 32px; border-radius: 8px; cursor: pointer;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>

                <!-- Fields -->
                <div style="margin-bottom: 20px;">
                    <label style="display: block; font-size: 0.75em; color: #888; margin-bottom: 10px;">字段定义</label>
                    <div class="st-fields-container" style="display: flex; flex-direction: column; gap: 10px;">
                        ${(table.fields || [])
                          .map(
                            (f, fidx) => `
                            <div class="st-field-row" style="display: flex; gap: 10px; align-items: center;">
                                <input type="text" class="st-field-key" value="${f.key}" placeholder="字段 Key" 
                                    style="flex: 1; background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 6px; font-size: 0.85em;">
                                <input type="text" class="st-field-name" value="${f.name}" placeholder="显示名称" 
                                    style="flex: 1; background: #000; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 6px; font-size: 0.85em;">
                                <button class="st-remove-field" data-fidx="${fidx}" style="background: transparent; border: 1px solid #ff5555; color: #ff5555; width: 32px; height: 32px; border-radius: 6px; cursor: pointer;">
                                    <i class="fa-solid fa-minus"></i>
                                </button>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                    <button class="st-add-field" style="margin-top: 10px; background: rgba(85, 255, 85, 0.1); border: 1px solid rgba(85, 255, 85, 0.3); color: #55ff55; padding: 8px 15px; border-radius: 8px; cursor: pointer; font-size: 0.85em;">
                        <i class="fa-solid fa-plus"></i> 添加字段
                    </button>
                </div>

                <!-- AI 配置区 -->
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);">
                    <h4 style="margin: 0 0 15px 0; font-size: 0.9em; color: #5588ff; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-robot"></i> AI 自动更新配置
                    </h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- AI 启用开关 -->
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" class="st-ai-enabled" ${aiEnabled ? "checked" : ""} 
                                style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="color: #ddd; font-size: 0.9em;">启用 AI 自动更新（关闭则为纯手动表）</span>
                        </label>

                        <!-- AI 可见性配置 -->
                        <div class="st-ai-visibility-section" style="margin-left: 30px; display: ${aiEnabled ? "flex" : "none"}; flex-direction: column; gap: 10px;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <input type="checkbox" class="st-ai-visible" ${aiVisible ? "checked" : ""} 
                                    style="width: 18px; height: 18px; cursor: pointer;">
                                <span style="color: #ddd; font-size: 0.85em;">AI 可见现有数据（增量更新模式）</span>
                            </label>

                            <div class="st-ai-maxrows-section" style="display: ${aiVisible ? "flex" : "none"}; align-items: center; gap: 10px; margin-left: 30px;">
                                <span style="color: #888; font-size: 0.8em;">最多显示</span>
                                <input type="number" class="st-ai-maxrows" value="${aiMaxRows}" min="0" 
                                    style="width: 80px; background: #000; border: 1px solid #333; color: #fff; padding: 6px; border-radius: 6px; text-align: center;">
                                <span style="color: #888; font-size: 0.8em;">条（0 = 全部可见）</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Prompt 注入配置 -->
                <div style="background: rgba(0,40,0,0.2); padding: 20px; border-radius: 12px; border: 1px solid rgba(85,255,85,0.1); margin-top: 15px;">
                    <h4 style="margin: 0 0 15px 0; font-size: 0.9em; color: #55ff55; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-paper-plane"></i> Prompt 自动注入配置
                    </h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <!-- 注入开关 -->
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                            <input type="checkbox" class="st-inject-enabled" ${table.injectOnInput ? "checked" : ""} 
                                style="width: 18px; height: 18px; cursor: pointer;">
                            <span style="color: #ddd; font-size: 0.9em;">用户发送消息时自动注入此表</span>
                        </label>

                        <!-- 注入深度 -->
                        <div class="st-inject-depth-section" style="margin-left: 30px; display: ${table.injectOnInput ? "flex" : "none"}; align-items: center; gap: 10px;">
                            <span style="color: #888; font-size: 0.8em;">插入深度:</span>
                            <input type="number" class="st-inject-depth" value="${table.injectDepth || 0}" min="0" max="10000" step="100"
                                style="width: 100px; background: #000; border: 1px solid #333; color: #fff; padding: 6px; border-radius: 6px; text-align: center;">
                            <span style="color: #666; font-size: 0.75em;">(0=最前 1000=中间 2000=靠后)</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  bindEvents(data, onUpdateSchema, onRefresh) {
    const schema = data.config.schema;

    // 新建表格
    $("#st-add-table")
      .off("click")
      .on("click", () => {
        const newTable = {
          id: "table_" + Date.now(),
          title: "新表格",
          fields: [{ key: "field1", name: "字段1" }],
          freq: 3,
          prompt: "",
          aiEnabled: true,
          aiVisible: true,
          aiMaxRows: 10,
        };
        schema.push(newTable);
        onUpdateSchema(schema);
        onRefresh();
      });

    // 删除表格
    $(".st-delete-table")
      .off("click")
      .on("click", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        if (confirm("确定删除此表格吗？")) {
          schema.splice(idx, 1);
          onUpdateSchema(schema);
          onRefresh();
        }
      });

    // 修改表格标题
    $(".st-table-title")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].title = $(this).val();
        onUpdateSchema(schema);
      });

    // 添加字段
    $(".st-add-field")
      .off("click")
      .on("click", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].fields.push({ key: "newField", name: "新字段" });
        onUpdateSchema(schema);
        onRefresh();
      });

    // 删除字段
    $(".st-remove-field")
      .off("click")
      .on("click", function () {
        const tableIdx = $(this).closest(".st-table-card").data("idx");
        const fieldIdx = $(this).data("fidx");
        schema[tableIdx].fields.splice(fieldIdx, 1);
        onUpdateSchema(schema);
        onRefresh();
      });

    // 修改字段
    $(".st-field-key, .st-field-name")
      .off("change")
      .on("change", function () {
        const tableIdx = $(this).closest(".st-table-card").data("idx");
        const fieldIdx = $(this).closest(".st-field-row").index();
        const isKey = $(this).hasClass("st-field-key");
        const value = $(this).val();

        if (isKey) {
          schema[tableIdx].fields[fieldIdx].key = value;
        } else {
          schema[tableIdx].fields[fieldIdx].name = value;
        }
        onUpdateSchema(schema);
      });

    // AI 启用开关
    $(".st-ai-enabled")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].aiEnabled = $(this).is(":checked");
        onUpdateSchema(schema);
        $(this)
          .closest(".st-table-card")
          .find(".st-ai-visibility-section")
          .toggle(schema[idx].aiEnabled);
      });

    // AI 可见性开关
    $(".st-ai-visible")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].aiVisible = $(this).is(":checked");
        onUpdateSchema(schema);
        $(this)
          .closest(".st-table-card")
          .find(".st-ai-maxrows-section")
          .toggle(schema[idx].aiVisible);
      });

    // AI 最大行数
    $(".st-ai-maxrows")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].aiMaxRows = parseInt($(this).val()) || 0;
        onUpdateSchema(schema);
      });

    // Prompt 注入开关
    $(".st-inject-enabled")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].injectOnInput = $(this).is(":checked");
        onUpdateSchema(schema);
        $(this)
          .closest(".st-table-card")
          .find(".st-inject-depth-section")
          .toggle(schema[idx].injectOnInput);
      });

    // 注入深度
    $(".st-inject-depth")
      .off("change")
      .on("change", function () {
        const idx = $(this).closest(".st-table-card").data("idx");
        schema[idx].injectDepth = parseInt($(this).val()) || 0;
        onUpdateSchema(schema);
      });
  },
};
