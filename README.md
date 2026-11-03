# Scolaris - Gestion scolaire

## Installation

1. Exécutez `Scolaris-Gestion-Scolaire-Setup-0.4.2.exe` sous Windows 10 ou ultérieur (64 bits).
2. Suivez les étapes de l’assistant. Il peut créer un raccourci sur le Bureau et dans le menu Démarrer.
3. L’application se lance à la fin de l’installation.

Le programme d’installation inclut l’interface, l’API Laravel, PHP et SQLite. Il n’est pas nécessaire d’installer PHP. La base SQLite intégrée convient à un poste unique ; pour utiliser un serveur partagé, choisissez MySQL pendant l’installation.

## Choisir la base de données pendant l’installation

À la première installation, **Base intégrée SQLite** est cochée. Les données seront conservées dans `%APPDATA%\scolaris\backend\database.sqlite` et les tables seront créées au premier lancement. Aucune installation de MySQL n’est nécessaire pour ce mode.

Pour utiliser MySQL, décochez SQLite et renseignez l’adresse, le port, le nom de la base, l’utilisateur et son mot de passe. Utilisez le curseur vertical à droite pour faire défiler les paramètres, ou la touche Tab pour afficher le champ suivant. Les valeurs proposées sont `127.0.0.1:3306`, `Gestion_ecole` et `root`. Le mot de passe peut rester vide si le compte n’en a pas.

En mode MySQL, **MySQL Server doit être installé et démarré ; MySQL Workbench seul ne fournit pas de serveur de base de données.** Avant le premier lancement de Scolaris, créez la base indiquée et assurez-vous que le compte dispose du droit d’exécuter les migrations Laravel. Lors d’une mise à jour, l’installateur conserve la configuration actuelle par défaut.

Les paramètres sont enregistrés dans la configuration de l’application sous le profil Windows :

```text
%APPDATA%\scolaris\backend\.env
```

Au premier démarrage, l’application génère sa clé Laravel, applique les migrations en attente et démarre l’API locale en arrière-plan. Si la base ne contient aucun compte, elle crée le premier administrateur avec l’identifiant `admin` et le mot de passe `admin1234`, puis affiche ces identifiants. Changez le mot de passe dans Mon profil après connexion. Notez-les avant de fermer la fenêtre. Le serveur s’arrête lorsque vous fermez Scolaris. Les migrations ne suppriment pas les tables existantes ; faites une sauvegarde de la base avant d’appliquer des migrations à une base déjà utilisée.

Après une mise à jour, fermez les anciennes fenêtres de Scolaris avant de lancer la nouvelle version. Les dossiers de cache Laravel sont créés automatiquement dans le profil Windows et le démarrage attend jusqu’à 30 secondes que l’API réponde.

Si les paramètres MySQL sont incorrects, relancez l’installateur et décochez « Conserver la configuration actuelle » pour les saisir à nouveau, ou corrigez les valeurs `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` et `DB_PASSWORD` dans le fichier `.env` ci-dessus. En cas d’échec de connexion MySQL, vérifiez que le service fonctionne et que la base existe. Le journal Laravel se trouve dans :

```text
%APPDATA%\scolaris\backend\laravel-server.log
```

## Enregistrer des enseignants et des élèves

Connectez-vous avec un compte administrateur, puis ouvrez **Enseignants** ou **Élèves** et utilisez le bouton **Nouveau**. Le matricule et le compte sont créés dans la base choisie ; les identifiants initiaux s'affichent une seule fois après l'enregistrement. Une classe peut être attribuée immédiatement à l'élève si une année scolaire ouverte et une classe active existent, ou plus tard.

## Organiser l’année et gérer les résultats

Dans **Années, niveaux et options**, créez une année scolaire. Scolaris crée deux semestres, chacun avec deux périodes et un examen. Les 1re et 2e années appartiennent au cycle d’orientation. Créez ensuite les niveaux d’humanités, par exemple **1re humanité** et **2e humanité**, avec ou sans option. Ajoutez les options, puis utilisez **Associer les options** sur chaque niveau concerné ; un niveau peut accueillir plusieurs options. Lors de la création d’une classe, choisissez son niveau et une de ses options associées si ce niveau en exige une. Ajoutez les frais annuels, les cours et leurs affectations à un enseignant et une salle.

L’administrateur configure l’école et les comptes. L’enseignant ne voit que ses classes, cours, affectations et feuilles de cotes ; il choisit sa classe, sa salle et son cours dans **Notes** avant de saisir les cotes. Le comptable accède aux inscriptions et à la comptabilité. Les mêmes droits sont contrôlés par l’API.

La moyenne d’un cours au semestre est `(période 1 + période 2 + 2 × examen) ÷ 4`. Les coefficients des cours servent à la moyenne générale. Le bulletin annuel indique la réussite seulement si la moyenne est **strictement supérieure à 10/20**, soit 50 %.

Les frais sont répartis sur deux semestres. Le comptable peut enregistrer plusieurs tranches de paiement par élève et les dépenses dans **Frais** et **Dépenses** ; **Rapports** présente les totaux réels. Tous les montants saisis sont des **dollars US entiers ($)**.

## Préparer et imprimer les bulletins

