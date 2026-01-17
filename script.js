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

let extractedBooks = [];

const updateStatus = (status, progress) => {
  statusText.textContent = status;
  progressText.textContent = progress;
};

const renderCards = (books) => {
  cards.innerHTML = "";
  resultCount.textContent = `${books.length} 件`;

  if (books.length === 0) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = "<p class=\"card-title\">結果がまだありません</p><p class=\"card-meta\">画像をアップロードすると書籍情報が表示されます。</p>";
    cards.appendChild(empty);
    return;
  }

  books.forEach((book, index) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <p class="card-title">${index + 1}. ${book.title || "(タイトル不明)"}</p>
      <p class="card-meta">著者: ${book.author || "未検出"}</p>
      <p class="card-meta">出版社: ${book.publisher || "未検出"}</p>
    `;
    cards.appendChild(card);
  });
};

const updateJsonOutput = (books) => {
  jsonOutput.textContent = JSON.stringify(books, null, 2);
  downloadButton.disabled = books.length === 0;
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
  const blob = new Blob([JSON.stringify(extractedBooks, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "books.json";
  anchor.click();
  URL.revokeObjectURL(url);
};

const runOcr = async (file) => {
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
    });

    extractedBooks = parseOcrText(data.text);
    updateJsonOutput(extractedBooks);
    renderCards(extractedBooks);
    updateStatus("OCRが完了しました", "完了");
  } catch (error) {
    console.error(error);
    updateStatus("OCRに失敗しました", "画像を変えて再試行してください");
  } finally {
    spinner.classList.add("hidden");
  }
};

imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    preview.src = reader.result;
    preview.classList.remove("hidden");
    previewPlaceholder.classList.add("hidden");
  };
  reader.readAsDataURL(file);

  extractedBooks = [];
  updateJsonOutput(extractedBooks);
  renderCards(extractedBooks);
  runOcr(file);
});

downloadButton.addEventListener("click", handleDownload);

renderCards(extractedBooks);
