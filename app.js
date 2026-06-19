// API Endpoints using Java Gateway Server (Proxy to Python backend)
const GATEWAY_URL = 'http://127.0.0.1:8080/api/gateway';

let loadedCustomers = [];
let batchCampaignResults = [];

// DOM Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadDashboardStats();
    loadCustomersData();
    setupSandboxForm();
    setupCampaignControls();
    loadCampaignLogs();
});

// Sidebar Page Navigation routing
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const id = item.id.replace('nav-', 'sec-');
            const targetSection = document.getElementById(id);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

// Fetch dashboard analytical stats
async function loadDashboardStats() {
    try {
        const response = await fetch(`${GATEWAY_URL}/stats`);
        const stats = await response.json();

        document.getElementById('stat-total').textContent = stats.total_customers || 0;
        document.getElementById('stat-avg-price').textContent = Math.round(stats.average_price || 0) + ' DA';

        // Render Persona breakdown chart/list
        const breakdownList = document.getElementById('persona-breakdown-list');
        breakdownList.innerHTML = '';
        const total = stats.total_customers || 1;

        if (stats.personas) {
            Object.entries(stats.personas).forEach(([persona, count]) => {
                const pct = Math.round((count / total) * 100);
                const row = document.createElement('div');
                row.className = 'breakdown-row';
                row.innerHTML = `
                    <span style="font-size:0.9rem; font-weight:600; width: 30%;">${persona}</span>
                    <div class="breakdown-bar-bg">
                        <div class="breakdown-bar-fg" style="width: ${pct}%;"></div>
                    </div>
                    <span style="font-size:0.9rem; color: var(--text-muted);">${count} (${pct}%)</span>
                `;
                breakdownList.appendChild(row);
            });
        }
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

// Retrieve customer directory segment
async function loadCustomersData() {
    try {
        const response = await fetch(`${GATEWAY_URL}/customers`);
        loadedCustomers = await response.json();

        const tableBody = document.querySelector('#table-customers tbody');
        tableBody.innerHTML = '';

        loadedCustomers.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${c.firstname}</strong></td>
                <td>${c.persona}</td>
                <td><span class="badge">${c.language}</span></td>
                <td>${c.offer}</td>
                <td>${c.price} DA</td>
                <td>${c.message_style}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size:0.8rem;" onclick="triggerSingleGeneration(${c.id})">Generate</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error loading customer list:', e);
    }
}

// Sandbox Form Event handler
function setupSandboxForm() {
    const form = document.getElementById('form-sandbox');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'Generating message via Mistral...';
        btn.disabled = true;

        const profile = {
            firstname: document.getElementById('sb-firstname').value,
            persona: document.getElementById('sb-persona').value,
            language: document.getElementById('sb-language').value,
            offer: document.getElementById('sb-offer').value,
            price: document.getElementById('sb-price').value,
            tone: document.getElementById('sb-tone').value,
            usage: document.getElementById('sb-usage').value,
            message_style: document.getElementById('sb-style').value
        };

        try {
            const res = await fetch(`${GATEWAY_URL}/generate-single`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_profile: profile })
            });
            const data = await res.json();
            document.getElementById('preview-bubble').textContent = data.generated_sms;
            showToast('SMS Generated successfully!');
        } catch (err) {
            console.error(err);
            showToast('Error generating sandbox message.');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

// Redirect and trigger single client generation
function triggerSingleGeneration(id) {
    document.getElementById('nav-sandbox').click();
    const customer = loadedCustomers.find(c => c.id === id);
    if (customer) {
        document.getElementById('sb-firstname').value = customer.firstname || 'Valued Customer';
        document.getElementById('sb-persona').value = customer.persona;
        document.getElementById('sb-language').value = customer.language;
        document.getElementById('sb-offer').value = customer.offer;
        document.getElementById('sb-price').value = customer.price;
        document.getElementById('sb-tone').value = customer.tone;
        document.getElementById('sb-usage').value = customer.usage;
        document.getElementById('sb-style').value = customer.message_style;
        document.getElementById('preview-bubble').textContent = "Ready to generate message. Click the generate button above...";
    }
}

// Batch Campaign execution and logs approval Flow
function setupCampaignControls() {
    const runBatchBtn = document.getElementById('btn-run-batch');
    const approveBtn = document.getElementById('btn-approve-campaign');
    const resetBtn = document.getElementById('btn-cancel-campaign');
    const statusBadge = document.getElementById('batch-progress-badge');

    runBatchBtn.addEventListener('click', async () => {
        document.getElementById('nav-campaigns').click();
        statusBadge.textContent = 'Generating...';
        statusBadge.className = 'badge';
        
        const tableBody = document.querySelector('#table-campaign-messages tbody');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Processing batch generation matching with Mistral RAG context...</td></tr>';

        try {
            const res = await fetch(`${GATEWAY_URL}/generate-batch`, { method: 'POST' });
            batchCampaignResults = await res.json();

            tableBody.innerHTML = '';
            batchCampaignResults.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.firstname}</strong></td>
                    <td>${item.persona}</td>
                    <td>${item.offer}</td>
                    <td>${item.tone}</td>
                    <td class="campaign-sms-cell" style="font-size:0.85rem; max-width:280px; word-wrap:break-word;">${item.generated_sms}</td>
                    <td><span class="badge badge-success">Generated</span></td>
                `;
                tableBody.appendChild(tr);
            });

            statusBadge.textContent = 'Completed';
            statusBadge.className = 'badge badge-success';
            approveBtn.disabled = false;
            showToast('Batch Campaign Generated Successfully!');
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-red">Batch campaign generation failed. Check server logs.</td></tr>';
            statusBadge.textContent = 'Failed';
        }
    });

    approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        const campaignPayload = {
            campaign_id: 'CMP-' + UUIDv4().substring(0, 8).toUpperCase(),
            timestamp: new Date().toISOString(),
            total_messages: batchCampaignResults.length,
            records: batchCampaignResults
        };

        try {
            const response = await fetch(`${GATEWAY_URL}/campaigns/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignPayload)
            });
            const data = await response.json();
            showToast('Campaign successfully approved and saved in Java log database!');
            loadCampaignLogs();
            document.getElementById('nav-logs').click();
        } catch (err) {
            console.error(err);
            showToast('Could not save campaign transaction.');
            approveBtn.disabled = false;
        }
    });

    resetBtn.addEventListener('click', () => {
        batchCampaignResults = [];
        const tableBody = document.querySelector('#table-campaign-messages tbody');
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No messages generated yet. Click "Start Campaign Generation" to begin.</td></tr>';
        approveBtn.disabled = true;
        statusBadge.textContent = 'Idle';
        statusBadge.className = 'badge';
    });
}

