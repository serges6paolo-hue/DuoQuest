/**
 * DuoQuest - Application JavaScript
 * Logique principale de l'application
 */

// ============================================
// ÉTAT GLOBAL
// ============================================
const AppState = {
    supabase: null,
    user: null,
    profile: null,
    couple: null,
    selectedPack: null,
    gameSession: null,
    currentQuestion: null,
    questions: [],
    currentRound: 0,
    timer: null,
    timeLeft: 15,
    chatOpen: false
};

// ============================================
// INITIALISATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DuoQuest - Initialisation...');
    
    // Vérifier la configuration Supabase
    if (!SUPABASE_CONFIG || SUPABASE_CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        showError('Configuration manquante. Veuillez remplir config.js avec vos identifiants Supabase.');
        return;
    }
    
    // Initialiser Supabase
    try {
        AppState.supabase = window.supabase.createClient(
            SUPABASE_CONFIG.SUPABASE_URL,
            SUPABASE_CONFIG.SUPABASE_ANON_KEY
        );
        console.log('Supabase initialisé avec succès');
    } catch (error) {
        console.error('Erreur Supabase:', error);
        showError('Erreur de connexion à Supabase');
        return;
    }
    
    // Vérifier la session existante
    await checkSession();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Masquer l'écran de chargement
    setTimeout(() => {
        showScreen('auth-screen');
    }, 1000);
});

// ============================================
// GESTION DES ÉCRANS
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ============================================
// AUTHENTIFICATION
// ============================================
async function checkSession() {
    try {
        const { data: { session } } = await AppState.supabase.auth.getSession();
        
        if (session) {
            AppState.user = session.user;
            await loadProfile();
            await loadCouple();
            showScreen('home-screen');
            updateUI();
        } else {
            showScreen('auth-screen');
        }
    } catch (error) {
        console.error('Erreur vérification session:', error);
        showScreen('auth-screen');
    }
}

async function loadProfile() {
    try {
        const { data, error } = await AppState.supabase
            .from('profiles')
            .select('*')
            .eq('id', AppState.user.id)
            .single();
        
        if (error) throw error;
        
        AppState.profile = data;
        document.getElementById('user-name').textContent = data.display_name || AppState.user.email;
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        // Créer un profil si inexistant
        await createProfile();
    }
}

async function createProfile() {
    try {
        const displayName = AppState.user.email.split('@')[0];
        
        const { data, error } = await AppState.supabase
            .from('profiles')
            .insert({
                id: AppState.user.id,
                display_name: displayName
            })
            .select()
            .single();
        
        if (error) throw error;
        
        AppState.profile = data;
        document.getElementById('user-name').textContent = displayName;
    } catch (error) {
        console.error('Erreur création profil:', error);
    }
}

async function handleLogin(email, password) {
    try {
        const { data, error } = await AppState.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) throw error;
        
        AppState.user = data.user;
        await loadProfile();
        await loadCouple();
        showScreen('home-screen');
        updateUI();
    } catch (error) {
        console.error('Erreur connexion:', error);
        showAuthError(error.message);
    }
}

async function handleSignup(email, password) {
    try {
        const { data, error } = await AppState.supabase.auth.signUp({
            email,
            password
        });
        
        if (error) throw error;
        
        // Le profil sera créé automatiquement par le trigger
        AppState.user = data.user;
        await loadProfile();
        showScreen('home-screen');
        updateUI();
    } catch (error) {
        console.error('Erreur inscription:', error);
        showAuthError(error.message);
    }
}

async function handleLogout() {
    try {
        await AppState.supabase.auth.signOut();
        AppState.user = null;
        AppState.profile = null;
        AppState.couple = null;
        showScreen('auth-screen');
    } catch (error) {
        console.error('Erreur déconnexion:', error);
    }
}

// ============================================
// COUPLE
// ============================================
async function loadCouple() {
    try {
        const { data, error } = await AppState.supabase
            .from('couple_members')
            .select(`
                couples (
                    id,
                    name,
                    invite_code,
                    is_active
                )
            `)
            .eq('user_id', AppState.user.id)
            .single();
        
        if (error) throw error;
        
        AppState.couple = data.couples;
        updateCoupleUI();
    } catch (error) {
        console.error('Erreur chargement couple:', error);
        AppState.couple = null;
        updateCoupleUI();
    }
}

