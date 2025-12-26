/**
 * HR-Gemini Application Entry Point
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initial UI Setup
    lucide.createIcons();
    initWeightsUI();
    initGlobalListeners();
});

/**
 * Initializes scoring weights UI in the sidebar.
 */
function initWeightsUI() {
    const sidebarWeightsContainer = document.querySelector('.slider-group');
    if (!sidebarWeightsContainer) return;

    sidebarWeightsContainer.innerHTML = '';
    scoringParams.forEach(param => {
        const div = document.createElement('div');
        div.className = 'slider-item';
        div.innerHTML = `
            <div class="slider-header">
                <span>${param.label}</span>
                <span><span id="val-${param.id}" class="slider-value">${weights[param.id]}</span> <span id="pct-${param.id}" class="weight-percent">(25%)</span></span>
            </div>
            <input type="range" id="weight-${param.id}" min="0" max="10" value="${weights[param.id]}" step="1">
        `;
        sidebarWeightsContainer.appendChild(div);

        const el = div.querySelector('input');
        updateSliderFill(el);

        el.addEventListener('input', (e) => {
            weights[param.id] = parseInt(e.target.value);
            document.getElementById(`val-${param.id}`).innerText = weights[param.id];
            updateSliderFill(e.target);
            updatePercentages();
            recalculateAndRender();
        });
    });
    updatePercentages();
}

/**
 * Updates weight percentages displayed in the UI.
 */
function updatePercentages() {
    let total = 0;
    scoringParams.forEach(p => total += weights[p.id] || 0);

    scoringParams.forEach(p => {
        const pct = total === 0 ? 0 : Math.round((weights[p.id] / total) * 100);
        const el = document.getElementById(`pct-${p.id}`);
        if (el) el.innerText = `(${pct}%)`;
    });
}

/**
 * Sets up global event listeners for search, filters, and window events.
 */
function initGlobalListeners() {
    // File Upload listeners
    const fileInput = document.getElementById('fileInput');
    const fileInputOverlay = document.getElementById('fileInputOverlay');
    const fileInputToolbar = document.getElementById('fileInputToolbar');
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
    if (fileInputOverlay) fileInputOverlay.addEventListener('change', handleFileUpload);
    if (fileInputToolbar) fileInputToolbar.addEventListener('change', handleFileUpload);

    // Search & Filters
    document.getElementById('search-text')?.addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase();
        window.currentPage = 1;
        updateFilteredData();
        if (viewMode === 'table') renderTable(); else renderKanban();
    });

    // Toolbar Actions
    document.getElementById('col-toggle-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('col-dropdown')?.classList.toggle('show');
    });

    // View Tabs (Shadcn Style)
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.onclick = () => {
            const mode = tab.dataset.view.toLowerCase();
            window.setViewMode(mode);
        };
    });

    document.getElementById('clear-filters-btn')?.addEventListener('click', clearFilters);
    document.getElementById('export-btn')?.addEventListener('click', exportToExcel);
    document.getElementById('rows-per-page')?.addEventListener('change', (e) => {
        changePageSize(e.target.value);
    });

    // Score tooltip handler (event delegation)
    document.addEventListener('mouseover', (e) => {
        if (e.target.classList.contains('score-with-tooltip')) {
            const tooltipHTML = e.target.getAttribute('data-tooltip');
            if (tooltipHTML) {
                const existing = e.target.querySelector('.score-tooltip');
                if (!existing) {
                    const tooltip = document.createElement('div');
                    tooltip.innerHTML = tooltipHTML;
                    e.target.style.position = 'relative';
                    e.target.appendChild(tooltip.firstChild);
                }
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.classList.contains('score-with-tooltip')) {
            const tooltip = e.target.querySelector('.score-tooltip');
            if (tooltip) tooltip.remove();
        }
    });

    // Column resizing listeners
    const tableHead = document.getElementById('table-head');
    if (tableHead) {
        tableHead.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('resize-handle')) {
                initResize(e);
            }
        });
    }

    // Pagination delegation
    const pagiControls = document.getElementById('pagination-controls');
    if (pagiControls) {
        pagiControls.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-page]');
            if (btn && !btn.disabled) {
                goToPage(parseInt(btn.dataset.page));
            }
        });
    }

    // Drag and Drop delegation for Kanban columns
    const kanbanCols = document.querySelectorAll('.kanban-col');
    kanbanCols.forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('drag-over');
        });
        col.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('drag-over');
        });
        col.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            const id = e.dataTransfer.getData("text");
            const newStatus = e.currentTarget.id.replace('col-', '').charAt(0).toUpperCase() + e.currentTarget.id.replace('col-', '').slice(1);
            
            if (id && window.statusOverrides) {
                window.statusOverrides[id] = newStatus;
                recalculateAndRender();
            }
        });
    });

    // Modal behavior
    document.getElementById('modal-close-btn')?.addEventListener('click', closeCandidateModal);
    document.getElementById('candidate-modal')?.addEventListener('click', closeCandidateModal);
    document.querySelector('.modal-content')?.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCandidateModal();
    });

    // Theme Initialization
    initTheme();
    document.getElementById('theme-toggle')?.addEventListener('click', toggleDarkMode);

    // Global click listener for dropdowns
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.getElementById('col-dropdown')?.classList.remove('show');
        }
    });
}

