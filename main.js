/* Debug all BookReader events */
/*let eventNames = {
  "fragmentChange": "fragmentChange",
  "pageChanged": "pageChanged",
  "PostInit": "PostInit",
  "stop": "stop",
  "resize": "resize",
  "userAction": "userAction",
  "fullscreenToggled": "fullscreenToggled",
  "zoomOut": "zoomOut",
  "zoomIn": "zoomIn",
  "1PageViewSelected": "1PageViewSelected",
  "2PageViewSelected": "2PageViewSelected",
  "3PageViewSelected": "3PageViewSelected",
  "mobileNavOpen": "mobileNavOpen"
};
Object.values(eventNames).forEach(name => {
	window.addEventListener(`BookReader:${name}`, console.log.bind(window, `[${name}]:`));
});*/



let iabannotate = {};

iabannotate.DEFAULT_HIGHLIGHT_HEIGHT = 16;
iabannotate.highlights = [];
iabannotate.highlightCounter = 0;



function onBookMajorMutation(mutations, observer) {

	let __mcheck = false; // mutation check done?
	for (const mutation of mutations) {
		if (__mcheck) break;
		if (mutation.type === "childList") {
			for (const node of mutation.addedNodes) {
				if (node.classList?.contains("br-mode-1up__world")) {
					__mcheck = true; // mutation check done.
					break;
				}
			}
		}
	}
	// Unsuccessful mutation check
	if (__mcheck == false) return false;
	// Successful mutation check
	observer.disconnect();


	// Set scroll-triggering element width to 100%
	let bookgeometry = br._modes['mode1Up'].mode1UpLit;
	let eventbox = br._modes['mode1Up'].mode1UpLit.firstElementChild;
	eventbox.style.minWidth = "100%";
	eventbox.style.zIndex = "10";
	let getBookRect = (index) => {
		// TODO: This is error
		return window.br.getActivePageContainerElementsForIndex(index ?? window.br.firstIndex)[0].getBoundingClientRect();
	};

	// States
	let isMouseDown = false;
	let newlyCreatedHighlight = null;

	eventbox.addEventListener('mousedown', handleMouseDown);
	eventbox.addEventListener('mousemove', handleMouseMove);
	eventbox.addEventListener('mouseup', handleMouseUp);

	function handleMouseDown(e) {
		isMouseDown = true;
		createNewHighlight(e.layerY);
	}

	function handleMouseMove(e) {
		if (!isMouseDown || newlyCreatedHighlight == null) return false;

		let hlTop = (e.layerY - newlyCreatedHighlight.height/2) + 'px';
		newlyCreatedHighlight.top = newlyCreatedHighlight.el.style.top = hlTop;
	}

	function handleMouseUp(e) {
		isMouseDown = false;
		newlyCreatedHighlight = null;
	}

	function createNewHighlight(startLayerY) {
		let highlight = document.createElement('div');

		/*
			position: absolute;
			top: startLayerY;
			left: 
			width: bookrect.width;
			height: 16px;
			background-color: yellow;
			opacity: 0.4;
			// TODO: Support changes to view scale
			// TODO: Add support to change highlight size
		*/
		highlight.classList.toggle('iabannotate__highlight_main');

		let pageRect = getBookRect();
		let hlTop = highlight.style.top = (startLayerY - iabannotate.DEFAULT_HIGHLIGHT_HEIGHT/2) + 'px';
		let hlLeft = highlight.style.left = pageRect.left + 'px';
		let hlWidth = highlight.style.width = pageRect.width + 'px';
		highlight.style.zIndex = 9;

		let len_ = iabannotate.highlights.push({
			id: iabannotate.highlightCounter++,
			top: hlTop,
			left: hlLeft,
			width: hlWidth,
			height: iabannotate.DEFAULT_HIGHLIGHT_HEIGHT,
			el: highlight
		});
		newlyCreatedHighlight = iabannotate.highlights[len_ - 1];

		bookgeometry.appendChild(highlight);
	}

	
	console.info("iabannotate ran successfully.");

}

window.addEventListener('BookReader:PostInit', function(postInit) {
	// Start MutationObserver for once
	let iabannotateMO;
	iabannotateMO = new MutationObserver(onBookMajorMutation);
	
	let iabannotateMOConf = { attributes: false, childList: true, subtree: false };
	iabannotateMO.observe(br._modes['mode1Up'].mode1UpLit, iabannotateMOConf);

});

document.styleSheets[0].insertRule(`
.iabannotate__highlight_main {
	position: absolute;
	height: ${iabannotate.DEFAULT_HIGHLIGHT_HEIGHT}px;
	background-color: yellow;
	opacity: 0.4;
}
`.replace('\n', ''));

