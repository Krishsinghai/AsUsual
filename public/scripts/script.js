document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const homepageContent = document.getElementById("homepage-content");

  // Use gsap.matchMedia() to define responsive animations
  let mm = gsap.matchMedia();

  mm.add("(min-width: 768px)", () => {
    // Animations for larger screens (desktops and tablets)
    gsap.to(".moon", {
      scale: 3,
      opacity: 1,
      duration: 2,
      ease: "power2.inOut",
    });

    gsap.to(".brand-name", {
      opacity: 1,
      zIndex: 3,
      y: -150,
      duration: 2,
      ease: "power2.inOut",
    });

    gsap.to(".sword-left", {
      x: 850,
      rotate: 180,
      duration: 2,
      scaleX: -1,
      zIndex: 2,
      ease: "power2.inOut",
    });

    gsap.to(".sword-right", {
      x: -850,
      rotate: -180,
      duration: 2,
      zIndex: 2,
      ease: "power2.inOut",
      onComplete: () => {
        loader.classList.add("hidden");
        homepageContent.style.display = "block";
        initializeAnimations();
      },
    });
  });

  mm.add("(max-width: 767px)", () => {
    // Animations for smaller screens (mobile devices)
    gsap.to(".moon", {
      scale: 2,
      opacity: 1,
      duration: 2,
      ease: "power2.inOut",
    });

    gsap.to(".brand-name", {
      opacity: 1,
      zIndex: 3,
      y: -100,
      duration: 2,
      ease: "power2.inOut",
    });

    gsap.to(".sword-left", {
      x: 250,
      rotate: 180,
      duration: 2,
      scaleX: -1,
      zIndex: 2,
      ease: "power2.inOut",
    });

    gsap.to(".sword-right", {
      x: -250,
      rotate: -180,
      duration: 2,
      zIndex: 2,
      ease: "power2.inOut",
      onComplete: () => {
        loader.classList.add("hidden");
        homepageContent.style.display = "block";
        initializeAnimations();
      },
    });
  });

  // Handle audio unmute after user interaction
  const audio = document.getElementById("background-sound");
  document.addEventListener("click", () => {
    audio.muted = false;
  });
});

const AsHamburger = document.querySelector('.As-hamburger');
const AsNavLinks = document.querySelector('.As-nav-links');

AsHamburger.addEventListener('click', () => {
  AsNavLinks.classList.toggle('active');
});
// Function to initialize other animations
function initializeAnimations() {
  // GSAP code for T-shirt animation
  let mm = gsap.matchMedia();

  mm.add("(min-width: 1024px)", () => {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#page2",
        start: "0% 95%",
        end: "50% 50%",
        scrub: true,
      },
    });

    tl.to("#move_image", {
      top: "145%",
      left: "28%",
      width: "19rem",
      duration: 1,
    });
  });

  mm.add("(max-width: 1024px) and (min-width: 768px)", () => {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#page2",
        start: "0% 40%",
        end: "10% 40%",
        scrub: true,
      },
    });

    tl.to("#move_image", {
      top: "76%",
      left: "55%",
      height: "18rem",
      duration: 1,
    });
  });

  mm.add("(max-width: 600px)", () => {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#page2",
        start: "0% 5%",
        end: "40% 40%",
        scrub: true,
      },
    });

    tl.to("#move_image", {
      top: "105%",
      left: "18%",
      height: "14rem",
      duration: 1,
    });
  });

  // Script for horizontal scrolling
  gsap.registerPlugin(ScrollTrigger);

  const scroller = document.querySelector(".scroller");

  gsap.to(scroller, {
    x: () => -(scroller.scrollWidth - document.documentElement.clientWidth) + "px",
    ease: "none",
    scrollTrigger: {
      trigger: ".page4",
      start: "top top",
      end: () => "+=" + (scroller.scrollWidth - document.documentElement.clientWidth),
      scrub: true,
      pin: true,
    },
  });

  // Script for notification text
  gsap.to(".notification-text", {
    x: "-100%",
    duration: 15,
    repeat: -1,
    ease: "linear",
  });
}



// script for 3d slider
// set and cache variables
var w, container, carousel, item, radius, itemLength, rY, ticker, fps;
var mouseX = 0;
var mouseY = 0;
var mouseZ = 0;
var addX = 0;



