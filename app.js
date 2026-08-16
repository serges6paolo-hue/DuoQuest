/**
 * DuoQuest - Application JavaScript (vanilla, ES2020+)
 * Logique principale : auth, couple, packs, jeux, temps réel, chat, emojis.
 * Tous les commentaires sont en français.
 */

'use strict';

// ============================================
// ÉTAT GLOBAL
// ============================================
const AppState = {
    supabase: null,
    user: null,
    profile: null,
    couple: null,
    selectedPack: null,

    // Jeu
    gameSession: null,
    mode: null,              // 'quiz_duel' | 'blitz' | 'devinette'
    questions: [],           // liste ordonnée partagée (seed = session.id)
    currentQuestion: null,
    currentRound: 0,
    isHost: false,
    answeredThisRound: false,
    advancing: false,        // évite les doubles avancées de round
    timeLeft: 15,
    timerInterval: null,

    // Blitz
    blitzIndex: 0,
    blitzTimeLeft: 60,
    blitzTimer: null,
    blitzEnded: false,

    // Realtime
    channels: [],
};

// ============================================
// PETITS UTILITAIRES
// ============================================
const $ = (id) => document.getElementById(id);

/** Échappe le HTML pour éviter les injections XSS (chat, noms). */
function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

/** Hash FNV-1a : transforme une chaîne en entier (déterministe). */
function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/**
 * Mélange déterministe (seedé) : les DEUX joueurs obtiennent le même ordre
 * à partir du même `seed` (l'id de la session). Indispensable pour le duel.
 */
function seededShuffle(arr, seedStr) {
    const a = arr.slice();
    let seed = hashString(seedStr);
    for (let i = a.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; // générateur LCG
        const j = seed % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Parse les options : PostgREST renvoie déjà un tableau JSON,
 * mais on gère aussi le cas où ce serait une chaîne JSON.
 */
function parseOptions(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { /* ignore */ }
    }
    return [];
}

/** Affiche un petit toast temporaire (remplace les alert()). */
function toast(message) {
    const el = $('toast');
    if (!el) { alert(message); return; }
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('hidden'), 2800);
}

/** Vérifie que config.js a bien été rempli. */
function isConfigured() {
    const url = SUPABASE_CONFIG?.SUPABASE_URL || '';
    const key = SUPABASE_CONFIG?.SUPABASE_ANON_KEY || '';
    if (!url || !key) return false;
    if (url.includes('VOTRE') || key.includes('VOTRE') || url.includes('xxxxx')) return false;
    return true;
}

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // 1) Vérifier la configuration
    if (!isConfigured()) {
        const content = $('loading-screen').querySelector('.loading-content');
        content.innerHTML = `
            <div class="logo">⚠️</div>
            <h1>Configuration manquante</h1>
            <p style="color:var(--text-secondary);padding:0 16px">
                Remplissez <code>config.js</code> avec l'URL et la clé anon de votre projet Supabase.
            </p>`;
        return;
    }

    // 2) Initialiser Supabase
    try {
        AppState.supabase = window.supabase.createClient(
            SUPABASE_CONFIG.SUPABASE_URL,
            SUPABASE_CONFIG.SUPABASE_ANON_KEY
        );
    } catch (error) {
        console.error('Erreur Supabase:', error);
        toast('Erreur de connexion à Supabase');
        return;
    }

    // 3) Écouter les changements d'authentification
    AppState.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            onSignedIn(session.user);
        } else if (event === 'SIGNED_OUT') {
            resetAppState();
            showScreen('auth-screen');
        }
    });

    // 4) Configurer les écouteurs d'événements
    setupEventListeners();

    // 5) Vérifier la session existante
    await checkSession();
}

// ============================================
// GESTION DES ÉCRANS
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const target = $(screenId);
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
}

// ============================================
// AUTHENTIFICATION
// ============================================
async function checkSession() {
    try {
        const { data: { session } } = await AppState.supabase.auth.getSession();
        if (session) {
            await onSignedIn(session.user);
        } else {
            showScreen('auth-screen');
        }
    } catch (error) {
        console.error('Erreur vérification session:', error);
        showScreen('auth-screen');
    }
}

/** Actions communes après connexion (utilisées par le listener ET checkSession). */
async function onSignedIn(user) {
    AppState.user = user;
    await loadProfile();
    await loadCouple();
    showScreen('home-screen');
    await loadPacks();
}

