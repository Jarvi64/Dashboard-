/**
 * HR-Gemini UI Rendering
 */

/**
 * Renders the table headers with sort/hide dropdowns and resize-handles.
 */
window.renderHeaders = function () {
    const tableHead = document.getElementById('table-head');
    let html = '<tr>';
    
    window.cols.forEach((c, i) => {
        if (!c.show) return;

        const widthStyle = c.width ? `style="width:${c.width}"` : '';
        const sLabel = sanitizeHTML(c.label);
        
        // Sorting is only through dropdown now
        const isSortable = c.id === 'Exp' || c.id === 'Score';
        const isCandidate = c.id === 'Candidate';

        html += `<th ${widthStyle} data-col-id="${c.id}" data-col-idx="${i}" style="position:relative;">
            <div class="header-container">
                <div class="header-btn" data-id="${c.id}">
                    <span>${sLabel}</span>
                </div>
                ${!isCandidate ? `
                <div class="dropdown-trigger" data-id="${c.id}">
                    <i data-lucide="chevron-down" width="12"></i>
                </div>
                ` : ''}
            </div>
            
            ${!isCandidate ? `
            <div class="dropdown-menu header-dropdown-menu" id="dropdown-${c.id}">
                ${isSortable ? `
                <div class="dropdown-item sort-asc" data-id="${c.id}">
                    <i data-lucide="arrow-up" width="14"></i> Sort Asc
                </div>
                <div class="dropdown-item sort-desc" data-id="${c.id}">
                    <i data-lucide="arrow-down" width="14"></i> Sort Desc
                </div>
                ` : ''}
                <div class="dropdown-item hide-col" data-id="${c.id}">
                    <i data-lucide="eye-off" width="14"></i> Hide Column
                </div>
            </div>
            ` : ''}
            <div class="resize-handle"></div>
        </th>`;
    });
    html += '</tr>';
    tableHead.innerHTML = html;
    lucide.createIcons();
    setupHeaderListeners();
}

/**
 * Renders the candidate table view.
 */
