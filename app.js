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


    // 3. Handle Guest/Pending Redirection/UI
    const guestBanner = document.getElementById('guestJoinBanner');
    const mainContent = document.querySelector('.main-content');
    // We look for a wrapper that should be hidden if not a member
    const dashboardContent = document.getElementById('dashboardContent') ||
        document.getElementById('expensesContent') ||
        document.getElementById('plansContent') ||
        document.getElementById('contributionsContent') ||
        document.getElementById('teamContent');

    if (user && (user.profile?.role === 'guest' || user.profile?.role === 'pending')) {
        const isPending = user.profile?.role === 'pending';
        // On dashboard (index.html), initDashboard() handles banners with admin-exists check.
        // On other pages, syncAdminUI handles it directly.
        const isOnDashboard = document.getElementById('dashboardContent');

        if (guestBanner && !isOnDashboard) {
            guestBanner.style.display = 'block';
            if (isPending) {
                const title = document.getElementById('guestBannerTitle');
                const text = document.getElementById('guestBannerText');
                const btn = document.getElementById('joinTeamBtn');
                const pendingStatus = document.getElementById('pendingStatus');

                if (title) title.textContent = "Request Pending";
                if (text) text.textContent = "Your request to join the StreetFit team is awaiting administrator approval. Please check back later.";
                if (btn) btn.classList.add('hidden');
                if (pendingStatus) pendingStatus.classList.remove('hidden');
            }
        }
        if (dashboardContent) dashboardContent.style.display = 'none';
        else if (mainContent && !guestBanner) {
            // Check if we already added restriction message to avoid duplicates
            if (!mainContent.querySelector('.restriction-message')) {
                mainContent.innerHTML = `<div class="card restriction-message" style="text-align:center; padding: 4rem 2rem; margin-top:2rem;">
                    <div style="width: 80px; height: 80px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: var(--accent);">
                        <i class="fas fa-lock" style="font-size: 2.5rem;"></i>
                    </div>
                    <h2 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--text-dark);">Access Restricted</h2>
                    <p style="color: var(--text-muted); margin-bottom: 2rem; max-width: 400px; margin-left: auto; margin-right: auto;">
                        You must be a member of the team to view this page. Please go to the <a href="index.html" style="color:var(--accent); text-decoration:underline;">Dashboard</a> to join the team.
                    </p>
                </div>`;
            }
        }
    } else if (guestBanner) {
        guestBanner.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
    }


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
        const username = user?.profile?.username;
        const capitalized = username ? username.charAt(0).toUpperCase() + username.slice(1) : '';

        if (isAdmin) {
            badge.textContent = capitalized ? `${capitalized} · Admin` : 'Admin';
            badge.className = 'badge badge-approved';
        } else if (user) {
            const role = user.profile?.role;
            if (role === 'pending') {
                badge.textContent = capitalized ? `${capitalized} · Pending` : 'Pending Approval';
                badge.className = 'badge badge-pending';
            } else if (role === 'guest') {
                badge.textContent = capitalized ? `${capitalized} · Guest` : 'Guest';
                badge.className = 'badge badge-pending';
            } else {
                badge.textContent = capitalized ? `${capitalized} · Partner` : 'Partner';
                badge.className = 'badge badge-approved';
            }
        } else {
            badge.textContent = 'Guest';
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
            alert("✅ Admin rights granted!");
            location.reload();
        }
    } catch (err) {
        alert("❌ Request failed.");
    }
}
