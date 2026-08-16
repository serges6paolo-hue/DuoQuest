-- DuoQuest - Données de seed (peuplement initial)
-- Ce fichier doit être exécuté après schema.sql dans l'éditeur SQL de Supabase

-- ============================================
-- PACKS DE CONTENU
-- (ON CONFLICT DO NOTHING : ré-exécutable sans doublon)
-- ============================================

INSERT INTO public.packs (name, slug, description, icon_emoji, color_hex)
VALUES
    ('Hélicoptère H125', 'h125', 'Questions pédagogiques sur l''hélicoptère H125. Ne remplace pas les documents officiels.', '🚁', '#3b82f6'),
    ('Géologie', 'geologie', 'Découvrez les merveilles de la Terre et des roches.', '🪨', '#10b981'),
    ('Informatique', 'informatique', 'Programmation, algorithmes et technologies.', '💻', '#8b5cf6'),
    ('Pagnes Tissés Africains', 'pagne', 'L''art du tissage traditionnel africain.', '🧵', '#f59e0b'),
    ('Couple', 'couple', 'Questions fun et romantiques pour se rapprocher.', '❤️', '#ec4899')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- QUESTIONS H125 (Pédagogiques - 5 questions)
-- Avertissement: Ces questions sont purement pédagogiques et ne remplacent pas les documents officiels
-- ============================================

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Facteurs Humains',
    'Fatigue',
    'qcm',
    2,
    'Quel est l''effet principal de la fatigue sur les performances d''un pilote ?',
    '["Amélioration des réflexes", "Diminution de la vigilance et des capacités de décision", "Augmentation de la concentration", "Aucun effet significatif"]'::jsonb,
    'Diminution de la vigilance et des capacités de décision',
    'La fatigue réduit la vigilance, ralentit les temps de réaction et altère la prise de décision. C''est un facteur critique en aviation.',
    'Manuel de fact humains en aviation - EASA',
    'active'
FROM public.packs p WHERE p.slug = 'h125';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Préparation du Vol',
    'Documentation',
    'true_false',
    1,
    'Il est acceptable de survoler une zone restreinte si les conditions météo sont excellentes.',
    '["Vrai", "Faux"]'::jsonb,
    'Faux',
    'Les zones restreintes doivent toujours être respectées, indépendamment des conditions météo. La réglementation aérienne s''applique en toutes circonstances.',
    'Réglementation aérienne - Autorité de l''aviation civile',
    'active'
FROM public.packs p WHERE p.slug = 'h125';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Météorologie',
    'Conditions de vol',
    'qcm',
    3,
    'Quelle est l''importance de vérifier le METAR avant un vol ?',
    '["Optionnel pour les pilotes expérimentés", "Essentiel pour connaître les conditions météo actuelles", "Uniquement nécessaire pour les vols de nuit", "Remplacé par une observation visuelle"]'::jsonb,
    'Essentiel pour connaître les conditions météo actuelles',
    'Le METAR fournit des informations météorologiques essentielles actualisées. C''est un document crucial pour la préparation et la sécurité du vol.',
    'Manuel de météorologie aéronautique - OACI',
    'active'
FROM public.packs p WHERE p.slug = 'h125';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Sécurité des Vols',
    'Checklist',
    'true_false',
    1,
    'Les checklist doivent être réalisées de mémoire pour gagner du temps.',
    '["Vrai", "Faux"]'::jsonb,
    'Faux',
    'Les checklist doivent TOUJOURS être utilisées physiquement. Les réaliser de mémoire augmente le risque d''oubli critique. C''est une pratique fondamentale de sécurité.',
    'Procédures de sécurité - Constructeur aéronef',
    'active'
FROM public.packs p WHERE p.slug = 'h125';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Facteurs Humains',
    'Gestion du stress',
    'qcm',
    2,
    'Quelle technique aide à gérer le stress pendant un vol ?',
    '["Ignorer les sensations physiques", "Respiration contrôlée et communication avec le sol", "Accélérer les procédures", "Éviter toute communication radio"]'::jsonb,
    'Respiration contrôlée et communication avec le sol',
    'La respiration contrôlée aide à réduire le stress physiologique. Communiquer avec le sol permet d''obtenir de l''aide et de partager la charge mentale.',
    'Formation CRM - Crew Resource Management',
    'active'