/**
 * Initializes the theme based on localStorage or system preference.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    if (isDark) {
        document.documentElement.classList.add('dark');
        updateThemeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcons(false);
    }
}

/**
 * Toggles between light and dark mode.
 */
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

/**
 * Updates theme toggle icons.
 */
function updateThemeIcons(isDark) {
    const sun = document.getElementById('sun-icon');
    const moon = document.getElementById('moon-icon');
    if (!sun || !moon) return;

    if (isDark) {
        sun.style.display = 'none';
        moon.style.display = 'block';
    } else {
        sun.style.display = 'block';
        moon.style.display = 'none';
    }
    lucide.createIcons(); // Refresh for any new icons injected
}

/**
 * Sets the view mode (table or board) and updates the UI tabs.
 */
window.setViewMode = function(mode) {
    window.viewMode = mode; // 'list' or 'board'

    // Update Tabs UI
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.view.toLowerCase() === mode);
    });

    // Lock sliders in Board mode
    const sliders = document.querySelectorAll('input[type="range"]');
    sliders.forEach(s => s.disabled = (mode === 'board'));

    const colWrapper = document.getElementById('col-toggle-wrapper');
    if (colWrapper) colWrapper.style.display = (mode === 'board' ? 'none' : 'block');

    recalculateAndRender();
}

/**
 * Resize logic for table columns.
 */
let startX, startWidth, resizingCol, resizingColIdx;
let isResizing = false;
let rafPending = false;

function initResize(e) {
    e.stopPropagation();
    e.preventDefault();

    const handle = e.target;
    resizingCol = handle.parentElement;
    resizingColIdx = parseInt(resizingCol.getAttribute('data-col-idx'));
    startX = e.pageX;
    startWidth = resizingCol.offsetWidth;
    isResizing = true;
    rafPending = false;

    document.querySelector('.resize-handle.active')?.classList.remove('active');
    handle.classList.add('active');

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
}

function handleMouseMove(e) {
    if (!isResizing || rafPending) return;
    
    rafPending = true;
    requestAnimationFrame(() => {
        if (!isResizing || !resizingCol) {
            rafPending = false;
            return;
        }
        
        const diff = e.pageX - startX;
        const newWidth = Math.max(80, startWidth + diff);
        
        // Update header
        resizingCol.style.width = newWidth + 'px';
        
        // Update all cells in this column
        const table = resizingCol.closest('table');
        if (table) {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cell = row.children[resizingColIdx];
                if (cell) cell.style.width = newWidth + 'px';
            });
        }

        // Save to cols config
        if (!isNaN(resizingColIdx) && window.cols[resizingColIdx]) {
            window.cols[resizingColIdx].width = newWidth + 'px';
        }
        
        rafPending = false;
    });
}

function stopResize() {
    isResizing = false;
    rafPending = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (resizingCol) {
        resizingCol.querySelector('.resize-handle')?.classList.remove('active');
    }
    resizingCol = null;
    resizingColIdx = null;
}
