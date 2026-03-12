// Popup script for Copy All Urls (Manifest V3)
// Communicates with background service worker via messaging
// Uses navigator.clipboard API directly (popup has document context)

function showMessage(html, isError) {
	var $msg = jQuery('#message');
	$msg.toggleClass('error', !!isError).html(html);
}

function handleCopy() {
	chrome.windows.getCurrent(function(win) {
		chrome.runtime.sendMessage({ type: 'getTabs', windowId: win.id }, async function(response) {
			if (!response || response.error) {
				showMessage(response ? response.error : 'Unknown error', true);
				return;
			}
			try {
				if (response.extended_mime) {
					await navigator.clipboard.write([
						new ClipboardItem({
							'text/html': new Blob([response.text], { type: 'text/html' }),
							'text/plain': new Blob([response.text], { type: 'text/plain' })
						})
					]);
				} else {
					await navigator.clipboard.writeText(response.text);
				}
				var n = response.tabCount;
				var plural = n > 1 ? 's' : '';
				showMessage('<b>' + n + '</b> url' + plural + ' successfully copied!');
				setTimeout(function() { window.close(); }, 3000);
			} catch (e) {
				showMessage('Failed to write to clipboard: ' + e.message, true);
			}
		});
	});
}

async function handlePaste() {
	var clipboardText;
	try {
		clipboardText = await navigator.clipboard.readText();
	} catch (e) {
		showMessage('Failed to read clipboard: ' + e.message, true);
		return;
	}

	chrome.runtime.sendMessage({ type: 'openUrls', clipboardText: clipboardText }, function(response) {
		if (!response || response.error) {
			showMessage(response ? response.error : 'Unknown error', true);
		} else {
			window.close();
		}
	});
}

jQuery(function($) {
	$('#actionCopy').on('click', function() {
		handleCopy();
	});

	$('#actionPaste').on('click', function() {
		handlePaste();
	});

	$('#actionOption').on('click', function() {
		chrome.tabs.create({ url: 'options.html' });
	});

	$('#contribute a').on('click', function(e) {
		e.preventDefault();
		chrome.tabs.create({ url: 'options.html#donate' });
	});

	// Default action
	chrome.storage.local.get('default_action', function(result) {
		var default_action = result.default_action || 'menu';
		if (default_action !== 'menu') {
			$('body>ul').hide();
			$('#message').css({ padding: '3px 0 5px' });
			if (default_action === 'copy') handleCopy();
			else if (default_action === 'paste') handlePaste();
		}
	});

	// Recent update notification
	chrome.storage.local.get('update_last_time', function(result) {
		if (!result.update_last_time) return;
		var diff = Date.now() - parseInt(result.update_last_time);
		if (diff < 86400000) {
			var content = 'New version recently installed. Check the <a href="#">changelog</a>.';
			$('#recently-updated').html(content).show().find('a').on('click', function(e) {
				e.preventDefault();
				chrome.tabs.create({ url: 'https://finalclap.github.io/CopyAllUrl_Chrome/' });
			});
		}
	});
});
