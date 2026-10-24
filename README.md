# StageFlow — Système de gestion de stages

Application web réalisée **d'après le cahier des charges « Système de gestion de stages » v1.1 du 23 octobre 2026 (IEEE/ANSI 830-1993)** fourni par le maître d'ouvrage (Service des stages de l'université). Même thème et même palette que les applications précédentes (CDC NF-1.1), même concept et mêmes fonctionnalités que le document : cycle complet du stage en 10 phases, pour les **cinq rôles du CDC**.

## Lancer la démo
Ouvre `index.html` via un serveur local (ex. `python3 -m http.server` dans ce dossier) — HTTPS en production. Aucune installation, aucune dépendance externe : tout est local (`js/vendor/` : jsPDF 2.5.1, sql.js/SQLite 1.8.0).

## Comptes de démonstration
Les mots de passe respectent la politique du CDC (EF-1.6 : 8 caractères min, une lettre et un chiffre).

| Rôle CDC | Identifiant de connexion | Mot de passe |
|---|---|---|
| Admin université | admin@univ.tn | admin1234 |
| Admin université (2e compte) | universite@univ.tn | univ1234 |
| Encadrant universitaire | encadrant@univ.tn | encad1234 |
| Étudiant (Yasmine) | **E-1001** (numéro universitaire) ou etudiant@univ.tn | etud1234 |
| Étudiant (Karim — stage officiel déjà créé) | E-1002 ou karim@univ.tn | etud1234 |
| Entreprise (encadrant professionnel, TechNova) | entreprise@tech.tn | entr1234 |
| Admin entreprise (TechNova) | admin@technova.tn | aent1234 |
| Entreprise (DataCorp) | contact@datacorp.tn | entr1234 |

**Parcours démo complet** : Yasmine a une candidature *acceptée* chez TechNova → connecte-toi en étudiante (E-1001) et **confirme sous 7 jours** → admin université : Suivi → **affecter l'encadrant** → encadrant : Candidatures → **approuver le dossier** (le stage officiel est créé) → Conventions : l'étudiante génère, valide, puis l'entreprise valide, puis l'université valide → Stages officiels : démarrage, pointage de présence, organisation, évaluation, soutenance, clôture.

**Inscription démo (EF-1.2)** : onglet Inscription avec le numéro **E-1003** (Sara Mansour, dans la liste officielle, sans compte) → bouton de confirmation email (lien simulé). Avec un numéro absent (ex. E-9999), l'inscription est refusée avec le motif (EN-7).


## Mise à jour v2 (design + corrections)
- **Design** : palette imposée (#0D1F16, #275D46, #DAF1DE, #2E6B3F, #14381F), fond de page #DAF1DE, page d'accueil animée (dégradé mouvant, parcours en 5 étapes, compteurs, mot qui tourne), sidebar avec icônes, cartes et boutons animés, écran de chargement, respect de `prefers-reduced-motion`.
- **Déconnexion corrigée** : la règle CSS `display:grid` écrasait l'attribut `hidden`, donc l'application restait affichée après la déconnexion. `[hidden]` est maintenant forcé, et l'espace connecté (vue, menu, modale, mots de passe) est entièrement vidé avant de revenir à la page de connexion. Le champ de connexion acceptait aussi mal le numéro `E-1001` (type email) : corrigé.
- **Inscription en 3 types** : Étudiant (numéro de la liste officielle), Entreprise (nouvelle raison sociale = admin entreprise ; raison sociale existante = collaborateur à valider), Université (activation après validation par un admin). Validation depuis Utilisateurs → « Approuver le compte ».
- **Messagerie privée** : plus de liste de destinataires ; on saisit l'email ou le numéro universitaire. Conversations en fil de discussion, visibles seulement par les deux participants ; épingler/archiver propres à chaque utilisateur ; badge de messages non lus.
- Le tableau de bord n'affiche plus que les chiffres liés au compte connecté (l'admin voit tout).
- Rappel : la démo reste front-end (données dans le navigateur) ; l'isolation réelle des messages et comptes demande un backend.

## Comment le CDC est appliqué

### Rôles (CDC chap. II, Tableau 2)
Étudiant · Entreprise (encadrant professionnel) · **Admin entreprise** · Encadrant universitaire · **Admin université**. Il n'y a pas de rôle « admin système » séparé : l'Admin université gère les comptes, la liste officielle, les conventions, le calendrier et les soutenances, comme le prévoit le CDC.

### Parcours et règles de gestion (RG-1 à RG-14)
- **Offres** : brouillon → **relecture par l'admin entreprise** (RG-9) → publiée ; fermée / complète (places pourvues, RG-3) / archivée. Formulaire en **stepper 3 étapes** validées (NF-1.5/1.6). Places, mode de travail (présentiel / distance / hybride), niveau, compétences, documents requis.
- **Candidatures** : examen, demande de pièces complémentaires, entretien (présentiel ou visio, résultat saisi, RG-12), notes internes, acceptation limitée par les places, décision horodatée et signée (RG-10).
- **Confirmation sous 7 jours (RG-4)** : passé le délai, la candidature expire et la place est libérée ; une seule confirmation par période, les autres candidatures en cours sont retirées (RG-5).
- **Approbation (EF-22.1)** : l'encadrant universitaire affecté approuve / rejette / demande un complément → le **stage officiel** est créé (RG-6), avec son dossier.
- **Convention (EF-31, Tableau 7)** : générée en PDF pour le stage, circuit **étudiant → entreprise → administration**, statuts Générée / En validation / Validée / Refusée (+ régénération).
- **Présence (EF-11, RG-8)** : pointage arrivée/départ chaque jour, retard au-delà de 15 minutes, jours fériés exclus (calendrier académique géré par l'administration), justification d'absence sous 72 h validée par l'entreprise.
- **Organisation (EF-19.1)** : l'entreprise fixe horaire, jours de présence, programme et encadrant professionnel ; l'encadrant universitaire définit son programme de suivi (EF-23.1).
- **Évaluation (EF-20.1)** : grille entreprise à 5 critères (discipline, technique, autonomie, communication, qualité) avec moyenne ; évaluation de l'entreprise par l'étudiant ; attestation PDF.
- **Soutenance (EF-33, RG-13/14)** : planification avec jury, dossier déclaré « prêt » seulement si rapport final approuvé + évaluation entreprise reçue, procès-verbal et note validée avant clôture du dossier.
- **Documents (EF-5.2, Tableau 8)** : PDF/DOCX/JPG/PNG, 10 Mo max (EN-5), statuts En attente / Acceptée / Refusée / À corriger, versions successives des rapports.
- **Administration** : import de la **liste officielle des étudiants** (CSV, modèle téléchargeable — EF-27.1), structure (filières/promotions), calendrier académique et annonces, statistiques incluant les **critères de succès du CDC** (convention < 48 h, 100 % de candidatures suivies, ≥ 95 % de présences, PDF < 5 s), exports PDF/CSV, journal d'activité.

### Sécurité et transversal (CDC chap. III §4-5 et chap. V)
- Mot de passe ≥ 8 caractères avec lettre et chiffre (EF-1.6) ; **blocage 15 min après 5 échecs** (EF-1.10) ; réinitialisation par lien (code en démo) **valable 1 heure**.
- **Session 30 minutes** d'inactivité (EF-1.9/NF-5.3) avec sauvegarde et restauration des saisies.
- Confirmation de l'email avant activation du compte étudiant (EF-1.4).
- Recherche globale selon les droits (EF-3), notifications in-app + préférences email par type d'événement (EF-4.3), messagerie (état lu, épingler, archiver), aide en ligne (EF-5.4).
- FR/AR complet avec RTL (toute la page, vues dynamiques incluses), mode sombre, **taille du texte réglable** (NF-2.6, bouton A+), responsive, palette imposée et logo unique en haut à gauche.

### Données : SQLite locale (adaptation du MySQL du CDC)
Le CDC prévoit MySQL côté serveur. Dans cette démo autonome, les entités métier du Tableau 9 sont matérialisées dans une **vraie base SQLite locale** (sql.js) : tables typées `users, offers, applications, conventions, reports, stages, attendance` + table `records` complète, synchronisée à chaque sauvegarde, restaurée au démarrage, et **exportable en fichier `stages.db`** depuis Administration (ouvrable avec DB Browser / sqlite3).

## Limites honnêtes (à lire)
Cette livraison est une **démonstration 100 % front-end** du concept et des fonctionnalités du CDC. Le CDC impose une architecture **Angular + API REST + MySQL sur serveur en ligne (VPS)** : c'est l'étape de production, non incluse ici. En conséquence : les données vivent dans le navigateur de chaque utilisateur (SQLite locale), les emails et la visioconférence sont simulés, la confirmation d'email et le lien de réinitialisation sont démontrés sans serveur SMTP, le PDF de convention est généré côté client (le CDC le prévoit côté serveur en < 5 s — ici il est instantané), et aucune garantie multi-utilisateurs réelle (RBAC serveur, hachage argon2/bcrypt côté serveur, transactions pour les places) ne peut exister sans le backend décrit au chapitre II et à l'Annexe A du CDC. Le budget et le planning du CDC (12 semaines, < 1 000 TND) correspondent à cette phase de production.

## Fichiers
```
stageflow/
  index.html            page unique (auth + application)
  css/style.css         palette imposée, responsive, mode sombre, mini-stepper
  js/app.js             interface et workflows CDC (EF/RG)
  js/db.js              données, seed StageFlow, liste officielle, migration
  js/sqldb.js           base SQLite locale (sql.js), export .db
  js/i18n.js            FR/AR + RTL, traduction complète de la page
  js/vendor/            jsPDF 2.5.1 + autotable, sql.js 1.8.0 (WASM)
  assets/logo.svg       logo unique (remplaçable)
```
Changer le logo : remplace `assets/logo.svg`. Déployer : héberger le dossier en **HTTPS** (obligatoire).

## Mise à jour v3 — CDC SUPPORTEUR
- Le « CDC Wizard » (assistant de cahier des charges IEEE/ANSI 830 en 27 étapes, récapitulatif, annexes, export PDF) est intégré au site : fichier `cdc-supporteur.html`.
- Un bouton **📄 CDC SUPPORTEUR** apparaît dans l'en-tête **après connexion** (pour tous les rôles) et ouvre le wizard dans l'application, sans en-tête ni pied de page en double.
- Les données du wizard restent en `sessionStorage` (clé propre) : aucun conflit avec la base StageFlow.
