(function () {
  window.App = window.App || {};

  const REMOTE_FALLBACK_LABEL = "metadata remota no disponible";

  function getVersionConfig() {
    return App.config?.version ?? {};
  }

  function getDisplayLabel(metadata) {
    if (!metadata) return null;

    if (metadata.label) return metadata.label;

    if (metadata.updatedAt) {
      return App.utils?.formatDateTime?.(metadata.updatedAt)
        ?? new Date(metadata.updatedAt).toLocaleString();
    }

    return null;
  }

  function setVersionLabel(el, metadata) {
    const cfg = getVersionConfig();
    const label = getDisplayLabel(metadata) ?? cfg.fallbackLabel ?? "—";
    el.innerHTML = `Versión: <strong>${label}</strong>`;
  }

  function getValueByPath(obj, path) {
    if (!obj || !path) return undefined;

    return path.split(".").reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, obj);
  }

  function readCachedMetadata(remoteCfg) {
    if (!remoteCfg?.storageKey || !remoteCfg?.ttlMs) return null;

    try {
      const raw = window.localStorage?.getItem(remoteCfg.storageKey);
      if (!raw) return null;

      const cached = JSON.parse(raw);
      const fetchedAt = Number(cached?.fetchedAt ?? 0);
      if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return null;

      if ((Date.now() - fetchedAt) > remoteCfg.ttlMs) return null;
      return cached.metadata ?? null;
    } catch (error) {
      console.warn("[versionUI] no se pudo leer el caché local de versión", error);
      return null;
    }
  }

  function writeCachedMetadata(remoteCfg, metadata) {
    if (!remoteCfg?.storageKey || !metadata) return;

    try {
      window.localStorage?.setItem(remoteCfg.storageKey, JSON.stringify({
        fetchedAt: Date.now(),
        metadata
      }));
    } catch (error) {
      console.warn("[versionUI] no se pudo persistir el caché local de versión", error);
    }
  }

  async function fetchRemoteMetadata(remoteCfg) {
    if (!remoteCfg?.enabled || !remoteCfg?.endpoint) return null;

    const response = await fetch(remoteCfg.endpoint, {
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
      throw new Error(`Version metadata: ${response.status}`);
    }

    const payload = await response.json();
    const updatedAt = getValueByPath(payload, remoteCfg.parse?.datePath);
    if (!updatedAt) {
      throw new Error("Version metadata: datePath sin resultado");
    }

    return {
      updatedAt,
      source: "remote"
    };
  }

  // UI que muestra la versión sin exigir una llamada remota en cada arranque.
  App.versionUI = {
    async init() {
      const el = document.getElementById("app-version");
      if (!el) return;

      const cfg = getVersionConfig();
      const embeddedMetadata = {
        label: cfg.label,
        updatedAt: cfg.updatedAt,
        source: cfg.source
      };

      setVersionLabel(el, embeddedMetadata);

      const remoteCfg = cfg.remote;
      if (!remoteCfg?.enabled) return;

      const cachedMetadata = readCachedMetadata(remoteCfg);
      if (cachedMetadata) {
        setVersionLabel(el, cachedMetadata);
        return;
      }

      try {
        const remoteMetadata = await fetchRemoteMetadata(remoteCfg);
        if (!remoteMetadata) return;

        writeCachedMetadata(remoteCfg, remoteMetadata);
        setVersionLabel(el, remoteMetadata);
      } catch (error) {
        console.warn("[versionUI] no se pudo actualizar la metadata remota", error);
        if (!getDisplayLabel(embeddedMetadata)) {
          setVersionLabel(el, { label: cfg.fallbackLabel ?? REMOTE_FALLBACK_LABEL });
        }
      }
    }
  };
})();
