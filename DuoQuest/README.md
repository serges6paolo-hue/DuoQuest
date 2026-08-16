# DuoQuest

**Application web mobile-first pour couple - Apprendre, jouer et rester proches**

## 📱 Présentation

DuoQuest est une application web privée conçue pour un couple. Elle permet de :
- **Jouer** à des quiz et devinettes en duel
- **Apprendre** grâce à des packs thématiques (H125, géologie, informatique, pagnes tissés, couple)
- **Communiquer** via un chat intégré pendant les parties

### Public cible
- Deux utilisateurs seulement
- Deux téléphones Android
- Espace strictement privé

### Domaines de contenu
- 🚁 **H125** : Questions pédagogiques sur l'hélicoptère H125
- 🪨 **Géologie** : Découverte des roches et de la Terre
- 💻 **Informatique** : Programmation et technologies
- 🧵 **Pagnes Tissés** : Art du tissage traditionnel africain
- ❤️ **Couple** : Questions fun et romantiques

---

## ⚠️ Avertissement Important - Contenu H125

**Les questions H125 sont purement pédagogiques.** Elles ne remplacent **PAS** :
- Les documents officiels
- Le manuel de vol
- Une formation certifiée

Ce contenu est destiné à l'apprentissage général et à la culture aéronautique, pas à la formation opérationnelle.

---

## 📁 Structure du Projet

```
duoquest/
├── index.html              # Page principale HTML5
├── style.css               # Styles CSS3 mobile-first
├── app.js                  # Logique JavaScript vanilla
├── config.js               # Configuration Supabase (à remplir)
├── manifest.json           # Manifest PWA pour installation Android
├── sw.js                   # Service worker (cache du shell statique)
├── README.md               # Ce fichier
├── supabase/
│   ├── schema.sql          # Schéma de base de données complet
│   ├── seed.sql            # Données initiales (packs et questions)
│   └── migration_v2.sql    # Migration pour une installation déjà en place
└── icons/
    ├── icon-192.png        # Icône PWA 192x192 (placeholder fourni)
    └── icon-512.png        # Icône PWA 512x512 (placeholder fourni)
```

---

## 🚀 Installation et Configuration

> 🔁 **Mise à jour d'une installation existante** : si vous avez déjà exécuté
> `schema.sql` et `seed.sql`, exécutez uniquement `supabase/migration_v2.sql`
> (il ajoute la fonction de score et les policies complémentaires).
> `seed.sql` n'a pas besoin d'être ré-exécuté.

### Étape 1 : Créer un projet Supabase

