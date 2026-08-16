-- ============================================
-- DuoQuest - MIGRATION v2
-- À exécuter SEULEMENT si vous avez déjà exécuté schema.sql (v1).
-- Contient uniquement les ajouts / modifications apportés à schema.sql.
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
-- ============================================

-- 1) Fonction RPC de mise à jour du score (appelée par app.js)
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

-- 2) Nouvelle policy : les membres d'un même couple lisent leurs profils
--    (nécessaire pour afficher le nom du partenaire dans le chat et les scores)
DROP POLICY IF EXISTS "Couple members can view each other's profile" ON public.profiles;
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

-- 3) Durcir la lecture des packs et questions (utilisateurs authentifiés uniquement)
DROP POLICY IF EXISTS "Users can view active packs" ON public.packs;
CREATE POLICY "Users can view active packs"
ON public.packs FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = TRUE);

DROP POLICY IF EXISTS "Users can view active questions" ON public.questions;
CREATE POLICY "Users can view active questions"
ON public.questions FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'active');

-- 4) Resserrer l'insertion des réponses (le joueur doit être dans CETTE session)
DROP POLICY IF EXISTS "Users can insert own answers" ON public.answers;
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

-- 5) Realtime : ajouter les tables à la publication si nécessaire (idempotent)
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