FROM public.packs p WHERE p.slug = 'h125';

-- ============================================
-- QUESTIONS GÉOLOGIE (5 questions)
-- ============================================

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Pétrologie',
    'Roches ignées',
    'qcm',
    2,
    'Quelle roche est une roche ignée intrusive ?',
    '["Basalte", "Granite", "Obsidienne", "Ponce"]'::jsonb,
    'Granite',
    'Le granite se forme par refroidissement lent du magma en profondeur, ce qui lui donne une texture grenue visible. Le basalte, l''obsidienne et la ponce sont des roches volcaniques (extrusives).',
    'Introduction à la Géologie - Presses Universitaires',
    'active'
FROM public.packs p WHERE p.slug = 'geologie';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Minéralogie',
    'Identification',
    'true_false',
    1,
    'Le quartz raye le verre.',
    '["Vrai", "Faux"]'::jsonb,
    'Vrai',
    'Le quartz a une dureté de 7 sur l''échelle de Mohs, tandis que le verre a une dureté d''environ 5.5. Le quartz peut donc rayer le verre.',
    'Échelle de Mohs - Minéralogie de base',
    'active'
FROM public.packs p WHERE p.slug = 'geologie';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Tectonique',
    'Plaques',
    'qcm',
    3,
    'Quel type de frontière de plaque crée généralement des montagnes ?',
    '["Divergente", "Transformante", "Convergente", "Passive"]'::jsonb,
    'Convergente',
    'Les frontières convergentes, où deux plaques entrent en collision, créent des chaînes de montagnes comme l''Himalaya ou les Alpes par soulèvement crustal.',
    'Tectonique des Plaques - Cours universitaire',
    'active'
FROM public.packs p WHERE p.slug = 'geologie';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Sédimentologie',
    'Érosion',
    'guess',
    2,
    'Quel terme décrit le transport de sédiments par le vent ?',
    '["Éolien", "Fluvial", "Glaciaire", "Marin"]'::jsonb,
    'Éolien',
    'Le transport éolien désigne spécifiquement le déplacement de particules par le vent. Ce processus façonne les dunes et les paysages désertiques.',
    'Géomorphologie - Traité de sédimentologie',
    'active'
FROM public.packs p WHERE p.slug = 'geologie';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Volcanologie',
    'Types de volcans',
    'qcm',
    2,
    'Quel type de volcan produit principalement des coulées de lave fluide ?',
    '["Stratovolcan", "Volcan bouclier", "Dôme de lave", "Cône de scories"]'::jsonb,
    'Volcan bouclier',
    'Les volcans boucliers, comme le Kilauea à Hawaï, produisent des laves basaltiques très fluides qui s''étalent sur de grandes surfaces, formant des pentes douces.',
    'Volcanologie - Introduction aux risques naturels',
    'active'
FROM public.packs p WHERE p.slug = 'geologie';

-- ============================================
-- QUESTIONS INFORMATIQUE (5 questions)
-- ============================================

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Algorithmes',
    'Complexité',
    'qcm',
    3,
    'Quelle est la complexité temporelle d''une recherche binaire ?',
    '["O(n)", "O(log n)", "O(n²)", "O(1)"]'::jsonb,
    'O(log n)',
    'La recherche binaire divise l''espace de recherche par deux à chaque étape, donnant une complexité logarithmique O(log n). Elle nécessite un tableau trié.',
    'Introduction aux Algorithmes - Cormen et al.',
    'active'
FROM public.packs p WHERE p.slug = 'informatique';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'JavaScript',
    'ES2020+',
    'true_false',
    2,
    'En JavaScript, const permet de modifier les propriétés d''un objet.',
    '["Vrai", "Faux"]'::jsonb,
    'Vrai',
    'const empêche la réassignation de la variable, mais ne rend pas l''objet immutable. On peut toujours modifier ses propriétés. Pour immutabilité totale, utiliser Object.freeze().',
    'MDN Web Docs - JavaScript',
    'active'
