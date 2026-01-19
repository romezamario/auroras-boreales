(function () {
    window.App = window.App || {};
    // Mapa interno de suscriptores por nombre de evento.
    const handlers = new Map();
  
    // Registra un callback para un evento específico de la app.
    App.on = function (eventName, fn) {
      if (!handlers.has(eventName)) handlers.set(eventName, []);
      handlers.get(eventName).push(fn);
    };
  
    // Emite un evento y propaga el payload a los listeners.
    App.emit = function (eventName, payload) {
      const list = handlers.get(eventName) || [];
      for (const fn of list) {
        try { fn(payload); } catch (e) { console.error("[App.emit]", eventName, e); }
      }
    };
  })();
  
