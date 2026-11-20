import { request } from "./client";

const barcodeCache = new Map();

export const fetchAuditPresets = async () => {
  const presets = await request("/api/audit/presets");
  // Silently warm up cache for the 5 preset samples in background
  setTimeout(() => {
    presets.forEach((p) => {
      if (p.barcode && !barcodeCache.has(p.barcode)) {
        request(`/api/audit/barcode/${encodeURIComponent(p.barcode)}`)
          .then((res) => barcodeCache.set(p.barcode, res))
          .catch(() => {});
      }
    });
  }, 100);
  return presets;
};

export const lookupBarcode = async (barcode) => {
  const key = String(barcode).trim();
  if (barcodeCache.has(key)) {
    return barcodeCache.get(key);
  }
  const result = await request(`/api/audit/barcode/${encodeURIComponent(key)}`);
  barcodeCache.set(key, result);
  return result;
};

export const auditPackagingPhoto = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/audit/photo", {
    method: "POST",
    form: formData,
  });
};

export const logPackagedFoodToDiary = (payload) =>
  request("/api/audit/log", {
    method: "POST",
    body: payload,
  });
