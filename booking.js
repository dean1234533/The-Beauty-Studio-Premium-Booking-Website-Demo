const demoServices = [
  { category: "Hair Styling", name: "Signature Cut & Finish", price: "£48", duration: "60 mins" },
  { category: "Hair Colour", name: "Gloss Colour Refresh", price: "£72", duration: "90 mins" },
  { category: "Brows & Lashes", name: "Brow Shape & Tint", price: "£28", duration: "30 mins" },
  { category: "Nails", name: "Luxury Gel Manicure", price: "£42", duration: "50 mins" },
  { category: "Makeup", name: "Event Makeup", price: "£65", duration: "60 mins" },
  { category: "Facials", name: "Radiance Facial", price: "£68", duration: "60 mins" },
  { category: "Massage", name: "Wellness Massage", price: "£75", duration: "75 mins" },
  { category: "Aesthetics", name: "Skin Consultation", price: "£35", duration: "30 mins" },
  { category: "Consultations", name: "New Client Consultation", price: "Free", duration: "20 mins" },
];

const demoTimes = ["09:30", "10:15", "11:00", "12:30", "14:00", "15:15", "16:30", "18:00"];

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date, options) {
  return date.toLocaleDateString("en-GB", options);
}

function initBookingWidget(widget) {
  const state = { step: 0, service: null, date: null, time: null };
  const form = widget.querySelector(".booking-form");
  const steps = [...widget.querySelectorAll(".booking-step")];
  const progress = [...widget.querySelectorAll(".booking-progress span")];
  const servicesTarget = widget.querySelector("[data-services]");
  const datesTarget = widget.querySelector("[data-dates]");
  const timesTarget = widget.querySelector("[data-times]");
  const selectedDateTarget = widget.querySelector("[data-selected-date]");
  const summaryTarget = widget.querySelector("[data-summary]");
  const confirmation = widget.querySelector("[data-confirmation]");
  const confirmationDetails = widget.querySelector("[data-confirmation-details]");
  const nextButton = widget.querySelector("[data-next]");
  const backButton = widget.querySelector("[data-back]");

  function renderServices() {
    servicesTarget.innerHTML = demoServices.map((service) => `
      <button class="option-card" type="button" data-service-name="${service.name}">
        <strong>${service.name}</strong>
        <small>${service.category} · ${service.duration}</small>
      </button>
    `).join("");

    servicesTarget.querySelectorAll(".option-card").forEach((button, index) => {
      button.addEventListener("click", () => {
        state.service = demoServices[index];
        servicesTarget.querySelectorAll(".option-card").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        updateButtons();
      });
    });
  }

  function renderDates() {
    const dates = Array.from({ length: 12 }, (_, index) => addDays(new Date(), index + 1))
      .filter((date) => date.getDay() !== 1)
      .slice(0, 8);

    datesTarget.innerHTML = dates.map((date, index) => `
      <button class="date-card" type="button" data-date-index="${index}">
        <span>${formatDate(date, { weekday: "short" })}</span>
        <strong>${formatDate(date, { day: "numeric" })}</strong>
        <span>${formatDate(date, { month: "short" })}</span>
      </button>
    `).join("");

    datesTarget.querySelectorAll(".date-card").forEach((button, index) => {
      button.addEventListener("click", () => {
        state.date = dates[index];
        datesTarget.querySelectorAll(".date-card").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        updateButtons();
      });
    });
  }

  function renderTimes() {
    selectedDateTarget.textContent = state.date
      ? formatDate(state.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      : "";

    timesTarget.innerHTML = demoTimes.map((time) => `
      <button class="time-card" type="button" data-time="${time}">${time}</button>
    `).join("");

    timesTarget.querySelectorAll(".time-card").forEach((button) => {
      button.addEventListener("click", () => {
        state.time = button.dataset.time;
        timesTarget.querySelectorAll(".time-card").forEach((item) => item.classList.remove("selected"));
        button.classList.add("selected");
        updateButtons();
      });
    });
  }

  function renderSummary() {
    if (!state.service || !state.date || !state.time) return;
    summaryTarget.innerHTML = `
      <strong>${state.service.name}</strong><br>
      ${state.service.duration}<br>
      ${formatDate(state.date, { weekday: "long", day: "numeric", month: "long" })} at ${state.time}
    `;
  }

  function canContinue() {
    if (state.step === 0) return Boolean(state.service);
    if (state.step === 1) return Boolean(state.date);
    if (state.step === 2) return Boolean(state.time);
    return true;
  }

  function updateButtons() {
    backButton.hidden = state.step === 0 || confirmation.hidden === false;
    nextButton.disabled = !canContinue();
    nextButton.textContent = state.step === 3 ? "Confirm Booking" : "Continue";
  }

  function showStep(step) {
    state.step = step;
    steps.forEach((item, index) => item.classList.toggle("active", index === step));
    progress.forEach((item, index) => {
      item.classList.toggle("active", index === step);
      item.classList.toggle("done", index < step);
    });

    if (step === 2) renderTimes();
    if (step === 3) renderSummary();
    updateButtons();
  }

  function showConfirmation() {
    const data = new FormData(form);
    const name = data.get("name") || "there";
    const reference = `TBS-${Math.floor(1000 + Math.random() * 9000)}`;

    steps.forEach((item) => item.classList.remove("active"));
    progress.forEach((item) => item.classList.add("done"));
    confirmation.hidden = false;
    confirmationDetails.innerHTML = `
      <p><strong>${state.service.name}</strong><br>
      ${formatDate(state.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${state.time}</p>
      <p>We would contact ${name} using the details provided. Demo reference: <strong>${reference}</strong></p>
    `;
    backButton.hidden = true;
    nextButton.textContent = "Start Again";
    nextButton.disabled = false;
  }

  nextButton.addEventListener("click", () => {
    if (confirmation.hidden === false) {
      confirmation.hidden = true;
      form.reset();
      state.step = 0;
      state.service = null;
      state.date = null;
      state.time = null;
      widget.querySelectorAll(".selected").forEach((item) => item.classList.remove("selected"));
      showStep(0);
      return;
    }

    if (!canContinue()) return;

    if (state.step === 3) {
      if (!form.reportValidity()) return;
      showConfirmation();
      return;
    }

    showStep(state.step + 1);
  });

  backButton.addEventListener("click", () => {
    showStep(Math.max(0, state.step - 1));
  });

  renderServices();
  renderDates();
  showStep(0);
}

document.querySelectorAll("[data-booking-widget]").forEach(initBookingWidget);
