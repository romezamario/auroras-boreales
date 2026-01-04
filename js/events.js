(function () {
    window.App = window.App || {};
    const handlers = new Map();
  
    App.on = function (eventName, fn) {
      if (!handlers.has(eventName)) handlers.set(eventName, []);
      handlers.get(eventName).push(fn);
    };
  
    App.emit = function (eventName, payload) {
      const list = handlers.get(eventName) || [];
      for (const fn of list) {
        try { fn(payload); } catch (e) { console.error("[App.emit]", eventName, e); }
      }
    };
  })();
  