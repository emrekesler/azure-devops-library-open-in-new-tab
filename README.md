# Azure DevOps Variable Groups New Tab Opener 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green.svg)](https://www.tampermonkey.net/)
[![Violentmonkey](https://img.shields.io/badge/Violentmonkey-Compatible-green.svg)](https://violentmonkey.github.io/)

A lightweight UserScript (Tampermonkey / Violentmonkey / Greasemonkey) that enhances the **Azure DevOps Library** page by allowing you to open **Variable Groups** in new browser tabs.

---

## 🔍 The Problem

By default, Azure DevOps operates as a Single Page Application (SPA). When you navigate to the **Library** page, clicking on any Variable Group opens its editor in the **same tab**. This behavior has major drawbacks:
1. **Losing Context**: You lose your scroll position and active filters in the main list.
2. **No Multi-tasking**: You cannot compare two variable groups side-by-side or edit multiple groups simultaneously.
3. **No Native Open in New Tab**: The native UI elements do not support middle-clicking, right-click menu navigation, or Ctrl-clicking to open in a new tab.

---

## ✨ Features

- 🔗 **Native Link Behavior**: Adds proper `href` attributes to Variable Group names so you can middle-click, Ctrl-click, or right-click to open in a new tab.
- 🔍 **React-Friendly Search & Filter**: Fully compatible with Azure DevOps' built-in search box, pagination, and columns sorting.
- ⚡ **Performance Optimized**: Uses efficient DOM decoration and observer methods without replacing the original React elements or breaking the UI.
- 🌍 **SPA Navigation Support**: Automatically updates and handles dynamic route transitions inside Azure DevOps seamlessly.

---

## 🚀 Installation

### Step 1: Install a UserScript Manager
Make sure you have one of the following extension installed in your browser:
*   [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
*   [Violentmonkey](https://violentmonkey.github.io/)
*   [Greasemonkey](https://www.greasespot.net/)

### Step 2: Install the Script
Click the link below to install the script directly via your manager:

👉 **[Click Here to Install Script](https://github.com/emrekesler/azure-devops-library-open-in-new-tab/raw/main/azure-devops-variable-groups-newtab.user.js)**

*(Or copy the code from [azure-devops-variable-groups-newtab.user.js](https://github.com/emrekesler/azure-devops-library-open-in-new-tab/raw/main/azure-devops-variable-groups-newtab.user.js) and paste it as a new script in your user script manager).*

---

## 🛠️ Configuration & Supported Platforms

The script runs automatically on the following URL matches:
*   `https://dev.azure.com/*/*/_library*`

Compatible with:
*   **Chrome**, **Firefox**, **Edge**, **Safari**, and other Chromium-based browsers.
*   **Azure DevOps Services** (Cloud edition) and **Azure DevOps Server** (On-premises).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/emrekesler/azure-devops-library-open-in-new-tab/issues).

## 📄 License

This project is [MIT](LICENSE) licensed.