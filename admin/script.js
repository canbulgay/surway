import tr from "../locales/tr.js";
import en from "../locales/en.js";

// DOM Elements
const modal = document.getElementById("questionModal");
const categoryModal = document.getElementById("categoryModal");
const deleteModal = document.getElementById("deleteModal");
const createQuestionBtn = document.getElementById("createQuestionBtn");
const createCategoryBtn = document.getElementById("createCategoryBtn");
const closeButtons = document.querySelectorAll(".close");
const questionForm = document.getElementById("questionForm");
const categoryForm = document.getElementById("categoryForm");
const answerType = document.getElementById("answerType");
const optionsContainer = document.getElementById("optionsContainer");
const addOptionBtn = document.getElementById("addOptionBtn");
const questionPool = document.getElementById("questionPool");
const activeSurvey = document.getElementById("activeSurvey");
const categoriesList = document.getElementById("categoriesList");
const noCategories = document.getElementById("noCategories");
const selectedCategory = document.getElementById("selectedCategory");
const confirmDeleteBtn = document.getElementById("confirmDelete");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const deleteMessage = document.getElementById("deleteMessage");
const questionTypeFields = document.getElementById("questionTypeFields");
const informationTypeFields = document.getElementById("informationTypeFields");
const imageUpload = document.getElementById("imageUpload");
const imagePreview = document.getElementById("imagePreview");

// State
let categories = [];
let questions = [];
let surveyQuestions = [];
let currentEditingId = null;
let currentDeletingId = null;
let currentDeletingType = null;
let selectedCategoryId = null;
let draggedItem = null;
let placeholder = null;

// Dil yönetimi
let currentLanguage = localStorage.getItem("language") || "tr";
const translations = { tr, en };

// Varsayılan verileri yükle
function loadDefaultData() {
  if (!localStorage.getItem("surveyData")) {
    const defaultData = {
      categories: [
        {
          id: Date.now(),
          name: "Genel",
          type: "question",
        },
      ],
      questions: [],
      surveyQuestions: [],
    };
    localStorage.setItem("surveyData", JSON.stringify(defaultData));
  }
}

// Event Listeners
createQuestionBtn.addEventListener("click", () => {
  if (!selectedCategoryId) {
    alert("Lütfen önce bir kategori seçin.");
    return;
  }

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  if (!selectedCategory) {
    alert("Seçili kategori bulunamadı.");
    return;
  }

  resetQuestionForm();

  // Seçili kategoriyi form'a gizli input olarak ekle
  document.getElementById("questionCategory").value = selectedCategoryId;

  // Form alanlarını kategori tipine göre göster/gizle
  questionTypeFields.style.display =
    selectedCategory.type === "question" ? "block" : "none";
  informationTypeFields.style.display =
    selectedCategory.type === "information" ? "block" : "none";

  // Gereklilik durumlarını güncelle
  const answerTypeSelect = document.getElementById("answerType");
  const descriptionField = document.getElementById("description");
  const optionInputs = document.querySelectorAll(".option-input");

  answerTypeSelect.required = selectedCategory.type === "question";
  descriptionField.required = selectedCategory.type === "information";

  // Seçenek alanlarının required özelliğini güncelle
  optionInputs.forEach((input) => {
    input.required =
      selectedCategory.type === "question" && answerType.value === "multiple";
  });

  modal.style.display = "block";
});

createCategoryBtn.addEventListener("click", () => {
  resetCategoryForm();
  categoryModal.style.display = "block";
});

closeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    modal.style.display = "none";
    categoryModal.style.display = "none";
    resetQuestionForm();
    resetCategoryForm();
  });
});

window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    resetQuestionForm();
  }
  if (e.target === categoryModal) {
    categoryModal.style.display = "none";
    resetCategoryForm();
  }
  if (e.target === deleteModal) {
    deleteModal.style.display = "none";
  }
});

