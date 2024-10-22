import * as utilities from "../utilities.js";
import * as serverVariables from "../serverVariables.js";

let repositoryCachesExpirationTime = serverVariables.get("main.repository.CacheExpirationTime");

// Initialisation des variables globales pour stocker les caches et gérer le nettoyage
global.repositoryCaches = [];
global.cachedRepositoriesCleanerStarted = false;

export default class CachedRequestsManager {

    // Méthode pour démarrer le processus de nettoyage périodique des caches expirées
    static startCachedRequestsCleaner() {
        if (!global.cachedRepositoriesCleanerStarted) {
            global.cachedRepositoriesCleanerStarted = true;
            setInterval(CachedRequestsManager.flushExpired, repositoryCachesExpirationTime * 1000);
            console.log("[Periodic cached requests cleaning process started...]");
        }
    }

    // Ajout d'une requête dans le cache (URL, contenu, et ETag optionnel)
    static add(url, content, ETag = "") {
        CachedRequestsManager.clear(url);  // Supprime toute cache existante pour cette URL
        global.repositoryCaches.push({
            url,
            content,
            ETag,
            Expire_Time: utilities.nowInSeconds() + repositoryCachesExpirationTime
        });
        console.log(`[Added to cache: URL - ${url}]`);
    }

    // Trouve la cache associée à une URL et renvoie les données si trouvées
    static find(url) {
        for (let cache of global.repositoryCaches) {
            if (cache.url === url) {
                // Met à jour le temps d'expiration pour prolonger la durée de vie de la cache
                cache.Expire_Time = utilities.nowInSeconds() + repositoryCachesExpirationTime;
                console.log(`[Cache hit: URL - ${url}]`);
                return { content: cache.content, ETag: cache.ETag };
            }
        }
        return null;
    }

    // Efface la cache associée à une URL
    static clear(url) {
        global.repositoryCaches = global.repositoryCaches.filter(cache => cache.url !== url);
        console.log(`[Cache cleared: URL - ${url}]`);
    }

    // Supprime les caches expirées
    static flushExpired() {
        let now = utilities.nowInSeconds();
        global.repositoryCaches = global.repositoryCaches.filter(cache => {
            if (cache.Expire_Time <= now) {
                console.log(`[Expired cache removed: URL - ${cache.url}]`);
                return false;
            }
            return true;
        });
    }

    // Gère la réponse à une requête HTTP en fonction du cache
    static get(HttpContext) {
        let cached = CachedRequestsManager.find(HttpContext.request.url);
        if (cached) {
            HttpContext.response.JSON(cached.content, cached.ETag, true); // true signifie "from cache"
            console.log(`[Response sent from cache: URL - ${HttpContext.request.url}]`);
        }
        return cached;
    }
}