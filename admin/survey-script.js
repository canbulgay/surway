import tr from "../locales/tr.js";
import en from "../locales/en.js";

// Dil yönetimi
let currentLanguage = localStorage.getItem("language") || "tr";
const translations = { tr, en };

// Survey verilerini localStorage'dan al
const surveyData = JSON.parse(localStorage.getItem("surveyData"));
const surveyContent = document.getElementById("surveyContent");

// Kullanıcı cevaplarını tutacak obje
let userAnswers = {};

// Global fonksiyonları window objesine ekle
window.selectOption = selectOption;
window.saveTextAnswer = saveTextAnswer;

// Dil değiştirme fonksiyonu
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  document.getElementById("currentLanguage").textContent = lang.toUpperCase();
  renderSurvey();
}

// Survey içeriğini oluştur
function renderSurvey() {
  const t = translations[currentLanguage];

  if (
    !surveyData ||
    !surveyData.surveyQuestions ||
    surveyData.surveyQuestions.length === 0
  ) {
    surveyContent.innerHTML = `<p>${t.noSurveyQuestions}</p>`;
    return;
  }

  const content = surveyData.surveyQuestions
    .map((item, index) => {
      return createQuestionCard(item, index, t);
    })
    .join("");

  surveyContent.innerHTML = content;
}

// Soru kartı oluştur
function createQuestionCard(item, index, t) {
  const category = surveyData.categories.find((c) => c.id === item.categoryId);

  if (category.type === "information") {
    return `
      <div class="info-card">
        ${
          item.image
            ? `
          <div class="info-card-image">
            <img src="${item.image}" alt="${item.title}">
          </div>
        `
            : ""
        }
        <h2 class="info-card-title">${item.title}</h2>
        <div class="info-card-description">${item.description || ""}</div>
      </div>
    `;
  } else {
    if (item.type === "multiple") {
      return `
        <div class="question-card" data-id="${item.id}">
          <h3 class="question-title">${item.title}</h3>
          <div class="question-options">
            ${item.options
              .map(
                (option, optIndex) => `
              <div class="option-item" onclick="selectOption('${item.id}', ${optIndex})">
                <div class="option-radio"></div>
                <span class="option-text">${option}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="question-card" data-id="${item.id}">
          <h3 class="question-title">${item.title}</h3>
          <textarea 
            class="textarea-answer" 
            placeholder="${t.writeYourAnswer}"
            onchange="saveTextAnswer('${item.id}', this.value)"
          ></textarea>
        </div>
      `;
    }
  }
}

// Çoktan seçmeli soru için seçenek seçme
function selectOption(questionId, optionIndex) {
  // Önceki seçimi kaldır
  const questionCard = document.querySelector(
    `.question-card[data-id="${questionId}"]`
  );
  questionCard.querySelectorAll(".option-item").forEach((item) => {
    item.classList.remove("selected");
  });

  // Yeni seçimi işaretle
  const selectedOption =
    questionCard.querySelectorAll(".option-item")[optionIndex];
  selectedOption.classList.add("selected");

  // Cevabı kaydet
  userAnswers[questionId] = optionIndex;
  saveAnswers();
}

// Açık uçlu soru için cevap kaydetme
function saveTextAnswer(questionId, answer) {
  userAnswers[questionId] = answer;
  saveAnswers();
}

// Cevapları localStorage'a kaydet
function saveAnswers() {
  localStorage.setItem("userAnswers", JSON.stringify(userAnswers));
}

// Sayfa yüklendiğinde önceki cevapları yükle
function loadAnswers() {
  const savedAnswers = localStorage.getItem("userAnswers");
  if (savedAnswers) {
    userAnswers = JSON.parse(savedAnswers);

    // Çoktan seçmeli soruların seçimlerini işaretle
    Object.entries(userAnswers).forEach(([questionId, answer]) => {
      const questionCard = document.querySelector(
        `.question-card[data-id="${questionId}"]`
      );
      if (questionCard) {
        if (typeof answer === "number") {
          // Çoktan seçmeli soru
          const options = questionCard.querySelectorAll(".option-item");
          if (options[answer]) {
            options[answer].classList.add("selected");
          }
        } else {
          // Açık uçlu soru
          const textarea = questionCard.querySelector(".textarea-answer");
          if (textarea) {
            textarea.value = answer;
          }
        }
      }
    });
  }
}

// Dil menüsü işlemleri
const languageBtn = document.getElementById("languageBtn");
const languageMenu = document.getElementById("languageMenu");
const languageOptions = document.querySelectorAll(".language-option");

languageBtn.addEventListener("click", () => {
  languageMenu.classList.toggle("show");
});

languageOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const lang = option.dataset.lang;
    changeLanguage(lang);
    languageMenu.classList.remove("show");
  });
});

document.addEventListener("click", (e) => {
  if (!languageBtn.contains(e.target) && !languageMenu.contains(e.target)) {
    languageMenu.classList.remove("show");
  }
});

// Sayfa yüklendiğinde
document.addEventListener("DOMContentLoaded", () => {
  changeLanguage(currentLanguage);
  loadAnswers();
});
