/**
 * AIRIC 新聘人員進用資格審核與簽呈生成系統
 * ------------------------------------------------
 * 檔案結構：
 *   1. 全域狀態
 *   2. 職位進用門檻範本
 *   3. 檔案上傳與解析（PDF / 圖片 OCR 交由 Gemini 視覺辨識）
 *   4. 去識別化引擎
 *   5. Gemini API 呼叫
 *   6. 資格審核主流程
 *   7. UI：分頁切換 / API Key 設定彈窗 / 初始化
 */

/* ===========================================================
   1. 全域狀態
   =========================================================== */
let aiAttachments = []; // 待送給 Gemini 視覺引擎的 PDF / 圖片附件（base64）

/* ===========================================================
   2. 職位進用門檻範本
   =========================================================== */
const templates = {
  rd_engineer: `【研發工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 3 年以上研究工作經驗。\n- 成果：需具4件資料處理開發相關作品成果。\n- 非相關系所：軟體開發或專案資料處理經驗5年。`,
  deputy_rd: `【副研發工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 2 年以上研究工作經驗。\n- 成果：需具2件資料處理開發相關作品成果。\n- 非相關系所：軟體開發或專案資料處理經驗3年。`,
  assistant_rd: `【助理研發工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 0 年以上研究工作經驗。\n- 成果：需具0件資料處理開發相關作品成果。\n- 非相關系所：軟體開發或專案資料處理經驗2年。`,
  algo_engineer: `【演算法工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 5 年以上研究工作經驗。\n- 成果：需具4件資料處理開發相關作品成果或巨量資料處理相關作品。\n- 推薦：獲兩位中心6職等工程師推薦。`,
  deputy_engineer: `【副演算法工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 3 年以上研究工作經驗。\n- 成果：需具3件資料處理開發相關作品成果或巨量資料處理相關作品。\n- 推薦：獲兩位中心6職等工程師推薦。`,
  assistant_engineer: `【助理演算法工程師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 經歷：具備 1 年以上研究工作經驗。\n- 成果：需具2件資料處理開發相關作品成果或巨量資料處理相關作品。\n- 推薦：獲兩位中心6職等工程師推薦。`,
  clinical_data_analyst: `【臨床數據分析師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士(含)以上學位。\n- 非相關系所：臨床相關經驗或資料統計處理經驗2年。`,
  junior_clinical_analyst: `【初級臨床數據分析師進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所學士(含)以上學位。\n- 非相關系所：臨床相關經驗或資料統計處理經驗1年。`,
  senior_data_scientist: `【高階應用資料科學家進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所博士學位。\n- 經歷：具備 5 年以上研究工作經驗。\n- 成果：相關文獻論文發表4篇。`,
  mid_data_scientist: `【應用資料科學家進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所博士學位。\n- 經歷：具備 3 年以上研究工作經驗。\n- 成果：相關文獻論文發表3篇。`,
  junior_data_scientist: `【初階應用資料科學家進用規範】\n- 學歷：國內外理科、工科、商科、數理、資訊、統計、生醫及相關系所碩士學位。\n- 經歷：具備 1 年以上研究工作經驗。\n- 成果：相關文獻論文發表2篇。`,
  "Assistant_QA RA Engineer": `【助理法規品管工程師進用規範】\n- 學歷：國內外物統計、統計、應用統計、公共衛生、流行病學與預防醫學、公衛所生物統計組、數學、應用數學、生物醫學資訊、精準醫學、生物醫學工程、醫學工程、藥學、化學工程、應用化學、工業工程與管理、生物科技、生命科學、法律、科技法律、藥品與醫材法規科學學位學程、公共衛生、護理、醫學檢驗暨生物技術、醫學影像暨放射科學、呼吸治療等相關系所學士學位。\n- 非相關系所：相關工作經驗1年。\n- 經歷：無工作經驗。\n- 成果：專案報告、論文、競賽、專利、或醫材證1份。`,
  "deputy_QA/RA Engineer": `【副法規品管工程師進用規範】\n- 學歷：國內外物統計、統計、應用統計、公共衛生、流行病學與預防醫學、公衛所生物統計組、數學、應用數學、生物醫學資訊、精準醫學、生物醫學工程、醫學工程、藥學、化學工程、應用化學、工業工程與管理、生物科技、生命科學、法律、科技法律、藥品與醫材法規科學學位學程、公共衛生、護理、醫學檢驗暨生物技術、醫學影像暨放射科學、呼吸治療等相關系所碩士學位。\n- 非相關系所：相關工作經驗3年。\n- 經歷：無工作經驗。\n- 成果：專案報告、論文、競賽、專利、或醫材證3份。`,
  "QA/RA Engineer": `【法規品管工程師進用規範】\n- 學歷：國內外物統計、統計、應用統計、公共衛生、流行病學與預防醫學、公衛所生物統計組、數學、應用數學、生物醫學資訊、精準醫學、生物醫學工程、醫學工程、藥學、化學工程、應用化學、工業工程與管理、生物科技、生命科學、法律、科技法律、藥品與醫材法規科學學位學程、公共衛生、護理、醫學檢驗暨生物技術、醫學影像暨放射科學、呼吸治療等相關系所碩士學位。\n- 非相關系所：相關工作經驗6年。\n- 經歷：需相關工作經驗4年。\n- 成果：專案報告、論文、競賽、專利、或醫材證5份。`,
  "Senior_QA/RA Engineer": `【資深法規品管工程師進用規範】\n- 學歷：國內外物統計、統計、應用統計、公共衛生、流行病學與預防醫學、公衛所生物統計組、數學、應用數學、生物醫學資訊、精準醫學、生物醫學工程、醫學工程、藥學、化學工程、應用化學、工業工程與管理、生物科技、生命科學、法律、科技法律、藥品與醫材法規科學學位學程、公共衛生、護理、醫學檢驗暨生物技術、醫學影像暨放射科學、呼吸治療等相關系所碩士學位。\n- 非相關系所：相關工作經驗9年。\n- 經歷：需相關工作經驗7年。\n- 成果：專案報告、論文、競賽、專利、或醫材證7份。`,
  "high Senior_QA/RA Engineer": `【高級法規品管工程師進用規範】\n- 學歷：國內外物統計、統計、應用統計、公共衛生、流行病學與預防醫學、公衛所生物統計組、數學、應用數學、生物醫學資訊、精準醫學、生物醫學工程、醫學工程、藥學、化學工程、應用化學、工業工程與管理、生物科技、生命科學、法律、科技法律、藥品與醫材法規科學學位學程、公共衛生、護理、醫學檢驗暨生物技術、醫學影像暨放射科學、呼吸治療等相關系所碩士學位。\n- 非相關系所：相關工作經驗12年。\n- 經歷：需相關工作經驗10年。\n- 成果：專案報告、論文、競賽、專利、或醫材證9份。`,
  pm: `【醫療 AI 專案經理進用規範】\n- 學歷：國內外醫管、資訊管理、商管相關碩士學位。\n- 經歷：具備 3 年以上醫療資訊系統、AI 專案管理或驗證經驗。\n- 成果：主導完成醫療 AI 軟體上線或衛福部 TFDA 認證經驗證明 1 件。`,
  custom: `請在此自訂您中心欲設定之人員進用條件門檻...`
};

