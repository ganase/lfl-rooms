const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const spinner = document.getElementById("spinner");
const statusText = document.getElementById("statusText");
const progressText = document.getElementById("progressText");
const jsonOutput = document.getElementById("jsonOutput");
const downloadButton = document.getElementById("downloadButton");
const cards = document.getElementById("cards");
const resultCount = document.getElementById("resultCount");
const uploadHistory = document.getElementById("uploadHistory");

const lflNumberInput = document.getElementById("lflNumberInput");
const emailInput = document.getElementById("emailInput");
const sendCodeButton = document.getElementById("sendCodeButton");
const verificationInput = document.getElementById("verificationInput");
const verifyButton = document.getElementById("verifyButton");
const demoCodeHint = document.getElementById("demoCodeHint");
const verificationStatus = document.getElementById("verificationStatus");
const lflSelect = document.getElementById("lflSelect");
const activeLflStatus = document.getElementById("activeLflStatus");

const STORAGE_KEY = "lfl-rooms-registrations";
const ACTIVE_KEY = "lfl-rooms-active-lfl";

let extractedSessions = [];
let pendingVerification = null;
let registeredLfls = [];
let activeLflNumber = "";

const updateStatus = (status, progress) => {
  statusText.textContent = status;
  progressText.textContent = progress;
};

const loadRegistrations = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    registeredLfls = Array.isArray(stored) ? stored : [];
  } catch (error) {
    registeredLfls = [];
  }

  activeLflNumber = localStorage.getItem(ACTIVE_KEY) || "";
  if (activeLflNumber && !registeredLfls.some((item) => item.number === activeLflNumber)) {
    activeLflNumber = "";
  }
};

const saveRegistrations = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registeredLfls));
  if (activeLflNumber) {
    localStorage.setItem(ACTIVE_KEY, activeLflNumber);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
};

const renderRegistrations = () => {
  lflSelect.innerHTML = "";

  if (registeredLfls.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "登録済み番号がありません";
    lflSelect.appendChild(option);
  } else {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "LFL番号を選択";
    lflSelect.appendChild(placeholder);

    registeredLfls.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.number;
      option.textContent = `${item.number} (${item.email})`;
      if (item.number === activeLflNumber) {
        option.selected = true;
      }
      lflSelect.appendChild(option);
    });
  }

  activeLflStatus.textContent = activeLflNumber
    ? `現在の選択: ${activeLflNumber}`
    : "現在の選択: 未選択";

  imageInput.disabled = !activeLflNumber;
  if (!activeLflNumber) {
    updateStatus("LFL番号を選択するとアップロードできます。", "待機中");
  }
};

const setPendingVerification = (payload) => {
  pendingVerification = payload;
  if (payload) {
    verificationStatus.textContent = `認証メールを ${payload.email} に送信しました。`;
    demoCodeHint.textContent = `デモ用認証コード: ${payload.code}`;
  } else {
    verificationStatus.textContent = "まだ登録されていません。";
    demoCodeHint.textContent = "";
  }
};

