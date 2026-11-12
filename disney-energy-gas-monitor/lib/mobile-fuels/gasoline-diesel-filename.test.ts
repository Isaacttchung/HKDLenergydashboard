import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMobileGasolineDieselUploadFilename,
  MOBILE_GASOLINE_DIESEL_UPLOAD_SUFFIX,
} from "./gasoline-diesel-filename";

describe("isMobileGasolineDieselUploadFilename", () => {
  it("accepts varying FY prefixes", () => {
    assert.equal(
      isMobileGasolineDieselUploadFilename(
        `FY20-26_Mobile_Gasoline_Diesel_data_sent.xlsx`,
      ),
      true,
    );
    assert.equal(
      isMobileGasolineDieselUploadFilename(
        `FY99-00${MOBILE_GASOLINE_DIESEL_UPLOAD_SUFFIX}`,
      ),
      true,
    );
  });

  it("rejects unrelated workbooks", () => {
    assert.equal(isMobileGasolineDieselUploadFilename("HKDL_Top_10.xlsx"), false);
    assert.equal(
      isMobileGasolineDieselUploadFilename("Mobile_Gasoline_Diesel.xlsx"),
      false,
    );
  });
});
