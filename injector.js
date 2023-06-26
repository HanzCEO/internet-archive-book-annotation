const script = document.createElement("script");
script.setAttribute("src", browser.runtime.getURL("main.js"));
document.head.appendChild(script);

window.addEventListener('message', async (e) => {
	if (e.data.direction != "webpage") return;

	let { data } = e.data;
	// console.log(e)
	let instruction = JSON.parse(data);

	if (instruction.name == "storage.get") {
		if (instruction.args[0] == "null") instruction.args[0] = null;
		chrome.storage.local.get(...instruction.args, (retval) => {
			window.postMessage({
				direction: "iab",
				data: JSON.stringify({ id: instruction.id, data: retval })
			});
		});
	} else if (instruction.name == "storage.set") {
		let retval = await chrome.storage.local.set(...instruction.args);
		window.postMessage({
			direction: "iab",
			data: JSON.stringify({ id: instruction.id, data: retval })
		});
	}
});
