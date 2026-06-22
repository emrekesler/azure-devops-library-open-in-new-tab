// ==UserScript==
// @name         Azure DevOps Variable Groups New Tab Opener
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Opens Azure DevOps Variable Groups in new tabs with proper links
// @match        https://dev.azure.com/*/*/_library*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        TIMEOUT: 10000,
        SELECTORS: {
            TBODY: 'tbody.relative',
            DATA_PROVIDERS: '#dataProviders',
            SPACER: 'tr.bolt-list-row-spacer'
        }
    };

    let tableObserver = null;

    function waitForElement(selector, timeout = CONFIG.TIMEOUT) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) return resolve(element);

            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element "${selector}" not found within ${timeout}ms.`));
            }, timeout);
        });
    }

    function injectStyles() {
        if (document.getElementById('vg-newtab-styles')) return;
        const style = document.createElement('style');
        style.id = 'vg-newtab-styles';
        style.textContent = `
            a.vg-newtab-link {
                color: inherit !important;
                text-decoration: none !important;
            }
            a.vg-newtab-link:hover {
                text-decoration: underline !important;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }

    function getPageData() {
        const dataScript = document.querySelector(CONFIG.SELECTORS.DATA_PROVIDERS);
        let orgName, projectName;

        if (dataScript) {
            try {
                const pageData = JSON.parse(dataScript.textContent).data;
                orgName = pageData["ms.vss-web.page-data"]?.hostName;
                projectName = pageData["ms.vss-tfs-web.page-data"]?.project?.name;
            } catch (error) {
                console.warn('Failed to parse page data from #dataProviders:', error.message);
            }
        }

        // Fallback to URL parsing if not found in dataProviders
        if (!orgName || !projectName) {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            if (pathParts.length >= 2) {
                orgName = orgName || pathParts[0];
                projectName = projectName || pathParts[1];
            }
        }

        if (!orgName || !projectName) {
            throw new Error('Organization or project name could not be retrieved.');
        }

        return { orgName, projectName };
    }

    async function fetchVariableGroups(orgName, projectName) {
        const apiUrl = `https://dev.azure.com/${orgName}/${projectName}/_apis/distributedtask/variablegroups?continuationToken=0&queryOrder=0`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.value;
        } catch (error) {
            throw new Error(`Failed to fetch variable groups: ${error.message}`);
        }
    }

    function enhanceTableRows(tbody, groups, orgName, projectName) {
        if (tableObserver) {
            tableObserver.disconnect();
            tableObserver = null;
        }

        const nameToGroupMap = new Map(groups.map(group => [group.name, group]));

        const processRows = () => {
            const rows = tbody.querySelectorAll('tr.bolt-table-row');
            rows.forEach(row => {
                // Find the first column cell (usually where the name is)
                const cell = row.querySelector('[data-column-index="0"]') || row.querySelector('[aria-colindex="2"]');
                if (!cell) return;

                // Use TreeWalker to find any text nodes that match the variable group name exactly
                const walk = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, null, false);
                let node;
                const matchedNodes = [];
                while (node = walk.nextNode()) {
                    const text = node.textContent.trim();
                    if (text && nameToGroupMap.has(text)) {
                        matchedNodes.push({ node, text });
                    }
                }

                // Process the matched nodes
                matchedNodes.forEach(({ node, text }) => {
                    const group = nameToGroupMap.get(text);
                    const parent = node.parentElement;

                    // If already processed or already inside a link, skip
                    if (parent.classList.contains('vg-newtab-link') || parent.closest('.vg-newtab-link')) {
                        return;
                    }

                    // Create the replacement link
                    const link = document.createElement('a');
                    link.className = 'vg-newtab-link';
                    link.href = `https://dev.azure.com/${orgName}/${projectName}/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=${group.id}&path=${encodeURIComponent(group.name)}`;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';

                    // Stop click propagation so native row click navigation is not triggered in the same tab
                    link.addEventListener('click', (event) => {
                        event.stopPropagation();
                    });

                    // Replace text node with a wrapped version in a link
                    parent.replaceChild(link, node);
                    link.appendChild(node);
                });
            });
        };

        // Run decoration initially
        processRows();

        // Start observing mutations inside the tbody
        tableObserver = new MutationObserver(() => {
            // Temporarily disconnect observer to prevent recursive mutations
            tableObserver.disconnect();
            try {
                processRows();
            } catch (error) {
                console.error('Error processing table rows during mutation:', error);
            } finally {
                // Reconnect the observer
                tableObserver.observe(tbody, { childList: true, subtree: true });
            }
        });

        tableObserver.observe(tbody, { childList: true, subtree: true });
        console.log('Observation and decoration setup complete on table rows.');
    }

    function isVariableGroupsView() {
        const urlParams = new URLSearchParams(window.location.search);
        const itemType = urlParams.get('itemType');
        // If itemType is not present, it defaults to Variable Groups view.
        // If itemType is present, it must be 'VariableGroups'.
        return itemType === null || itemType === 'VariableGroups';
    }

    async function main() {
        try {
            if (!isVariableGroupsView()) {
                console.log('Not on the Variable Groups view, script will not run.');
                return;
            }

            console.log('Azure DevOps Variable Groups New Tab Opener starting...');
            
            // Inject link styles
            injectStyles();

            // Get page data
            const { orgName, projectName } = getPageData();
            console.log(`Organization: ${orgName}, Project: ${projectName}`);

            // Wait for table element
            const tbody = await waitForElement(CONFIG.SELECTORS.TBODY);
            console.log('Table found, preparing row enhancement...');

            // Fetch variable groups from API
            const groups = await fetchVariableGroups(orgName, projectName);
            console.log(`Found ${groups.length} variable groups.`);

            // Enhance table rows dynamically
            enhanceTableRows(tbody, groups, orgName, projectName);

        } catch (error) {
            console.error('UserScript Error:', error.message);
            console.error('Details:', error);
        }
    }

    // --- SPA Navigation Handler ---

    let lastUrl = window.location.href;

    // This function contains the core logic to be executed.
    function runScript() {
        if (isVariableGroupsView()) {
            main();
        } else {
            console.log('Not on the Variable Groups view, script will not run.');
            if (tableObserver) {
                tableObserver.disconnect();
                tableObserver = null;
            }
        }
    }

    // Observe for changes in the DOM, which indicates a potential SPA navigation.
    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // If the URL has changed to the library page, run the script.
            if (currentUrl.includes('/_library')) {
                runScript();
            } else {
                // If we navigated away from the library completely
                if (tableObserver) {
                    tableObserver.disconnect();
                    tableObserver = null;
                }
            }
        }
    });

    // Start observing the body for attribute and child list changes.
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Initial Load ---

    // Run the script on the initial page load if it's the correct page.
    if (window.location.href.includes('/_library')) {
        runScript();
    }

})();