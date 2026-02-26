/**
 * Firebase Configuration for StreetFit Business Manager
 * Drop-in replacement for supabase.js — same window.auth & window.db interface
 */

// ========== FIREBASE CONFIG ==========
// REPLACE THESE WITH YOUR FIREBASE PROJECT CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDndv7Lp68Xhb-KU2tIo28YFwcI03AX8Y8",
    authDomain: "streetfit-4c0b2.firebaseapp.com",
    projectId: "streetfit-4c0b2",
    storageBucket: "streetfit-4c0b2.firebasestorage.app",
    messagingSenderId: "878167942999",
    appId: "1:878167942999:web:623831d518335cfbcd0012"
};

// ========== CACHE SYSTEM ==========
let _cachedUser = null;
let _cachedProfilesMap = null;

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const firebaseAuth = firebase.auth();
const firebaseDB = firebase.firestore();

// Enable Offline Persistence
firebaseDB.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence failed: Browser not supported');
        }
    });

// ========== AUTHENTICATION ==========

async function login(username, password) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@streetfit.local`;
    try {
        // Force logout current user first to ensure a clean slate
        try { await firebaseAuth.signOut(); } catch (e) { }

        const result = await firebaseAuth.signInWithEmailAndPassword(email, password);
        // CRITICAL: Clear all caches so the new user's data loads fresh
        _cachedUser = null;
        _cachedProfilesMap = null;
        sessionStorage.removeItem('sf_user_cache');
        localStorage.removeItem('sf_dash_cache');
        localStorage.removeItem('sf_contribs_cache');
        localStorage.removeItem('sf_expenses_cache');
        localStorage.removeItem('sf_plans_cache');
        localStorage.removeItem('sf_team_cache');

        return { data: result, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function signup(username, password, role = null) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@streetfit.local`;
    try {
        const result = await firebaseAuth.createUserWithEmailAndPassword(email, password);
        const user = result.user;

        // All new users start as Guest (Must be added to team by Admin)
        const role = 'guest';

        const profileData = {
            id: user.uid,
            email: email,
            username: username.toLowerCase(),
            role: role,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebaseDB.collection('profiles').doc(user.uid).set(profileData);

        return { data: { user, profile: profileData }, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function createMember(username, password) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@streetfit.local`;
    try {
        // Create a secondary app to avoid logging out the admin
        const secondaryApp = firebase.initializeApp(firebaseConfig, "secondary");
        const secondaryAuth = secondaryApp.auth();
        const result = await secondaryAuth.createUserWithEmailAndPassword(email, password);
        const user = result.user;

        const profileData = {
            id: user.uid,
            email: email,
            username: username.toLowerCase(),
            role: 'partner',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebaseDB.collection('profiles').doc(user.uid).set(profileData);

        // Clean up secondary app
        await secondaryApp.delete();

        return { data: profileData, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function logout() {
    try {
        await firebaseAuth.signOut();
        // Clear all caches and session data
        _cachedUser = null;
        _cachedProfilesMap = null;
        sessionStorage.clear();
        localStorage.removeItem('sf_dash_cache');
        localStorage.removeItem('sf_contribs_cache');
        localStorage.removeItem('sf_expenses_cache');
        localStorage.removeItem('sf_plans_cache');
        localStorage.removeItem('sf_team_cache');
        window.location.href = 'auth.html';
    } catch (err) {
        console.error('Logout error:', err);
    }
}

async function getCurrentUser() {
    // 1. Check in-memory cache
    if (_cachedUser) return _cachedUser;

    // 2. Check session storage for instant load
    const saved = sessionStorage.getItem('sf_user_cache');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Only trust if uid exists and looks valid
        if (parsed && parsed.id) {
            _cachedUser = parsed;
            return _cachedUser;
        }
    }

    return new Promise((resolve) => {
        const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                try {
                    const doc = await firebaseDB.collection('profiles').doc(user.uid).get();
                    let profileData;
                    if (doc.exists) {
                        profileData = doc.data();
                    } else {
                        // FIX: Detect if this is the first user if profile is missing
                        const profilesSnap = await firebaseDB.collection('profiles').limit(1).get();
                        const role = profilesSnap.empty ? 'admin' : 'guest';
                        const username = user.email.split('@')[0];

                        profileData = { id: user.uid, username: username, role: role };
                        // Self-healing: Create the missing profile doc with correct role
                        await firebaseDB.collection('profiles').doc(user.uid).set({
                            ...profileData,
                            created_at: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                    _cachedUser = { ...user, id: user.uid, profile: profileData };
                    sessionStorage.setItem('sf_user_cache', JSON.stringify(_cachedUser));
                    resolve(_cachedUser);
                } catch (err) {
                    console.error("Auth Listener Error:", err);
                    resolve(null);
                }
            } else {
                _cachedUser = null;
                sessionStorage.removeItem('sf_user_cache');
                resolve(null);
            }
        });
    });
}

/**
 * Change role to "pending" to signal a join request
 */
async function joinTeam(uid) {
    try {
        await firebaseDB.collection('profiles').doc(uid).update({ role: 'pending' });
        // Clear caches
        _cachedUser = null;
        sessionStorage.removeItem('sf_user_cache');
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

/**
 * Approve a pending request or specific guest to join the team
 */
async function approveMember(uid) {
    try {
        await firebaseDB.collection('profiles').doc(uid).update({ role: 'partner' });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

// ========== DATABASE OPERATIONS ==========

function docToObj(doc) {
    const data = doc.data();
    // Convert Timestamps to ISO strings for compatibility
    if (data.created_at && data.created_at.toDate) {
        data.created_at = data.created_at.toDate().toISOString();
    }
    if (data.date && data.date.toDate) {
        data.date = data.date.toDate().toISOString();
    }
    return { id: doc.id, ...data };
}

/**
 * Gets profiles map with caching to avoid redundant fetches
 */
async function getProfilesMap() {
    if (_cachedProfilesMap) return _cachedProfilesMap;

    const profileSnap = await firebaseDB.collection('profiles').get();
    _cachedProfilesMap = {};
    profileSnap.docs.forEach(doc => {
        _cachedProfilesMap[doc.id] = doc.data();
    });
    return _cachedProfilesMap;
}

async function getContributions() {
    try {
        const snap = await firebaseDB.collection('contributions').orderBy('created_at', 'desc').get();
        const contributions = snap.docs.map(docToObj);

        const profilesMap = await getProfilesMap();

        contributions.forEach(c => {
            if (c.partner_id) {
                c.profiles = profilesMap[c.partner_id] || null;
            }
        });

        return { data: contributions, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function addContribution(partner_id, amount) {
    try {
        await firebaseDB.collection('contributions').add({
            partner_id,
            amount: Number(amount),
            date: new Date().toISOString(),
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { data: true, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function deleteContribution(id) {
    try {
        await firebaseDB.collection('contributions').doc(id).delete();
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function updateContribution(id, amount) {
    try {
        await firebaseDB.collection('contributions').doc(id).update({ amount: Number(amount) });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function updateUserRole(uid, newRole) {
    try {
        await firebaseDB.collection('profiles').doc(uid).update({ role: newRole });
        // Clear caches to force refresh
        _cachedProfilesMap = null;
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function createTeam() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not logged in");

        // Update role to admin
        await firebaseDB.collection('profiles').doc(user.id).update({ role: 'admin' });

        // Clear caches
        _cachedUser = null;
        sessionStorage.clear();

        return { data: true, error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function claimAdminRole(providedPin) {
    const MASTER_PIN = "SF1234"; // You can change this secret code here

    if (providedPin !== MASTER_PIN) {
        return { error: { message: "Invalid Secret Admin Key!" } };
    }

    try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Not logged in");

        await firebaseDB.collection('profiles').doc(user.id).update({ role: 'admin' });

        // Refresh local cache
        _cachedUser = null;
        sessionStorage.clear();

        return { data: true, error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function getExpenses() {
    try {
        const snap = await firebaseDB.collection('expenses').orderBy('created_at', 'desc').get();
        const expenses = snap.docs.map(docToObj);

        const profilesMap = await getProfilesMap();

        expenses.forEach(e => {
            if (e.partner_id) {
                e.profiles = profilesMap[e.partner_id] || null;
            }
        });

        return { data: expenses, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function addExpense(description, amount, partner_id) {
    try {
        await firebaseDB.collection('expenses').add({
            description,
            amount: Number(amount),
            partner_id,
            status: 'pending',
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { data: true, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function updateExpenseStatus(id, status) {
    try {
        await firebaseDB.collection('expenses').doc(id).update({ status });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function updateExpense(id, description, amount) {
    try {
        await firebaseDB.collection('expenses').doc(id).update({
            description,
            amount: Number(amount)
        });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function deleteExpense(id) {
    try {
        await firebaseDB.collection('expenses').doc(id).delete();
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function getPlans() {
    try {
        const snap = await firebaseDB.collection('plans').orderBy('created_at', 'desc').get();
        return { data: snap.docs.map(docToObj), error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function addPlan(title, estimated_cost, partner = 'Unassigned') {
    try {
        await firebaseDB.collection('plans').add({
            title,
            estimated_cost: Number(estimated_cost),
            actual_cost: null,
            status: 'pending',
            phase: partner,
            created_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { data: true, error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function updatePlan(id, title, estimated_cost, status, partner) {
    try {
        const updateData = {};
        if (title !== null) updateData.title = title;
        if (estimated_cost !== null) updateData.estimated_cost = Number(estimated_cost);
        if (status !== null) updateData.status = status;
        if (partner !== null) updateData.phase = partner;

        await firebaseDB.collection('plans').doc(id).update(updateData);
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function completePlan(id, actual_cost) {
    try {
        await firebaseDB.collection('plans').doc(id).update({
            actual_cost: Number(actual_cost),
            status: 'completed'
        });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function deletePlan(id) {
    try {
        await firebaseDB.collection('plans').doc(id).delete();
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

async function getProfileByUsername(username) {
    try {
        const snap = await firebaseDB.collection('profiles').where('username', '==', username.toLowerCase()).limit(1).get();
        if (snap.empty) return { data: null, error: null };
        return { data: docToObj(snap.docs[0]), error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function getProfiles() {
    try {
        const snap = await firebaseDB.collection('profiles').orderBy('username').get();
        return { data: snap.docs.map(docToObj), error: null };
    } catch (err) {
        return { data: null, error: { message: err.message } };
    }
}

async function getSetting(key) {
    try {
        const doc = await firebaseDB.collection('settings').doc(key).get();
        return doc.exists ? doc.data().value : 0;
    } catch {
        return 0;
    }
}

async function updateSetting(key, value) {
    try {
        await firebaseDB.collection('settings').doc(key).set({
            value: Number(value),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return { error: null };
    } catch (err) {
        return { error: { message: err.message } };
    }
}

// ========== GLOBAL EXPORTS ==========
window.auth = { login, signup, logout, getCurrentUser, createMember, createTeam, claimAdminRole, updateUserRole, joinTeam, approveMember };
window.db = {
    getContributions, addContribution, deleteContribution, updateContribution,
    getExpenses, addExpense, updateExpenseStatus, deleteExpense, updateExpense,
    getPlans, addPlan, completePlan, deletePlan, updatePlan,
    getProfileByUsername, getProfiles,
    getSetting, updateSetting
};
