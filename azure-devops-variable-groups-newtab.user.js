// ==UserScript==
// @name         Azure DevOps Variable Groups New Tab Opener
// @namespace    http://tampermonkey.net/
// @version      1.0.1
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

    function getPageData() {
        const dataScript = document.querySelector(CONFIG.SELECTORS.DATA_PROVIDERS);
        if (!dataScript) {
            throw new Error('Data providers script element not found.');
        }

        try {
            const pageData = JSON.parse(dataScript.textContent).data;
            const orgName = pageData["ms.vss-web.page-data"]?.hostName;
            const projectName = pageData["ms.vss-tfs-web.page-data"]?.project?.name;

            if (!orgName || !projectName) {
                throw new Error('Organization or project name could not be retrieved.');
            }

            return { orgName, projectName };
        } catch (error) {
            throw new Error(`Failed to parse page data: ${error.message}`);
        }
    }

    async function fetchVariableGroups(orgName, projectName) {
        const apiUrl = `https://dev.azure.com/${orgName}/${projectName}/_apis/distributedtask/variablegroups?continuationToken=0&queryOrder=0`;
        
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API call failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            return data.value.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
        } catch (error) {
            throw new Error(`Failed to fetch variable groups: ${error.message}`);
        }
    }

    function createTableRow(group, index, orgName, projectName) {
        const tr = document.createElement('tr');
        tr.className = `bolt-table-row bolt-list-row ${index === 0 ? 'first-row focused' : ''} single-click-activation`;
        tr.setAttribute('aria-rowindex', index + 2);
        tr.setAttribute('data-focuszone', `focuszone-${index + 5}`);
        tr.setAttribute('data-row-index', index);
        tr.setAttribute('role', 'row');
        tr.setAttribute('tabindex', '0');

        const link = `https://dev.azure.com/${orgName}/${projectName}/_library?itemType=VariableGroups&view=VariableGroupView&variableGroupId=${group.id}&path=${encodeURIComponent(group.name)}`;
        const modifiedDate = new Date(group.modifiedOn).toLocaleDateString('en-US', { weekday: 'long' });
        const modifierName = group.modifiedBy?.displayName || 'Unknown';
        const modifierImageUrl = group.modifiedBy?.id ? `/${orgName}/${projectName}/_api/_common/IdentityImage?id=${group.modifiedBy.id}` : '';

        tr.innerHTML = `
            <td aria-hidden="true" class="bolt-table-cell-compact bolt-table-cell bolt-list-cell bolt-table-spacer-cell" role="presentation"></td>
            <td aria-colindex="1" class="bolt-table-cell bolt-list-cell" data-column-index="0" role="gridcell">
                <div class="bolt-table-cell-content flex-row flex-center">
                    <span class="fluent-icons-enabled">
                        <span aria-hidden="true" class="vg-item-name-icon flex-noshrink fabric-icon ms-Icon--Variable"></span>
                    </span>
                    <a class="lib-item-var-name" href="${link}" target="_blank" rel="noopener noreferrer">
                        ${group.name}
                    </a>
                </div>
            </td>
            <td aria-colindex="2" class="bolt-table-cell-side-action bolt-table-cell bolt-list-cell col-1" data-column-index="1">
                <div class="bolt-table-cell-content-reveal flex-row justify-center">
                    <div class="bolt-table-button-more bolt-expandable-button inline-flex-row">
                        <button aria-expanded="false" aria-haspopup="true" aria-label="More options"
                                class="icon-only bolt-button bolt-icon-button enabled subtle icon-only bolt-focus-treatment"
                                data-focuszone="focuszone-${index + 11}"
                                data-is-focusable="true"
                                role="button"
                                tabindex="-1"
                                type="button">
                            <span class="fluent-icons-enabled">
                                <span aria-hidden="true" class="small left-icon flex-noshrink fabric-icon ms-Icon--MoreVertical medium"></span>
                            </span>
                        </button>
                    </div>
                </div>
            </td>
            <td aria-colindex="3" class="bolt-table-cell bolt-list-cell" data-column-index="2" role="gridcell">
                <div class="bolt-table-cell-content flex-row flex-center">
                    <span class="lib-item-list-date">${modifiedDate}</span>
                </div>
            </td>
            <td aria-colindex="4" class="bolt-table-cell bolt-list-cell" data-column-index="3" role="gridcell">
                <div class="bolt-table-cell-content flex-row flex-center">
                    ${modifierImageUrl ? `<img class="lib-item-modifiedby-img" src="${modifierImageUrl}" alt="" />` : ''}
                    <span class="lib-item-modifiedby-name">${modifierName}</span>
                </div>
            </td>
            <td aria-colindex="5" class="bolt-table-cell bolt-list-cell" data-column-index="4" role="gridcell">
                <div class="bolt-table-cell-content flex-row flex-center">
                    <span class="lib-item-desc">${group.description || ''}</span>
                </div>
            </td>
            <td aria-hidden="true" class="bolt-table-cell-compact bolt-table-cell bolt-list-cell bolt-table-spacer-cell" role="presentation"></td>
        `;

        // Prevent the row's default click event from firing, which causes navigation.
        // This allows the <a> tag's target="_blank" to work correctly without interference.
        tr.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        return tr;
    }

    function populateTable(tbody, groups, orgName, projectName) {
        // Clear existing content but preserve spacer
        const spacer = tbody.querySelector(CONFIG.SELECTORS.SPACER);
        tbody.innerHTML = '';
        if (spacer) tbody.appendChild(spacer);

        // Create and append table rows
        const fragment = document.createDocumentFragment();
        groups.forEach((group, index) => {
            const row = createTableRow(group, index, orgName, projectName);
            fragment.appendChild(row);
        });
        tbody.appendChild(fragment);

        console.log(`Successfully loaded ${groups.length} variable groups.`);
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
            
            // Get page data
            const { orgName, projectName } = getPageData();
            console.log(`Organization: ${orgName}, Project: ${projectName}`);

            // Wait for table element
            const tbody = await waitForElement(CONFIG.SELECTORS.TBODY);
            console.log('Table found, loading data...');

            // Fetch variable groups from API
            const groups = await fetchVariableGroups(orgName, projectName);
            console.log(`Found ${groups.length} variable groups.`);

            // Populate table
            populateTable(tbody, groups, orgName, projectName);

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