FROM public.packs p WHERE p.slug = 'informatique';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Bases de données',
    'SQL',
    'qcm',
    2,
    'Quelle commande SQL permet de récupérer des données ?',
    '["UPDATE", "SELECT", "INSERT", "DELETE"]'::jsonb,
    'SELECT',
    'SELECT est la commande SQL utilisée pour interroger et récupérer des données d''une base. UPDATE modifie, INSERT ajoute, DELETE supprime.',
    'SQL - Concepts fondamentaux',
    'active'
FROM public.packs p WHERE p.slug = 'informatique';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Réseaux',
    'HTTP',
    'guess',
    2,
    'Quel code HTTP indique une réussite de requête ?',
    '["404", "500", "200", "301"]'::jsonb,
    '200',
    'Le code HTTP 200 OK indique que la requête a réussi. 404 = Non trouvé, 500 = Erreur serveur, 301 = Redirection permanente.',
    'RFC 7231 - HTTP/1.1 Semantics',
    'active'
FROM public.packs p WHERE p.slug = 'informatique';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Sécurité',
    'Authentification',
    'qcm',
    3,
    'Quel protocole est utilisé pour sécuriser les communications web ?',
    '["FTP", "HTTP", "HTTPS", "SMTP"]'::jsonb,
    'HTTPS',
    'HTTPS (HTTP Secure) utilise TLS/SSL pour chiffrer les communications entre client et serveur, protégeant ainsi les données échangées.',
    'Sécurité Web - OWASP',
    'active'
FROM public.packs p WHERE p.slug = 'informatique';

-- ============================================
-- QUESTIONS PAGNES TISSÉS (5 questions)
-- ============================================

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Histoire',
    'Origines',
    'qcm',
    2,
    'Quelle région d''Afrique est particulièrement connue pour ses pagnes tissés ?',
    '["Afrique du Nord", "Afrique de l''Ouest", "Afrique Australe", "Corne de l''Afrique"]'::jsonb,
    'Afrique de l''Ouest',
    'L''Afrique de l''Ouest, notamment le Mali, le Burkina Faso et la Côte d''Ivoire, est réputée pour ses traditions de tissage, dont le célèbre pagne Kente et le Faso Dan Fani.',
    'Artisanat Africain - UNESCO',
    'active'
FROM public.packs p WHERE p.slug = 'pagne';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Techniques',
    'Tissage',
    'true_false',
    2,
    'Le métier à tisser traditionnel utilise uniquement des fils de coton.',
    '["Vrai", "Faux"]'::jsonb,
    'Faux',
    'Les métiers à tisser traditionnels peuvent utiliser divers matériaux : coton, soie, laine, fibres synthétiques, et même des fils métalliques pour des effets décoratifs.',
    'Techniques de Tissage Traditionnel - Artisanat du Monde',
    'active'
FROM public.packs p WHERE p.slug = 'pagne';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Motifs',
    'Symbolique',
    'qcm',
    3,
    'Que représentent souvent les motifs géométriques sur les pagnes traditionnels ?',
    '["Uniquement des éléments décoratifs", "Des proverbes, statuts sociaux ou événements historiques", "Des marques de fabrication", "Des codes de prix"]'::jsonb,
    'Des proverbes, statuts sociaux ou événements historiques',
    'Les motifs des pagnes traditionnels ont souvent une signification profonde : proverbes, appartenance ethnique, statut marital, ou commémoration d''événements.',
    'Symbolique des Textiles Africains - Musée des Civilisations',
    'active'
FROM public.packs p WHERE p.slug = 'pagne';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Matériaux',
    'Teinture',
    'guess',
    2,
    'Quelle plante est traditionnellement utilisée pour la teinture indigo ?',
    '["Indigotier", "Garance", "Curcuma", "Roucou"]'::jsonb,
    'Indigotier',
    'L''indigotier (Indigofera tinctoria) est la plante historique pour produire la teinture indigo bleue, utilisée depuis des millénaires en Afrique de l''Ouest.',
    'Teintures Naturelles - Savoirs Traditionnels',
    'active'