function loadRoleTemplate() {
  const val = document.getElementById('roleSelect').value;
  document.getElementById('rulesInput').value = templates[val] || '';
}

/* ===========================================================
   3. 檔案上傳與解析
   =========================================================== */
function handleDrop(e) {
  e.preventDefault();
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileUpload(e.dataTransfer.files);
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
}

function processFile(file, index) {
  return new Promise((resolve) => {
    if (file.type === 'application/pdf') {
      const fileReader = new FileReader();
      fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);
        pdfjsLib
          .getDocument(typedarray)
          .promise.then((pdf) => {
            const pagePromises = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              pagePromises.push(pdf.getPage(i).then((page) => page.getTextContent()));
            }
            Promise.all(pagePromises)
              .then((contents) => {
                let text = contents.map((c) => c.items.map((item) => item.str).join(' ')).join(' ');
                text = text.trim() ? text.slice(0, 1000) : '[掃描檔/影像PDF，系統已自動交由 AI 視覺辨識處理]';
                resolve(`--- 【附件 ${index + 1}: ${file.name} 內文】 ---\n${text}\n`);
              })
              .catch(() => resolve(`--- 【附件 ${index + 1}: ${file.name} 內文】 ---\n[PDF 解析失敗]\n`));
          })
          .catch(() => resolve(`--- 【附件 ${index + 1}: ${file.name} 內文】 ---\n[PDF 讀取失敗]\n`));
      };
      fileReader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(`--- 【附件 ${index + 1}: ${file.name} 內文】 ---\n${e.target.result}\n`);
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      resolve(`--- 【附件 ${index + 1}: ${file.name} 圖檔】 ---\n[圖片檔已上傳，系統將自動交由 AI 視覺辨識處理]\n`);
    } else {
      resolve(`--- 【附件 ${index + 1}: ${file.name} 檔案】 ---\n[已載入此檔案]\n`);
    }
  });
}

