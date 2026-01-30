/**
 * 视图页面 - 负责展示结构化表格数据
 */
export const ViewPage = {
  render(data) {
    const schema = data.config.schema || [];
    const tables = data.tables || {};

    return `
            <div style="animation: fadeIn 0.3s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-weight: 300;">实时数据看板</h2>
                    <button id="st-manual-refresh" style="background: rgba(85, 136, 255, 0.1); border: 1px solid #5588ff; color: #5588ff; padding: 10px 20px; border-radius: 10px; cursor: pointer; font-size: 0.9em; display: flex; align-items: center; gap: 8px; transition: 0.3s;">
                        <i class="fa-solid fa-wand-sparkles"></i>
                        <span>全局刷新</span>
                    </button>
                </div>

                <!-- 楼层信息条 -->
                <div style="background: rgba(40,40,50,0.3); padding: 15px 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; gap: 30px; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #888; font-size: 0.85em;">当前楼层:</span>
                            <span style="color: #5588ff; font-weight: 600; font-size: 1.1em;">${data.currentFloor || 0}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #888; font-size: 0.85em;">起始楼层:</span>
                            <input type="number" id="st-base-floor" value="${data.baseFloor || 0}" min="0" 
                                style="width: 80px; background: #000; border: 1px solid #333; color: #fff; padding: 6px 10px; border-radius: 6px; text-align: center; font-size: 0.9em;">
                            <button id="st-set-base-floor" style="background: rgba(85,136,255,0.1); border: 1px solid #5588ff; color: #5588ff; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
                                设为起始
                            </button>
                        </div>
                        <div style="color: #666; font-size: 0.85em;">
                            已过 <span style="color: #ddd; font-weight: 600;">${Math.max(0, (data.currentFloor || 0) - (data.baseFloor || 0))}</span> 层
                        </div>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 30px;">
                    ${schema
                      .map(
                        (cat) => `
                        <div class="st-view-card" data-tid="${cat.id}" style="background: rgba(30,30,40,0.4); border-radius: 16px; padding: 25px; border: 1px solid rgba(255, 255, 255, 0.05);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <h3 style="margin: 0; font-size: 1.1em; color: #5588ff; letter-spacing: 1px;">${cat.title}</h3>
                                    <button class="st-add-row-btn" data-tid="${cat.id}" style="background: rgba(85,255,85,0.1); border: 1px solid rgba(85,255,85,0.3); color: #55ff55; width: 24px; height: 24px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8em; transition: 0.2s;" title="新增行">
                                        <i class="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                                <div style="font-size: 0.75em; color: #555; background: rgba(0,0,0,0.2); padding: 4px 10px; border-radius: 20px;">
                                    Auto-Sync: ${cat.freq} msgs
                                </div>
                            </div>
                            
                            <!-- Responsive Table -->
                            <div style="overflow-x: auto;">
                                <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
                                    <thead>
                                        <tr style="border-bottom: 2px solid rgba(255,255,255,0.05); text-align: left;">
                                            ${(cat.fields || [])
                                              .map(
                                                (f) => `
                                                <th style="padding: 12px; color: #777; font-size: 0.8em; text-transform: uppercase;">${f.name}</th>
                                            `,
                                              )
                                              .join("")}
                                            <th style="padding: 12px; color: #777; font-size: 0.8em; width: 80px; text-align: right;">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${this.renderTableRows(cat, tables[cat.id])}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            </div>
        `;
  },

  renderTableRows(cat, rows) {
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="${(cat.fields || []).length + 1}" style="padding: 30px; text-align: center; color: #444;">等待 AI 提取...</td></tr>`;
    }

    return rows
      .map(
        (row, rowIdx) => `
            <tr class="st-data-row" data-tid="${cat.id}" data-ridx="${rowIdx}" style="border-bottom: 1px solid rgba(255,255,255,0.02); transition: 0.2s; group">
                ${(cat.fields || [])
                  .map(
                    (f) => `
                    <td style="padding: 15px 12px; color: #ddd; font-size: 0.95em; vertical-align: top;">
                        <div class="st-cell-val" data-fkey="${f.key}">${typeof row === "object" ? row[f.key] || "-" : f.key === "content" ? row : "-"}</div>
                    </td>
                `,
                  )
                  .join("")}
                <td style="padding: 15px 12px; text-align: right; vertical-align: middle;">
                    <div style="display: flex; gap: 10px; justify-content: flex-end; opacity: 0.4; transition: 0.2s;" class="st-row-actions">
                        <i class="fa-solid fa-pen-to-square st-edit-row" style="cursor: pointer; color: #5588ff;" title="编辑"></i>
                        <i class="fa-solid fa-trash st-delete-row" style="cursor: pointer; color: #ff5555;" title="删除"></i>
                    </div>
                </td>
            </tr>
        `,
      )
      .join("");
  },

  bindEvents(callbacks) {
    // 全局刷新
    const $btn = $("#st-manual-refresh");
    $btn.off("click").on("click", async (e) => {
      e.preventDefault();
      console.log("[SmartTable] 用户手动触发提取...");
      $btn
        .prop("disabled", true)
        .css("opacity", "0.6")
        .find("span")
        .text("正在同步...");
      try {
        await callbacks.onManualRefresh();
      } catch (err) {
        console.error("[SmartTable] 提取失败:", err);
        toastr.error("核心逻辑执行异常");
      } finally {
        $btn
          .prop("disabled", false)
          .css("opacity", "1")
          .find("span")
          .text("全局刷新");
      }
    });

    // 设置起始楼层
    $("#st-set-base-floor")
      .off("click")
      .on("click", () => {
        const inputVal = parseInt($("#st-base-floor").val()) || 0;
        callbacks.onSetBaseFloor(inputVal);
      });

    // 悬浮显示操作按钮
    $(".st-data-row").hover(
      function () {
        $(this).find(".st-row-actions").css("opacity", "1");
      },
      function () {
        $(this).find(".st-row-actions").css("opacity", "0.4");
      },
    );

    // 删除行
    $(".st-delete-row")
      .off("click")
      .on("click", function (e) {
        const $row = $(this).closest(".st-data-row");
        const tid = $row.data("tid");
        const ridx = $row.data("ridx");
        if (confirm("确定要删除这一条数据吗？")) {
          callbacks.onDeleteRow(tid, ridx);
        }
      });

    // 新增行
    $(".st-add-row-btn")
      .off("click")
      .on("click", function () {
        const tid = $(this).data("tid");
        callbacks.onAddRow(tid);
      });

    // 编辑行
    $(".st-edit-row")
      .off("click")
      .on("click", function () {
        const $row = $(this).closest(".st-data-row");
        const tid = $row.data("tid");
        const ridx = $row.data("ridx");
        const rowData = {};
        $row.find(".st-cell-val").each(function () {
          rowData[$(this).data("fkey")] = $(this).text();
        });
        callbacks.onEditRow(tid, ridx, rowData);
      });
  },
};
