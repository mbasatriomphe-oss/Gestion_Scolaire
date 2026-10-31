# Scolaris - Gestion scolaire

## Installation

1. Exécutez `Scolaris-Gestion-Scolaire-Setup-0.1.0.exe` sous Windows 10 ou ultérieur (64 bits).
2. Suivez les étapes de l’assistant. Il peut créer un raccourci sur le Bureau et dans le menu Démarrer.
3. L’application se lance à la fin de l’installation.

Le programme d’installation inclut l’interface, l’API Laravel et PHP. Il n’est pas nécessaire d’installer PHP. **MySQL et la base de données ne sont pas inclus.**

## Configurer MySQL pendant l’installation

Pendant l’installation, renseignez l’adresse et le port du serveur MySQL, le nom de la base, l’utilisateur et son mot de passe. Utilisez le curseur vertical à droite pour faire défiler les paramètres, ou la touche Tab pour afficher le champ suivant. Les valeurs proposées par défaut sont `127.0.0.1:3306`, `Gestion_ecole` et `root`. Le mot de passe peut rester vide si le compte n’en a pas.

**MySQL Server doit être installé et démarré ; MySQL Workbench seul ne fournit pas de serveur de base de données.** Avant le premier lancement de Scolaris, créez la base indiquée et assurez-vous que le compte dispose du droit d’exécuter les migrations Laravel.

Les paramètres sont enregistrés dans la configuration de l’application sous le profil Windows :

```text
%APPDATA%\scolaris\backend\.env
```

Au premier démarrage, l’application génère sa clé Laravel, applique les migrations en attente et démarre l’API locale en arrière-plan. Le serveur s’arrête lorsque vous fermez Scolaris. Les migrations ne suppriment pas les tables existantes ; faites une sauvegarde de la base avant d’appliquer des migrations à une base déjà utilisée.

Après une mise à jour, fermez les anciennes fenêtres de Scolaris avant de lancer la nouvelle version. Les dossiers de cache Laravel sont créés automatiquement dans le profil Windows et le démarrage attend jusqu’à 30 secondes que l’API réponde.

Si les paramètres sont incorrects, relancez l’installateur pour les saisir à nouveau ou corrigez les valeurs `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` et `DB_PASSWORD` dans le fichier `.env` ci-dessus. En cas d’échec de connexion, vérifiez que le service MySQL fonctionne et que la base existe. Le journal Laravel se trouve dans :

```text
%APPDATA%\scolaris\backend\laravel-server.log
```

## Enregistrer des enseignants et des élèves

Connectez-vous avec un compte administrateur, puis ouvrez **Enseignants** ou **Élèves** et utilisez le bouton **Nouveau**. Le matricule et le compte sont créés dans la base MySQL ; les identifiants initiaux s'affichent une seule fois après l'enregistrement. Une classe peut être attribuée immédiatement à l'élève si une année scolaire ouverte et une classe active existent, ou plus tard.

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

Le fichier généré se trouve dans `release/Scolaris-Gestion-Scolaire-Setup-0.1.0.exe`. L’assistant de l’installateur demande les paramètres MySQL. Le guide de démarrage est également inclus dans les ressources installées sous le nom `Guide-de-demarrage.md`.

## Développement

- `npm run dev` démarre l’interface web Next.js.
- `npm run dev:electron` prépare Laravel et PHP, démarre l’interface web, puis ouvre Electron avec l’API Laravel locale.
