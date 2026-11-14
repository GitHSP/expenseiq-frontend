// Dark before the app loads (no white flash), unless the user chose light.
// A separate file because the site's security policy blocks inline scripts.
try { if (localStorage.getItem("glacier_theme") !== "light") document.documentElement.classList.add("pre-dark"); } catch (e) {}

// Chrome offers to install the app once: keep that offer so the More menu can show it.
window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); window.__glacierInstall = e; });

// iPhone: after the keyboard or a time picker closes, the page can stay shifted and
// fixed bars (the bottom menu) sit in the wrong place. Nudge it back into place.
document.addEventListener("focusout", function () {
  setTimeout(function () { window.scrollTo(window.scrollX, window.scrollY); }, 60);
});