// Category Form Submit Handler
categoryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const categoryId = document.getElementById("categoryId").value;
  const categoryName = document.getElementById("categoryName").value;
  const categoryType = document.getElementById("categoryType").value;

  if (!categoryType) {
    alert("Lütfen bir kategori tipi seçin");
    return;
  }

  if (categoryId) {
    // Edit mode
    const index = categories.findIndex((c) => c.id === parseInt(categoryId));
    if (index !== -1) {
      const oldType = categories[index].type;
      categories[index].name = categoryName;
      categories[index].type = categoryType;

      // Eğer tip değiştiyse ve eski tip "question" ise, bu kategorideki soruları temizle
      if (oldType === "question" && categoryType === "information") {
        const hasQuestions = questions.some(
          (q) => q.categoryId === parseInt(categoryId)
        );
        if (hasQuestions) {
          if (
            confirm(
              "Bu kategoride sorular var. Kategori tipini değiştirmek soruları silecektir. Devam etmek istiyor musunuz?"
            )
          ) {
            // Soruları sil
            questions = questions.filter(
              (q) => q.categoryId !== parseInt(categoryId)
            );
            surveyQuestions = surveyQuestions.filter(
              (q) => q.categoryId !== parseInt(categoryId)
            );
          } else {
            // İşlemi iptal et
            return;
          }
        }
      }
    }
  } else {
    // Create mode
    categories.push({
      id: Date.now(),
      name: categoryName,
      type: categoryType,
    });
  }

  saveToJSON();
  renderCategories();
  categoryModal.style.display = "none";
  resetCategoryForm();
});

// Question Form Submit Handler
questionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const categoryId = document.getElementById("questionCategory").value;
    if (!categoryId) {
      alert("Lütfen bir kategori seçin");
      return;
    }

    const category = categories.find((c) => c.id === parseInt(categoryId));
    if (!category) {
      alert("Kategori bulunamadı");
      return;
    }

    const questionId = document.getElementById("questionId").value;
    const questionTitle = document.getElementById("questionTitle").value;

    if (!questionTitle.trim()) {
      alert("Lütfen bir başlık girin");
      return;
    }

    let questionData = {
      id: questionId ? parseInt(questionId) : Date.now(),
      categoryId: parseInt(categoryId),
      title: questionTitle,
    };

    if (category.type === "question") {
      const type = answerType.value;
      if (!type) {
        alert("Lütfen bir cevap tipi seçin");
        return;
      }

      const options = Array.from(
        document.querySelectorAll(".option-input")
      ).map((input) => input.value);

      if (type === "multiple") {
        if (options.some((opt) => !opt.trim())) {
          alert("Lütfen tüm seçenekleri doldurun");
          return;
        }

        const correctAnswer = document.querySelector(
          'input[name="correctAnswer"]:checked'
        );
        if (!correctAnswer) {
          alert("Lütfen doğru cevabı seçin");
          return;
        }

        questionData = {
          ...questionData,
          type,
          options,
          correctAnswer: parseInt(correctAnswer.value),
        };
      } else {
        questionData = {
          ...questionData,
          type,
          options: [],
        };
      }
    } else if (category.type === "information") {
      console.log("Burdayım");
      const description = document.getElementById("description").value;
      if (!description.trim()) {
        alert("Lütfen bir açıklama girin");
        return;
      }

      let imageData = null;
      const imageFile = imageUpload.files[0];

      if (imageFile) {
        try {
          // Dosya boyutu kontrolü (5MB)
          if (imageFile.size > 5 * 1024 * 1024) {
            alert("Görsel boyutu 5MB'dan küçük olmalıdır");
            return;
          }

          // Dosya tipi kontrolü
          if (!imageFile.type.startsWith("image/")) {
            alert("Lütfen geçerli bir görsel dosyası seçin");
            return;
          }

          // Dosyayı base64'e çevir
          imageData = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) =>
              reject(new Error("Görsel yüklenirken hata oluştu"));
            reader.readAsDataURL(imageFile);
          });

          // Dosyayı uploads klasörüne kaydet
          const fileName = `image_${Date.now()}_${imageFile.name}`;
          const filePath = `uploads/${fileName}`;

          // Base64'ten blob'a çevir
          const response = await fetch(imageData);
          const blob = await response.blob();

          // Dosyayı kaydet
          const formData = new FormData();
          formData.append("image", blob, fileName);

          // Burada dosya kaydetme işlemi yapılacak
          // Şu an için base64 olarak tutuyoruz
          questionData.imagePath = filePath;
        } catch (error) {
          console.error("Görsel yükleme hatası:", error);
          alert("Görsel yüklenirken bir hata oluştu: " + error.message);
          return;
        }
      }

      questionData = {
        ...questionData,
        type: "information",
        description: description,
        image: imageData,
      };
    } else {
      alert("Geçersiz kategori tipi");
      return;
    }

    if (questionId) {
      // Edit mode
      const index = questions.findIndex((q) => q.id === parseInt(questionId));
      if (index !== -1) {
        questions[index] = questionData;

        const surveyIndex = surveyQuestions.findIndex(
          (q) => q.id === parseInt(questionId)
        );
        if (surveyIndex !== -1) {
          surveyQuestions[surveyIndex] = questionData;
        }
      }
    } else {
      // Create mode
      questions.push(questionData);
    }

    saveToJSON();
    renderQuestions();
    modal.style.display = "none";
    resetQuestionForm();
  } catch (error) {
    console.error("Form gönderme hatası:", error);
    alert("Kart oluşturulurken bir hata oluştu: " + error.message);
  }
});