const handleSendCode = () => {
  const number = lflNumberInput.value.trim();
  const email = emailInput.value.trim();
  if (!number || !email) {
    verificationStatus.textContent = "LFL番号とメールアドレスを入力してください。";
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  setPendingVerification({ number, email, code });
};

const handleVerify = () => {
  if (!pendingVerification) {
    verificationStatus.textContent = "まず認証メールを送信してください。";
    return;
  }

  if (verificationInput.value.trim() !== pendingVerification.code) {
    verificationStatus.textContent = "認証コードが一致しません。";
    return;
  }

  const exists = registeredLfls.find((item) => item.number === pendingVerification.number);
  if (!exists) {
    registeredLfls.push({
      number: pendingVerification.number,
      email: pendingVerification.email,
      verifiedAt: new Date().toISOString(),
    });
  }
  activeLflNumber = pendingVerification.number;
  saveRegistrations();
  renderRegistrations();
  verificationInput.value = "";
  lflNumberInput.value = "";
  emailInput.value = "";
  setPendingVerification(null);
  verificationStatus.textContent = "登録が完了しました。";
};

const renderUploadHistory = () => {
  uploadHistory.innerHTML = "";
  if (extractedSessions.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "まだアップロードがありません。";
    uploadHistory.appendChild(empty);
    return;
  }

  extractedSessions.forEach((session) => {
    const row = document.createElement("div");
    row.className = "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2";
    row.innerHTML = `
      <span>${session.imageName}</span>
      <span class="text-slate-400">${session.statusLabel}</span>
    `;
    uploadHistory.appendChild(row);
  });
};

const renderCards = (sessions) => {
  cards.innerHTML = "";
  const totalBooks = sessions.reduce((sum, session) => sum + session.books.length, 0);
  resultCount.textContent = `${totalBooks} 件`;

  if (sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = "<p class=\"card-title\">結果がまだありません</p><p class=\"card-meta\">画像をアップロードすると書籍情報が表示されます。</p>";
    cards.appendChild(empty);
    return;
  }

  sessions.forEach((session) => {
    const group = document.createElement("div");
    group.className = "card flex flex-col gap-3";
    group.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="card-title">${session.imageName}</p>
        <span class="card-meta">${session.books.length} 冊 / ${session.lflNumber}</span>
      </div>
    `;

    if (session.books.length === 0) {
      const empty = document.createElement("p");
      empty.className = "card-meta";
      empty.textContent = "文字が検出できませんでした。";
      group.appendChild(empty);
    } else {
      session.books.forEach((book, index) => {
        const bookRow = document.createElement("div");
        bookRow.className = "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2";
        bookRow.innerHTML = `
          <p class="text-sm font-semibold text-slate-700">${index + 1}. ${book.title || "(タイトル不明)"}</p>
          <p class="text-xs text-slate-500">著者: ${book.author || "未検出"}</p>
          <p class="text-xs text-slate-500">出版社: ${book.publisher || "未検出"}</p>
        `;
        group.appendChild(bookRow);
      });
    }

    cards.appendChild(group);
  });
};

const updateJsonOutput = (sessions) => {
  jsonOutput.textContent = JSON.stringify(sessions, null, 2);
  downloadButton.disabled = sessions.length === 0;
};

const parseOcrText = (text) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 2);

  return lines.map((line) => {
    const normalized = line.replace(/\s{2,}/g, " ");
    const parts = normalized.split("/").map((part) => part.trim());

    return {
      title: parts[0] || normalized,
      author: parts[1] || "",
      publisher: parts[2] || "",
    };
  });
};

const handleDownload = () => {
  const blob = new Blob([JSON.stringify(extractedSessions, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "books.json";
  anchor.click();
  URL.revokeObjectURL(url);
};

const runOcr = async (session, file) => {
  spinner.classList.remove("hidden");
  updateStatus("OCRを実行中です…", "0% 完了");

  try {
    const { data } = await Tesseract.recognize(file, "jpn+eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          const progressValue = Math.round(message.progress * 100);
          updateStatus("文字を解析しています", `${progressValue}% 完了`);
        }
      },
      tessedit_pageseg_mode: "6",
    });

    session.books = parseOcrText(data.text);
    session.statusLabel = "OCR完了";
    updateStatus("OCRが完了しました", "完了");
  } catch (error) {
    console.error(error);
    session.statusLabel = "OCR失敗";
    updateStatus("OCRに失敗しました", "画像を変えて再試行してください");
  } finally {
    spinner.classList.add("hidden");
    updateJsonOutput(extractedSessions);
    renderCards(extractedSessions);
    renderUploadHistory();
  }
};

const processFiles = async (files) => {
  for (const file of files) {
    const session = {
      id: crypto.randomUUID(),
      lflNumber: activeLflNumber,
      imageName: file.name,
      uploadedAt: new Date().toISOString(),
      books: [],
      statusLabel: "OCR待機中",
    };
    extractedSessions.push(session);
    renderUploadHistory();

    const reader = new FileReader();
    reader.onload = () => {
      preview.src = reader.result;
      preview.classList.remove("hidden");
      previewPlaceholder.classList.add("hidden");
    };
    reader.readAsDataURL(file);

    session.statusLabel = "OCR処理中";
    renderUploadHistory();
    await runOcr(session, file);
  }
};

imageInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }
  if (!activeLflNumber) {
    updateStatus("LFL番号を選択してください。", "待機中");
    return;
  }

  await processFiles(files);
  event.target.value = "";
});

sendCodeButton.addEventListener("click", handleSendCode);
verifyButton.addEventListener("click", handleVerify);

lflSelect.addEventListener("change", (event) => {
  activeLflNumber = event.target.value;
  saveRegistrations();
  renderRegistrations();
});

downloadButton.addEventListener("click", handleDownload);

loadRegistrations();
renderRegistrations();
renderCards(extractedSessions);
renderUploadHistory();
updateJsonOutput(extractedSessions);