FROM public.packs p WHERE p.slug = 'pagne';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Commerce',
    'Boutique',
    'qcm',
    1,
    'Quel est l''avantage principal des pagnes tissés main ?',
    '["Prix inférieur", "Production rapide", "Qualité artisanale et unicité", "Uniformité parfaite"]'::jsonb,
    'Qualité artisanale et unicité',
    'Le tissage manuel garantit une qualité artisanale exceptionnelle et chaque pièce est unique. C''est un gage d''authenticité et de valeur culturelle.',
    'Guide de l''Artisanat Textile - Commerce Équitable',
    'active'
FROM public.packs p WHERE p.slug = 'pagne';

-- ============================================
-- QUESTIONS COUPLE (5 questions)
-- ============================================

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Romantisme',
    'Souvenirs',
    'qcm',
    1,
    'Quel est le meilleur moyen de raviver un souvenir commun ?',
    '["Regarder une photo ensemble", "Envoyer un message", "Attendre une occasion spéciale", "Changer de sujet"]'::jsonb,
    'Regarder une photo ensemble',
    'Partager un moment en regardant des photos communes active la mémoire émotionnelle et renforce les liens. C''est un exercice simple mais puissant.',
    'Psychologie du Couple - Relations Amoureuses',
    'active'
FROM public.packs p WHERE p.slug = 'couple';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Communication',
    'Écoute',
    'true_false',
    2,
    'Écouter activement signifie préparer sa réponse pendant que l''autre parle.',
    '["Vrai", "Faux"]'::jsonb,
    'Faux',
    'L''écoute active implique d''être pleinement présent et attentif, sans préparer sa réponse. Il faut comprendre avant de répondre, avec empathie.',
    'Communication dans le Couple - Thérapie Relationnelle',
    'active'
FROM public.packs p WHERE p.slug = 'couple';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Jeux',
    'Devinettes',
    'guess',
    1,
    'Complétez : "L''amour est aveugle, mais le voisin... ?"',
    '["Voit tout", "Est sourd", "Rit beaucoup", "Dort toujours"]'::jsonb,
    'Voit tout',
    'Proverbe humoristique : "L''amour est aveugle, mais le voisin voit tout." Cela rappelle discrètement que notre intimité n''est pas toujours aussi privée qu''on le pense !',
    'Proverbes Populaires - Sagesse Humoristique',
    'active'
FROM public.packs p WHERE p.slug = 'couple';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Projets',
    'Avenir',
    'qcm',
    2,
    'Quel est l''élément clé pour construire un projet de couple solide ?',
    '["Avoir exactement les mêmes rêves", "Communiquer et respecter les différences", "Tout planifier à l''avance", "Éviter les conflits à tout prix"]'::jsonb,
    'Communiquer et respecter les différences',
    'Un couple solide repose sur la communication ouverte et le respect mutuel des individualités. Les différences bien gérées enrichissent la relation.',
    'Construction du Couple - Psychologie Positive',
    'active'
FROM public.packs p WHERE p.slug = 'couple';

INSERT INTO public.questions (pack_id, category, subcategory, type, difficulty, question_text, options, correct_answer, explanation, source_reference, status)
SELECT 
    p.id,
    'Fun',
    'Quiz',
    'true_false',
    1,
    'Dans un couple, il est normal de ne pas toujours être d''accord.',
    '["Vrai", "Faux"]'::jsonb,
    'Vrai',
    'Les désaccords sont normaux et sains dans un couple. Ce qui compte, c''est la manière de les gérer : avec respect, écoute et compromis.',
    'Dynamique du Couple - Gestion des Conflits',
    'active'
FROM public.packs p WHERE p.slug = 'couple';

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE 'Seed DuoQuest exécuté avec succès!';
    RAISE NOTICE '5 packs créés avec 5 questions chacun (25 questions au total).';
END $$;