async function handleFileUpload(files) {
  if (!files.length) return;
  const fileListContainer = document.getElementById('fileList');
  fileListContainer.innerHTML = '';
  const fileArray = Array.from(files);

  aiAttachments = []; // 每次上傳新檔案時清空舊紀錄

  fileArray.forEach((file, index) => {
    const item = document.createElement('div');
    item.innerText = `📄 [附件 ${index + 1}] ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    fileListContainer.appendChild(item);
  });

  document.getElementById('candidateInput').value = '正在依序解析檔案內容，請稍候...';

  // 處理顯示在畫面上的文字預覽
  const promises = fileArray.map((file, idx) => processFile(file, idx));
  const results = await Promise.all(promises);
  document.getElementById('candidateInput').value = results.join('\n');

  // 把 PDF 與圖片打包準備送給 Gemini 視覺引擎
  for (const file of fileArray) {
    if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
      try {
        const base64Data = await fileToBase64(file);
        aiAttachments.push({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      } catch (e) {
        console.error('檔案轉換給 AI 失敗:', e);
      }
    }
  }
}

/* ===========================================================
   4. 去識別化引擎
   =========================================================== */

// 對 text 套用 regex，將命中內容取代為 label，並統計命中次數寫入 counts[key]
function maskCount(text, regex, label, counts, key) {
  let n = 0;
  const out = text.replace(regex, () => {
    n++;
    return label;
  });
  if (n > 0) counts[key] = (counts[key] || 0) + n;
  return out;
}

// 讀取「遮蔽項目設定」checkbox 狀態；若找不到該元素，預設為啟用
function anonOptionEnabled(id) {
  const el = document.getElementById(id);
  return el ? el.checked : true;
}

function anonymizeInputText() {
  const inputArea = document.getElementById('candidateInput');
  let text = inputArea.value;

  if (!text || text.trim() === '') {
    alert('請先輸入或上傳應徵者資料/面試紀錄表！');
    return;
  }

  const counts = {};

  // 4-1. 身分證字號 / 居留證號碼（含2021新式統一證號，第2碼為 1289）/ 健保卡號
  if (anonOptionEnabled('anonOptId')) {
    text = maskCount(text, /[A-Za-z][1289]\d{8}/g, '[身分證/居留證字號已遮蔽]', counts, '身分證/居留證/健保卡號');
    text = maskCount(text, /[A-Za-z]{2}\d{8}/g, '[居留證字號已遮蔽]', counts, '身分證/居留證/健保卡號');
    text = maskCount(text, /\b\d{12}\b/g, '[健保卡號已遮蔽]', counts, '身分證/居留證/健保卡號');
  }

  // 4-2. Email
  if (anonOptionEnabled('anonOptEmail')) {
    text = maskCount(text, /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[Email已遮蔽]', counts, 'Email');
  }

  // 4-3. 電話（手機需先比對，避免被市話規則提前吃掉部分字元）
  if (anonOptionEnabled('anonOptPhone')) {
    text = maskCount(text, /09\d{2}[\s-]?\d{3}[\s-]?\d{3}/g, '[手機號碼已遮蔽]', counts, '手機/電話');
    text = maskCount(text, /\(?0[2-9]\)?[\s-]?\d{3,4}[\s-]?\d{4}/g, '[電話號碼已遮蔽]', counts, '手機/電話');
  }

  // 4-4. 出生年月日（西元/民國多種分隔符號 + 英文日期格式）
  if (anonOptionEnabled('anonOptBirth')) {
    text = maskCount(text, /\d{2,4}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}[日]?/g, '[生日日期已遮蔽]', counts, '出生年月日');
    text = maskCount(
      text,
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
      '[Date of Birth Masked]',
      counts,
      '出生年月日'
    );
  }

  // 4-5. 通訊地址（台灣縣市/鄉鎮區/路街門牌 heuristic 比對，非 100% 涵蓋）
  if (anonOptionEnabled('anonOptAddress')) {
    text = maskCount(
      text,
      /[\u4e00-\u9fa5]{2,3}[市縣][\u4e00-\u9fa5]{1,4}[區鄉鎮市][\u4e00-\u9fa50-9]{0,20}?(?:路|街|大道)[\u4e00-\u9fa50-9]{0,10}?\d{1,4}號(?:之\d{1,3})?(?:\d{1,3}樓)?/g,
      '[通訊地址已遮蔽]',
      counts,
      '通訊地址'
    );
  }

  // 4-6. LINE ID / 微信 / IG / FB 等社群帳號
  if (anonOptionEnabled('anonOptSocial')) {
    text = maskCount(
      text,
      /(?:LINE\s*ID|微信|WeChat|IG帳號|Instagram|FB|Facebook)[:：]?\s*[A-Za-z0-9_.\-]{2,30}/gi,
      '[社群帳號已遮蔽]',
      counts,
      'LINE/社群帳號'
    );
  }

  // 4-7. 姓名（優先比對「應徵者姓名」欄位的精確字串 + 常見中文稱謂 heuristic）
  if (anonOptionEnabled('anonOptName')) {
    const name = (document.getElementById('candidateName').value || '').trim();
    const isPlaceholder = !name || /^O+(\s*O+)*$/i.test(name);
    if (!isPlaceholder && name.length >= 2) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = maskCount(text, new RegExp(escaped, 'g'), '[姓名已遮蔽]', counts, '姓名');
    }
    text = maskCount(text, /[\u4e00-\u9fa5]{1,3}(?:先生|小姐|女士|君)/g, '[姓名已遮蔽]', counts, '姓名');
  }

  inputArea.value = text;
  document.getElementById('anonOutput').value = text;

  // 更新摘要文字，讓承辦人員可以快速確認本次遮蔽了哪些類別/筆數
  const summaryEl = document.getElementById('anonSummaryText');
  if (summaryEl) {
    const entries = Object.entries(counts);
    if (entries.length > 0) {
      summaryEl.innerText = '🔒 已自動遮蔽：' + entries.map(([k, v]) => `${k} x${v}`).join('、') + '（下載前請再次人工複查）';
    } else {
      summaryEl.innerText = '🔒 系統已掃描全文，本次未偵測到可自動辨識的敏感個資（仍請人工複查後再下載）。';
    }
  }

  switchTab('anon');
}

function downloadAnonymizedFile() {
  const text = document.getElementById('anonOutput').value;
  if (!text || text.trim() === '') {
    alert('沒有可下載的內容！請先執行去識別化。');
    return;
  }

  const candidateName = document.getElementById('candidateName').value || '應徵者';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  a.href = url;
  a.download = `${candidateName}_去識別化資料.txt`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ===========================================================
   5. Gemini API 呼叫
   =========================================================== */
async function callGeminiAPI(apiKey, prompt, attachments = []) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const parts = [{ text: prompt }];

  if (attachments.length > 0) {
    parts.push(...attachments);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await response.json();

    if (!response.ok) {
      // 在 Console 詳細印出 Google API 回傳的完整錯誤訊息
      console.error('Gemini API Error Detail:', data);
      throw new Error(data.error?.message || `HTTP 錯誤：${response.status}`);
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Fetch Exception:', error);
    alert('Gemini AI 連線失敗：' + error.message);
    return null;
  }
}

/* ===========================================================
   6. 資格審核主流程
   =========================================================== */
async function executeAudit() {
  const name = document.getElementById('candidateName').value || '應徵者';
  const surname = name.length > 0 ? name.charAt(0) : '該'; // 自動抓取第一個字作為姓氏

  const dept = document.getElementById('candidateDept').value || '人工智慧暨機器人創新中心';
  const type = document.getElementById('appointmentType').value;
  const typeText = type === 'deepen' ? '深耕計畫聘' : '院聘 (本院編制)';
  const fundText =
    type === 'deepen'
      ? '教育部高等教育深耕計畫（AIRIC 分項專案）年度預算項下支應'
      : '本中心/本院統籌業務及人資預算費用項下支應';

  const roleSelect = document.getElementById('roleSelect');
  const roleText = roleSelect.options[roleSelect.selectedIndex].text.split('(')[0].trim();
  const rules = document.getElementById('rulesInput').value;
  const candidateInfo = document.getElementById('candidateInput').value;

  const badge = document.getElementById('resultBadge');
  const overview = document.getElementById('auditOverview');
  const matrix = document.getElementById('auditMatrix');
  const docOutput = document.getElementById('docOutput');
  const apiKey = localStorage.getItem('AIRIC_GEMINI_KEY');

  const currentYear = new Date().getFullYear();

  if (!apiKey) {
    alert('請先點擊右上角設定 Gemini API Key，才能啟動系統的智慧條件核對功能！');
    return;
  }

  switchTab('audit');
  badge.className = 'text-xs px-3 py-1 rounded-full font-bold bg-amber-100 text-amber-800';
  badge.innerText = '🤖 AI 影像與語意聯合比對審查中...';
  matrix.innerHTML = '<div class="p-4 text-sm text-neutral-500 font-mono">正在交叉比對門檻、讀取掃描附件與生成公文，請稍候...</div>';
  docOutput.innerText = '等待審核完成後，將自動生成對應公文...';

  const prompt = `
    你是一位專業嚴謹的醫療院所人資與行政主管。
    請根據以下【擬聘職位門檻規範】嚴格審核【應徵者履歷與附件資料】。

    【審核極度重要指示】：
    1. 必須「完全符合」規範要求才算通過。
    2. 【年資彈性認定】：若應徵者目前仍在職（如寫「至今」或「Present」），請自動推算至今年（${currentYear}年）計算總年資。此外，若人資人員已在內文中手動備註「年資有X年」、「已確認具備X年工作經驗」等文字，請直接無條件採信該手動輸入的文字作為年資達標的證據！
    3. 【掃描圖檔與推薦信辨識】：系統已連線並附上原始掃描圖檔與PDF。遇到推薦信或證書掃描檔時，請發揮你的 OCR 視覺辨識能力，親自閱讀圖檔內文，若圖檔內文確實含有主管推薦或相關資歷，即算符合條件。

    【擬聘單位】：${dept}
    【應徵者姓名】：${name}
    【擬聘職稱】：${roleText}
    【進用門檻規範】：
    ${rules}

    【應徵者文字履歷與摘要】：
    ${candidateInfo}

    請以純 JSON 格式回傳（不可包含 markdown 標籤，如 \`\`\`json，只要純粹的括號結構），格式如下：
    {
      "isPass": true 或 false,
      "reasonTitle": "核對結果標題 (例如：符合學歷與經歷門檻 / 缺少推薦信)",
      "reasonDetail": "詳細說明哪裡符合或不符合。如果不符合，請具體指出缺漏 (例如：未檢附推薦信)。",
      "docText": "如果 isPass 為 true，請嚴格依照下方【公文撰寫格式要求】生成簽呈；如果 false，請撰寫補件通知單草稿。"
    }

    【公文撰寫格式要求】(當 isPass 為 true 時，docText 必須嚴格遵守以下格式與段落)：
    主旨：因應中心發展，擬請同意聘任 ${name} 君為 ${roleText}，呈請核示。
    說明：
    一、${surname}員（請接續詳述其學歷背景，並具體說明其曾任職的機構與工作內容；若無工作經驗，請詳述其在學期間的專案或研究經驗）。
    二、（請詳細且完整地用一大段文字，敘述該員的傑出成果、專案貢獻、論文發表或作品集，展現其專業亮點）。
    三、${surname}員之專業能力與本中心持續推動智慧醫療系統研發之需求契合。為強化本中心專業團隊戰力，擬請同意聘任${name}先生/小姐為 [請自行判斷填寫] 職等${roleText}（採「${typeText}」辦理，所需費用由「${fundText}」支應）。
    擬辦：奉 核可後，移請人力資源室辦理後續聘任與簽約事宜。
    `;

  try {
    const aiResultStr = await callGeminiAPI(apiKey, prompt, aiAttachments);
    const cleanJsonStr = aiResultStr.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonStr);

    if (result.isPass) {
      badge.className = 'text-xs px-3 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800';
      badge.innerText = '審核結果：完全符合 qualification passed';
      overview.innerHTML = `
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-emerald-700 text-sm">✓ 具備進用資格</span>
              <p class="text-neutral-500 text-[11px] mt-0.5">應徵者：${name} ｜ 聘任類型：${typeText}</p>
            </div>
            <span class="font-bold text-emerald-600 border-2 border-emerald-500 px-3 py-1 rounded">AIRIC 通過</span>
          </div>
        `;
      matrix.innerHTML = `
          <div class="p-3 border rounded-lg bg-emerald-50/50 border-emerald-200 text-xs space-y-1">
            <p class="font-bold text-emerald-900">${result.reasonTitle}</p>
            <p class="text-neutral-600">${result.reasonDetail}</p>
          </div>
        `;
    } else {
      badge.className = 'text-xs px-3 py-1 rounded-full font-bold bg-rose-100 text-rose-800';
      badge.innerText = '審核結果：資格不符 / 資料缺失';
      overview.innerHTML = `
          <div class="flex items-center justify-between">
            <div>
              <span class="font-bold text-rose-700 text-sm">✕ 未達門檻 / 缺少佐證資料</span>
              <p class="text-neutral-500 text-[11px] mt-0.5">應徵者：${name} ｜ 聘任類型：${typeText}</p>
            </div>
            <span class="border border-rose-300 text-rose-600 font-bold px-2 py-0.5 rounded text-xs">需退補件</span>
          </div>
        `;
      matrix.innerHTML = `
          <div class="p-3 border rounded-lg bg-rose-50/50 border-rose-200 text-xs space-y-1">
            <p class="font-bold text-rose-900">${result.reasonTitle}</p>
            <p class="text-neutral-600">${result.reasonDetail}</p>
          </div>
        `;
    }
    docOutput.innerText = result.docText;
  } catch (error) {
    console.error('API 審核解析錯誤:', error);
    alert('AI 審核發生錯誤，可能是網路異常或回傳格式錯誤，請重試。');
    badge.className = 'text-xs px-3 py-1 rounded-full font-bold bg-neutral-100 text-neutral-800';
    badge.innerText = '系統錯誤';
    matrix.innerHTML = '<div class="text-rose-500 text-sm">無法完成比對，請檢查主控台 (Console) 錯誤訊息。</div>';
  }
}

/* ===========================================================
   7. UI：分頁切換 / API Key 設定彈窗 / 初始化
   =========================================================== */
function switchTab(type) {
  const tab1 = document.getElementById('tabContentAudit');
  const tab2 = document.getElementById('tabContentDoc');
  const tab3 = document.getElementById('tabContentAnon');
  const btn1 = document.getElementById('tabBtn1');
  const btn2 = document.getElementById('tabBtn2');
  const btn3 = document.getElementById('tabBtn3');

  tab1.classList.add('hidden');
  tab2.classList.add('hidden');
  tab3.classList.add('hidden');

  btn1.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200';
  btn2.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200';
  btn3.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-600 hover:bg-neutral-200';

  if (type === 'audit') {
    tab1.classList.remove('hidden');
    btn1.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F0F10] text-white';
  } else if (type === 'doc') {
    tab2.classList.remove('hidden');
    btn2.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F0F10] text-white';
  } else if (type === 'anon') {
    tab3.classList.remove('hidden');
    btn3.className = 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#0F0F10] text-white';
  }
}

