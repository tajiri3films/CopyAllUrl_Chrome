Copy All URLs for Google Chrome
================================

> **This is a fork of [finalclap/CopyAllUrl_Chrome](https://github.com/finalclap/CopyAllUrl_Chrome), updated to support Manifest V3.**
> The original repository is no longer actively maintained.

CopyAllURLs is a Google Chrome extension to copy all open tab URLs to the clipboard, and to open multiple URLs from the clipboard (paste).

> The original extension is available on the Chrome Web Store (by the original author):
> https://chrome.google.com/webstore/detail/copy-all-urls/djdmadneanknadilpjiknlnanaolmbfk

## Changes in this fork

- Migrated from Manifest V2 to **Manifest V3**
- Replaced background page with a service worker
- Replaced `localStorage` with `chrome.storage.local`
- Clipboard access via `navigator.clipboard` API and Offscreen Document
- Removed Google Analytics

## Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the repository folder
