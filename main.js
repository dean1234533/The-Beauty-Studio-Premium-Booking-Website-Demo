const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("menu-open", open);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    });
  });
}

document.querySelectorAll("[data-service-link]").forEach((card) => {
  card.addEventListener("click", (event) => {
    const service = card.dataset.serviceLink;
    if (!service) return;
    const target = document.querySelector(`[data-booking-widget] [data-service-name="${CSS.escape(service)}"]`);
    if (target) {
      target.click();
      if (event.target.tagName !== "A") {
        document.getElementById("booking")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  });
});

function initCarousel(carousel) {
  const track = carousel.querySelector(".carousel__track");
  const slides = [...carousel.querySelectorAll(".carousel__slide")];
  const prev = carousel.querySelector("[data-carousel-prev]");
  const next = carousel.querySelector("[data-carousel-next]");
  const dotsWrap = carousel.querySelector("[data-carousel-dots]");
  const autoplay = Number(carousel.dataset.autoplay || 5000);
  const mobileQuery = window.matchMedia("(max-width: 760px)");
  let index = 0;
  let timer = null;
  let active = false;

  if (!track || slides.length < 2) return;

  function renderDots() {
    if (!dotsWrap) return;
    dotsWrap.innerHTML = slides.map((_, dotIndex) => (
      `<button class="carousel__dot${dotIndex === 0 ? " active" : ""}" type="button" aria-label="Go to slide ${dotIndex + 1}" data-carousel-dot="${dotIndex}"></button>`
    )).join("");

    dotsWrap.querySelectorAll("[data-carousel-dot]").forEach((dot) => {
      dot.addEventListener("click", () => {
        goTo(Number(dot.dataset.carouselDot));
        restart();
      });
    });
  }

  function goTo(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = active ? `translateX(-${index * 100}%)` : "";
    dotsWrap?.querySelectorAll(".carousel__dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === index);
    });
  }

  function start() {
    if (!active) return;
    stop();
    timer = window.setInterval(() => goTo(index + 1), autoplay);
  }

  function stop() {
    if (timer) window.clearInterval(timer);
  }

  function restart() {
    if (!active) return;
    stop();
    start();
  }

  prev?.addEventListener("click", () => {
    if (!active) return;
    goTo(index - 1);
    restart();
  });

  next?.addEventListener("click", () => {
    if (!active) return;
    goTo(index + 1);
    restart();
  });

  carousel.addEventListener("mouseenter", stop);
  carousel.addEventListener("mouseleave", start);
  carousel.addEventListener("focusin", stop);
  carousel.addEventListener("focusout", start);

  function enable() {
    if (active) return;
    active = true;
    goTo(index);
    start();
  }

  function disable() {
    active = false;
    stop();
    index = 0;
    track.style.transform = "";
    dotsWrap?.querySelectorAll(".carousel__dot").forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === 0);
    });
  }

  renderDots();
  if (mobileQuery.matches) enable();
  else disable();

  mobileQuery.addEventListener("change", (event) => {
    if (event.matches) enable();
    else disable();
  });
}

document.querySelectorAll("[data-carousel]").forEach(initCarousel);
