(function () {
  "use strict";

  var tablist = document.querySelector(".activity-tabs");
  if (tablist) {
    var tabs = Array.prototype.slice.call(
      tablist.querySelectorAll("[data-activity-tab]")
    );
    var panels = Array.prototype.slice.call(
      document.querySelectorAll("[data-activity-panel]")
    );

    function activateTab(tab) {
      var target = tab.getAttribute("data-activity-tab");

      tabs.forEach(function (other) {
        var isActive = other === tab;
        other.classList.toggle("is-active", isActive);
        other.setAttribute("aria-selected", isActive ? "true" : "false");
        other.setAttribute("tabindex", isActive ? "0" : "-1");
      });

      panels.forEach(function (panel) {
        var isTarget = panel.getAttribute("data-activity-panel") === target;
        if (isTarget) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () {
        activateTab(tab);
      });

      tab.addEventListener("keydown", function (event) {
        var nextIndex = null;

        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % tabs.length;
        } else if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = tabs.length - 1;
        }

        if (nextIndex !== null) {
          event.preventDefault();
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex]);
        }
      });
    });
  }

  Array.prototype.forEach.call(
    document.querySelectorAll(".activity-card-image img"),
    function (img) {
      img.addEventListener("error", function () {
        img.classList.add("is-broken");
        var fallback = img.nextElementSibling;
        if (fallback && fallback.classList.contains("activity-image-fallback")) {
          fallback.hidden = false;
        }
      });
    }
  );
})();
