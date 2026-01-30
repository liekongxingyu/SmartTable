import { ViewPage } from "./view-page.js";
import { TemplatePage } from "./template-page.js";
import { EditorPage } from "./editor-page.js";
import { SettingsPage } from "./settings-page.js";
import { Modal } from "./modal.js";

export const Renderer = {
  panelId: "smart-table-floating-panel",
  currentTab: "view",

  toggle(data, callbacks) {
    let $panel = $(`#${this.panelId}`);
    if ($panel.length > 0) {
      $panel.remove();
    } else {
      this.render(data, callbacks);
    }
  },

  render(data, callbacks) {
    const html = `
        <div id="${this.panelId}" style="
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 900px; height: 700px; background: rgba(10, 10, 15, 0.99);
            backdrop-filter: blur(50px); border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 28px; box-shadow: 0 40px 100px rgba(0,0,0,0.95);
            color: #fff; z-index: 10002; display: flex; overflow: hidden;
            font-family: 'Inter', system-ui;
        ">
            <!-- Close -->
            <div id="${this.panelId}-close" style="position: absolute; top: 30px; right: 35px; font-size: 1.8em; cursor: pointer; opacity: 0.3; transition: 0.3s; z-index: 10;">
                <i class="fa-solid fa-xmark"></i>
            </div>

            <!-- Sidebar -->
            <div style="width: 85px; background: rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; padding: 40px 0; border-right: 1px solid rgba(255,255,255,0.03); flex-shrink: 0;">
                <div class="st-tab-btn" data-tab="view" style="margin-bottom: 40px; font-size: 1.6em; cursor: pointer; opacity: ${this.currentTab === "view" ? "1" : "0.3"};" title="看板">
                    <i class="fa-solid fa-gauge-high"></i>
                </div>
                <div class="st-tab-btn" data-tab="template" style="margin-bottom: 40px; font-size: 1.6em; cursor: pointer; opacity: ${this.currentTab === "template" ? "1" : "0.3"};" title="模板">
                    <i class="fa-solid fa-table-columns"></i>
                </div>
                <div class="st-tab-btn" data-tab="editor" style="margin-bottom: 40px; font-size: 1.6em; cursor: pointer; opacity: ${this.currentTab === "editor" ? "1" : "0.3"};" title="策略">
                    <i class="fa-solid fa-bolt-lightning"></i>
                </div>
                <div class="st-tab-btn" data-tab="settings" style="margin-bottom: 40px; font-size: 1.6em; cursor: pointer; opacity: ${this.currentTab === "settings" ? "1" : "0.3"};" title="设置">
                    <i class="fa-solid fa-cog"></i>
                </div>
            </div>

            <!-- Body -->
            <div id="${this.panelId}-body" style="flex: 1; padding: 60px; overflow-y: auto;">
                ${this.renderCurrentTab(data)}
            </div>
        </div>`;

    $("body").append(html);
    this.initCoreEvents(data, callbacks);
  },

  initCoreEvents(data, callbacks) {
    $(`#${this.panelId}-close`).on("click", () =>
      $(`#${this.panelId}`).remove(),
    );

    $(".st-tab-btn").on("click", (e) => {
      this.currentTab = $(e.currentTarget).data("tab");
      $(".st-tab-btn").css("opacity", "0.3");
      $(e.currentTarget).css("opacity", "1");

      // 切换标签页时，调用回调获取最新数据
      if (callbacks.onTabSwitch) {
        const freshData = callbacks.onTabSwitch();
        this.refresh(freshData, callbacks);
      } else {
        // 向后兼容
        this.refresh(data, callbacks);
      }
    });
    this.bindTabEvents(data, callbacks);
  },

  renderCurrentTab(data) {
    switch (this.currentTab) {
      case "view":
        return ViewPage.render(data);
      case "template":
        return TemplatePage.render(data);
      case "editor":
        return EditorPage.render(data);
      case "settings":
        return SettingsPage.render(data);
      default:
        return "";
    }
  },

  bindTabEvents(data, callbacks) {
    switch (this.currentTab) {
      case "view":
        ViewPage.bindEvents({
          onManualRefresh: () => callbacks.onManualRefresh(this),
          onSetBaseFloor: (floor) => callbacks.onSetBaseFloor(floor, this),
          onAddRow: (tid) => callbacks.onAddRow(tid, this),
          onEditRow: (tid, ridx, data) =>
            callbacks.onEditRow(tid, ridx, data, this),
          onDeleteRow: (tid, ridx) => callbacks.onDeleteRow(tid, ridx, this),
        });
        break;
      case "template":
        TemplatePage.bindEvents(data, callbacks.onUpdateSchema, () =>
          this.refresh(data, callbacks),
        );
        break;
      case "editor":
        EditorPage.bindEvents(data, callbacks.onUpdateSchema);
        break;
      case "settings":
        SettingsPage.bindEvents(
          callbacks.onSaveSettings,
          data.config,
          callbacks.onUpdateSchema,
        );
        break;
    }
  },

  refresh(data, callbacks) {
    $(`#${this.panelId}-body`).html(this.renderCurrentTab(data));
    this.bindTabEvents(data, callbacks);
  },
};
