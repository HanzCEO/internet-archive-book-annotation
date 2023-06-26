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
iabannotate.DEFAUTL_HIGHLIGHT_ACTION_CONTEXT = { dragOffset: { x: 0, y: 0 } };
iabannotate.highlights = [];
iabannotate.highlightCounter = 0;



async function onBookMajorMutation(mutations, observer) {

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


	// Retrieve storage stuff
	let storage__ = await iabstorageGet("null");

	if (!storage__.counters) {
		iabstorageSet({ counters: { highlight: 0 } });
		Object.assign(storage__, { counters: { highlight: 0 } });
	}
	
	if (!storage__.highlights) {
		iabstorageSet({ highlights: [] });
		Object.assign(storage__, { highlights: [] });
	}
	
	let storage__counters = storage__.counters;
	iabannotate.highlightCounter = storage__counters.highlight;


	// Set scroll-triggering element width to 100%
	let bookgeometry = br._modes['mode1Up'].mode1UpLit;
	let eventbox = br._modes['mode1Up'].mode1UpLit.firstElementChild;
	eventbox.style.minWidth = "100%";
	eventbox.style.zIndex = "10";
	let getBookRect = (index) => {
		// TODO: This is error
		return window.br.getActivePageContainerElementsForIndex(index ?? window.br.firstIndex)[0].getBoundingClientRect();
	};

	// Place initial highlights
	iabannotate.highlights = [];
	for (const hl of storage__.highlights) {
		let len_ = iabannotate.highlights.push(hl);
		iabannotate.highlights[len_ - 1].el = createHighlightEl(hl.top);
	}

	// States
	let isMouseDown = false;
	let newlyCreatedHighlight = null;
	let highlightAction = Object.assign({}, iabannotate.DEFAUTL_HIGHLIGHT_ACTION_CONTEXT);

	eventbox.addEventListener('mousedown', handleMouseDown);
	eventbox.addEventListener('mousemove', handleMouseMove);
	eventbox.addEventListener('mouseup', handleMouseUp);

	function resetHighlightAction() {
		highlightAction = Object.assign({}, iabannotate.DEFAUTL_HIGHLIGHT_ACTION_CONTEXT)
	}

	function handleMouseDown(e) {
		isMouseDown = true;
		resetHighlightAction();

		let hls = iabannotate.highlights.filter(h => h.top < e.layerY && e.layerY < (h.top + h.height));
		if (hls.length) {
			newlyCreatedHighlight = hls[hls.length-1];
			highlightAction.dragOffset.y = e.layerY - newlyCreatedHighlight.top;
		} else {
			createNewHighlight(e.layerY);
		}
	}

	function handleMouseMove(e) {
		if (!isMouseDown || newlyCreatedHighlight == null) return false;

		newlyCreatedHighlight.top = (e.layerY - highlightAction.dragOffset.y);
		newlyCreatedHighlight.el.style.top = newlyCreatedHighlight.top + 'px';
	}

	function handleMouseUp(e) {
		iabstorageSet({
			highlights: iabannotate.highlights
		});
		isMouseDown = false;
		newlyCreatedHighlight = null;
	}

	function createHighlightEl(startLayerY) {
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

		bookgeometry.appendChild(highlight);

		return highlight;
	}

	function createNewHighlight(startLayerY) {
		let highlight = createHighlightEl(startLayerY);

		let len_ = iabannotate.highlights.push({
			id: iabannotate.highlightCounter++,
			top: Number(highlight.style.top.replace('px', '')),
			left: Number(highlight.style.left.replace('px', '')),
			width: Number(highlight.style.width.replace('px', '')),
			height: iabannotate.DEFAULT_HIGHLIGHT_HEIGHT,
			el: highlight
		});
		newlyCreatedHighlight = iabannotate.highlights[len_ - 1];
		// TODO: storage error handling
		iabstorageSet({
			highlights: iabannotate.highlights,
			counters: { highlight: iabannotate.highlightCounter }
		});
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

// Webpage <--> Content Script communication port
let iabmessageWaitlist = {}
let iabmessageCounter = 0;
window.addEventListener('message', (e) => {
	// TODO: proxy storage to content script

	if (e.data.direction != "iab") return;

	let { data } = e.data;
	// console.warn(e);
	let obj = JSON.parse(data);

	iabmessageWaitlist[obj.id](obj.data);
	delete iabmessageWaitlist[obj.id];
});

function iabcommunicate(inst, argv, cb) {
	window.postMessage({
		direction: 'webpage',
		data: JSON.stringify({ id: iabmessageCounter++, name: inst, args: argv })
	});

	iabmessageWaitlist[iabmessageCounter - 1] = cb;
}

async function iabstorageGet(keys) {
	return new Promise((resolve) => iabcommunicate('storage.get', [keys], resolve));
}
async function iabstorageSet(keys) {
	return new Promise((resolve) => iabcommunicate('storage.set', [keys], resolve));
}


document.styleSheets[0].insertRule(`
.iabannotate__highlight_main {
	position: absolute;
	height: ${iabannotate.DEFAULT_HIGHLIGHT_HEIGHT}px;
	background-color: yellow;
	opacity: 0.4;
}
`.replace('\n', ''));

