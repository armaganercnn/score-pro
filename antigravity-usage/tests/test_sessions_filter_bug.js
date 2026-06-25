// Test script to verify the Sessions Table filtering logic discrepancy
const assert = require('assert');

// 1. Setup mock rawData
const rawData = {
    all_models: ['gemini-2.5-pro'],
    daily: [
        { day: '2026-06-15', model: 'gemini-2.5-pro', input: 100, output: 50, cache_read: 0, cache_creation: 0 },
        { day: '2026-06-24', model: 'gemini-2.5-pro', input: 200, output: 80, cache_read: 0, cache_creation: 0 }
    ],
    sessions: [
        {
            session_id: 'parent1',
            session_id_full: 'parent-session-long-id-1',
            parent_session_id: null,
            project: 'my-project',
            title: 'Parent Session',
            last_active_raw: '2026-06-15 12:00:00',
            model: 'gemini-2.5-pro',
            turns: 2,
            input: 100,
            output: 50,
            cache_read: 0,
            cache_creation: 0,
            cost: 0.001
        },
        {
            session_id: 'child1',
            session_id_full: 'child-session-long-id-1',
            parent_session_id: 'parent-session-long-id-1',
            project: 'my-project',
            title: 'Child Session',
            last_active_raw: '2026-06-24 15:30:00',
            model: 'gemini-2.5-pro',
            turns: 3,
            input: 200,
            output: 80,
            cache_read: 0,
            cache_creation: 0,
            cost: 0.002
        }
    ]
};

// 2. Set active filters
const selectedModels = new Set(['gemini-2.5-pro']);
const selectedRange = '3d'; // 3 days filter. Today is 2026-06-25, so maxDate is 2026-06-24.
const maxDateStr = '2026-06-24';
const maxDate = new Date(maxDateStr + 'T00:00:00');
const days = 3;
const cutoffDate = new Date(maxDate);
cutoffDate.setDate(maxDate.getDate() - (days + 1)); // 2026-06-20

console.log('Cutoff Date:', cutoffDate.toISOString().split('T')[0]);

// 3. Run dashboard.py filtering logic verbatim
const filteredSessions = rawData.sessions.filter(s => {
    // Model filter
    if (!selectedModels.has(s.model)) return false;
    // Date filter
    if (cutoffDate) {
        const datePart = s.last_active_raw ? s.last_active_raw.split(' ')[0] : '';
        const sDate = new Date(datePart + 'T00:00:00');
        if (sDate < cutoffDate) return false;
    }
    return true;
});

console.log('Filtered Sessions Count:', filteredSessions.length);
console.log('Filtered Sessions IDs:', filteredSessions.map(s => s.session_id_full));

// Group and link child sessions to parents
const sessionMap = {};
rawData.sessions.forEach(s => {
    s.children = [];
    sessionMap[s.session_id_full] = s;
});

rawData.sessions.forEach(s => {
    if (s.parent_session_id && sessionMap[s.parent_session_id]) {
        sessionMap[s.parent_session_id].children.push(s);
    }
});

// rootSessions are root sessions or child sessions whose parent is not in the filtered list
const rootSessions = filteredSessions.filter(s => !s.parent_session_id || !sessionMap[s.parent_session_id]);

console.log('Root Sessions (to render) Count:', rootSessions.length);
console.log('Root Sessions IDs:', rootSessions.map(s => s.session_id_full));

// 4. Assert discrepancy
const totalCost = filteredSessions.reduce((acc, s) => acc + s.cost, 0);
console.log('Total Cost of filtered sessions:', totalCost);
console.log('Sessions count displayed in UI:', rootSessions.length);

if (rootSessions.length === 0 && filteredSessions.length > 0) {
    console.log('SUCCESS: Discrepancy successfully reproduced! The child session is filtered, active statistics are calculated, but the session is not rendered.');
} else {
    console.log('FAIL: Did not reproduce the discrepancy.');
}