window.renderTable = function () {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (currentPage > totalPages) window.currentPage = totalPages;
    if (currentPage < 1) window.currentPage = 1;

    renderPaginationControls(totalPages);

    const startIdx = (currentPage - 1) * rowsPerPage;
    const pageData = filteredData.slice(startIdx, startIdx + rowsPerPage);

    pageData.forEach(item => {
        const tr = document.createElement('tr');
        tr.onclick = () => showCandidateModal(item._id);
        
        let html = '';

        window.cols.forEach(c => {
            if (!c.show) return;

            if (c.type === 'contact') {
                const nameKey = fieldMapping.candidate || '';
                const emailKey = Object.keys(item).find(k => k.toLowerCase().includes('email')) || '';
                const phoneKey = Object.keys(item).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')) || '';
                html += `<td>
                    <div class="name-cell-inner">
                        <div class="avatar" style="background: ${getAvatarGradient(item[nameKey])}">
                            ${getInitials(item[nameKey])}
                        </div>
                        <div class="contact-info">
                            <b>${sanitizeHTML(item[nameKey]) || 'Unknown'}</b>
                            <div style="font-size: 0.75rem; color: var(--muted-foreground); display: flex; flex-direction: column; gap: 1px;">
                                <span>${sanitizeHTML(item[emailKey]) || ''}</span>
                                ${item[phoneKey] ? `<span>${sanitizeHTML(item[phoneKey])}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </td>`;
            } else if (c.type === 'status') {
                const status = item._calculatedStatus;
                let badgeClass = (status === 'Shortlisted') ? 'badge-success' : ((status === 'Rejected') ? 'badge-danger' : 'badge-warning');
                html += `<td><span class="badge ${badgeClass}">${status}</span></td>`;
            } else if (c.type === 'score') {
                const score = item._calculatedScore;
                const scoreClass = score >= 70 ? 'score-high' : (score < 40 ? 'score-low' : 'score-mid');
                
                let sparklineHtml = '';
                const paramColors = ['spark-edu', 'spark-dom', 'spark-exp', 'spark-req'];
                const keys = Object.keys(item);
                
                // Build tooltip content with score breakdown
                let tooltipHtml = '<div class="score-tooltip"><div class="score-tooltip-title">Score Breakdown</div>';
                let totalWeight = 0;
                let weightedSum = 0;
                
                // Calculate total weight first
                scoringParams.forEach((param) => {
                    totalWeight += window.weights[param.id] || 5;
                });
                
                scoringParams.forEach((param, idx) => {
                    const key = keys.find(k => {
                        const low = k.toLowerCase();
                        return low.includes('score') && param.keywords.some(kw => low.includes(kw));
                    });
                    const val = key ? parseFloat(item[key]) || 0 : 0;
                    const weight = window.weights[param.id] || 5;
                    const weightPercent = ((weight / totalWeight) * 100).toFixed(0);
                    const contribution = ((val * weight) / totalWeight).toFixed(1);
                    weightedSum += parseFloat(contribution);
                    
                    const height = Math.min(100, Math.max(10, val * 10));
                    sparklineHtml += `<div class="sparkline-bar ${paramColors[idx % paramColors.length]}" style="height:${height}%"></div>`;
                    
                    tooltipHtml += `
                        <div class="score-tooltip-row">
                            <span class="score-tooltip-label">${param.label}</span>
                            <div class="score-tooltip-calc">
                                <span class="score-tooltip-value">${val}</span>
                                <span class="score-tooltip-op">×</span>
                                <span class="score-tooltip-weight">${weightPercent}%</span>
                                <span class="score-tooltip-op">=</span>
                                <span class="score-tooltip-result">${contribution}</span>
                            </div>
                        </div>
                    `;
                });
                
                tooltipHtml += `
                    <div class="score-tooltip-total">
                        <span>Final Score (×10)</span>
                        <span class="${scoreClass}">${score}</span>
                    </div>
                </div>`;

                html += `<td>
                    <div style="display:flex; align-items:center; gap:0.75rem; position:relative;">
                        <span class="final-score ${scoreClass} score-with-tooltip" style="font-weight:700; cursor:help;" data-tooltip='${tooltipHtml.replace(/'/g, "&apos;")}'>${score}</span>
                        <div class="sparkline-container" style="display:flex; align-items:flex-end; gap:2px; height:20px; width:40px;">
                            ${sparklineHtml}
                        </div>
                    </div>
                </td>`;
            } else if (c.type === 'subcards') {
                const keys = Object.keys(item);
                const subScores = scoringParams.map(p => {
                    const key = keys.find(k => {
                        const low = k.toLowerCase();
                        return low.includes('score') && p.keywords.some(kw => low.includes(kw));
                    });
                    return { label: p.label.substring(0, 2), val: key ? item[key] : '0' };
                });

                html += `<td>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${subScores.map(s => {
                            const val = parseFloat(s.val) || 0;
                            const percentage = (val / 10) * 100;
                            const color = val >= 7 ? 'var(--success)' : (val >= 5 ? 'var(--warning)' : 'var(--danger)');
                            return `
                                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;" title="${s.label}: ${val}">
                                    <div style="position: relative; width: 32px; height: 32px;">
                                        <svg width="32" height="32" style="transform: rotate(-90deg);">
                                            <circle cx="16" cy="16" r="14" fill="none" stroke="var(--border)" stroke-width="2"></circle>
                                            <circle cx="16" cy="16" r="14" fill="none" stroke="${color}" stroke-width="2" 
                                                    stroke-dasharray="${2 * Math.PI * 14}" 
                                                    stroke-dashoffset="${2 * Math.PI * 14 * (1 - percentage / 100)}"
                                                    style="transition: stroke-dashoffset 0.3s ease;"></circle>
                                        </svg>
                                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                                    font-size: 0.65rem; font-weight: 700; color: var(--foreground);">
                                            ${val}
                                        </div>
                                    </div>
                                    <span style="font-size: 0.6rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.02em;">
                                        ${s.label}
                                    </span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>`;
            } else if (c.type === 'tags') {
                html += `<td>${renderTags(item[c.dataKey])}</td>`;
            } else {
                html += `<td>${sanitizeHTML(item[c.dataKey]) || '-'}</td>`;
            }
        });

        tr.innerHTML = html;
        tableBody.appendChild(tr);
    });
}

/**
 * Renders the Kanban board view.
 */
window.renderKanban = function () {
    const listShort = document.getElementById('list-shortlisted');
    const listBorder = document.getElementById('list-borderline');
    const listReject = document.getElementById('list-rejected');
    
    if (listShort) listShort.innerHTML = '';
    if (listBorder) listBorder.innerHTML = '';
    if (listReject) listReject.innerHTML = '';

    let counts = { 'Shortlisted': 0, 'Borderline': 0, 'Rejected': 0 };
    const kanbanData = [...filteredData].sort((a, b) => b._calculatedScore - a._calculatedScore);

    kanbanData.forEach(item => {
        const status = item._calculatedStatus;
        counts[status]++;

        const card = document.createElement('div');
        card.className = 'k-card';
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
            e.currentTarget.classList.add('dragging');
            e.dataTransfer.setData("text", String(item._id));
        });
        card.addEventListener('dragend', (e) => e.currentTarget.classList.remove('dragging'));

        const nameKey = fieldMapping.candidate || '';
        const score = item._calculatedScore;
        const scoreClass = score >= 70 ? 'score-high' : (score < 40 ? 'score-low' : 'score-mid');

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                <div class="name-cell-inner">
                    <div class="avatar" style="background: ${getAvatarGradient(item[nameKey])}">
                        ${getInitials(item[nameKey])}
                    </div>
                    <b>${sanitizeHTML(item[nameKey]) || 'Unknown'}</b>
                </div>
                <span class="final-score ${scoreClass}" style="font-weight:700;">${score}</span>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 0.75rem; justify-content: center;">
                ${(() => {
                    const keys = Object.keys(item);
                    const subScores = scoringParams.map(p => {
                        const key = keys.find(k => {
                            const low = k.toLowerCase();
                            return low.includes('score') && p.keywords.some(kw => low.includes(kw));
                        });
                        return { label: p.label.substring(0, 2), val: key ? parseFloat(item[key]) || 0 : 0 };
                    });
                    return subScores.map(s => {
                        const percentage = (s.val / 10) * 100;
                        const color = s.val >= 7 ? 'var(--success)' : (s.val >= 5 ? 'var(--warning)' : 'var(--danger)');
                        return `
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;" title="${s.label}: ${s.val}">
                                <div style="position: relative; width: 28px; height: 28px;">
                                    <svg width="28" height="28" style="transform: rotate(-90deg);">
                                        <circle cx="14" cy="14" r="12" fill="none" stroke="var(--border)" stroke-width="2"></circle>
                                        <circle cx="14" cy="14" r="12" fill="none" stroke="${color}" stroke-width="2" 
                                                stroke-dasharray="${2 * Math.PI * 12}" 
                                                stroke-dashoffset="${2 * Math.PI * 12 * (1 - percentage / 100)}"
                                                style="transition: stroke-dashoffset 0.3s ease;"></circle>
                                    </svg>
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                                font-size: 0.6rem; font-weight: 700; color: var(--foreground);">
                                        ${s.val}
                                    </div>
                                </div>
                                <span style="font-size: 0.55rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase;">
                                    ${s.label}
                                </span>
                            </div>
                        `;
                    }).join('');
                })()}
            </div>
            <div class="tag-container" style="margin-top:0.5rem;">
                ${renderTags(item[fieldMapping.skills]).replace('tag-container', '')}
            </div>
        `;
        card.onclick = () => showCandidateModal(item._id);

        const listId = `list-${status.toLowerCase()}`;
        const container = document.getElementById(listId);
        if (container) container.appendChild(card);
    });

    if (document.getElementById('count-k-short')) document.getElementById('count-k-short').innerText = counts['Shortlisted'];
    if (document.getElementById('count-k-border')) document.getElementById('count-k-border').innerText = counts['Borderline'];
    if (document.getElementById('count-k-reject')) document.getElementById('count-k-reject').innerText = counts['Rejected'];
}

/**
 * Renders pagination controls.
 */
window.renderPaginationControls = function (totalPages) {
    const controls = document.getElementById('pagination-controls');
    if (!controls) return;
    
    const infoEl = document.getElementById('page-info-text');
    if (infoEl) infoEl.innerText = `Page ${currentPage} of ${totalPages}`;

    const sizeDisplay = document.getElementById('current-page-size');
    if (sizeDisplay) sizeDisplay.innerText = window.rowsPerPage;

    let html = `
        <button class="btn btn-outline btn-icon" ${currentPage === 1 ? 'disabled' : ''} data-page="1">
            <i data-lucide="chevrons-left" width="16"></i>
        </button>
        <button class="btn btn-outline btn-icon" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
            <i data-lucide="chevron-left" width="16"></i>
        </button>
        <button class="btn btn-outline btn-icon" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
            <i data-lucide="chevron-right" width="16"></i>
        </button>
        <button class="btn btn-outline btn-icon" ${currentPage === totalPages ? 'disabled' : ''} data-page="${totalPages}">
            <i data-lucide="chevrons-right" width="16"></i>
        </button>
    `;

    controls.innerHTML = html;
    lucide.createIcons();
    setupPaginationListeners();
}

/**
 * Pagination navigation helpers.
 */
window.changePageSize = function (size) {
    window.rowsPerPage = parseInt(size);
    window.currentPage = 1;
    renderTable();
}

window.goToPage = function (page) {
    window.currentPage = page;
    renderTable();
}

/**
 * Sets up pagination specific listeners.
 */
function setupPaginationListeners() {
    // Custom Page Size Dropdown
    const trigger = document.getElementById('page-size-trigger');
    const menu = document.getElementById('page-size-menu');
    
    if (trigger && menu) {
        trigger.onclick = (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        };

        menu.querySelectorAll('.dropdown-item').forEach(item => {
            item.onclick = (e) => {
                const val = item.dataset.value;
                window.changePageSize(val);
                menu.classList.remove('show');
            };
        });
    }

    // Page Buttons
    document.querySelectorAll('#pagination-controls [data-page]').forEach(btn => {
        btn.onclick = () => window.goToPage(parseInt(btn.dataset.page));
    });
}

/**
 * Sets up listeners for the header dropdowns. Labels no longer trigger sorting.
 */
function setupHeaderListeners() {
    // Dropdown Trigger (Chevron Click)
    document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
        trigger.onclick = (e) => {
            e.stopPropagation();
            const id = trigger.dataset.id;
            const menu = document.getElementById(`dropdown-${id}`);
            document.querySelectorAll('.header-dropdown-menu').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });
            if (menu) menu.classList.toggle('show');
        };
    });

    // Close on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.header-dropdown-menu').forEach(m => m.classList.remove('show'));
        const pageSizeMenu = document.getElementById('page-size-menu');
        if (pageSizeMenu) pageSizeMenu.classList.remove('show');
    });

    // Menu Sort Actions
    document.querySelectorAll('.sort-asc').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            window.sortTableWithDir(el.dataset.id, 1);
        };
    });

    document.querySelectorAll('.sort-desc').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            window.sortTableWithDir(el.dataset.id, -1);
        };
    });

    // Menu Hide Action
    document.querySelectorAll('.hide-col').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            const colIdx = window.cols.findIndex(c => c.id === el.dataset.id);
            if (colIdx !== -1) {
                window.cols[colIdx].show = false;
                renderHeaders();
                renderTable();
                
                // Keep global dropdown in sync
                const cb = document.querySelector(`.col-visibility-checkbox[data-idx="${colIdx}"]`);
                if (cb) cb.checked = false;
            }
        };
    });
}

/**
 * Helper to sort with a specific direction.
 */
window.sortTableWithDir = function(colId, dir) {
    window.currentSort = { colId, dir };
    applyCurrentSort();
    window.currentPage = 1;
    updateFilteredData();
    renderHeaders();
    renderTable();
    document.querySelectorAll('.header-dropdown-menu').forEach(m => m.classList.remove('show'));
}

/**
 * Shows the candidate detail modal.
 */
window.showCandidateModal = function (id) {
    const item = processedData.find(d => d._id === id);
    if (!item) return;

    const modal = document.getElementById('candidate-modal');
    if (!modal) return;

    // Populate hero section
    document.getElementById('modal-name').innerText = item[fieldMapping.candidate] || 'Unknown';
    
    const avatarEl = document.getElementById('modal-avatar');
    if (avatarEl) {
        avatarEl.innerText = getInitials(item[fieldMapping.candidate]);
        avatarEl.style.background = getAvatarGradient(item[fieldMapping.candidate]);
    }

    // Populate contact info
    const contactEl = document.getElementById('modal-contact');
    if (contactEl) {
        const emailKey = Object.keys(item).find(k => k.toLowerCase().includes('email')) || '';
        const phoneKey = Object.keys(item).find(k => k.toLowerCase().includes('phone') || k.toLowerCase().includes('mobile')) || '';
        const email = item[emailKey] || '';
        const phone = item[phoneKey] || '';
        
        contactEl.innerHTML = `
            ${email ? `<div><i data-lucide="mail" width="14" style="display:inline-block; vertical-align:middle; margin-right:0.5rem;"></i>${sanitizeHTML(email)}</div>` : ''}
            ${phone ? `<div><i data-lucide="phone" width="14" style="display:inline-block; vertical-align:middle; margin-right:0.5rem;"></i>${sanitizeHTML(phone)}</div>` : ''}
        `;
        lucide.createIcons();
    }

    // Populate scores section with circular indicators
    const scoresEl = document.getElementById('modal-scores');
    if (scoresEl) {
        const keys = Object.keys(item);
        const subScores = scoringParams.map(p => {
            const key = keys.find(k => {
                const low = k.toLowerCase();
                return low.includes('score') && p.keywords.some(kw => low.includes(kw));
            });
            return { label: p.label, val: key ? parseFloat(item[key]) || 0 : 0 };
        });

        scoresEl.innerHTML = subScores.map(s => {
            const percentage = (s.val / 10) * 100;
            const color = s.val >= 7 ? 'var(--success)' : (s.val >= 5 ? 'var(--warning)' : 'var(--danger)');
            return `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                    <div style="position: relative; width: 64px; height: 64px;">
                        <svg width="64" height="64" style="transform: rotate(-90deg);">
                            <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" stroke-width="3"></circle>
                            <circle cx="32" cy="32" r="28" fill="none" stroke="${color}" stroke-width="3" 
                                    stroke-dasharray="${2 * Math.PI * 28}" 
                                    stroke-dashoffset="${2 * Math.PI * 28 * (1 - percentage / 100)}"
                                    style="transition: stroke-dashoffset 0.3s ease;"></circle>
                        </svg>
                        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                    font-size: 1.25rem; font-weight: 700; color: var(--foreground);">
                            ${s.val}
                        </div>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 600; color: var(--muted-foreground);">
                        ${s.label}
                    </span>
                </div>
            `;
        }).join('');
    }

    // Populate details grid
    const gridEl = document.getElementById('modal-details-grid');
    if (gridEl) {
        gridEl.innerHTML = '';
        Object.keys(item).forEach(key => {
            if (key.startsWith('_')) return;
            const val = item[key];
            if (!val) return;

            const div = document.createElement('div');
            div.className = 'detail-item';
            div.innerHTML = `<label>${sanitizeHTML(key)}</label><div>${sanitizeHTML(val)}</div>`;
            gridEl.appendChild(div);
        });
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

window.closeCandidateModal = function () {
    const modal = document.getElementById('candidate-modal');
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
}
