/**
 * HR-Gemini Data Processing
 */

/**
 * Handles the file upload and parsing using SheetJS.
 */
window.handleFileUpload = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonData.length > 0) {
            // Assign Unique IDs for tracking manual overrides
            window.rawData = jsonData.map((row) => ({
                ...row,
                _id: crypto.randomUUID()
            }));
            window.statusOverrides = {}; // Reset overrides on new upload

            setupColumns(window.rawData[0]);
            document.getElementById('empty-state').style.display = 'none';
            document.getElementById('table-wrapper').style.display = 'block';
            document.getElementById('table-toolbar').style.display = 'flex';
            document.getElementById('pagination-container').style.display = 'flex';
            recalculateAndRender();
        }
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Maps Excel headers to internal simplified column definitions.
 */
window.setupColumns = function (rowSample) {
    const keys = Object.keys(rowSample);

    fieldMapping.candidate = keys.find(k => k.toLowerCase().includes('name')) || '';
    fieldMapping.experience = keys.find(k => k.toLowerCase().includes('years of experience') && !k.toLowerCase().includes('relevant')) || '';
    fieldMapping.domainMatch = keys.find(k => k.toLowerCase().includes('domain match')) || '';
    fieldMapping.skills = keys.find(k => k.toLowerCase().includes('skill')) || '';

    window.cols = coreCols.map(c => {
        if (c.type === 'contact' || c.type === 'subcards' || c.type === 'score' || c.type === 'status' || c.type === 'manual_select') {
            return c;
        }
        const foundKey = keys.find(k => {
            return c.keyMatches.some(m => k.toLowerCase().includes(m) && !k.toLowerCase().includes('score'));
        });
        return { ...c, dataKey: foundKey };
    });

    // Populate Column Toggles
    const colDropdown = document.getElementById('col-dropdown');
    colDropdown.innerHTML = '';
    window.cols.forEach((col, idx) => {
        // Candidate is mandatory and should not be in the toggle list
        if (col.id === 'Score' || col.id === 'Status' || col.id === 'Candidate') return;

        const label = document.createElement('label');
        label.className = 'column-toggle-item';
        label.innerHTML = `
            <input type="checkbox" ${col.show ? 'checked' : ''} data-idx="${idx}" class="col-visibility-checkbox">
            <span>${sanitizeHTML(col.label)}</span>
        `;
        colDropdown.appendChild(label);
        
        label.querySelector('input').addEventListener('change', (e) => {
            toggleColumn(idx, e.target.checked);
        });
    });

    renderHeaders();
}

/**
 * Toggles column visibility.
 */
window.toggleColumn = function (idx, checked) {
    window.cols[idx].show = checked;
    renderHeaders();
    renderTable();
}

/**
 * Calculates the final score for a single row based on weights.
 */
window.calculateFinalScore = function (row) {
    const keys = Object.keys(row);
    let weightedSum = 0;
    let totalWeight = 0;

    scoringParams.forEach(param => {
        const key = keys.find(k => {
            const low = k.toLowerCase();
            return low.includes('score') && param.keywords.some(kw => low.includes(kw));
        });
        const val = key ? safeFloat(row[key]) : 0;
        weightedSum += (val * weights[param.id]);
        totalWeight += weights[param.id];
    });

    if (totalWeight === 0) return 0;
    const relativeScore = weightedSum / totalWeight;
    return Math.round(relativeScore * 10);
}

/**
 * Recalculates all scores and statuses, then triggers layout rendering.
 */