1. Rendez-vous sur [https://supabase.com](https://supabase.com)
2. Créez un compte gratuit si nécessaire
3. Cliquez sur **"New Project"**
4. Remplissez les informations :
   - **Name** : `duoquest` (ou le nom de votre choix)
   - **Database Password** : Choisissez un mot de passe fort (notez-le !)
   - **Region** : Sélectionnez la région la plus proche
5. Attendez la création du projet (environ 2 minutes)

### Étape 2 : Récupérer les clés API

1. Dans votre projet Supabase, allez dans **Settings** (roue dentée en bas à gauche)
2. Cliquez sur **API**
3. Notez les deux valeurs suivantes :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : `eyJhbGciOiJIUzI1NiIsInR...` (clé publique)

⚠️ **Important** : N'utilisez **JAMAIS** la clé `service_role` côté client !

### Étape 3 : Configurer le fichier config.js

1. Ouvrez le fichier `config.js` à la racine du projet
2. Remplacez les placeholders par vos valeurs :

```javascript
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://votre-projet.supabase.co',
    SUPABASE_ANON_KEY: 'votre-clé-anon-publique'
};
```

### Étape 4 : Exécuter le schéma de base de données

1. Dans le dashboard Supabase, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New Query"**
3. Copiez-collez le contenu complet du fichier `supabase/schema.sql`
4. Cliquez sur **"Run"** ou appuyez sur Ctrl+Entrée
5. Vous devriez voir un message de succès

Le schéma crée :
- Toutes les tables nécessaires (profiles, couples, packs, questions, etc.)
- Les fonctions RPC (`create_couple`, `join_couple`)
- Les policies de sécurité RLS (Row Level Security)
- Les triggers pour la création automatique de profil
- La publication Realtime pour la synchronisation en temps réel

### Étape 5 : Exécuter le seed (données initiales)

1. Toujours dans **SQL Editor**, cliquez sur **"New Query"**
2. Copiez-collez le contenu complet du fichier `supabase/seed.sql`
3. Cliquez sur **"Run"**
4. Vous devriez voir un message confirmant la création des 5 packs avec 25 questions

### Étape 6 : Configurer l'authentification par email

1. Allez dans **Authentication** > **Providers** (menu de gauche)
2. Vérifiez que **Email** est activé (devrait l'être par défaut)

#### Optionnel : Désactiver la confirmation email pour le développement

Pour tester plus rapidement sans vérifier les emails :

1. Allez dans **Authentication** > **Settings**
2. Descendez jusqu'à **"Email Auth"**
3. Décochez **"Enable email confirmations"**
4. Cliquez sur **"Save"**

⚠️ **Remettez cette option pour la production !**

---

## 🌐 Déploiement

DuoQuest est un site **100 % statique** (HTML, CSS, JS), il se déploie donc sur n'importe quel hébergeur statique.

### Option A : Netlify

1. Poussez le projet sur un dépôt GitHub/GitLab/Bitbucket.
2. Sur [netlify.com](https://netlify.com), cliquez sur **Add new site → Import an existing project**.
3. Connectez votre dépôt.
4. Laissez **Build command** vide et définissez **Publish directory** sur `.` (la racine).
5. Cliquez sur **Deploy site**. L'URL fournie (ex. `https://xxx.netlify.app`) est votre application.

### Option B : Vercel

1. Sur [vercel.com](https://vercel.com), cliquez sur **Add New → Project** et importez votre dépôt.
2. Choisissez **Framework Preset : Other** (aucun build requis).
3. Laissez la commande de build vide ; le répertoire de sortie est la racine.
4. Cliquez sur **Deploy**. L'URL fournie (ex. `https://xxx.vercel.app`) est votre application.

### Option C : GitHub Pages / Cloudflare Pages

- **GitHub Pages** : Settings → Pages → source = branche principale / dossier racine.
- **Cloudflare Pages** : New Project → connectez le dépôt → aucun build → répertoire racine.

> ⚠️ Après déploiement, pensez à mettre l'URL déployée dans les **Site URL** de Supabase
> (Authentication → URL Configuration) pour un bon fonctionnement des redirections d'auth.

## 📲 Installation sur Android (PWA)

### Méthode 1 : Via Chrome

1. Ouvrez l'URL de votre application déployée dans **Chrome Android**
2. Attendez que la page charge complètement
3. Appuyez sur le menu (trois points en haut à droite)
4. Sélectionnez **"Ajouter à l'écran d'accueil"** ou **"Installer l'application"**
5. Confirmez en appuyant sur **"Ajouter"** ou **"Installer"**
6. L'icône DuoQuest apparaît maintenant sur votre écran d'accueil !

### Méthode 2 : Via l'écran d'accueil

1. Sur certains appareils, une bannière apparaît automatiquement en bas de l'écran
2. Appuyez sur **"Installer"** ou **"Ajouter"**

### Personnalisation des icônes

Des icônes **placeholder** sont déjà fournies dans `icons/` (`icon-192.png` et `icon-512.png`). Pour personnaliser :

1. Remplacez ces deux images par vos propres PNG (mêmes noms et mêmes tailles : 192×192 et 512×512)
2. Redéployez l'application

**Conseil** : Utilisez un générateur d'icônes PWA comme [https://realfavicongenerator.net](https://realfavicongenerator.net)

---

## 🎮 Utilisation

### Première connexion

1. Ouvrez l'application sur votre téléphone
2. Cliquez sur **"S'inscrire"**
3. Entrez votre email et mot de passe
4. Validez (si la confirmation email est activée, vérifiez vos emails)

### Créer un couple

1. Après connexion, vous arrivez sur l'écran d'accueil
2. Dans la section **"Espace Couple"**, cliquez sur **"Créer un couple"**
3. Donnez un nom à votre couple (ex: "Amour & Ciel", "Rock & Code")
4. Un code d'invitation unique est généré automatiquement
5. Partagez ce code avec votre partenaire (par SMS, WhatsApp, etc.)

### Rejoindre un couple

1. Votre partenaire reçoit le code d'invitation
2. Il/elle s'inscrit ou se connecte
3. Clique sur **"Rejoindre un couple"**
4. Entre le code à 12 caractères
5. Le couple est maintenant actif !

### Lancer une partie

1. **Sélectionnez un pack** en cliquant dessus (H125, Géologie, etc.)
2. **Choisissez un mode de jeu** :
   - **Quiz Duel** : Affrontement classique avec timer de 15s par question
   - **Blitz 60s** : Maximum de questions en 60 secondes
   - **Devinette** : Mode découverte avec indices
3. La partie commence automatiquement !

### Pendant la partie

- Répondez aux questions en sélectionnant une option
- Gagnez des points : **1000 pts** pour une bonne réponse + **bonus rapidité** (jusqu'à 500 pts)
- Envoyez des **emojis rapides** pour réagir (❤️, 👏, 😂, 🔥, etc.)
- Utilisez le **chat** pour communiquer avec votre partenaire
- Lisez les **explications** après chaque réponse pour apprendre

---

## 🛠️ Développement

### Prérequis

- Aucun outil de build requis
- Aucun npm requis
- Un éditeur de texte suffit (VS Code recommandé)

### Tester en local

1. Installez un serveur HTTP simple :
   ```bash
   # Avec Python 3
   python -m http.server 8000
   
   # Avec Node.js
   npx serve
   ```

2. Ouvrez `http://localhost:8000` dans votre navigateur

### Bonnes pratiques

- **Mobile-first** : Testez toujours sur un véritable appareil Android
- **Orientation portrait** : Privilégiez le mode portrait
- **Thème sombre** : Respectez la charte graphique
- **Boutons larges** : Facilitez le tactile
- **Code commenté** : Tous les commentaires sont en français

---

## 🔒 Sécurité

### Row Level Security (RLS)

Toutes les tables sont protégées par RLS. Les policies garantissent que :
- Chaque utilisateur ne voit que **son propre profil**
- Les couples sont **privés** : seuls les membres peuvent y accéder
- Les questions et packs sont **publics en lecture** (utilisateurs authentifiés)
- Les sessions de jeu sont **limitées au couple**
- Le chat est **privé entre les membres du couple**

### Clés API

- ✅ **SUPABASE_ANON_KEY** : Peut être exposée côté client (publique par nature)
- ❌ **SUPABASE_SERVICE_ROLE_KEY** : **JAMAIS** côté client ! À utiliser uniquement côté serveur

---

## 📊 Base de données

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Profils utilisateurs (display_name, avatar) |
| `couples` | Espaces couple avec code d'invitation |
| `couple_members` | Liaison utilisateurs-couples |
| `packs` | Packs thématiques (h125, geologie, etc.) |
| `questions` | Questions de quiz avec options et explications |
| `game_sessions` | Sessions de jeu en cours |
| `session_players` | Joueurs participant à une session |
| `answers` | Réponses des joueurs |
| `chat_messages` | Messages du chat couple |
| `emoji_reactions` | Réactions emoji pendant les jeux |

### Fonctions RPC

- `create_couple(couple_name)` : Crée un couple et ajoute le créateur
- `join_couple(invite_code)` : Rejoint un couple existant (max 2 membres)
- `is_couple_member(couple_id)` : Vérifie l'appartenance au couple

---

## 🚧 Limitations MVP

Cette première version inclut :
- ✅ Authentification email/mot de passe
- ✅ Création/rejoindre un couple
- ✅ 3 modes de jeu (Quiz Duel, Blitz, Devinette)
- ✅ Chat en temps réel
- ✅ Emojis rapides
- ✅ Synchronisation temps réel des réponses
- ✅ PWA installable sur Android

**Fonctionnalités futures potentielles :**
- Statistiques détaillées
- Classements historiques
- Plus de modes de jeu
- Personnalisation des avatars
- Notifications push
- Mode hors ligne amélioré

---

## 📝 Licence

Ce projet est privé et destiné à un usage personnel.

---

## 🆘 Support

En cas de problème :

1. **Vérifiez la console** (F12 dans le navigateur ou Chrome Remote Debugging)
2. **Contrôlez votre configuration Supabase** dans `config.js`
3. **Assurez-vous que le schema SQL a été exécuté** correctement
4. **Vérifiez que les packs et questions sont présents** dans la base

Pour activer les logs détaillés dans Supabase :
- Allez dans **Settings** > **Logs**
- Filtrez par table ou fonction

---

## 🎉 Prêt à jouer !

Votre application DuoQuest est **prête à être configurée et déployée** !

Pour commencer :
1. Partagez l'URL de l'application avec votre partenaire
2. Installez l'application sur vos téléphones Android (PWA)
3. Créez ou rejoignez un couple
4. Lancez votre première partie !

**Bon jeu et amusez-vous bien ! 🚁🪨💻🧵❤️**
