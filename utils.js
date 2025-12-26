/**
 * HR-Gemini Utilities
 */

/**
 * Enhanced HTML sanitizer to prevent XSS.
 * Escapes special characters from untrusted strings.
 */
function sanitizeHTML(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Extracts initials from a name string.
 */
function getInitials(name) {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
}

/**
 * Generates a consistent gradient background based on a name string.
 */
function getAvatarGradient(name) {
    const gradients = [
        'linear-gradient(135deg, #6366f1, #a855f7)', // Blue/Purple
        'linear-gradient(135deg, #f43f5e, #fb923c)', // Pink/Orange
        'linear-gradient(135deg, #059669, #34d399)', // Green/Teal
        'linear-gradient(135deg, #0ea5e9, #22d3ee)', // Sky/Cyan
        'linear-gradient(135deg, #8b5cf6, #d946ef)', // Violet/Fuchsia
        'linear-gradient(135deg, #f59e0b, #fbbf24)', // Amber/Yellow
    ];
    let hash = 0;
    const n = String(name || '');
    for (let i = 0; i < n.length; i++) {
        hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
}

/**
 * Updates the background fill percentage of a range input.
 */
function updateSliderFill(el) {
    if (!el) return;
    const min = parseFloat(el.min) || 0;
    const max = parseFloat(el.max) || 10;
    const val = parseFloat(el.value) || 0;
    const percentage = (val - min) * 100 / (max - min);
    el.style.backgroundSize = percentage + '% 100%';
}

/**
 * Renders a set of tags (skills, redflags, etc.) as badges.
 */
function renderTags(val) {
    if (!val) return '-';
    let arr = [];
    const strVal = String(val);
    if (strVal.includes('|')) {
        arr = strVal.split('|');
    } else {
        arr = strVal.split(',');
    }
    return `<div class="tag-container">${arr.map(t => t.trim()).filter(t => t).map(t => `<span class="badge badge-neutral">${sanitizeHTML(t)}</span>`).join('')}</div>`;
}

/**
 * Safely parses a float value, returning 0 if invalid.
 */
function safeFloat(val) {
    const f = parseFloat(val);
    return isNaN(f) ? 0 : f;
}