// Load approved campaigns saved from Java DB
async function loadCampaignLogs() {
    try {
        const response = await fetch(`${GATEWAY_URL}/campaigns/list`);
        const campaigns = await response.json();

        const logsList = document.getElementById('gateway-logs-list');
        logsList.innerHTML = '';

        if (!campaigns || campaigns.length === 0) {
            logsList.innerHTML = '<div class="text-center text-muted p-4">No campaign runs stored yet.</div>';
            return;
        }

        campaigns.reverse().forEach(cmp => {
            const card = document.createElement('div');
            card.className = 'log-run-card';
            card.innerHTML = `
                <div class="log-run-header">
                    <h4>Campaign ID: ${cmp.campaign_id}</h4>
                    <span class="badge badge-success">${cmp.total_messages} SMS Dispatched</span>
                </div>
                <p style="font-size:0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Run Timestamp: <strong>${new Date(cmp.timestamp).toLocaleString()}</strong>
                </p>
                <div class="table-container">
                    <table class="data-table" style="font-size: 0.8rem;">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Persona</th>
                                <th>SMS Text</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cmp.records.slice(0, 3).map(rec => `
                                <tr>
                                    <td><strong>${rec.firstname}</strong></td>
                                    <td>${rec.persona}</td>
                                    <td>${rec.generated_sms}</td>
                                </tr>
                            `).join('')}
                            ${cmp.records.length > 3 ? `<tr><td colspan="3" class="text-center text-muted">And ${cmp.records.length - 3} more...</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>
            `;
            logsList.appendChild(card);
        });
    } catch (e) {
        console.error('Error loading campaigns:', e);
    }
}

// UI Toast Notification helper
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Helper to generate dynamic ID
function UUIDv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