// Delete Handlers
confirmDeleteBtn.addEventListener("click", () => {
  if (!currentDeletingId || !currentDeletingType) return;

  if (currentDeletingType === "category") {
    const hasQuestions = questions.some(
      (q) => q.categoryId === currentDeletingId
    );
    if (hasQuestions) {
      alert("Bu kategoride sorular var. Önce soruları silmelisiniz.");
      deleteModal.style.display = "none";
      return;
    }
    categories = categories.filter((c) => c.id !== currentDeletingId);
    if (selectedCategoryId === currentDeletingId) {
      selectedCategoryId = null;
    }
    renderCategories();
  } else {
    questions = questions.filter((q) => q.id !== currentDeletingId);
    surveyQuestions = surveyQuestions.filter((q) => q.id !== currentDeletingId);
  }

  saveToJSON();
  renderQuestions();
  deleteModal.style.display = "none";
  currentDeletingId = null;
  currentDeletingType = null;
});

cancelDeleteBtn.addEventListener("click", () => {
  deleteModal.style.display = "none";
  currentDeletingId = null;
  currentDeletingType = null;
});

// Category Functions
function selectCategory(categoryId) {
  selectedCategoryId = categoryId === null ? null : Number(categoryId);
  const category = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId)
    : null;

  selectedCategory.querySelector(".category-name").textContent = category
    ? category.name
    : "Tüm Kartlar";

  document.querySelectorAll(".category-item").forEach((item) => {
    const itemId = item.dataset.id ? Number(item.dataset.id) : null;
    item.classList.toggle("active", itemId === selectedCategoryId);
  });

  renderQuestions();
}

function editCategory(id) {
  const category = categories.find((c) => c.id === id);
  if (!category) return;

  document.getElementById("categoryId").value = id;
  document.getElementById("categoryName").value = category.name;
  document.getElementById("categoryType").value = category.type;
  document.getElementById("categoryModalTitle").textContent =
    "Kategori Düzenle";

  categoryModal.style.display = "block";
}

function deleteCategory(id) {
  currentDeletingId = id;
  currentDeletingType = "category";
  deleteMessage.textContent =
    "Bu kategoriyi silmek istediğinizden emin misiniz?";
  deleteModal.style.display = "block";
}

function resetCategoryForm() {
  document.getElementById("categoryId").value = "";
  document.getElementById("categoryName").value = "";
  document.getElementById("categoryType").value = "";
  document.getElementById("categoryModalTitle").textContent = "Yeni Kategori";
}

