/**
 * 表格注入器 - 在用户发送消息时自动注入表格数据
 */
export const TableInjector = {
  /**
   * 将表格数据转换为极简文本格式
   * @param {Object} table 表格配置
   * @param {Array} rows 表格数据
   */
  formatTable(table, rows) {
    if (!rows || rows.length === 0) return "";

    const lines = [`【${table.title}】`];

    // 添加字段名作为表头
    const fieldNames = table.fields.map((f) => f.name);
    lines.push(fieldNames.join(" | "));

    // 添加数据行
    rows.forEach((row) => {
      const values = table.fields.map((f) => row[f.key] || "-");
      lines.push(values.join(" | "));
    });

    return lines.join("\n");
  },

  /**
   * 生成所有需要注入的表格内容
   * @param {Array} schema 表格配置列表
   * @param {Object} tables 表格数据
   * @returns {Array} [{depth, content}, ...]
   */
  buildInjectableContent(schema, tables) {
    const injectables = [];

    schema.forEach((cat) => {
      // 只处理启用了注入的表格
      if (cat.injectOnInput !== true) return;

      const tableData = tables[cat.id];
      if (!tableData || tableData.length === 0) return;

      // 根据 injectMaxRows 限制注入数量（0或未设置表示不限制）
      const maxRows = cat.injectMaxRows || 0;
      const dataToInject =
        maxRows > 0 ? tableData.slice(0, maxRows) : tableData;

      const content = this.formatTable(cat, dataToInject);
      if (content) {
        injectables.push({
          depth: cat.injectDepth || 0,
          content: content,
          actualRows: dataToInject.length,
          totalRows: tableData.length,
        });
      }
    });

    return injectables;
  },
};
