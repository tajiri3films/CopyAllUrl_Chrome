// Service Worker for Copy All Urls (Manifest V3)
importScripts('vendor/encoder.js');

// ---- Tab formatting ----

function tabsToHtml(tabs, settings) {
	var anchor = settings.anchor || 'url';
	var s = '';
	for (var i = 0; i < tabs.length; i++) {
		var rowAnchor = tabs[i].url;
		if (anchor === 'title') {
			try {
				Encoder.EncodeType = 'entity';
				rowAnchor = Encoder.htmlEncode(tabs[i].title);
			} catch (ex) {
				rowAnchor = tabs[i].title;
			}
		}
		s += '<a href="' + tabs[i].url + '">' + rowAnchor + '</a><br/>\n';
	}
	return s;
}

function tabsToCustom(tabs, settings) {
	var template = settings.format_custom_advanced || null;
	if (!template) return 'ERROR : Row template is empty ! (see options page)';
	var s = '';
	for (var i = 0; i < tabs.length; i++) {
		s += template
			.replace(/\$url/gi, tabs[i].url)
			.replace(/\$title/gi, tabs[i].title);
	}
	return s;
}

function tabsToText(tabs) {
	var s = '';
	for (var i = 0; i < tabs.length; i++) {
		s += tabs[i].url + '\n';
	}
	return s;
}

function tabsToJson(tabs) {
	var data = [];
	for (var i = 0; i < tabs.length; i++) {
		data.push({ url: tabs[i].url, title: tabs[i].title });
	}
	return JSON.stringify(data);
}

function formatTabs(tabs, settings) {
	var format = settings.format || 'text';
	var text = '';
	var extended_mime = false;

	if (format === 'html') {
		text = tabsToHtml(tabs, settings);
		extended_mime = settings.mime === 'html';
	} else if (format === 'custom') {
		text = tabsToCustom(tabs, settings);
		extended_mime = settings.mime === 'html';
	} else if (format === 'json') {
		text = tabsToJson(tabs);
	} else {
		text = tabsToText(tabs);
	}

	return { text: text, extended_mime: extended_mime };
}

// ---- Tab filtering ----

async function getFilteredTabs(windowId, settings) {
	var highlightedOnly = settings.highlighted_tab_only === true || settings.highlighted_tab_only === 'true';
	var allWindows = settings.walk_all_windows === true || settings.walk_all_windows === 'true';
	var query = allWindows ? {} : { windowId: windowId };
	var tabs = await chrome.tabs.query(query);
	if (highlightedOnly) {
		tabs = tabs.filter(function(t) { return t.highlighted; });
	}
	return tabs;
}

// ---- URL extraction for paste ----

function extractUrls(text, intelligent) {
	if (intelligent) {
		return text.match(/(https?|ftp|ssh|mailto):\/\/[a-z0-9\/:%_+.,#?!@&=-]+/gi) || [];
	}
	return text.split('\n');
}

function cleanUrls(list) {
	return list.map(function(url) {
		var m = url.match(/<a[^>]+href="([^"]+)"/i);
		return (m ? m[1] : url).trim();
	}).filter(function(url) { return url !== ''; });
}

// ---- Offscreen document management ----

async function ensureOffscreenDocument() {
	var offscreenUrl = chrome.runtime.getURL('offscreen.html');
	try {
		var existing = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
			documentUrls: [offscreenUrl]
		});
		if (existing.length > 0) return;
	} catch (e) {
		// getContexts not available in older Chrome versions
	}
	try {
		await chrome.offscreen.createDocument({
			url: 'offscreen.html',
			reasons: ['CLIPBOARD'],
			justification: 'Read/write clipboard for tab URL copy/paste'
		});
	} catch (e) {
		// Already exists
		if (!e.message || !e.message.includes('already exists')) throw e;
	}
}

async function closeOffscreenDocument() {
	try { await chrome.offscreen.closeDocument(); } catch (e) {}
}

async function writeToClipboardViaOffscreen(text, extended_mime) {
	await ensureOffscreenDocument();
	return new Promise(function(resolve) {
		chrome.runtime.sendMessage(
			{ target: 'offscreen', type: 'write-clipboard', text: text, extended_mime: extended_mime },
			resolve
		);
	});
}

