-- DuoQuest - Schéma de base de données Supabase
-- Ce fichier doit être exécuté dans l'éditeur SQL de Supabase

-- Activer l'extension pgcrypto pour gen_random_uuid() si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLE: profiles
-- Stocke les informations de profil des utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- ============================================
-- TABLE: couples
-- Représente un espace couple avec un code d'invitation unique
-- ============================================
CREATE TABLE IF NOT EXISTS public.couples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index pour les recherches par code d'invitation
CREATE INDEX IF NOT EXISTS idx_couples_invite_code ON public.couples(invite_code);
CREATE INDEX IF NOT EXISTS idx_couples_is_active ON public.couples(is_active);

-- ============================================
-- TABLE: couple_members
-- Table de liaison entre utilisateurs et couples
-- ============================================
CREATE TABLE IF NOT EXISTS public.couple_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    role TEXT DEFAULT 'member', -- 'owner' ou 'member'
    UNIQUE(couple_id, user_id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_couple_members_couple_id ON public.couple_members(couple_id);
CREATE INDEX IF NOT EXISTS idx_couple_members_user_id ON public.couple_members(user_id);

-- ============================================
-- TABLE: packs
-- Packs de contenu thématique
-- ============================================
CREATE TABLE IF NOT EXISTS public.packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_emoji TEXT,
    color_hex TEXT DEFAULT '#2563eb',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_packs_slug ON public.packs(slug);
CREATE INDEX IF NOT EXISTS idx_packs_is_active ON public.packs(is_active);

-- ============================================
-- TABLE: questions
-- Questions pour les quiz et jeux
-- ============================================
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
    category TEXT,
    subcategory TEXT,
    type TEXT NOT NULL CHECK (type IN ('qcm', 'true_false', 'guess', 'order', 'matching')),
    difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    question_text TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    image_url TEXT,
    audio_url TEXT,
    source_reference TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_questions_pack_id ON public.questions(pack_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_type ON public.questions(type);

-- ============================================
-- TABLE: game_sessions
-- Sessions de jeu en cours ou terminées
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES public.packs(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('quiz_duel', 'blitz', 'devinette')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    timer_seconds INTEGER DEFAULT 15,
    total_rounds INTEGER DEFAULT 5,
    current_round INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_game_sessions_couple_id ON public.game_sessions(couple_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_pack_id ON public.game_sessions(pack_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON public.game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_mode ON public.game_sessions(mode);

-- ============================================
-- TABLE: session_players
-- Joueurs participant à une session de jeu
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    answers_count INTEGER DEFAULT 0,
    correct_answers_count INTEGER DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON public.session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user_id ON public.session_players(user_id);

-- ============================================
-- TABLE: answers
-- Réponses des joueurs aux questions
-- ============================================
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.session_players(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_answer TEXT,
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    time_taken_ms INTEGER,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_answers_session_id ON public.answers(session_id);
CREATE INDEX IF NOT EXISTS idx_answers_player_id ON public.answers(player_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);

-- ============================================
-- TABLE: chat_messages
-- Messages de chat entre les membres du couple
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id UUID NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE SET NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_emoji BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_chat_messages_couple_id ON public.chat_messages(couple_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ============================================
-- TABLE: emoji_reactions
-- Réactions emoji pendant les jeux
-- ============================================
CREATE TABLE IF NOT EXISTS public.emoji_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_emoji_reactions_session_id ON public.emoji_reactions(session_id);
CREATE INDEX IF NOT EXISTS idx_emoji_reactions_created_at ON public.emoji_reactions(created_at);

-- ============================================
-- FONCTION: is_couple_member
-- Vérifie si l'utilisateur connecté est membre d'un couple
-- ============================================
CREATE OR REPLACE FUNCTION public.is_couple_member(target_couple_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.couple_members cm
        WHERE cm.couple_id = target_couple_id
        AND cm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: create_couple
-- Crée un nouveau couple et ajoute le créateur comme membre
-- ============================================
CREATE OR REPLACE FUNCTION public.create_couple(couple_name TEXT)
RETURNS public.couples AS $$
DECLARE
    new_couple public.couples;
BEGIN
    -- Créer le couple
    INSERT INTO public.couples (name, created_by)
    VALUES (couple_name, auth.uid())
    RETURNING * INTO new_couple;
    
    -- Ajouter le créateur comme membre avec rôle owner
    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (new_couple.id, auth.uid(), 'owner');
    
    RETURN new_couple;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: join_couple
-- Rejoint un couple existant via un code d'invitation
-- ============================================
CREATE OR REPLACE FUNCTION public.join_couple(invite_code_param TEXT)
RETURNS public.couples AS $$
DECLARE
    target_couple public.couples;
    member_count INTEGER;
BEGIN
    -- Trouver le couple actif par code d'invitation
    SELECT * INTO target_couple
    FROM public.couples
    WHERE couples.invite_code = invite_code_param
    AND couples.is_active = TRUE;
    
    -- Vérifier si le couple existe
    IF target_couple.id IS NULL THEN
        RAISE EXCEPTION 'Couple non trouvé ou code invalide';
    END IF;
    
    -- Vérifier si l'utilisateur est déjà membre
    IF EXISTS (
        SELECT 1 FROM public.couple_members cm
        WHERE cm.couple_id = target_couple.id
        AND cm.user_id = auth.uid()
    ) THEN
        RETURN target_couple;
    END IF;
    
    -- Compter le nombre de membres actuels
    SELECT COUNT(*) INTO member_count
    FROM public.couple_members cm
    WHERE cm.couple_id = target_couple.id;
    
    -- Limiter à 2 membres maximum
    IF member_count >= 2 THEN
        RAISE EXCEPTION 'Ce couple a déjà atteint le nombre maximum de membres (2)';
    END IF;
    
    -- Ajouter l'utilisateur comme membre
    INSERT INTO public.couple_members (couple_id, user_id, role)
    VALUES (target_couple.id, auth.uid(), 'member');
    
    RETURN target_couple;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION: update_player_score
-- Incrémente le score et les statistiques d'un joueur.
-- SECURITY DEFINER mais restreinte à auth.uid() :
-- un utilisateur ne peut mettre à jour QUE sa propre ligne joueur.
-- ============================================
CREATE OR REPLACE FUNCTION public.update_player_score(
    p_player_id UUID,
    p_points INTEGER,
    p_is_correct BOOLEAN
)
RETURNS void AS $$
BEGIN
    UPDATE public.session_players
    SET score = COALESCE(score, 0) + p_points,
        answers_count = COALESCE(answers_count, 0) + 1,
        correct_answers_count = COALESCE(correct_answers_count, 0)
            + CASE WHEN p_is_correct THEN 1 ELSE 0 END
    WHERE id = p_player_id
      AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emoji_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: profiles
-- ============================================
-- Un utilisateur peut lire son propre profil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Les membres d'un même couple peuvent lire leurs profils respectifs
-- (nécessaire pour afficher le nom du partenaire dans le chat et les scores)
CREATE POLICY "Couple members can view each other's profile"
ON public.profiles FOR SELECT
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1
        FROM public.couple_members me
        JOIN public.couple_members partner ON me.couple_id = partner.couple_id
        WHERE me.user_id = auth.uid()
          AND partner.user_id = profiles.id
    )
);

-- Un utilisateur peut mettre à jour son propre profil
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Un utilisateur peut insérer son propre profil (lors de l'inscription)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================
-- POLICIES: couples
-- ============================================
-- Un utilisateur peut lire les couples dont il est membre
CREATE POLICY "Users can view member couples"
ON public.couples FOR SELECT
USING (public.is_couple_member(id));

-- Un utilisateur peut créer un couple (via la fonction RPC)
CREATE POLICY "Users can create couples"
ON public.couples FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Un utilisateur peut mettre à jour un couple dont il est membre
CREATE POLICY "Users can update member couples"
ON public.couples FOR UPDATE
USING (public.is_couple_member(id));

-- ============================================
-- POLICIES: couple_members
-- ============================================
-- Un utilisateur peut lire les membres des couples dont il est membre
CREATE POLICY "Users can view couple members"
ON public.couple_members FOR SELECT
USING (public.is_couple_member(couple_id));

-- Un utilisateur peut rejoindre un couple (via la fonction RPC ou directement)
CREATE POLICY "Users can join couples"
ON public.couple_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- POLICIES: packs
-- ============================================
-- Tout utilisateur authentifié peut lire les packs actifs
CREATE POLICY "Users can view active packs"
ON public.packs FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- ============================================
-- POLICIES: questions
-- ============================================
-- Tout utilisateur authentifié peut lire les questions actives
CREATE POLICY "Users can view active questions"
ON public.questions FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- ============================================
-- POLICIES: game_sessions
-- ============================================
-- Un utilisateur peut lire les sessions des couples dont il est membre
CREATE POLICY "Users can view couple sessions"
ON public.game_sessions FOR SELECT
USING (public.is_couple_member(couple_id));

-- Un utilisateur peut créer une session pour un couple dont il est membre
CREATE POLICY "Users can create couple sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (public.is_couple_member(couple_id) AND auth.uid() = created_by);

-- Un utilisateur peut mettre à jour les sessions des couples dont il est membre
CREATE POLICY "Users can update couple sessions"
ON public.game_sessions FOR UPDATE
USING (public.is_couple_member(couple_id));

-- ============================================
-- POLICIES: session_players
-- ============================================
-- Un utilisateur peut lire les joueurs d'une session de son couple
CREATE POLICY "Users can view session players"
ON public.session_players FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.game_sessions gs
        WHERE gs.id = session_id
        AND public.is_couple_member(gs.couple_id)
    )
);

-- Un utilisateur peut rejoindre une session
CREATE POLICY "Users can join sessions"
ON public.session_players FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Un utilisateur peut mettre à jour ses propres statistiques de joueur
CREATE POLICY "Users can update own session player"
ON public.session_players FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: answers
-- ============================================
-- Un utilisateur peut lire les réponses d'une session de son couple
CREATE POLICY "Users can view session answers"
ON public.answers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.game_sessions gs
        JOIN public.couple_members cm ON cm.couple_id = gs.couple_id
        WHERE gs.id = session_id
        AND cm.user_id = auth.uid()
    )
);

-- Un utilisateur peut insérer ses propres réponses
CREATE POLICY "Users can insert own answers"
ON public.answers FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.session_players sp
        WHERE sp.id = player_id
          AND sp.user_id = auth.uid()
          AND sp.session_id = session_id
    )
);

-- ============================================
-- POLICIES: chat_messages
-- ============================================
-- Un utilisateur peut lire les messages des couples dont il est membre
CREATE POLICY "Users can view couple messages"
ON public.chat_messages FOR SELECT
USING (public.is_couple_member(couple_id));

-- Un utilisateur peut envoyer des messages dans ses couples
CREATE POLICY "Users can send couple messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND public.is_couple_member(couple_id));

-- ============================================
-- POLICIES: emoji_reactions
-- ============================================
-- Un utilisateur peut lire les réactions d'une session de son couple
CREATE POLICY "Users can view session reactions"
ON public.emoji_reactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.game_sessions gs
        WHERE gs.id = session_id
        AND public.is_couple_member(gs.couple_id)
    )
);

-- Un utilisateur peut envoyer des réactions dans ses sessions
CREATE POLICY "Users can send session reactions"
ON public.emoji_reactions FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.game_sessions gs
        WHERE gs.id = session_id
        AND public.is_couple_member(gs.couple_id)
        AND auth.uid() = sender_id
    )
);

-- ============================================
-- TRIGGER: Création automatique du profil lors de l'inscription
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_email TEXT;
    user_display_name TEXT;
BEGIN
    -- Extraire la partie avant @ de l'email pour le display_name
    user_email := NEW.email;
    user_display_name := SPLIT_PART(user_email, '@', 1);
    
    -- Créer le profil automatiquement
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, user_display_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER: Mise à jour de updated_at sur profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Publication pour Supabase Realtime
-- (idempotent : n'ajoute une table que si elle n'y est pas déjà)
-- ============================================
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['game_sessions','session_players','answers','chat_messages','emoji_reactions'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Schéma DuoQuest créé avec succès!';
    RAISE NOTICE 'N''oubliez pas d''exécuter seed.sql pour peupler les packs et questions.';
END $$;
