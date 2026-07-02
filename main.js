window.Webflow ||= [];

(function () {
  const currentScript = document.currentScript;
  const scriptSrc = currentScript ? currentScript.src : "";
  const ASSET_BASE = scriptSrc.replace(/\/main\.js(?:\?.*)?$/, "/");

  const PAGE_ASSETS = {
    client: {
      css: ["css/client.css"],
      js: ["pages/client.js"],
      init: function () {
        if (window.ClientPage && typeof window.ClientPage.init === "function") {
          window.ClientPage.init();
        } else {
          console.warn("ClientPage.init() was not found.");
        }
      },
    },
  };

  Webflow.push(function () {
    initCommon();

    const page = document.body.dataset.page || "";
    const assets = PAGE_ASSETS[page];

    if (!assets) return;

    (assets.css || []).forEach(function (path) {
      loadCss(ASSET_BASE + path);
    });

    loadScriptsSequentially((assets.js || []).map(function (path) {
      return ASSET_BASE + path;
    })).then(function () {
      assets.init();
    }).catch(function (error) {
      console.error("Page script failed to load:", error);
    });
  });

  function initCommon() {
    // Global site code can go here later.
  }

  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;

    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false;

      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Failed to load " + src));
      };

      document.body.appendChild(script);
    });
  }

  async function loadScriptsSequentially(srcs) {
    for (const src of srcs) {
      await loadScript(src);
    }
  }
})();