// Question Functions
function editQuestion(id) {
  const question = questions.find((q) => q.id === id);
  if (!question) return;

  currentEditingId = id;
  document.getElementById("questionId").value = id;
  document.getElementById("questionCategory").value = question.categoryId;
  document.getElementById("questionTitle").value = question.title;

  const category = categories.find((c) => c.id === question.categoryId);

  questionTypeFields.style.display =
    category.type === "question" ? "block" : "none";
  informationTypeFields.style.display =
    category.type === "information" ? "block" : "none";

  if (category.type === "question") {
    const answerTypeSelect = document.getElementById("answerType");
    answerTypeSelect.value = question.type;
    answerTypeSelect.disabled = true;

    if (question.type === "multiple") {
      optionsContainer.style.display = "block";
      const optionsList = document.getElementById("optionsList");
      optionsList.innerHTML = question.options
        .map(
          (option, index) => `
            <div class="option-item">
              <input type="text" class="option-input" placeholder="Seçenek ${
                index + 1
              }" 
                     value="${option}" required>
              <label class="correct-answer">
                <input type="radio" name="correctAnswer" value="${index}" 
                       ${
                         index === question.correctAnswer ? "checked" : ""
                       } required>
                <span class="checkmark"></span>
              </label>
              <button type="button" class="remove-option">
                <i class="fas fa-times"></i>
              </button>
            </div>
          `
        )
        .join("");
      updateRemoveButtons();
    } else {
      optionsContainer.style.display = "none";
    }
  } else {
    document.getElementById("description").value = question.description || "";
    if (question.image) {
      imagePreview.innerHTML = `<img src="${question.image}" alt="Yüklenen görsel">`;
      imagePreview.classList.add("has-image");
    } else {
      imagePreview.innerHTML = "";
      imagePreview.classList.remove("has-image");
    }
  }

  modal.style.display = "block";
}

function deleteQuestion(id) {
  currentDeletingId = id;
  currentDeletingType = "question";
  deleteMessage.textContent = "Bu kartı silmek istediğinizden emin misiniz?";
  deleteModal.style.display = "block";
}

