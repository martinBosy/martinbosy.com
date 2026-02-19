document.addEventListener("DOMContentLoaded", () => {
  initCommon() {console.log("MAIN JS IS LOADED");};

  const page = document.body.dataset.page || "";
  const init = PAGE_INITS[page];

  if (typeof init === "function") init();
});

function initCommon() {
  // Keep only lightweight global code here
  // Example:
  // console.log("Common loaded");
}

const PAGE_INITS = {
  home: initHome,
  client: initClient,
  media: initMedia,
  // add more later, e.g.:
  // about: initAbout,
};

function initHome() {
  // home page code
  // console.log("Home init");
}

function initClient() {
  // client page code (your swipers, randomize, etc.)
  // console.log("Client init");
}

function initMedia() {
  // media page code
  // console.log("Media init");
}
