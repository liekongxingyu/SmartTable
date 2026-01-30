/**
 * 数据清理器 - 负责管理表格数据的数量限制
 */
export const DataCleaner = {
  /**
   * 清理超出数量限制的表格数据
   * @param {Object} tables - 所有表格数据 {tableId: [...rows]}
   * @param {Array} schema - 表格配置列表
   * @returns {Object} 清理后的表格数据
   */
  cleanTables(tables, schema) {
    const cleanedTables = {};
    const cleanReport = [];

    schema.forEach((cat) => {
      const tableId = cat.id;
      const rows = tables[tableId] || [];
      const maxRows = cat.maxRows;

      // 如果未设置限制或数据未超限，直接保留
      if (!maxRows || maxRows <= 0 || rows.length <= maxRows) {
        cleanedTables[tableId] = rows;
        return;
      }

      // 获取主键字段（第一个字段）
      const primaryKeyField = cat.fields?.[0]?.key;

      if (!primaryKeyField) {
        // 无主键：简单截取最新的 maxRows 条
        cleanedTables[tableId] = rows.slice(0, maxRows);
        cleanReport.push({
          tableId: cat.title,
          removed: rows.length - maxRows,
          strategy: "simple-truncate",
        });
        return;
      }

      // 有主键：按 key 分组，保留最新的记录
      const groupedByKey = new Map();

      // 从前往后遍历（假设前面是最新的）
      rows.forEach((row, index) => {
        const keyValue = row[primaryKeyField];
        if (keyValue !== undefined) {
          if (!groupedByKey.has(keyValue)) {
            groupedByKey.set(keyValue, { row, index });
          }
          // 如果 key 已存在，保留索引较小的（较新的）
        }
      });

      // 转换为数组并排序（保持原顺序）
      const uniqueRows = Array.from(groupedByKey.values())
        .sort((a, b) => a.index - b.index)
        .map((item) => item.row);

      // 截取到最大数量
      const finalRows = uniqueRows.slice(0, maxRows);
      cleanedTables[tableId] = finalRows;

      const removedDuplicates = rows.length - uniqueRows.length;
      const removedByLimit = uniqueRows.length - finalRows.length;

      if (removedDuplicates > 0 || removedByLimit > 0) {
        cleanReport.push({
          tableId: cat.title,
          removedDuplicates,
          removedByLimit,
          strategy: "key-based-dedup",
        });
      }
    });

    // 输出清理报告
    if (cleanReport.length > 0) {
      console.log(`🧹 [DataCleaner] 数据清理报告:`);
      cleanReport.forEach((report) => {
        if (report.strategy === "simple-truncate") {
          console.log(
            `   [${report.tableId}] 简单截取：删除 ${report.removed} 条旧数据`,
          );
        } else {
          const parts = [];
          if (report.removedDuplicates > 0) {
            parts.push(`去重删除 ${report.removedDuplicates} 条`);
          }
          if (report.removedByLimit > 0) {
            parts.push(`超限删除 ${report.removedByLimit} 条`);
          }
          console.log(
            `   [${report.tableId}] 基于主键清理：${parts.join(", ")}`,
          );
        }
      });
    }

    return cleanedTables;
  },

  /**
   * 清理单个表格
   * @param {Array} rows - 表格数据行
   * @param {Object} tableConfig - 表格配置
   * @returns {Array} 清理后的数据行
   */
  cleanSingleTable(rows, tableConfig) {
    const tempTables = { [tableConfig.id]: rows };
    const cleaned = this.cleanTables(tempTables, [tableConfig]);
    return cleaned[tableConfig.id] || [];
  },
};
