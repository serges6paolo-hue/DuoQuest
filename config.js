/**
 * DuoQuest - Configuration Supabase
 *
 * ⚠️  La clé anon ci-dessous est PUBLIQUE par conception : elle peut être
 *     exposée dans le frontend. Ne mettez JAMAIS la clé "service_role" ici.
 */
const SUPABASE_CONFIG = {
    // URL de votre projet Supabase
    SUPABASE_URL: 'https://woiayvybuqbnppqfyysx.supabase.co',

    // Clé anon publique (safe to use in frontend)
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaWF5dnlidXFibnBwcWZ5eXN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDA3MzgsImV4cCI6MjEwMjMxNjczOH0.qbeSJh3UFyIvNOqR2vvUQ0QEXgszhLlsGDZZA6tP8Oo'
};

// Compatibilité (inutile dans un navigateur, mais permet un éventuel usage Node)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
