// Options page script for Copy All Urls (Manifest V3)
// Uses chrome.storage.local instead of localStorage

var SETTINGS_KEYS = [
	'format', 'anchor', 'format_custom_advanced', 'intelligent_paste',
	'walk_all_windows', 'highlighted_tab_only', 'default_action', 'mime'
];

function loadSettings(callback) {
	chrome.storage.local.get(SETTINGS_KEYS, callback);
}

function saveSetting(key, value) {
	var obj = {};
	obj[key] = value;
	chrome.storage.local.set(obj, function() {
		loadSettings(function(settings) {
			OptionFormManager.init(settings);
		});
	});
}

jQuery(document).ready(function($) {
	// Display version
	$('#cpau_version_label').html(chrome.runtime.getManifest().version);

	// Initialize form from saved settings
	loadSettings(function(settings) {
		OptionFormManager.init(settings);
	});

	// Format change
	$('#formats input[type=radio]').change(function() {
		saveSetting('format', $(this).val());
	});

	// HTML anchor change
	$('#format_html_advanced input[type=radio]').change(function() {
		saveSetting('anchor', $(this).val());
	});

	// Custom format template change
	$('#format_custom_advanced>textarea').change(function() {
		saveSetting('format_custom_advanced', $(this).val());
	});

	// Intelligent paste
	$('#intelligent_paste').change(function() {
		saveSetting('intelligent_paste', $(this).prop('checked'));
	});

	// Copy tabs from all windows
	$('#walk_all_windows').change(function() {
		saveSetting('walk_all_windows', $(this).prop('checked'));
	});

	// Highlighted only
	$('#highlighted_tab_only').change(function() {
		saveSetting('highlighted_tab_only', $(this).prop('checked'));
	});

	// Default action
	$('#default_action').change(function() {
		saveSetting('default_action', $(this).val());
	});

	// MIME type
	$('#mime').change(function() {
		saveSetting('mime', $(this).val());
	});

	// Reset settings
	$('#reset_settings').click(function() {
		OptionFormManager.optionsReset();
	});

	// Update copyright year
	var currentYear = new Date().getFullYear();
	if (parseInt($('#copyright-year-footer').text()) < currentYear) {
		$('#copyright-year-footer').text(currentYear);
	}

	// Open chrome:// links via tabs API (direct navigation is blocked)
	$('.open-link-via-chrome-api').click(function(e) {
		e.preventDefault();
		e.stopImmediatePropagation();
		var href = $(this).attr('href');
		if (!href) return;
		if ($(this).hasClass('on-new-tab')) {
			chrome.tabs.create({ url: href });
		} else {
			chrome.tabs.update({ url: href });
		}
	});

	// Recent update notification
	chrome.storage.local.get('update_last_time', function(result) {
		if (!result.update_last_time) return;
		var diff = Date.now() - parseInt(result.update_last_time);
		if (diff < 86400000) {
			var content = '<h3>New version recently installed : ' + chrome.runtime.getManifest().version + '</h3>'
				+ 'Check the <a href="https://finalclap.github.io/CopyAllUrl_Chrome/">changelog</a> to see what\'s new !<br>'
				+ '<em>This notice will go off automatically</em>';
			$('#recently-updated').html(content).show();
		}
	});

	// Decode contact email
	var email = (function() {
		var coded = "49vVNJ@y36Ws4sWA.4VN";
		var key = "bP3Oc7k8xzM2dnm0oWZplqEw4SKf1UDBr6NeVCTAshItiLYyjQu5vXHJFRGag9";
		var shift = coded.length;
		var output = "";
		for (var i = 0; i < coded.length; i++) {
			if (key.indexOf(coded.charAt(i)) === -1) {
				output += coded.charAt(i);
			} else {
				var ltr = (key.indexOf(coded.charAt(i)) - shift + key.length) % key.length;
				output += key.charAt(ltr);
			}
		}
		return output;
	})();
	$('#contact-link').attr('href', 'mailto:' + email).find('span').html(email);
});

var OptionFormManager = {
	init: function(settings) {
		var format = settings.format || 'text';
		var anchor = settings.anchor || 'url';
		var format_custom_advanced = settings.format_custom_advanced || '';
		var intelligent_paste = settings.intelligent_paste === true || settings.intelligent_paste === 'true';
		var walk_all_windows = settings.walk_all_windows === true || settings.walk_all_windows === 'true';
		var highlighted_tab_only = settings.highlighted_tab_only === true || settings.highlighted_tab_only === 'true';
		var default_action = settings.default_action || 'menu';
		var mime = settings.mime || 'plaintext';

		// Format radio buttons
		this.checkFormat(format);

		// Anchor radio buttons
		jQuery('#format_html_advanced input[type=radio]').prop('checked', false);
		jQuery('#format_html_anchor_' + anchor).prop('checked', true);

		// Custom template textarea
		jQuery('#format_custom_advanced>textarea').val(format_custom_advanced);

		// Show/hide advanced panels
		jQuery('#format_html_advanced').toggle(format === 'html');
		jQuery('#format_custom_advanced').toggle(format === 'custom');

		// Checkboxes
		jQuery('#intelligent_paste').prop('checked', intelligent_paste);
		jQuery('#walk_all_windows').prop('checked', walk_all_windows);
		jQuery('#highlighted_tab_only').prop('checked', highlighted_tab_only);

		// Selects
		jQuery('#default_action').val(default_action);
		jQuery('#mime').val(mime);
	},

	checkFormat: function(option) {
		jQuery('#formats input[type=radio]').prop('checked', false);
		jQuery('#format_' + option).prop('checked', true);
	},

	optionsReset: function() {
		chrome.storage.local.remove(SETTINGS_KEYS, function() {
			loadSettings(function(settings) {
				OptionFormManager.init(settings);
			});
		});
	}
};