async function loadProfile() {
    try {
        const { data, error } = await AppState.supabase
            .from('profiles')
            .select('*')
            .eq('id', AppState.user.id)
            .maybeSingle();

        if (error) throw error;

        if (data) {
            AppState.profile = data;
        } else {
            // Profil absent (trigger non exécuté) : on le crée
            await createProfile();
            return;
        }
        $('user-name').textContent = data.display_name || AppState.user.email;
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

async function createProfile() {
    try {
        const displayName = AppState.user.email.split('@')[0];
        const { data, error } = await AppState.supabase
            .from('profiles')
            .insert({ id: AppState.user.id, display_name: displayName })
            .select()
            .single();

        if (error) throw error;
        AppState.profile = data;
        $('user-name').textContent = displayName;
    } catch (error) {
        console.error('Erreur création profil:', error);
    }
}

async function handleLogin(email, password) {
    const { error } = await AppState.supabase.auth.signInWithPassword({ email, password });
    if (error) {
        showAuthError(error.message);
    }
    // La navigation est gérée par onAuthStateChange (SIGNED_IN).
}

async function handleSignup(email, password) {
    const { data, error } = await AppState.supabase.auth.signUp({ email, password });
    if (error) {
        showAuthError(error.message);
        return;
    }
    // Si la confirmation email est activée, `session` est null.
    if (data.session) {
        // La navigation est gérée par onAuthStateChange.
    } else {
        showAuthError('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
    }
}

async function handleLogout() {
    cleanupGame();
    await AppState.supabase.auth.signOut();
    // La réinitialisation est gérée par onAuthStateChange (SIGNED_OUT).
}

// ============================================
// COUPLE
// ============================================
async function loadCouple() {
    try {
        const { data, error } = await AppState.supabase
            .from('couple_members')
            .select('couples(id, name, invite_code, is_active)')
            .eq('user_id', AppState.user.id)
            .order('joined_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        AppState.couple = data ? data.couples : null;
    } catch (error) {
        console.error('Erreur chargement couple:', error);
        AppState.couple = null;
    }
    updateCoupleUI();
}

async function createCouple(name) {
    try {
        const { data, error } = await AppState.supabase.rpc('create_couple', { couple_name: name });
        if (error) throw error;
        AppState.couple = data;
        updateCoupleUI();
        closeModal();
    } catch (error) {
        console.error('Erreur création couple:', error);
        showModalError(error.message);
    }
}

async function joinCouple(inviteCode) {
    try {
        const { data, error } = await AppState.supabase.rpc('join_couple', { invite_code_param: inviteCode });
        if (error) throw error;
        AppState.couple = data;
        updateCoupleUI();
        closeModal();
    } catch (error) {
        console.error('Erreur rejoindre couple:', error);
        showModalError(error.message);
    }
}

function updateCoupleUI() {
    const coupleInfo = $('couple-info');
    const noCouple = $('no-couple');
    if (AppState.couple) {
        coupleInfo.classList.remove('hidden');
        noCouple.classList.add('hidden');
        $('couple-name').textContent = AppState.couple.name;
        $('invite-code').textContent = AppState.couple.invite_code;
    } else {
        coupleInfo.classList.add('hidden');
        noCouple.classList.remove('hidden');
    }
}

async function copyInviteCode() {
    if (!AppState.couple) return;
    try {
        await navigator.clipboard.writeText(AppState.couple.invite_code);
        toast('Code copié !');
    } catch {
        toast(AppState.couple.invite_code);
    }
}

// ============================================
// PACKS
// ============================================
async function loadPacks() {
    try {
        const { data, error } = await AppState.supabase
            .from('packs')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        renderPacks(data || []);
    } catch (error) {
        console.error('Erreur chargement packs:', error);
    }
}

function renderPacks(packs) {
    const container = $('packs-list');
    container.innerHTML = '';
    packs.forEach((pack) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'pack-card';
        card.dataset.packId = pack.id;
        card.dataset.slug = pack.slug;
        card.innerHTML = `
            <div class="pack-icon">${escapeHtml(pack.icon_emoji || '📦')}</div>
            <div class="pack-name">${escapeHtml(pack.name)}</div>`;
        card.addEventListener('click', () => selectPack(card, pack));
        container.appendChild(card);
    });
}

function selectPack(cardElement, pack) {
    document.querySelectorAll('.pack-card').forEach((c) => c.classList.remove('selected'));
    cardElement.classList.add('selected');
    AppState.selectedPack = pack;

    // Avertissement spécifique au pack H125
    $('h125-warning').classList.toggle('hidden', pack.slug !== 'h125');
}

// ============================================
// JEU : démarrage
// ============================================
async function startGame(mode) {
    if (!AppState.couple) return toast('Créez ou rejoignez un couple d\'abord !');
    if (!AppState.selectedPack) return toast('Sélectionnez un pack !');

    AppState.mode = mode;

    try {
        // Trouver une session active du couple, sinon en créer une.
        const session = await findOrCreateSession(mode);
        AppState.gameSession = session;
        AppState.isHost = session.created_by === AppState.user.id;

        await ensureJoined(session.id);
        await loadQuestions(session);

        AppState.currentRound = session.current_round || 0;
        AppState.answeredThisRound = false;
        AppState.advancing = false;

        showScreen('game-screen');
        setupGameHeader(mode);
        renderScores();
        setupRealtime(session);

        if (mode === 'blitz') {
            startBlitz();
        } else {
            startRound();
        }
    } catch (error) {
        console.error('Erreur démarrage jeu:', error);
        toast('Erreur : ' + error.message);
    }
}

async function findOrCreateSession(mode) {
    // 1) Chercher une session active RÉCENTE pour ce couple + pack + mode
    //    (limite à 2 h pour éviter de rejoindre une session orpheline)
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await AppState.supabase
        .from('game_sessions')
        .select('*')
        .eq('couple_id', AppState.couple.id)
        .eq('pack_id', AppState.selectedPack.id)
        .eq('mode', mode)
        .in('status', ['pending', 'active'])
        .gt('created_at', recent)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;
    if (data && data.length) return data[0];

    // 2) Sinon, créer la session
    const isBlitz = mode === 'blitz';
    const { data: created, error: createError } = await AppState.supabase
        .from('game_sessions')
        .insert({
            couple_id: AppState.couple.id,
            pack_id: AppState.selectedPack.id,
            mode,
            status: 'active',
            timer_seconds: isBlitz ? 60 : 15,
            total_rounds: isBlitz ? 999 : 5,
            current_round: 0,
            created_by: AppState.user.id,
            started_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (createError) throw createError;
    return created;
}

/** Ajoute le joueur courant à la session s'il n'y est pas déjà. */
async function ensureJoined(sessionId) {
    const { data } = await AppState.supabase
        .from('session_players')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', AppState.user.id)
        .maybeSingle();

    if (!data) {
        await AppState.supabase
            .from('session_players')
            .insert({ session_id: sessionId, user_id: AppState.user.id });
    }
}

async function loadQuestions(session) {
    let query = AppState.supabase
        .from('questions')
        .select('*')
        .eq('pack_id', AppState.selectedPack.id)
        .eq('status', 'active');

    // Mode Devinette : uniquement les questions de type guess ou qcm
    if (AppState.mode === 'devinette') {
        query = query.in('type', ['guess', 'qcm']);
    }

    const { data, error } = await query.limit(30);
    if (error) throw error;
    if (!data || !data.length) throw new Error('Aucune question active pour ce pack.');

    // Ordre DÉTERMINISTE partagé entre les deux joueurs (seed = id de session)
    let questions = seededShuffle(data, session.id);

    if (AppState.mode !== 'blitz') {
        const n = Math.min(session.total_rounds, questions.length);
        questions = questions.slice(0, n);
    }

    AppState.questions = questions;
}

function setupGameHeader(mode) {
    const labels = {
        quiz_duel: '⚔️ Quiz Duel',
        blitz: '⚡ Blitz 60s',
        devinette: '❓ Devinette',
    };
    $('game-mode-display').textContent = labels[mode] || mode;
}

// ============================================
// JEU : round (quiz_duel & devinette)
// ============================================
function startRound() {
    if (AppState.gameSession && AppState.gameSession.status === 'completed') {
        showResults();
        return;
    }

    const idx = AppState.currentRound;
    if (idx >= AppState.questions.length) {
        if (AppState.isHost) endSession();
        else showResults();
        return;
    }

    const question = AppState.questions[idx];
    AppState.currentQuestion = question;
    AppState.answeredThisRound = false;
    renderQuestion(question);
    startRoundTimer();
}

function renderQuestion(question) {
    $('question-pack').textContent = AppState.selectedPack.name;
    $('question-difficulty').textContent = 'Difficulté : ' + '⭐'.repeat(question.difficulty || 1);
    $('question-text').textContent = question.question_text;

    const container = $('options-container');
    container.innerHTML = '';

    // true_false / qcm / guess → options ; order / matching → réponse unique
    let options = (question.type === 'order' || question.type === 'matching')
        ? [question.correct_answer]
        : parseOptions(question.options);

    if (!options.length) options = [question.correct_answer];

    options.forEach((option) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.dataset.value = option;
        btn.addEventListener('click', () => submitAnswer(option));
        container.appendChild(btn);
    });

    $('feedback-container').classList.add('hidden');
}

function startRoundTimer() {
    clearInterval(AppState.timerInterval);
    AppState.timeLeft = AppState.gameSession.timer_seconds || 15;
    updateTimerDisplay();

    AppState.timerInterval = setInterval(() => {
        AppState.timeLeft--;
        updateTimerDisplay();
        if (AppState.timeLeft <= 0) {
            clearInterval(AppState.timerInterval);
            onRoundTimerExpire();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const el = $('game-timer');
    el.classList.remove('hidden');
    el.textContent = '⏱️ ' + AppState.timeLeft + 's';
    el.classList.toggle('urgent', AppState.timeLeft <= 5);
}

function onRoundTimerExpire() {
    if (!AppState.answeredThisRound) {
        submitAnswer(null); // temps écoulé → réponse vide
    }
    // Filet de sécurité pour l'hôte : avancer même si le partenaire ne répond pas.
    if (AppState.isHost && !AppState.advancing) {
        setTimeout(() => advanceRound(), 1200);
    }
}

async function submitAnswer(selectedAnswer) {
    if (AppState.answeredThisRound) return;
    AppState.answeredThisRound = true;
    clearInterval(AppState.timerInterval);

    const question = AppState.currentQuestion;
    const isCorrect = selectedAnswer !== null && selectedAnswer === question.correct_answer;

    // Score : 1000 points + bonus rapidité (max 500)
    const total = AppState.gameSession.timer_seconds || 15;
    const bonus = isCorrect ? Math.round(Math.max(0, AppState.timeLeft) / total * 500) : 0;
    const points = isCorrect ? 1000 + bonus : 0;

    await recordAnswer(question, selectedAnswer, isCorrect, points);
    await updatePlayerScore(isCorrect, points);
    revealFeedback(question, selectedAnswer, isCorrect);

    if (AppState.isHost) {
        checkBothAnsweredAndAdvance();
    }
}

async function recordAnswer(question, selectedAnswer, isCorrect, points) {
    const playerId = await getPlayerId();
    if (!playerId) return;
    await AppState.supabase.from('answers').insert({
        session_id: AppState.gameSession.id,
        player_id: playerId,
        question_id: question.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        points_earned: points,
        time_taken_ms: Math.round((AppState.gameSession.timer_seconds - AppState.timeLeft) * 1000),
    });
}

async function updatePlayerScore(isCorrect, points) {
    const playerId = await getPlayerId();
    if (!playerId) return;

    // Essayer le RPC sécurisé, sinon mise à jour directe (RLS "own row").
    const { error } = await AppState.supabase.rpc('update_player_score', {
        p_player_id: playerId,
        p_points: points,
        p_is_correct: isCorrect,
    });

    if (error) {
        const { data: cur } = await AppState.supabase
            .from('session_players')
            .select('score, answers_count, correct_answers_count')
            .eq('id', playerId)
            .maybeSingle();
        if (cur) {
            await AppState.supabase.from('session_players').update({
                score: (cur.score || 0) + points,
                answers_count: (cur.answers_count || 0) + 1,
                correct_answers_count: (cur.correct_answers_count || 0) + (isCorrect ? 1 : 0),
            }).eq('id', playerId);
        }
    }
}

async function getPlayerId() {
    const { data } = await AppState.supabase
        .from('session_players')
        .select('id')
        .eq('session_id', AppState.gameSession.id)
        .eq('user_id', AppState.user.id)
        .maybeSingle();
    return data ? data.id : null;
}

function revealFeedback(question, selectedAnswer, isCorrect) {
    const fb = $('feedback-container');
    const result = $('feedback-result');
    result.textContent = selectedAnswer === null
        ? '⏱️ Temps écoulé'
        : (isCorrect ? '✅ Correct !' : '❌ Incorrect');
    result.className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
    $('feedback-explanation').textContent = question.explanation || '';
    fb.classList.remove('hidden');

    // Surligner la bonne réponse et l'éventuelle erreur
    document.querySelectorAll('.option-btn').forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.value === question.correct_answer) btn.classList.add('correct');
        else if (btn.dataset.value === selectedAnswer) btn.classList.add('incorrect');
    });
}

/** Hôte : avance le round quand les DEUX joueurs ont répondu. */
async function checkBothAnsweredAndAdvance() {
    const question = AppState.currentQuestion;
    if (!question) return;

    const { data } = await AppState.supabase
        .from('answers')
        .select('player_id')
        .eq('session_id', AppState.gameSession.id)
        .eq('question_id', question.id);

    const distinctPlayers = new Set((data || []).map((a) => a.player_id)).size;
    if (distinctPlayers >= 2) {
        // Petite pause pour lire l'explication, puis round suivant
        setTimeout(() => advanceRound(), 2600);
    }
}

async function advanceRound() {
    if (AppState.advancing) return;
    if (!AppState.isHost) return;
    AppState.advancing = true;

    const next = AppState.currentRound + 1;
    const total = AppState.gameSession.total_rounds;

    if (next >= total || next >= AppState.questions.length) {
        await endSession();
    } else {
        await AppState.supabase
            .from('game_sessions')
            .update({ current_round: next })
            .eq('id', AppState.gameSession.id);
        // La mise à jour est reçue par les DEUX joueurs via Realtime.
    }
}

async function endSession() {
    await AppState.supabase
        .from('game_sessions')
        .update({ status: 'completed', ended_at: new Date().toISOString() })
        .eq('id', AppState.gameSession.id);
    showResults();
}

// ============================================
// JEU : Blitz 60 secondes
// ============================================
function startBlitz() {
    AppState.blitzIndex = 0;
    AppState.blitzEnded = false;
    $('game-timer').classList.remove('hidden');
    renderBlitzQuestion();
    startBlitzTimer();
}

/** Temps restant calculé depuis started_at (horloge partagée entre les deux joueurs). */
function blitzRemaining() {
    const started = AppState.gameSession?.started_at
        ? new Date(AppState.gameSession.started_at).getTime()
        : Date.now();
    return Math.max(0, Math.round(60 - (Date.now() - started) / 1000));
}

function startBlitzTimer() {
    clearInterval(AppState.blitzTimer);
    AppState.blitzTimer = setInterval(() => {
        AppState.blitzTimeLeft = blitzRemaining();
        $('game-timer').textContent = '⏱️ ' + AppState.blitzTimeLeft + 's';
        $('game-timer').classList.toggle('urgent', AppState.blitzTimeLeft <= 10);
        if (AppState.blitzTimeLeft <= 0) {
            clearInterval(AppState.blitzTimer);
            finishBlitz();
        }
    }, 1000);
}

function renderBlitzQuestion() {
    if (!AppState.questions.length) return;
    const question = AppState.questions[AppState.blitzIndex % AppState.questions.length];
    AppState.currentQuestion = question;
    $('question-pack').textContent = AppState.selectedPack.name;
    $('question-difficulty').textContent = 'Difficulté : ' + '⭐'.repeat(question.difficulty || 1);
    $('question-text').textContent = question.question_text;

    const container = $('options-container');
    container.innerHTML = '';
    // Pas d'explication en Blitz : seulement des options cliquables.
    const options = parseOptions(question.options);
    const list = options.length ? options : [question.correct_answer];
    list.forEach((option) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.dataset.value = option;
        btn.addEventListener('click', () => blitzAnswer(option));
        container.appendChild(btn);
    });
    $('feedback-container').classList.add('hidden');
}

async function blitzAnswer(selectedAnswer) {
    if (AppState.blitzEnded) return;
    const question = AppState.currentQuestion;
    const isCorrect = selectedAnswer === question.correct_answer;
    const points = isCorrect ? 1000 : 0;

    await recordBlitzAnswer(question, selectedAnswer, isCorrect, points);
    await updatePlayerScore(isCorrect, points);

    // Retour visuel rapide (sans explication), puis question suivante
    flashAnswer(isCorrect);
    AppState.blitzIndex++;
    renderBlitzQuestion();
}

async function recordBlitzAnswer(question, selectedAnswer, isCorrect, points) {
    const playerId = await getPlayerId();
    if (!playerId) return;
    await AppState.supabase.from('answers').insert({
        session_id: AppState.gameSession.id,
        player_id: playerId,
        question_id: question.id,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        points_earned: points,
        time_taken_ms: 0,
    });
}

function flashAnswer(isCorrect) {
    const fb = $('feedback-container');
    $('feedback-result').textContent = isCorrect ? '✅' : '❌';
    $('feedback-result').className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
    $('feedback-explanation').textContent = '';
    fb.classList.remove('hidden');
}

async function finishBlitz() {
    AppState.blitzEnded = true;
    clearInterval(AppState.blitzTimer);
    if (AppState.isHost) {
        await AppState.supabase
            .from('game_sessions')
            .update({ status: 'completed', ended_at: new Date().toISOString() })
            .eq('id', AppState.gameSession.id);
    }
    showResults();
}

// ============================================
// SCORES & RÉSULTATS
// ============================================
/**
 * Récupère une map { userId: display_name } pour une liste d'utilisateurs.
 * (On évite la jointure PostgREST profiles(...) qui n'est pas résolue car
 *  les FK user_id/sender_id pointent vers auth.users et non vers profiles.)
 */
async function getProfilesMap(userIds) {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (!ids.length) return {};
    try {
        const { data } = await AppState.supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', ids);
        const map = {};
        (data || []).forEach((p) => { map[p.id] = p.display_name || ''; });
        return map;
    } catch {
        return {};
    }
}

/** Résout le nom d'affichage d'un utilisateur. */
async function resolveName(userId) {
    if (!userId) return 'Inconnu';
    if (userId === AppState.user?.id) return AppState.profile?.display_name || 'Vous';
    const map = await getProfilesMap([userId]);
    return map[userId] || 'Inconnu';
}

async function renderScores() {
    if (!AppState.gameSession) return;
    try {
        const { data, error } = await AppState.supabase
            .from('session_players')
            .select('*')
            .eq('session_id', AppState.gameSession.id)
            .order('joined_at', { ascending: true });

        if (error) throw error;

        const names = await getProfilesMap((data || []).map((p) => p.user_id));

        for (let i = 1; i <= 2; i++) {
            const el = $(`player${i}-score`);
            if (!el) continue;
            const player = (data || [])[i - 1];
            if (player) {
                const isMe = player.user_id === AppState.user.id;
                const name = names[player.user_id] || (isMe ? 'moi' : 'Joueur ' + i);
                el.querySelector('.player-name').textContent = isMe ? ('Vous · ' + name) : name;
                el.querySelector('.score-value').textContent = player.score || 0;
            } else {
                el.querySelector('.player-name').textContent = i === 1 ? 'Vous' : 'Partenaire';
                el.querySelector('.score-value').textContent = '0';
            }
        }
    } catch (error) {
        console.error('Erreur scores:', error);
    }
}

async function showResults() {
    cleanupTimers();
    try {
        const { data, error } = await AppState.supabase
            .from('session_players')
            .select('*')
            .eq('session_id', AppState.gameSession.id)
            .order('score', { ascending: false });

        if (error) throw error;

        const names = await getProfilesMap((data || []).map((p) => p.user_id));

        const rows = (data || []).map((p) => ({
            name: names[p.user_id] || (p.user_id === AppState.user.id ? 'Vous' : 'Joueur'),
            score: p.score || 0,
            correct: p.correct_answers_count || 0,
            answers: p.answers_count || 0,
            isMe: p.user_id === AppState.user.id,
        }));

        $('results-body').innerHTML = rows.map((r, i) => `
            <div class="result-row ${r.isMe ? 'me' : ''}">
                <span class="result-rank">${i === 0 ? '🏆' : '🥈'}</span>
                <div class="result-info">
                    <div class="result-name">${escapeHtml(r.name)}${r.isMe ? ' (vous)' : ''}</div>
                    <div class="result-detail">${r.correct} bonne(s) réponse(s) / ${r.answers}</div>
                </div>
                <span class="result-score">${r.score}</span>
            </div>`).join('');

        $('results-overlay').classList.remove('hidden');
    } catch (error) {
        console.error('Erreur résultats:', error);
        $('results-body').textContent = 'Erreur lors du chargement des résultats.';
        $('results-overlay').classList.remove('hidden');
    }
}

// ============================================
// TEMPS RÉEL (Supabase Realtime)
// ============================================
function setupRealtime(session) {
    closeChannels();

    // 1) Mises à jour de la session (round courant, fin de partie)
    const sessionChannel = AppState.supabase
        .channel(`session:${session.id}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${session.id}`,
        }, (payload) => {
            const s = payload.new;
            AppState.gameSession = { ...AppState.gameSession, ...s };
            if (s.status === 'completed') {
                showResults();
            } else if (s.status === 'cancelled') {
                toast('La partie a été annulée.');
                cleanupGame();
                showScreen('home-screen');
            } else {
                AppState.currentRound = s.current_round || 0;
                AppState.advancing = false;
                if (AppState.mode !== 'blitz') startRound();
            }
        })
        .subscribe();
    AppState.channels.push(sessionChannel);

    // 2) Nouvelles réponses (mise à jour des scores + détection "les deux ont répondu")
    const answersChannel = AppState.supabase
        .channel(`answers:${session.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'answers',
            filter: `session_id=eq.${session.id}`,
        }, (payload) => {
            // Ne pas recompter sa propre réponse
            if (payload.new.player_id && AppState.isHost && AppState.currentQuestion) {
                checkBothAnsweredAndAdvance();
            }
            renderScores();
        })
        .subscribe();
    AppState.channels.push(answersChannel);

    // 2b) Joueurs qui rejoignent la session (mise à jour des noms/scores)
    const playersChannel = AppState.supabase
        .channel(`players:${session.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'session_players',
            filter: `session_id=eq.${session.id}`,
        }, () => renderScores())
        .subscribe();
    AppState.channels.push(playersChannel);

    // 3) Chat du couple
    if (AppState.couple) {
        const chatChannel = AppState.supabase
            .channel(`chat:${AppState.couple.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `couple_id=eq.${AppState.couple.id}`,
            }, async (payload) => {
                const senderName = await resolveName(payload.new.sender_id);
                addChatMessage(payload.new, true, senderName);
            })
            .subscribe();
        AppState.channels.push(chatChannel);
    }

    // 4) Emojis rapides (réactions du partenaire)
    const emojiChannel = AppState.supabase
        .channel(`emojis:${session.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'emoji_reactions',
            filter: `session_id=eq.${session.id}`,
        }, (payload) => {
            if (payload.new.sender_id !== AppState.user?.id) {
                showEmojiAnimation(payload.new.emoji);
            }
        })
        .subscribe();
    AppState.channels.push(emojiChannel);
}

function closeChannels() {
    AppState.channels.forEach((c) => AppState.supabase.removeChannel(c));
    AppState.channels = [];
}

// ============================================
// CHAT
// ============================================
function toggleChat() {
    const panel = $('chat-panel');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        loadChatMessages();
    } else {
        panel.classList.add('hidden');
    }
}

async function loadChatMessages() {
    if (!AppState.couple) return;
    try {
        const { data, error } = await AppState.supabase
            .from('chat_messages')
            .select('*')
            .eq('couple_id', AppState.couple.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;

        const names = await getProfilesMap((data || []).map((m) => m.sender_id));

        const container = $('chat-messages');
        container.innerHTML = '';
        (data || []).reverse().forEach((msg) => addChatMessage(msg, false, names[msg.sender_id]));
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Erreur chargement chat:', error);
    }
}

function addChatMessage(msg, scroll = true, senderName) {
    const container = $('chat-messages');
    if (!container) return;
    const name = senderName || msg.profiles?.display_name || (msg.sender_id === AppState.user?.id ? 'Vous' : 'Inconnu');
    const el = document.createElement('div');
    el.className = 'chat-message' + (msg.sender_id === AppState.user?.id ? ' own' : '');
    el.innerHTML = `
        <div class="chat-sender">${escapeHtml(name)}</div>
        <div class="chat-text">${escapeHtml(msg.message_text)}</div>`;
    container.appendChild(el);
    if (scroll) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(text) {
    if (!AppState.couple || !text.trim()) return;
    try {
        await AppState.supabase.from('chat_messages').insert({
            couple_id: AppState.couple.id,
            session_id: AppState.gameSession ? AppState.gameSession.id : null,
            sender_id: AppState.user.id,
            message_text: text.trim(),
        });
        $('chat-input').value = '';
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
}

// ============================================
// EMOJIS RAPIDES
// ============================================
async function sendEmoji(emoji) {
    if (!AppState.gameSession) return;
    try {
        await AppState.supabase.from('emoji_reactions').insert({
            session_id: AppState.gameSession.id,
            sender_id: AppState.user.id,
            emoji,
        });
        showEmojiAnimation(emoji);
    } catch (error) {
        console.error('Erreur envoi emoji:', error);
    }
}

function showEmojiAnimation(emoji) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.className = 'emoji-float';
    el.style.left = (Math.random() * 70 + 15) + '%';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// ============================================
// MODAL COUPLE
// ============================================
function openModal(type) {
    const modal = $('couple-modal');
    const createForm = $('create-couple-form');
    const joinForm = $('join-couple-form');
    modal.classList.remove('hidden');

    if (type === 'create') {
        createForm.classList.remove('hidden');
        joinForm.classList.add('hidden');
        $('modal-title').textContent = 'Créer un couple';
    } else {
        createForm.classList.add('hidden');
        joinForm.classList.remove('hidden');
        $('modal-title').textContent = 'Rejoindre un couple';
    }
}

function closeModal() {
    $('couple-modal').classList.add('hidden');
    $('modal-error').classList.add('hidden');
    $('create-couple-form').reset();
    $('join-couple-form').reset();
}

function showModalError(message) {
    const el = $('modal-error');
    el.textContent = message;
    el.classList.remove('hidden');
}

// ============================================
// NETTOYAGE
// ============================================
function cleanupTimers() {
    clearInterval(AppState.timerInterval);
    clearInterval(AppState.blitzTimer);
}

function cleanupGame() {
    cleanupTimers();
    closeChannels();
    AppState.gameSession = null;
    AppState.currentQuestion = null;
    AppState.questions = [];
    AppState.currentRound = 0;
    AppState.advancing = false;
    AppState.answeredThisRound = false;
    AppState.blitzEnded = false;
}

function resetAppState() {
    cleanupGame();
    AppState.user = null;
    AppState.profile = null;
    AppState.couple = null;
    AppState.selectedPack = null;
}

// ============================================
// ÉCOUTEURS D'ÉVÉNEMENTS
// ============================================
function setupEventListeners() {
    // --- Navigation auth ---
    $('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        $('login-form').classList.add('hidden');
        $('signup-form').classList.remove('hidden');
        $('auth-error').classList.add('hidden');
    });
    $('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        $('signup-form').classList.add('hidden');
        $('login-form').classList.remove('hidden');
        $('auth-error').classList.add('hidden');
    });

    // --- Auth ---
    $('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin($('login-email').value, $('login-password').value);
    });
    $('signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignup($('signup-email').value, $('signup-password').value);
    });
    $('logout-btn').addEventListener('click', handleLogout);

    // --- Couple ---
    $('create-couple-btn').addEventListener('click', () => openModal('create'));
    $('join-couple-btn').addEventListener('click', () => openModal('join'));
    $('cancel-create-btn').addEventListener('click', closeModal);
    $('cancel-join-btn').addEventListener('click', closeModal);
    $('create-couple-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createCouple($('couple-name-input').value.trim());
    });
    $('join-couple-form').addEventListener('submit', (e) => {
        e.preventDefault();
        joinCouple($('invite-code-input').value.trim());
    });
    $('copy-code-btn').addEventListener('click', copyInviteCode);

    // --- Modes de jeu ---
    document.querySelectorAll('.game-mode-card').forEach((card) => {
        card.addEventListener('click', () => startGame(card.dataset.mode));
    });

    // --- Retour accueil ---
    $('back-home-btn').addEventListener('click', async () => {
        // Si l'hôte quitte, annuler la session pour ne pas la réutiliser.
        if (AppState.isHost && AppState.gameSession && AppState.gameSession.status === 'active') {
            await AppState.supabase
                .from('game_sessions')
                .update({ status: 'cancelled' })
                .eq('id', AppState.gameSession.id);
        }
        cleanupGame();
        showScreen('home-screen');
    });

    // --- Fermer les résultats ---
    $('close-results-btn').addEventListener('click', () => {
        $('results-overlay').classList.add('hidden');
        cleanupGame();
        showScreen('home-screen');
    });

    // --- Chat ---
    $('toggle-chat-btn').addEventListener('click', toggleChat);
    $('close-chat-btn').addEventListener('click', toggleChat);
    $('chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('chat-input');
        sendChatMessage(input.value);
    });

    // --- Emojis ---
    document.querySelectorAll('.emoji-btn').forEach((btn) => {
        btn.addEventListener('click', () => sendEmoji(btn.dataset.emoji));
    });

    // --- Avertissement H125 ---
    $('dismiss-warning').addEventListener('click', () => {
        $('h125-warning').classList.add('hidden');
    });

    // --- Service Worker (PWA) ---
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {
            console.log('Service Worker non enregistré.');
        });
    }
}

// ============================================
// ERREURS
// ============================================
function showAuthError(message) {
    const el = $('auth-error');
    el.textContent = message;
    el.classList.remove('hidden');
    clearTimeout(showAuthError._t);
    showAuthError._t = setTimeout(() => el.classList.add('hidden'), 6000);
}