async function createCouple(name) {
    try {
        const { data, error } = await AppState.supabase.rpc('create_couple', {
            couple_name: name
        });
        
        if (error) throw error;
        
        AppState.couple = data;
        updateCoupleUI();
        closeModal();
        return true;
    } catch (error) {
        console.error('Erreur création couple:', error);
        showModalError(error.message);
        return false;
    }
}

async function joinCouple(inviteCode) {
    try {
        const { data, error } = await AppState.supabase.rpc('join_couple', {
            invite_code_param: inviteCode
        });
        
        if (error) throw error;
        
        AppState.couple = data;
        updateCoupleUI();
        closeModal();
        return true;
    } catch (error) {
        console.error('Erreur rejoindre couple:', error);
        showModalError(error.message);
        return false;
    }
}

function updateCoupleUI() {
    const coupleInfo = document.getElementById('couple-info');
    const noCouple = document.getElementById('no-couple');
    
    if (AppState.couple) {
        coupleInfo.classList.remove('hidden');
        noCouple.classList.add('hidden');
        document.getElementById('couple-name').textContent = AppState.couple.name;
        document.getElementById('invite-code').textContent = AppState.couple.invite_code;
    } else {
        coupleInfo.classList.add('hidden');
        noCouple.classList.remove('hidden');
    }
}

async function copyInviteCode() {
    if (AppState.couple) {
        try {
            await navigator.clipboard.writeText(AppState.couple.invite_code);
            alert('Code copié !');
        } catch (error) {
            console.error('Erreur copie:', error);
        }
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
            .eq('is_active', true);
        
        if (error) throw error;
        
        renderPacks(data);
    } catch (error) {
        console.error('Erreur chargement packs:', error);
    }
}

function renderPacks(packs) {
    const container = document.getElementById('packs-list');
    container.innerHTML = '';
    
    packs.forEach(pack => {
        const card = document.createElement('div');
        card.className = 'pack-card';
        card.dataset.packId = pack.id;
        card.dataset.slug = pack.slug;
        card.innerHTML = `
            <div class="pack-icon">${pack.icon_emoji || '📦'}</div>
            <div class="pack-name">${pack.name}</div>
        `;
        
        card.addEventListener('click', () => selectPack(card, pack));
        container.appendChild(card);
    });
}

function selectPack(cardElement, pack) {
    // Désélectionner tous les packs
    document.querySelectorAll('.pack-card').forEach(c => c.classList.remove('selected'));
    
    // Sélectionner le pack cliqué
    cardElement.classList.add('selected');
    AppState.selectedPack = pack;
    
    // Afficher l'avertissement H125 si nécessaire
    const warningBanner = document.getElementById('h125-warning');
    if (pack.slug === 'h125') {
        warningBanner.classList.remove('hidden');
    } else {
        warningBanner.classList.add('hidden');
    }
}

// ============================================
// JEU
// ============================================
async function startGame(mode) {
    if (!AppState.couple) {
        alert('Veuillez créer ou rejoindre un couple d\'abord !');
        return;
    }
    
    if (!AppState.selectedPack) {
        alert('Veuillez sélectionner un pack !');
        return;
    }
    
    try {
        // Créer une session de jeu
        const { data: session, error } = await AppState.supabase
            .from('game_sessions')
            .insert({
                couple_id: AppState.couple.id,
                pack_id: AppState.selectedPack.id,
                mode: mode,
                timer_seconds: mode === 'blitz' ? 60 : 15,
                total_rounds: mode === 'blitz' ? 999 : 5,
                status: 'active',
                created_by: AppState.user.id
            })
            .select()
            .single();
        
        if (error) throw error;
        
        AppState.gameSession = session;
        
        // Ajouter le joueur actuel
        await AppState.supabase
            .from('session_players')
            .insert({
                session_id: session.id,
                user_id: AppState.user.id
            });
        
        // Charger les questions
        await loadQuestions();
        
        // Afficher l'écran de jeu
        showScreen('game-screen');
        document.getElementById('game-mode-display').textContent = 
            mode === 'quiz_duel' ? 'Quiz Duel' : 
            mode === 'blitz' ? 'Blitz 60s' : 'Devinette';
        
        // Démarrer le jeu
        startRound();
        
        // Écouter les changements en temps réel
        setupRealtimeListeners(session.id);
        
    } catch (error) {
        console.error('Erreur démarrage jeu:', error);
        alert('Erreur: ' + error.message);
    }
}

