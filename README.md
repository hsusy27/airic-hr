# AIRIC 新聘人員進用資格審核與簽呈生成系統
> 人工智慧暨機器人創新中心 (Artificial Intelligence and Robotics Innovation Center, AIRIC)

本系統提供新聘人員學經歷與研究成果之自動化審核，並自動產出標準院內聘任簽呈或補件通知。

## 🌟 系統特色

- **Nintendo Systems 現代極簡風格**：採用高對比紅黑白配色、俐落卡片佈局與圓角膠囊設計。
- **雙軌審核機制**：
  - **在地規則引擎**：預設免設定即可進行即時條件比對與公文生成。
  - **Gemini LLM 智慧語意引擎**：輸入 API Key 後，可啟動語意比對與 PDF 內文自動抽詞。
- **多種聘任類別支援**：動態帶入 **院聘 (本院編制)** 或 **深耕計畫聘 (高教深耕專案)** 之經費來源與法規條文。
- **個資保護與安全部署**：所有資料解析與 API 金鑰皆儲存於使用者本機瀏覽器 (`LocalStorage`)，極適合部署於 GitHub Pages。

---

## 📂 專案檔案結構

```text
├── assets/                  # 靜態資源目錄
│   └── AIRIC_Logo.png       # 中心標準識別標誌 (請將 AIRIC_Logo_0826_終_標準版.png 放入並更名)
├── index.html               # 系統主程式頁面
├── build.html               # 專案建置與驗證頁面
├── style.css                # 系統客製化樣式表
└── README.md                # 專案說明文件