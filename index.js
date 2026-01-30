import { SmartTableManager } from "./src/feature/manager.js";

/**
 * SmartTable 插件入口
 */
(function () {
  const manager = new SmartTableManager();

  async function initialize() {
    console.log("[智能表格] 架构启动中...");

    const context = SillyTavern.getContext();
    const { eventSource, event_types } = context;

    // 1. 初始化功能逻辑
    manager.init();

    // 2. 注入 UI 按钮到魔法棒菜单
    eventSource.on(event_types.APP_READY, () => {
      const $menu = $("#extensionsMenu");
      if ($menu.length === 0) return;

      if ($("#smart-table-wand-btn").length > 0) return;

      const buttonHtml = `
            <div id="smart-table-wand-btn" class="list-group-item flex-container flexGap5 interactable" title="智能表格">
                <div class="fa-solid fa-table extensionsMenuExtensionButton"></div>
                <span data-i18n="Smart Table">智能表格</span>
            </div>`;

      $menu.append(buttonHtml);

      // 点击时调用解耦的显示逻辑
      $("#smart-table-wand-btn").on("click", () => {
        manager.show();
      });

      console.log("[智能表格] 插件已就绪（模式：深度解耦）");
    });
  }

  /**
   * 等待全局对象就绪
   */
  const pollST = setInterval(() => {
    if (typeof SillyTavern !== "undefined" && SillyTavern.getContext) {
      clearInterval(pollST);
      initialize();
    }
  }, 100);

  setTimeout(() => clearInterval(pollST), 10000);
})();