function resetQuestionForm() {
  currentEditingId = null;
  document.getElementById("questionId").value = "";
  document.getElementById("questionCategory").value = "";
  document.getElementById("questionTitle").value = "";
  document.getElementById("description").value = "";
  imageUpload.value = "";
  imagePreview.innerHTML = "";
  imagePreview.classList.remove("has-image");

  const answerTypeSelect = document.getElementById("answerType");
  answerTypeSelect.disabled = false;
  answerTypeSelect.value = "multiple";

  questionTypeFields.style.display = "block";
  informationTypeFields.style.display = "none";

  const optionsList = document.getElementById("optionsList");
  optionsList.innerHTML = `
    <div class="option-item">
      <input type="text" class="option-input" placeholder="Seçenek 1" required>
      <label class="correct-answer">
        <input type="radio" name="correctAnswer" value="0" required>
        <span class="checkmark"></span>
      </label>
      <button type="button" class="remove-option" disabled>
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  optionsContainer.style.display = "block";
}

// Render Functions
function renderCategories() {
  const t = translations[currentLanguage];

  if (categories.length === 0) {
    categoriesList.style.display = "none";
    noCategories.style.display = "block";
  } else {
    categoriesList.style.display = "block";
    noCategories.style.display = "none";

    categoriesList.innerHTML = `
        <div class="category-item ${!selectedCategoryId ? "active" : ""}" 
            onclick="selectCategory(null)">
            <span class="category-name">${t.questions}</span>
        </div>
        ${categories
          .map(
            (category) => `
            <div class="category-item ${
              category.id === selectedCategoryId ? "active" : ""
            }" 
                data-id="${category.id}" 
                onclick="selectCategory(${category.id})">
                <div class="category-info">
                    <span class="category-name">${category.name}</span>
                    <span class="category-type-badge ${category.type}">
                        ${
                          category.type === "question"
                            ? t.categoryTypeQuestion
                            : t.categoryTypeInformation
                        }
                    </span>
                </div>
                <div class="category-actions">
                    <button class="category-edit" onclick="event.stopPropagation(); editCategory(${
                      category.id
                    })">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="category-delete" onclick="event.stopPropagation(); deleteCategory(${
                      category.id
                    })">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `
          )
          .join("")}
    `;
  }
}

// Toggle Card
function toggleCard(id) {
  const card = document.querySelector(`.question-card[data-id="${id}"]`);
  if (card) {
    card.classList.toggle("collapsed");
    saveCardState(id, card.classList.contains("collapsed"));
  }
}

// Save card state to localStorage
function saveCardState(id, isCollapsed) {
  const cardStates = JSON.parse(localStorage.getItem("cardStates") || "{}");
  cardStates[id] = isCollapsed;
  localStorage.setItem("cardStates", JSON.stringify(cardStates));
}

// Load card states from localStorage
function loadCardStates() {
  const cardStates = JSON.parse(localStorage.getItem("cardStates") || "{}");
  // Yeni kartlar için varsayılan olarak kapalı durumu ayarla
  return new Proxy(cardStates, {
    get: (target, prop) => {
      // Eğer kart durumu tanımlı değilse true (kapalı) döndür
      return prop in target ? target[prop] : true;
    },
  });
}

function createQuestionCard(question, index) {
  const category = categories.find((c) => c.id === question.categoryId);
  const cardStates = loadCardStates();
  const isCollapsed = cardStates[question.id];

  let contentHtml = "";
  if (category.type === "question") {
    contentHtml =
      question.type === "multiple"
        ? `<ul>${question.options
            .map(
              (opt, idx) =>
                `<li class="${
                  idx === question.correctAnswer ? "correct" : ""
                }">${opt}</li>`
            )
            .join("")}</ul>`
        : "";
  } else {
    contentHtml = `
      <div class="description">${question.description || ""}</div>
      ${
        question.image
          ? `<img src="${question.image}" alt="${question.title}" class="card-image">`
          : ""
      }
    `;
  }

  return `
    <div class="question-card ${isCollapsed ? "collapsed" : ""}" data-id="${
    question.id
  }">
      <button class="toggle-btn" onclick="event.stopPropagation(); toggleCard(${
        question.id
      })">
        <i class="fas fa-chevron-down"></i>
      </button>
      <div class="order-badge">${index + 1}</div>
      <div class="card-actions">
        <button class="edit-btn" onclick="editQuestion(${question.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn" onclick="deleteQuestion(${question.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
      <div class="card-header">
        <div class="header-content">
          <h3>${question.title}</h3>
          <div class="meta-info">
            <span class="category-badge">${
              category ? category.name : "Kategorisiz"
            }</span>
            <span class="question-type">
              ${
                category.type === "question"
                  ? question.type === "multiple"
                    ? "Çoktan Seçmeli"
                    : "Açık Uçlu"
                  : "Bilgi Kartı"
              }
            </span>
          </div>
        </div>
      </div>
      <div class="card-content">
        ${contentHtml}
      </div>
    </div>
  `;
}

function renderQuestionPool() {
  let filteredQuestions = questions;
  if (selectedCategoryId !== null) {
    filteredQuestions = questions.filter(
      (q) => q.categoryId === selectedCategoryId
    );
  }

  const poolQuestions = filteredQuestions.filter(
    (q) => !surveyQuestions.find((sq) => sq.id === q.id)
  );

  questionPool.innerHTML = poolQuestions
    .map((question, index) => createQuestionCard(question, index))
    .join("");

  questionPool.querySelectorAll(".question-card").forEach(addDragListeners);
}

function renderActiveSurvey() {
  let filteredSurveyQuestions = surveyQuestions;
  if (selectedCategoryId !== null) {
    filteredSurveyQuestions = surveyQuestions.filter(
      (q) => q.categoryId === selectedCategoryId
    );
  }

  activeSurvey.innerHTML = filteredSurveyQuestions
    .map((question, index) => createQuestionCard(question, index))
    .join("");

  activeSurvey.querySelectorAll(".question-card").forEach(addDragListeners);
}

function renderQuestions() {
  renderQuestionPool();
  renderActiveSurvey();
}

// JSON Integration
function saveToJSON() {
  const data = {
    categories,
    questions,
    surveyQuestions,
  };

  localStorage.setItem("surveyData", JSON.stringify(data));
  console.log("Saved to JSON:", data);
}

function loadFromJSON() {
  loadDefaultData(); // Önce varsayılan verileri kontrol et

  const data = localStorage.getItem("surveyData");
  if (data) {
    try {
      const parsed = JSON.parse(data);
      categories = parsed.categories || [];
      questions = parsed.questions || [];
      surveyQuestions = parsed.surveyQuestions || [];

      renderCategories();
      renderQuestions();
    } catch (error) {
      console.error("JSON parse error:", error);
      // Hata durumunda varsayılan verileri yükle
      loadDefaultData();
      loadFromJSON();
    }
  }
}

// Initialize
loadFromJSON();

// Drag and Drop Functions
function addDragListeners(element) {
  element.setAttribute("draggable", true);

  element.addEventListener("dragstart", (e) => {
    // Eğer tıklanan yer butonlar veya içerikse sürüklemeyi engelle
    if (e.target.closest(".card-actions") || e.target.closest(".toggle-btn")) {
      e.preventDefault();
      return;
    }
    draggedItem = element;
    e.dataTransfer.setData("text/plain", e.target.dataset.id);

    requestAnimationFrame(() => {
      element.classList.add("dragging");
      placeholder = document.createElement("div");
      placeholder.className = "drag-placeholder";
      element.parentNode.insertBefore(placeholder, element.nextSibling);
    });
  });

  element.addEventListener("dragend", (e) => {
    element.classList.remove("dragging");
    if (placeholder && placeholder.parentNode) {
      placeholder.parentNode.removeChild(placeholder);
    }
    draggedItem = null;
    placeholder = null;
  });
}

// Container Drag Events
[questionPool, activeSurvey].forEach((container) => {
  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    const draggableContainer = e.target.closest(".draggable-container");
    if (!draggableContainer) return;

    const cards = [
      ...draggableContainer.querySelectorAll(".question-card:not(.dragging)"),
    ];
    const draggedOverItem = e.target.closest(".question-card");

    if (draggedOverItem) {
      const draggedRect = draggedItem.getBoundingClientRect();
      const draggedOverRect = draggedOverItem.getBoundingClientRect();
      const midpoint = draggedOverRect.top + draggedOverRect.height / 2;

      if (e.clientY < midpoint) {
        draggedOverItem.parentNode.insertBefore(placeholder, draggedOverItem);
      } else {
        draggedOverItem.parentNode.insertBefore(
          placeholder,
          draggedOverItem.nextSibling
        );
      }
    } else if (cards.length === 0) {
      draggableContainer.appendChild(placeholder);
    }

    draggableContainer.classList.add("drag-over");
  });

  container.addEventListener("dragleave", (e) => {
    const draggableContainer = e.target.closest(".draggable-container");
    if (draggableContainer) {
      draggableContainer.classList.remove("drag-over");
    }
  });

  container.addEventListener("drop", (e) => {
    e.preventDefault();
    const draggableContainer = e.target.closest(".draggable-container");
    if (!draggableContainer) return;

    draggableContainer.classList.remove("drag-over");
    const questionId = parseInt(e.dataTransfer.getData("text/plain"));
    const question = questions.find((q) => q.id === questionId);

    if (!question) return;

    // Hedef konteynır ve kaynak konteynırı belirle
    const targetContainer = draggableContainer.id;
    const sourceContainer = draggedItem.closest(".draggable-container").id;

    // Aynı konteynır içinde sıralama
    if (targetContainer === sourceContainer) {
      if (targetContainer === "activeSurvey") {
        const newIndex = [...draggableContainer.children].indexOf(placeholder);
        const oldIndex = surveyQuestions.findIndex((q) => q.id === questionId);
        const [movedQuestion] = surveyQuestions.splice(oldIndex, 1);
        surveyQuestions.splice(newIndex, 0, movedQuestion);
      }
    } else {
      // Konteynırlar arası taşıma
      if (targetContainer === "activeSurvey") {
        if (!surveyQuestions.find((q) => q.id === questionId)) {
          const insertIndex = [...draggableContainer.children].indexOf(
            placeholder
          );
          surveyQuestions.splice(insertIndex, 0, question);
        }
      } else {
        surveyQuestions = surveyQuestions.filter((q) => q.id !== questionId);
      }
    }

    saveToJSON();
    renderQuestions();
  });
});

// Answer Type Change Handler
answerType.addEventListener("change", () => {
  const isMultiple = answerType.value === "multiple";
  optionsContainer.style.display = isMultiple ? "block" : "none";

  // Seçenek alanlarının required özelliğini güncelle
  const optionInputs = document.querySelectorAll(".option-input");
  optionInputs.forEach((input) => {
    input.required = isMultiple;
  });
});

// Add Option Button Handler
addOptionBtn.addEventListener("click", () => {
  const optionsList = document.getElementById("optionsList");
  const optionCount = optionsList.children.length;

  const optionItem = document.createElement("div");
  optionItem.className = "option-item";
  optionItem.innerHTML = `
    <input type="text" class="option-input" placeholder="Seçenek ${
      optionCount + 1
    }" 
           ${answerType.value === "multiple" ? "required" : ""}>
    <label class="correct-answer">
      <input type="radio" name="correctAnswer" value="${optionCount}" required>
      <span class="checkmark"></span>
    </label>
    <button type="button" class="remove-option">
      <i class="fas fa-times"></i>
    </button>
  `;

  optionsList.appendChild(optionItem);
  updateRemoveButtons();
});

// Remove Option Handler
document.addEventListener("click", (e) => {
  if (e.target.closest(".remove-option")) {
    const optionsList = document.getElementById("optionsList");
    if (optionsList.children.length > 1) {
      const optionItem = e.target.closest(".option-item");
      const removedIndex = Array.from(optionsList.children).indexOf(optionItem);
      optionItem.remove();

      // Radio butonların value'larını güncelle
      optionsList
        .querySelectorAll('input[name="correctAnswer"]')
        .forEach((radio, idx) => {
          radio.value = idx;
        });

      updateRemoveButtons();
    }
  }
});

// Seçenek silme butonlarını güncelle
function updateRemoveButtons() {
  const optionsList = document.getElementById("optionsList");
  const removeButtons = optionsList.querySelectorAll(".remove-option");

  removeButtons.forEach((button) => {
    if (optionsList.children.length === 1) {
      button.disabled = true;
      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";
    } else {
      button.disabled = false;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  });
}

// Kategori seçimi değiştiğinde form alanlarını güncelle
document.getElementById("questionCategory").addEventListener("change", (e) => {
  const categoryId = e.target.value;
  const category = categories.find((c) => c.id === parseInt(categoryId));

  if (category) {
    // Form alanlarını göster/gizle
    questionTypeFields.style.display =
      category.type === "question" ? "block" : "none";
    informationTypeFields.style.display =
      category.type === "information" ? "block" : "none";

    // Gereklilik durumlarını güncelle
    const answerTypeSelect = document.getElementById("answerType");
    const descriptionField = document.getElementById("description");
    const optionInputs = document.querySelectorAll(".option-input");

    // Soru tipi için gereklilikler
    answerTypeSelect.required = category.type === "question";
    optionInputs.forEach((input) => {
      input.required =
        category.type === "question" && answerType.value === "multiple";
    });

    // Bilgi tipi için gereklilikler
    descriptionField.required = category.type === "information";
  }
});

// Resim yükleme önizlemesi
imageUpload.addEventListener("change", (e) => {
  try {
    const file = e.target.files[0];
    if (file) {
      // Dosya boyutu kontrolü (örneğin 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("Görsel boyutu 5MB'dan küçük olmalıdır");
        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.classList.remove("has-image");
        return;
      }

      // Dosya tipi kontrolü
      if (!file.type.startsWith("image/")) {
        alert("Lütfen geçerli bir görsel dosyası seçin");
        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.classList.remove("has-image");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Yüklenen görsel">`;
        imagePreview.classList.add("has-image");
      };
      reader.onerror = () => {
        alert("Görsel önizleme oluşturulurken bir hata oluştu");
        imageUpload.value = "";
        imagePreview.innerHTML = "";
        imagePreview.classList.remove("has-image");
      };
      reader.readAsDataURL(file);
    } else {
      imagePreview.innerHTML = "";
      imagePreview.classList.remove("has-image");
    }
  } catch (error) {
    alert("Görsel yüklenirken bir hata oluştu: " + error.message);
    console.error("Görsel yükleme hatası:", error);
    imageUpload.value = "";
    imagePreview.innerHTML = "";
    imagePreview.classList.remove("has-image");
  }
});