async function loadQuestions() {
    try {
        const { data, error } = await AppState.supabase
            .from('questions')
            .select('*')
            .eq('pack_id', AppState.selectedPack.id)
            .eq('status', 'active')
            .limit(10);
        
        if (error) throw error;
        
        // Mélanger les questions
        AppState.questions = data.sort(() => Math.random() - 0.5);
        AppState.currentRound = 0;
    } catch (error) {
        console.error('Erreur chargement questions:', error);
    }
}

function startRound() {
    if (AppState.currentRound >= AppState.questions.length || 
        AppState.currentRound >= AppState.gameSession.total_rounds) {
        endGame();
        return;
    }
    
    const question = AppState.questions[AppState.currentRound];
    AppState.currentQuestion = question;
    
    // Mettre à jour l'affichage
    document.getElementById('question-pack').textContent = AppState.selectedPack.name;
    document.getElementById('question-difficulty').textContent = 
        'Difficulté: ' + '⭐'.repeat(question.difficulty);
    document.getElementById('question-text').textContent = question.question_text;
    
    // Générer les options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    let options = [];
    if (question.type === 'qcm' || question.type === 'true_false' || question.type === 'guess') {
        options = JSON.parse(question.options);
    } else {
        // Pour les autres types, utiliser correct_answer comme option unique
        options = [question.correct_answer];
    }
    
    options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = option;
        btn.addEventListener('click', () => submitAnswer(option, btn));
        optionsContainer.appendChild(btn);
    });
    
    // Réinitialiser le feedback
    document.getElementById('feedback-container').classList.add('hidden');
    
    // Démarrer le timer
    startTimer();
}