var fps_counter = {

  tick: function () {
    // this has to clone the array every tick so that
    // separate instances won't share state 
    this.times = this.times.concat(+new Date());
    var seconds, times = this.times;

    if (times.length > this.span + 1) {
      times.shift(); // ditch the oldest time
      seconds = (times[times.length - 1] - times[0]) / 1000;
      return Math.round(this.span / seconds);
    }
    else return null;
  },

  times: [],
  span: 20
};
var counter = Object.create(fps_counter);



$(document).ready(init)

function init() {
  w = $(window);
  container = $('#contentContainer');
  carousel = $('#carouselContainer');
  item = $('.carouselItem');
  itemLength = $('.carouselItem').length;
  fps = $('#fps');
  rY = 360 / itemLength;
  radius = Math.round((550) / Math.tan(Math.PI / itemLength));


  // Bigger perspective = more depth
  gsap.set(container, { perspective: 2000 });
  gsap.set(carousel, { z: -radius });

  // Loop to set item positions
  for (let i = 0; i < itemLength; i++) {
    const $item = item[i];
    const $block = $item.querySelector('.carouselItemInner');

    // Set rotation and bring closer with smaller radius
    gsap.set($item, {
      rotationY: rY * i,
      z: radius,
      transformOrigin: `50% 50% -${radius}px`,
      scale: 1.3 // increase size visually
    });

    animateIn($item, $block);
  }

  // set mouse x and y props and looper ticker
  window.addEventListener("mousemove", onMouseMove, false);
  ticker = setInterval(looper, 1000 / 60);
}

// for mobile view 
let touchStartX = 0;
let touchMoveX = 0;

window.addEventListener("touchstart", function (e) {
  touchStartX = e.touches[0].clientX;
}, false);

window.addEventListener("touchmove", function (e) {
  touchMoveX = e.touches[0].clientX;
  const deltaX = touchMoveX - touchStartX;
  mouseX = deltaX * 0.01; // adjust sensitivity here
}, false);

window.addEventListener("touchend", function (e) {
  touchMoveX = 0;
}, false);


function animateIn($item, $block) {
  var $nrX = 360 * getRandomInt(2);
  var $nrY = 360 * getRandomInt(2);

  var $nx = -(2000) + getRandomInt(4000)
  var $ny = -(2000) + getRandomInt(4000)
  var $nz = -4000 + getRandomInt(4000)

  var $s = 1.5 + (getRandomInt(10) * .1)
  var $d = 1 - (getRandomInt(8) * .1)

  TweenMax.set($item, { autoAlpha: 1, delay: $d })
  TweenMax.set($block, { z: $nz, rotationY: $nrY, rotationX: $nrX, x: $nx, y: $ny, autoAlpha: 0 })
  TweenMax.to($block, $s, { delay: $d, rotationY: 0, rotationX: 0, z: 0, ease: Expo.easeInOut })
  TweenMax.to($block, $s - .5, { delay: $d, x: 0, y: 0, autoAlpha: 1, ease: Expo.easeInOut })
}

function onMouseMove(event) {
  mouseX = -(-(window.innerWidth * .5) + event.pageX) * .0025;
  mouseY = -(-(window.innerHeight * .5) + event.pageY) * .01;
  mouseZ = -(radius) - (Math.abs(-(window.innerHeight * .5) + event.pageY) - 200);
}

// loops and sets the carousel 3d properties
function looper() {
  addX += mouseX
  mouseX *= 0.95;
  TweenMax.to(carousel, 1, {
    rotationY: addX,
    // rotationX: mouseY,
    ease: Quint.easeOut
  })
  TweenMax.set(carousel, { z: mouseZ })
  fps.text('Framerate: ' + counter.tick() + '/60 FPS')
}

function getRandomInt($n) {
  return Math.floor((Math.random() * $n) + 1);
}

gsap.from(".ninja-word", {
  scrollTrigger: {
    trigger: ".ninja-word",
    start: "top 80%",
    toggleActions: "play none none reverse"
  },
  opacity: 0,
  y: 80,
  scale: 0.9,
  stagger: 0.2,
  ease: "power4.out",
  duration: 1.5
});