Dans **Bulletins**, l’administrateur renseigne d’abord l’en-tête de l’établissement (nom, numéro d’identification, province éducationnelle, ville, commune ou territoire et code). Il choisit ensuite une classe et un élève pour afficher son bulletin individuel, puis utilise **Imprimer**. Le nouveau modèle congolais est proposé par défaut pour **toutes les classes** : son titre reprend le niveau, l’option et l’année scolaire de l’élève. Il affiche les domaines de branches, les maxima, les deux périodes et l’examen de chaque semestre, les sous-totaux, le total général, le pourcentage annuel et la décision. L’impression est préparée pour une page A4 par élève.

Dans **Cours**, indiquez le **domaine du bulletin** et, si besoin, le **sous-domaine** pour retrouver les groupes du formulaire papier. Les cours sans groupe configuré sont classés automatiquement selon leur intitulé ; les autres apparaissent dans « Autres branches ». Dans **Classes**, le champ **Modèle du bulletin** permet de choisir l’ancien tableau si nécessaire. La colonne **Examen d’État** conserve les cases officielles du modèle, mais reste vierge tant qu’aucun résultat distinct de l’examen d’État n’est enregistré.

Les maxima par branche dépendent du coefficient du cours : 10 points par période, 20 points par examen, 40 points par semestre et 80 points pour l’année, multipliés par ce coefficient. Les cases d’application, de conduite et les signatures sont laissées vides lorsqu’aucune donnée correspondante n’a été enregistrée. Une décision de réussite n’apparaît que lorsque toutes les cotes sont complètes et que le résultat annuel dépasse strictement 50 %.

Exemple pour un cours de coefficient 1 : les cotes 12/20, 14/20 et 15/20 donnent 6/10, 7/10 et 15/20 sur le bulletin, soit **28/40 au semestre**. Les totaux et le pourcentage annuels sont calculés à partir des points imprimés, après arrondi de chaque case au centième ; **40/80 ne suffit pas pour réussir**.

## Informations sur le paquet

- Nom de l’application : **Scolaris - Gestion scolaire**
- Système : Windows 10 ou ultérieur, 64 bits
- Dossier des données et configuration : `%APPDATA%\scolaris\backend`
- API locale : `http://127.0.0.1:8000`

## Création de l’installateur (développement)

Depuis le dossier `gestion-scolaire-web`, lancez :

```powershell
npm run dist
```

Le build utilise le projet Laravel situé dans le dossier voisin `Projet-scolors-client-Bunia`. Il exclut les fichiers `.env` locaux, les journaux, les données de base et les caches de développement. Par défaut, le runtime PHP est pris depuis `C:\xampp\php`. Pour utiliser une autre installation compatible de PHP 8.2, définissez `PHP_RUNTIME_DIR` avant la commande.

Le fichier généré se trouve dans `release/Scolaris-Gestion-Scolaire-Setup-0.4.2.exe`. L’assistant de l’installateur propose SQLite ou MySQL. Le guide de démarrage est également inclus dans les ressources installées sous le nom `Guide-de-demarrage.md`.

## Nouveautés 0.4.2

- Icône Scolaris pour l’application, les raccourcis et l’installateur Windows.
- Installation vierge : identifiant `admin`, mot de passe `admin1234`. Les comptes existants sont conservés lors des mises à jour.
- Indicateur global pendant les requêtes de données, y compris les chargements simultanés et les erreurs.
- Dans **Utilisateurs**, l’administrateur peut créer des comptables et des secrétaires. Les élèves sont créés depuis **Élèves**.
- Chaque utilisateur, y compris un élève, peut ouvrir **Mon profil** pour modifier son nom, son e-mail et son mot de passe. Un changement de mot de passe révoque les sessions.
- L’administrateur, le secrétaire et le comptable peuvent créer et inscrire des élèves. **Inscriptions** permet de réinscrire un dossier existant et de consulter son parcours avec le nombre d’années dans l’établissement. Le matricule est permanent et une seule inscription est autorisée par année.
- La réinscription exige des résultats annuels complets : réussite strictement supérieure à 50 % pour passer au niveau suivant, sinon redoublement au même niveau. Les niveaux suivent leur ordre dans le cycle ; après l’orientation, le premier niveau d’humanités est proposé. Les années ne doivent pas se chevaucher et la capacité de la classe est contrôlée.
- Un cours peut appartenir à plusieurs cycles, sélectionnés par cases à cocher. Les cycles utilisés par des affectations ne peuvent pas être retirés.
- **Notes** propose à l’administrateur et au secrétaire la consultation des cotes d’un élève dans tous les cours ou un cours précis. Seuls les enseignants affectés peuvent saisir des cotes ; seul leur auteur peut les modifier.
- **Journal des opérations**, réservé à l’administrateur, conserve l’auteur, la date et les changements des dossiers, inscriptions, paiements, dépenses, cotes et paramètres. Les opérations API réussies sont également tracées. Les mots de passe et jetons ne sont pas enregistrés. La traçabilité commence à la mise à jour ; elle ne reconstitue pas les auteurs des anciennes opérations.

## Développement

- `npm run dev` démarre l’interface web Next.js.
- `npm run dev:electron` prépare Laravel et PHP, démarre l’interface web, puis ouvre Electron avec l’API Laravel locale.
