/**
 * Shared App Logic
 */

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// Close sidebar on click outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

/**
 * Authentication & Role Protection
 */
function syncAdminUI() {
    // 1. Instant check from session cache
    const saved = sessionStorage.getItem('sf_user_cache');
    const user = saved ? JSON.parse(saved) : null;
    const isAdmin = user && user.profile && user.profile.role === 'admin';

    // 2. Handle role-based UI visibility
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        if (isAdmin) {
            el.classList.remove('hidden');
            // If it's a bottom-nav-item, ensure it's visible on mobile
            if (el.classList.contains('bottom-nav-item') && window.innerWidth <= 768) {
                el.style.display = 'flex';
            }
        } else {
            el.classList.add('hidden');
        }
    });


    // 4. Update Header Buttons & Badges
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (user) {
        headerLoginBtn?.classList.add('hidden');
        logoutBtn?.classList.remove('hidden');
    } else {
        headerLoginBtn?.classList.remove('hidden');
        logoutBtn?.classList.add('hidden');
    }

    const roleBadge = document.getElementById('userRoleBadge');
    const roleBadgeMobile = document.getElementById('userRoleBadgeMobile');
    const updateBadge = (badge) => {
        if (!badge) return;
        if (isAdmin) {
            badge.textContent = 'Admin';
            badge.className = 'badge badge-approved';
        } else if (user) {
            badge.textContent = user.profile?.username || 'Partner';
            badge.className = 'badge badge-pending';
        } else {
            badge.textContent = 'Partner (Guest)';
            badge.className = 'badge badge-pending';
        }
    };
    updateBadge(roleBadge);
    updateBadge(roleBadgeMobile);

    return { user, isAdmin };
}

// Auto-sync UI on load as soon as app.js runs
syncAdminUI();

async function checkAuth() {
    // Sync UI instantly from cache first
    syncAdminUI();

    // Then verify with real server data
    const user = await window.auth.getCurrentUser();

    // Sync UI again with fresh data
    syncAdminUI();

    return user;
}

/**
 * Global Utilities
 */
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

async function requestAdminAccess() {
    const pin = prompt("Please enter the Secret Admin Key to claim management rights:");
    if (!pin) return;

    try {
        const { data, error } = await window.auth.claimAdminRole(pin);
        if (error) {
            alert("❌ " + error.message);
        } else {
            alert("✅ Successfully promoted to Admin! The app will now reload.");
            window.location.reload();
        }
    } catch (err) {
        alert("An error occurred. Please try again.");
    }
}
