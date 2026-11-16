/**
 * ExcelJS 4.4.0 crashes loading HKDL masters that define tables with autoFilter
 * when filter column count ≠ parsed table columns (see exceljs#1240, PR #2978).
 * Guard parseClose until upstream ships the fix.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TableXform = require("exceljs/lib/xlsx/xform/table/table-xform") as {
  prototype: {
    tag: string;
    parser: unknown;
    map: {
      tableColumns: { model: Array<Record<string, unknown>> };
      autoFilter: {
        model: {
          autoFilterRef: string;
          columns: Array<{ filterButton?: boolean }>;
        } | null;
      };
      tableStyleInfo: { model: unknown };
    };
    model: {
      columns: Array<Record<string, unknown>>;
      autoFilterRef?: string;
      style?: unknown;
    };
    parseClose: (name: string) => boolean;
  };
};

let patched = false;

export function applyExcelJsTableLoadPatch(): void {
  if (patched) return;
  patched = true;

  const proto = TableXform.prototype;

  proto.parseClose = function parseClosePatched(name: string): boolean {
    if (this.parser) {
      if (!(this.parser as { parseClose: (n: string) => boolean }).parseClose(name)) {
        this.parser = undefined;
      }
      return true;
    }
    if (name === this.tag) {
      this.model.columns = this.map.tableColumns.model;
      if (this.map.autoFilter.model) {
        this.model.autoFilterRef = this.map.autoFilter.model.autoFilterRef;
        this.map.autoFilter.model.columns.forEach((column, index) => {
          const target = this.model.columns[index];
          if (target) {
            target.filterButton = column.filterButton;
          }
        });
      }
      this.model.style = this.map.tableStyleInfo.model;
      return false;
    }
    return true;
  };
}