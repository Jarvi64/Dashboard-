/**
 * HR-Gemini State Management
 */

// Core Data
window.rawData = [];
window.processedData = [];
window.filteredData = [];
window.columns = []; // This will be the processed columns (cols)
window.statusOverrides = {}; // Map: _id -> 'Shortlisted' | 'Borderline' | 'Rejected'
window.fieldMapping = {}; // Stores mapping: internalKey -> excelHeader

// Scoring configuration
window.scoringParams = [
    { id: 'edu', keywords: ['education'], label: 'Education' },
    { id: 'dom', keywords: ['domain'], label: 'Domain Fit' },
    { id: 'exp', keywords: ['experien'], label: 'Experience' },
    { id: 'req', keywords: ['requirement', 'tool', 'technolog'], label: 'Skills/Reqs' }
];

window.weights = {};
window.scoringParams.forEach(p => window.weights[p.id] = 5);

// Filtering State
window.filters = {
    search: '',
    minExp: null,
    domainMatch: 'all',
    status: 'all'
};

// UI State
window.currentPage = 1;
window.rowsPerPage = 10;
window.viewMode = 'table'; // 'table' | 'board'
window.sortDir = 1;
window.currentSort = { colId: null, dir: 1 };

// Column Definitions (Static)
window.coreCols = [
    { id: 'Candidate', label: 'Candidate', show: true, type: 'contact', width: '250px' },
    { id: 'Exp', label: 'Exp (Yrs)', show: true, type: 'number', keyMatches: ['years of experience'], sortable: true, width: '100px' },
    { id: 'Domain', label: 'Domain', show: true, type: 'boolean', keyMatches: ['domain match'], width: '100px' },
    { id: 'Skills', label: 'Skills', show: true, type: 'tags', keyMatches: ['skill'], width: '300px' },
    { id: 'Critical', label: 'Critical Match', show: false, type: 'tags', keyMatches: ['critical'], width: '200px' },
    { id: 'NonCritical', label: 'Non-Critical', show: false, type: 'tags', keyMatches: ['non critical'], width: '200px' },
    { id: 'Notes', label: 'Notes', show: false, type: 'text', keyMatches: ['note'], width: '250px' },
    { id: 'Summary', label: 'AI Summary', show: false, type: 'text', keyMatches: ['summary'], width: '300px' },
    { id: 'Redflag', label: 'Red Flags', show: true, type: 'tags', keyMatches: ['redflag'], width: '200px' },
    { id: 'Subcards', label: 'Subcards (10)', show: true, type: 'subcards', width: '200px' },
    { id: 'Score', label: 'Final Score', show: true, type: 'score', sortable: true, width: '120px' },
    { id: 'Status', label: 'Status', show: true, type: 'status', width: '120px' }
];

window.cols = []; // Active columns
