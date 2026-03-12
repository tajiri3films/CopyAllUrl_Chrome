// Offscreen document for clipboard access (used by keyboard shortcuts via background service worker)

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if (msg.target !== 'offscreen') return false;

	if (msg.type === 'write-clipboard') {
		writeToClipboard(msg.text, msg.extended_mime)
			.then(function() { sendResponse({ success: true }); })
			.catch(function(e) { sendResponse({ success: false, error: e.message }); });
		return true;
	}

	if (msg.type === 'read-clipboard') {
		readFromClipboard()
			.then(function(text) { sendResponse(text); })
			.catch(function() { sendResponse(''); });
		return true;
	}

	return false;
});

async function writeToClipboard(text, extended_mime) {
	if (!text) text = '<empty>';

	if (extended_mime) {
		// Use execCommand with oncopy override to write both text/html and text/plain
		var textarea = document.getElementById('clipboard-buffer');
		textarea.value = text;
		textarea.select();

		var origOncopy = document.oncopy;
		document.oncopy = function(e) {
			e.preventDefault();
			e.clipboardData.setData('text/html', text);
			e.clipboardData.setData('text/plain', text);
		};
		document.execCommand('copy');
		document.oncopy = origOncopy;
	} else {
		try {
			await navigator.clipboard.writeText(text);
		} catch (e) {
			// Fallback to execCommand
			var textarea = document.getElementById('clipboard-buffer');
			textarea.value = text;
			textarea.select();
			document.execCommand('copy');
		}
	}
}

async function readFromClipboard() {
	try {
		return await navigator.clipboard.readText();
	} catch (e) {
		// Fallback to execCommand
		var textarea = document.getElementById('clipboard-buffer');
		textarea.value = '';
		textarea.select();
		document.execCommand('paste');
		return textarea.value;
	}
}
