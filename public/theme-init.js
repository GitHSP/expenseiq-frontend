// Dark before the app loads (no white flash), unless the user chose light.
// A separate file because the site's security policy blocks inline scripts.
try { if (localStorage.getItem("glacier_theme") !== "light") document.documentElement.classList.add("pre-dark"); } catch (e) {}