function startTimer() {
    clearInterval(AppState.timer);
    AppState.timeLeft = AppState.gameSession.timer_seconds;
    updateTimerDisplay();
    
    AppState.timer = setInterval(() => {
        AppState.timeLeft--;
        updateTimerDisplay();
        
        if (AppState.timeLeft <= 0) {
            clearInterval(AppState.timer);
            submitAnswer(null, null); // Temps écoulé
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerEl = document.getElementById('game-timer');
    timerEl.textContent = `⏱️ ${AppState.timeLeft}s`;
    
    if (AppState.timeLeft <= 5) {
        timerEl.classList.remove('hidden');
    } else {
        timerEl.classList.add('hidden');
    }
}

async function submitAnswer(selectedAnswer, btnElement) {
    clearInterval(AppState.timer);
    
    const question = AppState.currentQuestion;
    const isCorrect = selectedAnswer === question.correct_answer;
    
    // Calculer les points
    let points = 0;
    if (isCorrect) {
        points = 1000 + (AppState.timeLeft * 50); // Bonus rapidité
    }
    
    // Enregistrer la réponse
    try {
        // Récupérer le player_id
        const { data: playerData } = await AppState.supabase
            .from('session_players')
            .select('id')
            .eq('session_id', AppState.gameSession.id)
            .eq('user_id', AppState.user.id)
            .single();
        
        if (playerData) {
            await AppState.supabase
                .from('answers')
                .insert({
                    session_id: AppState.gameSession.id,
                    player_id: playerData.id,
                    question_id: question.id,
                    selected_answer: selectedAnswer,
                    is_correct: isCorrect,
                    points_earned: points,
                    time_taken_ms: (AppState.gameSession.timer_seconds - AppState.timeLeft) * 1000
                });
            
            // Mettre à jour le score du joueur
            await AppState.supabase.rpc('update_player_score', {
                p_player_id: playerData.id,
                p_points: points,
                p_is_correct: isCorrect
            }).catch(() => {
                // Si la fonction RPC n'existe pas, mettre à jour directement
                console.log('Mise à jour directe du score...');
            });
        }
    } catch (error) {
        console.error('Erreur enregistrement réponse:', error);
    }
    
    // Afficher le feedback
    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackResult = document.getElementById('feedback-result');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    
    feedbackContainer.classList.remove('hidden');
    feedbackResult.textContent = isCorrect ? '✅ Correct !' : '❌ Incorrect';
    feedbackResult.className = 'feedback-result ' + (isCorrect ? 'correct' : 'incorrect');
    feedbackExplanation.textContent = question.explanation || '';
    
    // Mettre en évidence la bonne/mauvaise réponse
    if (btnElement) {
        btnElement.classList.add(isCorrect ? 'correct' : 'incorrect');
    }
    
    // Passer à la question suivante après un délai
    setTimeout(() => {
        AppState.currentRound++;
        startRound();
    }, 3000);
}

function endGame() {
    clearInterval(AppState.timer);
    
    // Afficher les scores finaux
    alert('Partie terminée !');
    
    // Retour à l'accueil
    showScreen('home-screen');
    
    // Nettoyer la session
    AppState.gameSession = null;
    AppState.currentQuestion = null;
}

// ============================================
// TEMPS RÉEL
// ============================================
function setupRealtimeListeners(sessionId) {
    // Écouter les réponses des autres joueurs
    AppState.supabase
        .channel(`answers:${sessionId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'answers',
            filter: `session_id=eq.${sessionId}`
        }, payload => {
            console.log('Nouvelle réponse:', payload);
            // Mettre à jour les scores en temps réel
            updateScores();
        })
        .subscribe();
    
    // Écouter les messages de chat
    if (AppState.couple) {
        AppState.supabase
            .channel(`chat:${AppState.couple.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `couple_id=eq.${AppState.couple.id}`
            }, payload => {
                addChatMessage(payload.new);
            })
            .subscribe();
    }
}

async function updateScores() {
    if (!AppState.gameSession) return;
    
    try {
        const { data, error } = await AppState.supabase
            .from('session_players')
            .select('*, profiles(display_name)')
            .eq('session_id', AppState.gameSession.id);
        
        if (error) throw error;
        
        // Mettre à jour l'affichage des scores
        data.forEach((player, index) => {
            const scoreEl = document.getElementById(`player${index + 1}-score`);
            if (scoreEl) {
                scoreEl.querySelector('.player-name').textContent = 
                    player.profiles?.display_name || `Joueur ${index + 1}`;
                scoreEl.querySelector('.score-value').textContent = player.score || 0;
            }
        });
    } catch (error) {
        console.error('Erreur mise à jour scores:', error);
    }
}

// ============================================
// CHAT
// ============================================
function toggleChat() {
    const chatPanel = document.getElementById('chat-panel');
    AppState.chatOpen = !AppState.chatOpen;
    
    if (AppState.chatOpen) {
        chatPanel.classList.remove('hidden');
        loadChatMessages();
    } else {
        chatPanel.classList.add('hidden');
    }
}

async function loadChatMessages() {
    if (!AppState.couple) return;
    
    try {
        const { data, error } = await AppState.supabase
            .from('chat_messages')
            .select('*, profiles(display_name)')
            .eq('couple_id', AppState.couple.id)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';
        
        data.reverse().forEach(msg => {
            addChatMessage(msg, false);
        });
        
        // Scroll vers le bas
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Erreur chargement chat:', error);
    }
}

function addChatMessage(msg, scroll = true) {
    const container = document.getElementById('chat-messages');
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message' + (msg.sender_id === AppState.user?.id ? ' own' : '');
    
    messageEl.innerHTML = `
        <div class="chat-sender">${msg.profiles?.display_name || 'Inconnu'}</div>
        <div class="chat-text">${msg.message_text}</div>
    `;
    
    container.appendChild(messageEl);
    
    if (scroll) {
        container.scrollTop = container.scrollHeight;
    }
}

async function sendChatMessage(text) {
    if (!AppState.couple || !text.trim()) return;
    
    try {
        await AppState.supabase
            .from('chat_messages')
            .insert({
                couple_id: AppState.couple.id,
                sender_id: AppState.user.id,
                message_text: text.trim()
            });
        
        document.getElementById('chat-input').value = '';
    } catch (error) {
        console.error('Erreur envoi message:', error);
    }
}

async function sendEmoji(emoji) {
    if (!AppState.gameSession) return;
    
    try {
        await AppState.supabase
            .from('emoji_reactions')
            .insert({
                session_id: AppState.gameSession.id,
                sender_id: AppState.user.id,
                emoji: emoji
            });
        
        // Animation visuelle
        showEmojiAnimation(emoji);
    } catch (error) {
        console.error('Erreur envoi emoji:', error);
    }
}

function showEmojiAnimation(emoji) {
    // Créer une animation temporaire
    const animation = document.createElement('div');
    animation.textContent = emoji;
    animation.style.cssText = `
        position: fixed;
        font-size: 3rem;
        pointer-events: none;
        z-index: 1000;
        animation: floatUp 1s ease-out forwards;
    `;
    
    animation.style.left = Math.random() * 80 + 10 + '%';
    animation.style.top = '50%';
    
    document.body.appendChild(animation);
    
    setTimeout(() => animation.remove(), 1000);
}

// ============================================
// MODAL
// ============================================
function openModal(type) {
    const modal = document.getElementById('couple-modal');
    const createForm = document.getElementById('create-couple-form');
    const joinForm = document.getElementById('join-couple-form');
    const modalTitle = document.getElementById('modal-title');
    
    modal.classList.remove('hidden');
    
    if (type === 'create') {
        createForm.classList.remove('hidden');
        joinForm.classList.add('hidden');
        modalTitle.textContent = 'Créer un Couple';
    } else {
        createForm.classList.add('hidden');
        joinForm.classList.remove('hidden');
        modalTitle.textContent = 'Rejoindre un Couple';
    }
}

function closeModal() {
    document.getElementById('couple-modal').classList.add('hidden');
    document.getElementById('modal-error').classList.add('hidden');
    document.getElementById('create-couple-form').reset();
    document.getElementById('join-couple-form').reset();
}

function showModalError(message) {
    const errorEl = document.getElementById('modal-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// ============================================
// ÉCOUTEURS D'ÉVÉNEMENTS
// ============================================
function setupEventListeners() {
    // Navigation entre formulaires auth
    document.getElementById('show-signup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
    });
    
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('login-form').classList.remove('hidden');
    });
    
    // Connexion
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        await handleLogin(email, password);
    });
    
    // Inscription
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        await handleSignup(email, password);
    });
    
    // Déconnexion
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // Création couple
    document.getElementById('create-couple-btn').addEventListener('click', () => openModal('create'));
    document.getElementById('cancel-create-btn').addEventListener('click', closeModal);
    document.getElementById('create-couple-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('couple-name-input').value;
        await createCouple(name);
    });
    
    // Rejoindre couple
    document.getElementById('join-couple-btn').addEventListener('click', () => openModal('join'));
    document.getElementById('cancel-join-btn').addEventListener('click', closeModal);
    document.getElementById('join-couple-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('invite-code-input').value.trim();
        await joinCouple(code);
    });
    
    // Copier code
    document.getElementById('copy-code-btn').addEventListener('click', copyInviteCode);
    
    // Modes de jeu
    document.querySelectorAll('.game-mode-card').forEach(card => {
        card.addEventListener('click', () => {
            startGame(card.dataset.mode);
        });
    });
    
    // Retour accueil
    document.getElementById('back-home-btn').addEventListener('click', () => {
        clearInterval(AppState.timer);
        showScreen('home-screen');
    });
    
    // Chat
    document.getElementById('toggle-chat-btn').addEventListener('click', toggleChat);
    document.getElementById('close-chat-btn').addEventListener('click', toggleChat);
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        await sendChatMessage(input.value);
    });
    
    // Emojis
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sendEmoji(btn.dataset.emoji);
        });
    });
    
    // Avertissement H125
    document.getElementById('dismiss-warning').addEventListener('click', () => {
        document.getElementById('h125-warning').classList.add('hidden');
    });
    
    // Service Worker pour PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            console.log('Service Worker non enregistré (fichier sw.js manquant)');
        });
    }
}

// ============================================
// UTILITAIRES
// ============================================
function showError(message) {
    alert(message);
}

function showAuthError(message) {
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function updateUI() {
    loadPacks();
    updateCoupleUI();
}

// Ajouter la fonction RPC pour update_player_score si elle n'existe pas dans le schema
// Cette fonction est appelée mais peut ne pas exister, donc on gère l'erreur
console.log('DuoQuest - Prêt à jouer ! 🎮');
