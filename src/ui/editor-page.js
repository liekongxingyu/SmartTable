/**
 * 编辑页面 - 专注于追踪策略（频率、提示词、数量限制）
 */
export const EditorPage = {
  render(data) {
    const schema = data.config.schema || [];
    return `
            <div style="animation: fadeIn 0.3s ease-out;">
                <h2 style="margin: 0 0 10px 0; font-weight: 300;">追踪策略配置</h2>
                <p style="color: #888; margin-bottom: 30px;">在此微调 AI 的思维逻辑。全局上下文深度请前往"设置"页面调整。</p>
                
                <div id="st-policy-list">
                    ${schema
                      .map(
                        (cat, idx) => `
                        <div class="st-policy-item" style="background: rgba(40,40,50,0.3); padding: 25px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.05);">
                            <!-- Header: Title only -->
                            <div style="font-weight: 600; color: #5588ff; margin-bottom: 20px; font-size: 1.1em; display: flex; align-items: center; gap: 10px;">
                                <i class="fa-solid fa-microchip"></i>
                                <span>${cat.title}</span>
                            </div>

                            <!-- Policy Control Grid -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">状态同步频率 (每几条消息同步一次)</label>
                                    <input type="number" min="1" value="${cat.freq || 3}" data-idx="${idx}" class="st-policy-freq" 
                                        style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">
                                        <i class="fa-solid fa-broom" style="opacity: 0.5; margin-right: 5px;"></i>
                                        最大保留数量 (0=不限制)
                                    </label>
                                    <input type="number" min="0" value="${cat.maxRows || 0}" data-idx="${idx}" class="st-policy-maxrows" 
                                        style="width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 6px;"
                                        title="超过此数量时，会自动删除相同主键中较旧的数据">
                                </div>
                            </div>

                            <!-- Custom Prompt -->
                            <div>
                                <label style="display: block; font-size: 0.75em; color: #666; margin-bottom: 8px;">针对此表的引导 Prompt (告诉 AI 如何提取该表)</label>
                                <textarea data-idx="${idx}" class="st-policy-prompt" 
                                    style="width: 100%; height: 80px; background: #000; border: 1px solid #333; color: #ccc; padding: 12px; border-radius: 8px; font-size: 0.9em; resize: vertical;"
                                    placeholder="例如：只记录当前处于'激活'状态的任务...">${cat.prompt || ""}</textarea>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
  },

  bindEvents(data, onUpdateSchema) {
    const schema = data.config.schema;

    $(".st-policy-freq").on("change", function () {
      schema[$(this).data("idx")].freq = parseInt($(this).val()) || 1;
      onUpdateSchema(schema);
    });

    $(".st-policy-maxrows").on("change", function () {
      schema[$(this).data("idx")].maxRows = parseInt($(this).val()) || 0;
      onUpdateSchema(schema);
      toastr.success("数量限制已更新，将在下次更新时生效");
    });

    $(".st-policy-prompt").on("change", function () {
      schema[$(this).data("idx")].prompt = $(this).val();
      onUpdateSchema(schema);
    });
  },
};
