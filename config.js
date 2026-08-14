/**
 * DuoQuest - Configuration Supabase
 * 
 * IMPORTANT: Remplissez ces valeurs avec vos identifiants Supabase
 * 
 * Comment obtenir ces clés :
 * 1. Créez un projet sur https://supabase.com
 * 2. Allez dans Settings > API
 * 3. Copiez l'URL du projet et la clé anon publique
 * 
 * ⚠️ N'utilisez JAMAIS la clé service_role côté client !
 */

const SUPABASE_CONFIG = {
    // URL de votre projet Supabase (ex: https://xxxxx.supabase.co)
    SUPABASE_URL: 'https://woiayvybuqbnppqfyysx.supabase.co',
    
    // Clé anon publique (safe to use in frontend)
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWF5dnlidXFibnBwcWZ5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDA3MzgsImV4cCI6MjEwMjMxNjczOH0.qbeSJh3UFyIvNOqR2vvUQ0QEXgszhLlsGDZZA6tP8Oo'
};

// Export pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
