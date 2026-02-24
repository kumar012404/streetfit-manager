// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://ipojxwupuqkcftwyjiyb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MXI2of5uVL5GrsHaL9Fy8w_O-utFxaq';

// Initialize the Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * AUTHENTICATION
 */

async function login(username, password) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@streetfit.local`;
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

async function signup(username, password) {
    const email = username.includes('@') ? username : `${username.toLowerCase()}@streetfit.local`;
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: { username: username }
        }
    });
    return { data, error };
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (!error) window.location.href = 'auth.html';
}

async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Get profile for role
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
    return { ...user, profile };
}

/**
 * DATABASE OPERATIONS
 */

// Contributions
async function getContributions() {
    return await supabaseClient.from('contributions').select('*, profiles(username, email)');
}

async function addContribution(partner_id, amount) {
    return await supabaseClient.from('contributions').insert([{ partner_id, amount, date: new Date() }]);
}

async function deleteContribution(id) {
    return await supabaseClient.from('contributions').delete().eq('id', id);
}

async function updateContribution(id, amount) {
    return await supabaseClient.from('contributions').update({ amount }).eq('id', id);
}

// Expenses
async function getExpenses() {
    return await supabaseClient.from('expenses').select('*, profiles(username, email)');
}

async function addExpense(description, amount, partner_id) {
    return await supabaseClient.from('expenses').insert([{
        description,
        amount,
        partner_id,
        status: 'pending',
        created_at: new Date()
    }]);
}

async function updateExpenseStatus(id, status) {
    return await supabaseClient.from('expenses').update({ status }).eq('id', id);
}

async function updateExpense(id, description, amount) {
    return await supabaseClient.from('expenses').update({ description, amount }).eq('id', id);
}

async function deleteExpense(id) {
    return await supabaseClient.from('expenses').delete().eq('id', id);
}

// Plans
async function getPlans() {
    return await supabaseClient.from('plans').select('*');
}

async function addPlan(title, estimated_cost, partner = 'Unassigned') {
    const data = {
        title,
        estimated_cost: parseFloat(estimated_cost) || 0,
        status: 'pending',
        phase: partner
    };

    return await supabaseClient.from('plans').insert([data]);
}

async function updatePlan(id, title, estimated_cost, status, partner) {
    const updateData = {};
    if (title !== null && title !== undefined) updateData.title = title;
    if (estimated_cost !== null && estimated_cost !== undefined) updateData.estimated_cost = estimated_cost;
    if (status !== null && status !== undefined) updateData.status = status;
    if (partner !== null && partner !== undefined) updateData.phase = partner;

    // If we are setting status to pending, we should probably clear actual cost
    if (status === 'pending') updateData.actual_cost = null;

    return await supabaseClient.from('plans').update(updateData).eq('id', id);
}

async function completePlan(id, actual_cost) {
    return await supabaseClient.from('plans').update({
        actual_cost,
        status: 'completed'
    }).eq('id', id);
}

async function deletePlan(id) {
    return await supabaseClient.from('plans').delete().eq('id', id);
}

async function getProfileByUsername(username) {
    return await supabaseClient.from('profiles').select('*').ilike('username', username).single();
}

async function getProfiles() {
    return await supabaseClient.from('profiles').select('*').order('username');
}

async function deleteProfile(id) {
    return await supabaseClient.from('profiles').delete().eq('id', id);
}

async function getSetting(key) {
    const { data } = await supabaseClient.from('settings').select('value').eq('key', key).single();
    return data ? data.value : 0;
}

async function updateSetting(key, value) {
    return await supabaseClient.from('settings').update({ value, updated_at: new Date() }).eq('key', key);
}

// Global Exports
window.auth = { login, signup, logout, getCurrentUser };
window.db = {
    getContributions, addContribution, deleteContribution, updateContribution,
    getExpenses, addExpense, updateExpenseStatus, deleteExpense, updateExpense,
    getPlans, addPlan, completePlan, deletePlan, updatePlan,
    getProfileByUsername, getProfiles, deleteProfile,
    getSetting, updateSetting
};
window.supabase = supabaseClient;
