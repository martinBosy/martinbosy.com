document.addEventListener("DOMContentLoaded", () => {
  initCommon();

  const page = document.body.dataset.page || "";
  const init = PAGE_INITS[page];

  if (typeof init === "function") init();
});

function initCommon() {
  // Keep only lightweight global code here
  // console.log("Common loaded");
}

const PAGE_INITS = {
  home: initHome,
  client: initClient,
  media: initMedia,
};

function initHome() {
  // home page code
}

function initClient() {
  console.log("CLIENT PAGE CODE IS RUNNING")
}

function initMedia() {
  // media page code
}