// Dil değiştirme fonksiyonu
function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  document.getElementById("currentLanguage").textContent = lang.toUpperCase();
  updateTexts();
}

// Metinleri güncelleme fonksiyonu
function updateTexts() {
  const t = translations[currentLanguage];

  // Başlıklar ve ana metin içerikleri
  document.querySelector("h1").textContent = t.survey;
  document.querySelector("#createCategoryBtn span").textContent =
    t.createCategory;
  document.querySelector("#createQuestionBtn span").textContent =
    t.createQuestion;
  document.querySelector("h2:first-of-type").textContent = t.categories;
  document.querySelector(".no-categories p").textContent = t.noQuestionsYet;
  document.querySelector(".selected-category .category-name").textContent =
    selectedCategoryId
      ? categories.find((c) => c.id === selectedCategoryId)?.name
      : t.questions;

  // Kategori modal
  document.querySelector("#categoryModalTitle").textContent = currentEditingId
    ? t.editCategory
    : t.createCategory;
  document.querySelector('label[for="categoryName"]').textContent =
    t.categoryName + ":";
  document.querySelector('label[for="categoryType"]').textContent =
    t.categoryType + ":";
  document.querySelector('#categoryType option[value=""]').textContent =
    t.selectCategoryType;
  document.querySelector('#categoryType option[value="question"]').textContent =
    t.categoryTypeQuestion;
  document.querySelector(
    '#categoryType option[value="information"]'
  ).textContent = t.categoryTypeInformation;

  // Soru modal
  document.querySelector("#questionModalTitle").textContent = currentEditingId
    ? t.editQuestion
    : t.createQuestion;
  document.querySelector('label[for="questionTitle"]').textContent =
    t.questionTitle + ":";
  document.querySelector('label[for="answerType"]').textContent =
    t.questionType + ":";
  document.querySelector('#answerType option[value="multiple"]').textContent =
    t.questionTypeMultiple;
  document.querySelector('#answerType option[value="textarea"]').textContent =
    t.questionTypeOpen;
  document.querySelector('label[for="description"]').textContent =
    t.informationDescription + ":";
  document.querySelector('label[for="imageUpload"]').textContent =
    t.uploadImage + ":";
  document.querySelector(
    "#addOptionBtn"
  ).innerHTML = `<i class="fas fa-plus"></i> ${t.addOption}`;

  // Modal butonları
  document
    .querySelectorAll('[data-action="cancel"]')
    .forEach((btn) => (btn.textContent = t.cancel));
  document
    .querySelectorAll('[data-action="confirm"]')
    .forEach((btn) => (btn.textContent = t.delete));
  document
    .querySelectorAll('button[type="submit"]')
    .forEach((btn) => (btn.textContent = t.save));

  // Silme modalı
  document.querySelector("#deleteMessage").textContent =
    currentDeletingType === "category"
      ? t.deleteCategoryConfirm
      : t.deleteQuestionConfirm;

  // Kategorileri ve soruları yeniden render et
  renderCategories();
  renderQuestions();
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
  loadFromJSON();
  changeLanguage(currentLanguage);
});

// Global fonksiyonları window objesine ekle
window.selectCategory = selectCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.editQuestion = editQuestion;
window.deleteQuestion = deleteQuestion;
window.toggleCard = toggleCard;
