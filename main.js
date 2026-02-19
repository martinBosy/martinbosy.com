document.addEventListener("DOMContentLoaded", () => {
  initCommon();

  const page = document.body.dataset.page || "";
  const init = PAGE_INITS[page];

  if (typeof init === "function") init();
});

function initCommon() {
  console.log("MAIN JS IS LOADED");
}

const PAGE_INITS = {
  home: initHome,
  client: initClient,
  media: initMedia,
};

function initHome() {
  // home page code
  // console.log("Home init");
}

function initClient() {
  // client page code
  // console.log("Client init");
}

function initMedia() {
  // media page code
  // console.log("Media init");
}
