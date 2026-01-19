(function () {
  window.App = window.App || {};

  App.utils = App.utils || {};

  App.utils.formatDateTime = function (date) {
    const locale = App.config?.locale ?? "es-MX";
    const options = App.config?.dateTimeFormat ?? {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    };
    return new Date(date).toLocaleString(locale, options);
  };
})();