window.recalculateAndRender = function () {
    let counts = { 'Shortlisted': 0, 'Borderline': 0, 'Rejected': 0 };

    window.processedData = window.rawData.map(row => {
        const score = calculateFinalScore(row);
        const override = statusOverrides[row._id];
        let status = 'Borderline';
        if (override) {
            status = override;
        } else {
            if (score >= 70) status = 'Shortlisted';
            if (score < 40) status = 'Rejected';
        }

        counts[status]++;

        return {
            ...row,
            _calculatedScore: score,
            _calculatedStatus: status
        };
    });

    // Update Sidebar Counts
    document.getElementById('count-shortlisted').innerText = counts['Shortlisted'];
    document.getElementById('count-borderline').innerText = counts['Borderline'];
    document.getElementById('count-rejected').innerText = counts['Rejected'];

    // Apply current sort if any
    applyCurrentSort();

    updateFilteredData();

    const tableWrapper = document.getElementById('table-wrapper');
    const kanbanView = document.getElementById('kanban-view');
    const paginationContainer = document.getElementById('pagination-container');

    if (viewMode === 'table') {
        tableWrapper.style.display = 'flex';
        kanbanView.style.display = 'none';
        paginationContainer.style.display = 'flex';
        renderTable();
    } else {
        tableWrapper.style.display = 'none';
        kanbanView.style.display = 'flex';
        paginationContainer.style.display = 'none';
        renderKanban();
    }
}

/**
 * Filters rows based on user criteria.
 */
window.updateFilteredData = function () {
    window.filteredData = window.processedData.filter(item => {
        const searchStr = filters.search;
        const matchesSearch = !searchStr || Object.values(item).some(val => String(val).toLowerCase().includes(searchStr));

        const expVal = fieldMapping.experience ? parseFloat(item[fieldMapping.experience]) : 0;
        const matchesExp = filters.minExp === null || expVal >= filters.minExp;

        const domValRaw = fieldMapping.domainMatch ? item[fieldMapping.domainMatch] : false;
        const domVal = String(domValRaw).toLowerCase() === 'true' || domValRaw === 1 || String(domValRaw).toLowerCase() === 'yes';
        const matchesDom = filters.domainMatch === 'all' || (filters.domainMatch === 'true' && domVal) || (filters.domainMatch === 'false' && !domVal);

        const matchesStatus = filters.status === 'all' || item._calculatedStatus === filters.status;

        return matchesSearch && matchesExp && matchesDom && matchesStatus;
    });

    document.getElementById('result-count').innerText = `Showing ${window.filteredData.length} candidates`;
}

/**
 * Clears all active filters and resets the UI.
 */
window.clearFilters = function () {
    document.getElementById('search-text').value = '';
    document.getElementById('filter-exp').value = '';
    document.getElementById('filter-domain').value = 'all';
    document.getElementById('filter-status').value = 'all';

    window.filters = {
        search: '',
        minExp: null,
        domainMatch: 'all',
        status: 'all'
    };

    window.currentPage = 1;
    updateFilteredData();
    if (viewMode === 'table') renderTable(); else renderKanban();
}

/**
 * Sorts the processed data by column.
 */
window.sortTable = function (colId) {
    if (window.currentSort.colId === colId) {
        window.currentSort.dir = -window.currentSort.dir;
    } else {
        window.currentSort.colId = colId;
        window.currentSort.dir = 1;
    }
    
    applyCurrentSort();
    window.currentPage = 1;
    updateFilteredData();
    renderHeaders();
    renderTable();
}

/**
 * Applies the stored sort state to processedData.
 */
window.applyCurrentSort = function() {
    const { colId, dir } = window.currentSort;
    if (!colId) return;

    const colDef = window.cols.find(c => c.id === colId);
    if (!colDef) return;

    if (colId === 'Exp') {
        window.processedData.sort((a, b) => {
            const vA = parseFloat(a[colDef.dataKey]) || 0;
            const vB = parseFloat(b[colDef.dataKey]) || 0;
            return (vA - vB) * dir;
        });
    } else if (colId === 'Score') {
        window.processedData.sort((a, b) => (a._calculatedScore - b._calculatedScore) * dir);
    } else if (colDef.sortable && colDef.dataKey) {
        window.processedData.sort((a, b) => {
            const vA = String(a[colDef.dataKey] || '').toLowerCase();
            const vB = String(b[colDef.dataKey] || '').toLowerCase();
            return vA.localeCompare(vB) * dir;
        });
    }
}

/**
 * Exports data to Excel.
 */
window.exportToExcel = function () {
    if (window.processedData.length === 0) {
        alert("No data to export!");
        return;
    }
    const ws = XLSX.utils.json_to_sheet(window.processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Screening Results");
    XLSX.writeFile(wb, "Screening_Results.xlsx");
}