function copyDoc() {
  navigator.clipboard.writeText(document.getElementById('docOutput').innerText);
  alert('已複製公文內容！');
}

function openApiModal() {
  document.getElementById('apiModal').classList.remove('hidden');
}
function closeApiModal() {
  document.getElementById('apiModal').classList.add('hidden');
}
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value;
  if (key) {
    localStorage.setItem('AIRIC_GEMINI_KEY', key);
    document.getElementById('apiStatusDot').className = 'w-2 h-2 rounded-full bg-emerald-400';
    document.getElementById('apiStatusText').innerText = 'Gemini API : AI 已連線';
  }
  closeApiModal();
}
function clearApiKey() {
  localStorage.removeItem('AIRIC_GEMINI_KEY');
  document.getElementById('apiKeyInput').value = '';
  document.getElementById('apiStatusDot').className = 'w-2 h-2 rounded-full bg-amber-400';
  document.getElementById('apiStatusText').innerText = 'Gemini API : 本機模式';
  closeApiModal();
}

window.onload = function () {
  loadRoleTemplate();
  if (localStorage.getItem('AIRIC_GEMINI_KEY')) {
    document.getElementById('apiStatusDot').className = 'w-2 h-2 rounded-full bg-emerald-400';
    document.getElementById('apiStatusText').innerText = 'Gemini API : AI 已連線';
  }
};
