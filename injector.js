const script = document.createElement("script");
script.setAttribute("src", browser.runtime.getURL("main.js"));
document.head.appendChild(script);