async function readFromClipboardViaOffscreen() {
	await ensureOffscreenDocument();
	return new Promise(function(resolve) {
		chrome.runtime.sendMessage(
			{ target: 'offscreen', type: 'read-clipboard' },
			resolve
		);
	});
}

// ---- Badge management ----

async function updateBadge() {
	var result = await chrome.storage.local.get('update_last_time');
	if (result.update_last_time) {
		var diff = Date.now() - parseInt(result.update_last_time);
		if (diff < 86400000) {
			chrome.action.setBadgeText({ text: 'NEW' });
			return;
		}
	}
	chrome.action.setBadgeText({ text: '' });
}

// ---- Keyboard commands ----

chrome.commands.onCommand.addListener(async function(command) {
	if (command === 'copy') {
		try {
			var win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
			var settings = await chrome.storage.local.get([
				'format', 'anchor', 'mime', 'highlighted_tab_only', 'walk_all_windows', 'format_custom_advanced'
			]);
			var tabs = await getFilteredTabs(win.id, settings);
			var formatted = formatTabs(tabs, settings);
			await writeToClipboardViaOffscreen(formatted.text, formatted.extended_mime);
		} catch (e) {
			console.error('Copy command error:', e);
		} finally {
			await closeOffscreenDocument();
		}
	} else if (command === 'paste') {
		try {
			var settingsPaste = await chrome.storage.local.get('intelligent_paste');
			var clipboardText = await readFromClipboardViaOffscreen();
			var intelligent = settingsPaste.intelligent_paste === true || settingsPaste.intelligent_paste === 'true';
			var urls = cleanUrls(extractUrls(clipboardText || '', intelligent));
			for (var i = 0; i < urls.length; i++) {
				await chrome.tabs.create({ url: urls[i] });
			}
		} catch (e) {
			console.error('Paste command error:', e);
		} finally {
			await closeOffscreenDocument();
		}
	}
});

// ---- Update lifecycle ----

chrome.runtime.onInstalled.addListener(async function(details) {
	if (details.reason !== 'update') return;
	var manifest = chrome.runtime.getManifest();
	if (details.previousVersion === manifest.version) return;

	await chrome.storage.local.set({
		update_last_time: Date.now(),
		update_previous_version: details.previousVersion
	});

	updateBadge();

	chrome.notifications.create('cpau_update_notification', {
		type: 'basic',
		title: 'Copy All Urls updated',
		message: 'New version installed : ' + manifest.version + '. Click to see new features.',
		iconUrl: 'img/umbrella_128.png'
	});
});

chrome.notifications.onClicked.addListener(function(notificationId) {
	if (notificationId === 'cpau_update_notification') {
		chrome.tabs.create({ url: 'https://finalclap.github.io/CopyAllUrl_Chrome/' });
	}
});

// ---- Messages from popup ----

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	// Messages intended for the offscreen document are handled there
	if (msg.target === 'offscreen') return false;

	if (msg.type === 'getTabs') {
		(async function() {
			try {
				var settings = await chrome.storage.local.get([
					'format', 'anchor', 'mime', 'highlighted_tab_only', 'walk_all_windows', 'format_custom_advanced'
				]);
				var tabs = await getFilteredTabs(msg.windowId, settings);
				var result = formatTabs(tabs, settings);
				sendResponse({ text: result.text, extended_mime: result.extended_mime, tabCount: tabs.length });
			} catch (e) {
				sendResponse({ error: e.message });
			}
		})();
		return true;
	}

	if (msg.type === 'openUrls') {
		(async function() {
			try {
				var settings = await chrome.storage.local.get('intelligent_paste');
				var intelligent = settings.intelligent_paste === true || settings.intelligent_paste === 'true';
				var urls = cleanUrls(extractUrls(msg.clipboardText || '', intelligent));
				if (urls.length === 0) {
					sendResponse({ error: 'No URL found in the clipboard' });
					return;
				}
				for (var i = 0; i < urls.length; i++) {
					await chrome.tabs.create({ url: urls[i] });
				}
				sendResponse({ openedCount: urls.length });
			} catch (e) {
				sendResponse({ error: e.message });
			}
		})();
		return true;
	}
});

// ---- Initialize ----
updateBadge();
