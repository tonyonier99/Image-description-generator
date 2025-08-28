// 以 GitHub（JSON）作為後端資料來源，含 fallback 與路徑生成工具。

const DEFAULT_CATEGORIES = {
  Classic: {
    label: "經典",
    fields: [
      { key: "title", label: "主標題", type: "text", maxLength: 60 },
      { key: "subtitle", label: "副標題", type: "text", maxLength: 120 },
      { key: "accentColor", label: "強調色", type: "color" }
    ]
  },
  Menu: {
    label: "菜單",
    fields: [
      { key: "section", label: "區段標題", type: "text" },
      { key: "items", label: "品項（多行）", type: "textarea" },
      { key: "currency", label: "幣別", type: "select", options: ["$", "NT$", "¥"] }
    ]
  },
  Room: {
    label: "房型",
    fields: [
      { key: "roomType", label: "房型名稱", type: "text" },
      { key: "capacity", label: "入住人數", type: "number", min: 1, max: 10 },
      { key: "amenities", label: "設施（多選）", type: "checkbox-group", options: ["Wi-Fi", "TV", "Mini Bar", "Ocean View"] }
    ]
  },
  BusinessCard: {
    label: "名片",
    fields: [
      { key: "name", label: "姓名", type: "text" },
      { key: "role", label: "職稱", type: "text" },
      { key: "phone", label: "電話", type: "text" },
      { key: "email", label: "Email", type: "text" }
    ]
  }
};

const DEFAULT_MANIFEST = {
  Classic: { templates: 4, empties: 2 },
  Menu: { templates: 3, empties: 1 },
  Room: { templates: 3, empties: 1 },
  BusinessCard: { templates: 2, empties: 1 }
};

async function loadJSON(path) {
  const url = `${path}?v=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export async function loadCategoriesConfig() {
  try {
    return await loadJSON("config/categories.config.json");
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export async function loadTemplatesManifest() {
  try {
    return await loadJSON("config/templates.manifest.json");
  } catch {
    return DEFAULT_MANIFEST;
  }
}

/**
 * 依命名規範產生檔名與路徑
 * - 範本：<Category>_<i>
 * - 底圖：<Category>_Empty_<i>
 * 建議目錄：
 * - assets/templates/<Category>/*.png(jpg)
 * - assets/templates/<Category>/empty/*.png(jpg)
 */
export function buildTemplatePaths(category, manifest, options = {}) {
  const { baseDir = "assets/templates", ext = "png" } = options;
  const info = manifest[category];
  if (!info) return { templates: [], empties: [] };

  const templates = Array.from({ length: info.templates }, (_, i) => {
    const n = i + 1;
    return `${baseDir}/${category}/${category}_${n}.${ext}`;
  });

  const empties = Array.from({ length: info.empties }, (_, i) => {
    const n = i + 1;
    return `${baseDir}/${category}/empty/${category}_Empty_${n}.${ext}`;
  });

  return { templates, empties };
}

// localStorage 保存目前選擇的類別
const LS_KEY = "idg:selectedCategory";
export function saveSelectedCategory(category) {
  try {
    localStorage.setItem(LS_KEY, category);
  } catch {}
}
export function loadSelectedCategory(defaultValue = "Classic") {
  try {
    return localStorage.getItem(LS_KEY) || defaultValue;
  } catch {
    return defaultValue;
  }
}
