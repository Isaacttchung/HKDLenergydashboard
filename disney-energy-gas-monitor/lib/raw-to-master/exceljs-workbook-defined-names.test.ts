import assert from "node:assert/strict";
import { test } from "node:test";
import { patchFilterDatabaseDefinedName } from "@/lib/raw-to-master/exceljs-workbook-defined-names";

const sampleWb = `<?xml version="1.0"?>
<workbook>
  <sheets>
    <sheet name="Charts" sheetId="1" r:id="rId1"/>
    <sheet name="WebSS_Data" sheetId="2" r:id="rId2"/>
  </sheets>
  <definedNames>
    <definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">WebSS_Data!$A$1:$B$301</definedName>
  </definedNames>
</workbook>`;

test("patchFilterDatabaseDefinedName extends filter range to sheet dimension", () => {
  const out = patchFilterDatabaseDefinedName(
    sampleWb,
    "WebSS_Data",
    "A1:CCO301",
  );
  assert.match(
    out,
    /_FilterDatabase" localSheetId="1"[^>]*>WebSS_Data!\$A\$1:\$CCO\$301<\/definedName>/,
  );
});

test("patchFilterDatabaseDefinedName extends row span when columns already match", () => {
  const wb = `<?xml version="1.0"?><workbook><sheets>
    <sheet name="CCP" sheetId="1" r:id="rId1"/>
  </sheets><definedNames>
    <definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">CCP!$A$1:$J$2367</definedName>
  </definedNames></workbook>`;
  const out = patchFilterDatabaseDefinedName(wb, "CCP", "A1:I3057");
  assert.ok(out.includes("CCP!$A$1:$I$3057"));
});