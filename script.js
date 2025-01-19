// DOM Elements
const questionContainer = document.getElementById("questionContainer");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const completionMessage = document.getElementById("completionMessage");
const restartBtn = document.getElementById("restartBtn");

// State
let currentQuestionIndex = 0;
let questions = [];
let answers = {};

// Load questions from localStorage (saved by admin panel)
function loadQuestions() {
  const surveyData = localStorage.getItem("surveyData");
  if (surveyData) {
    const data = JSON.parse(surveyData);
    questions = data.surveyQuestions || [];

    if (questions.length > 0) {
      showQuestion(0);
      updateProgress();
    } else {
      questionContainer.innerHTML =
        '<p class="no-questions">Henüz soru eklenmemiş.</p>';
    }
  }
}

// Load saved answers if they exist
function loadSavedAnswers() {
  const savedAnswers = localStorage.getItem("surveyAnswers");
  if (savedAnswers) {
    answers = JSON.parse(savedAnswers);
  }
}

// Show question at given index
function showQuestion(index) {
  const question = questions[index];
  if (!question) return;

  const previousAnswer = answers[question.id];

  let optionsHTML = "";
  if (question.type === "multiple") {
    optionsHTML = question.options
      .map(
        (option, i) => `
            <div class="option ${
              previousAnswer === option ? "selected" : ""
            }" data-value="${option}">
                <input type="radio" name="q${question.id}" value="${option}" ${
          previousAnswer === option ? "checked" : ""
        }>
                <span>${option}</span>
            </div>
        `
      )
      .join("");
  } else {
    optionsHTML = `
            <textarea class="answer-input" placeholder="Cevabınızı buraya yazın...">${
              previousAnswer || ""
            }</textarea>
        `;
  }

  const questionHTML = `
        <div class="question">
            <h2>${question.title}</h2>
            <div class="options">
                ${optionsHTML}
            </div>
        </div>
    `;

  questionContainer.innerHTML = questionHTML;

  // Add event listeners for options
  if (question.type === "multiple") {
    const options = questionContainer.querySelectorAll(".option");
    options.forEach((option) => {
      option.addEventListener("click", () => {
        options.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
        const radio = option.querySelector('input[type="radio"]');
        radio.checked = true;
        saveAnswer(question.id, option.dataset.value);
      });
    });
  } else {
    const textarea = questionContainer.querySelector("textarea");
    textarea.addEventListener("input", (e) => {
      saveAnswer(question.id, e.target.value);
    });
  }

  // Show question with animation
  setTimeout(() => {
    const questionElement = questionContainer.querySelector(".question");
    questionElement.classList.add("active");
  }, 0);
}

// Save answer to localStorage
function saveAnswer(questionId, value) {
  answers[questionId] = value;
  localStorage.setItem("surveyAnswers", JSON.stringify(answers));
}

// Update progress bar and text
function updateProgress() {
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  progressBar.style.setProperty("--progress", `${progress}%`);
  progressText.textContent = `Soru ${currentQuestionIndex + 1}/${
    questions.length
  }`;

  // Update navigation buttons
  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.style.display =
    currentQuestionIndex === questions.length - 1 ? "none" : "flex";
  submitBtn.style.display =
    currentQuestionIndex === questions.length - 1 ? "flex" : "none";
}

// Navigation event handlers
prevBtn.addEventListener("click", () => {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    showQuestion(currentQuestionIndex);
    updateProgress();
  }
});

nextBtn.addEventListener("click", () => {
  if (currentQuestionIndex < questions.length - 1) {
    currentQuestionIndex++;
    showQuestion(currentQuestionIndex);
    updateProgress();
  }
});

submitBtn.addEventListener("click", () => {
  // Check if all questions are answered
  const unansweredQuestions = questions.filter((q) => !answers[q.id]);

  if (unansweredQuestions.length > 0) {
    alert("Lütfen tüm soruları cevaplayın.");
    return;
  }

  // Hide survey container and show completion message
  document.querySelector(".survey-container").style.display = "none";
  completionMessage.style.display = "block";

  // Save final answers
  localStorage.setItem("surveyAnswers", JSON.stringify(answers));
  console.log("Final Answers:", answers);
});

restartBtn.addEventListener("click", () => {
  // Reset everything
  currentQuestionIndex = 0;
  answers = {};
  localStorage.removeItem("surveyAnswers");

  // Show survey container and hide completion message
  document.querySelector(".survey-container").style.display = "block";
  completionMessage.style.display = "none";

  // Show first question
  showQuestion(0);
  updateProgress();
});

// Initialize
loadQuestions();
loadSavedAnswers();
