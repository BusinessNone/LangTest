/* Demo shell — shared Power Apps-style renderer.
   Each demo calls PA.app(spec). Two levels of depth:
     level 1  -> list view (KPIs + command bar + data grid / gallery)
     level 2  -> record detail (tabs, form sections, AI strawman panel)
   Navigation is hash-based (#/  and  #/<recordId>). Pure static, no deps. */
(function () {
  "use strict";

  // ---- tiny icon set (Fluent-ish) ----
  var I = {
    waffle: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4h3v3H4zM8.5 4h3v3h-3zM13 4h3v3h-3zM4 8.5h3v3H4zM8.5 8.5h3v3h-3zM13 8.5h3v3h-3zM4 13h3v3H4zM8.5 13h3v3h-3zM13 13h3v3h-3z"/></svg>',
    search: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8.5" cy="8.5" r="5"/><path d="M12.5 12.5L17 17" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 1.6a1.9 1.9 0 110 3.8 1.9 1.9 0 010-3.8z"/><path d="M8.7 2.5h2.6l.4 1.9 1.4.6 1.7-1 1.8 1.8-1 1.7.6 1.4 1.9.4v2.6l-1.9.4-.6 1.4 1 1.7-1.8 1.8-1.7-1-1.4.6-.4 1.9H8.7l-.4-1.9-1.4-.6-1.7 1L3.4 15l1-1.7-.6-1.4-1.9-.4V8.9l1.9-.4.6-1.4-1-1.7 1.8-1.8 1.7 1 1.4-.6z" opacity=".35"/></svg>',
    help: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10" cy="10" r="7.2"/><path d="M8 8a2 2 0 113 1.7c-.6.4-1 .8-1 1.6" stroke-linecap="round"/><circle cx="10" cy="14" r=".9" fill="currentColor" stroke="none"/></svg>',
    add: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M10 4v12M4 10h12" stroke-linecap="round"/></svg>',
    refresh: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M15.5 6.5A6 6 0 104 10" stroke-linecap="round"/><path d="M15.8 3.5v3.2h-3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 3.8l2.7 2.7L7 15.7l-3.2.6.6-3.2z" stroke-linejoin="round"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 6h11M8 6V4.5h4V6M6 6l.7 9h6.6L14 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flow: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3.5" width="5" height="4" rx="1"/><rect x="12" y="12.5" width="5" height="4" rx="1"/><path d="M5.5 7.5v3a2 2 0 002 2h4.5" stroke-linecap="round"/></svg>',
    filter: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 5h13l-5 6v4l-3 1.5V11z" stroke-linejoin="round"/></svg>',
    exp: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3v9M6.5 8.5L10 12l3.5-3.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 14v2.5h12V14" stroke-linecap="round"/></svg>',
    chevL: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 5l-5 5 5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevR: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 5l5 5-5 5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grid: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3.5" width="14" height="13" rx="1.5"/><path d="M3 8h14M8 8v8.5"/></svg>',
    clock: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 1.7" stroke-linecap="round"/></svg>',
    link: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M8 12l4-4M7 9L5.2 10.8a2.5 2.5 0 003.5 3.5L10.5 12M13 11l1.8-1.8a2.5 2.5 0 00-3.5-3.5L9.5 8" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 16V4M4 16h12M7 13V9M10.5 13V6M14 13v-3" stroke-linecap="round"/></svg>',
    doc: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 3h5l3 3v11H6z" stroke-linejoin="round"/><path d="M11 3v3h3M8 10h4M8 13h4" stroke-linecap="round"/></svg>',
    people: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7.5" cy="7" r="2.5"/><path d="M3.5 15.5a4 4 0 018 0"/><path d="M13 5.2a2.4 2.4 0 010 4.6M14.5 15.5a4 4 0 00-2-3.4" stroke-linecap="round"/></svg>',
    box: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 3l6 3v8l-6 3-6-3V6z" stroke-linejoin="round"/><path d="M4 6l6 3 6-3M10 9v8" stroke-linecap="round"/></svg>',
    factory: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3.5 16.5V9l4 2.5V9l4 2.5V6l5 .5v10z" stroke-linejoin="round"/></svg>',
    money: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="10" cy="10" r="7"/><path d="M10 6v8M12 7.5C12 6.7 11.1 6 10 6S8 6.7 8 7.5 8.9 9 10 9.7s2 1.2 2 2-.9 1.5-2 1.5-2-.7-2-1.5" stroke-linecap="round"/></svg>',
    shield: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M10 3l6 2v5c0 4-2.7 6.2-6 7.2C6.7 16.2 4 14 4 10V5z" stroke-linejoin="round"/><path d="M7.5 10l1.8 1.8L13 8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    route: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M5 7v4a2 2 0 002 2h4a2 2 0 012 2" stroke-linecap="round"/></svg>',
    db: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><ellipse cx="10" cy="5" rx="6" ry="2.3"/><path d="M4 5v10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3V5M4 10c0 1.3 2.7 2.3 6 2.3s6-1 6-2.3" stroke-linecap="round"/></svg>',
    image: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="14" height="12" rx="1.5"/><circle cx="7.5" cy="8" r="1.3"/><path d="M4 14l4-3.5 3 2.5 3-3 2 2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ai: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 2l1.3 3.2L14.5 6l-2.6 2 .9 3.4L10 9.6 7.2 11.4l.9-3.4L5.5 6l3.2-.8z"/><circle cx="15.5" cy="14.5" r="1.5"/><circle cx="5" cy="14.5" r="1.1"/></svg>',
    warn: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 3.5l7 12.5H3z" stroke-linejoin="round"/><path d="M10 8v3.5" stroke-linecap="round"/><circle cx="10" cy="14" r=".8" fill="currentColor" stroke="none"/></svg>',
    check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 10.5l3.5 3.5 7.5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l10 10M15 5L5 15" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="7.2"/><path d="M10 9v4.5" stroke-linecap="round"/><circle cx="10" cy="6.3" r=".9" fill="currentColor" stroke="none"/></svg>'
  };

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var icon = function (n) { return I[n] || ""; };

  // ---- cell / value formatting ----
  function confClass(v) { return v >= 0.85 ? "" : v >= 0.6 ? "mid" : "low"; }
  function conf(v) {
    var pct = Math.round(v * 100);
    return '<span class="pa-conf ' + confClass(v) + '"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + "%</span></span>";
  }
  function badge(text, tone) { return '<span class="pa-badge ' + (tone || "neutral") + '"><span class="bdot"></span>' + esc(text) + "</span>"; }
  function money(v) {
    if (v == null || v === "") return "";
    var n = typeof v === "number" ? v : parseFloat(v);
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function cell(col, row) {
    var v = row[col.key];
    switch (col.type) {
      case "primary": return '<span class="cell-primary">' + esc(v) + "</span>";
      case "mono": return '<span class="cell-mono">' + esc(v) + "</span>";
      case "badge": return badge(v, typeof col.tone === "function" ? col.tone(row) : col.tone);
      case "status": return badge(v, row._tone || col.tone || "neutral");
      case "confidence": return conf(v);
      case "money": return '<span class="cell-num">' + money(v) + "</span>";
      case "num": return '<span class="cell-num">' + esc(v) + "</span>";
      case "pct": return '<span class="cell-num">' + esc(v) + "%</span>";
      default: return esc(v);
    }
  }

  // ---- component builders exposed to apps (for detail tabs) ----
  var C = {
    icon: icon,
    esc: esc,
    badge: badge,
    conf: conf,
    money: money,
    field: function (label, value, opts) {
      opts = opts || {};
      var cls = "f-v" + (opts.plain ? " plain" : "") + (opts.mono ? " mono" : "");
      return '<div class="pa-field' + (opts.wide ? " wide" : "") + '"><span class="f-l">' + esc(label) + '</span><span class="' + cls + '">' + (opts.html ? value : esc(value)) + "</span></div>";
    },
    section: function (title, fieldsHtml, opts) {
      opts = opts || {};
      if (Array.isArray(fieldsHtml)) fieldsHtml = fieldsHtml.join("");
      var h = title ? '<h4>' + (opts.icon ? icon(opts.icon) : "") + esc(title) + "</h4>" : "";
      return '<div class="pa-section">' + h + '<div class="pa-fields' + (opts.one ? " one" : "") + '">' + fieldsHtml + "</div></div>";
    },
    table: function (cols, rows, opts) {
      opts = opts || {};
      var head = "<tr>" + cols.map(function (c) { return "<th class=\"" + (c.num ? "num" : "") + "\">" + esc(c.label) + "</th>"; }).join("") + "</tr>";
      var body = rows.map(function (r) {
        return "<tr class=\"" + (r._total ? "tot" : "") + "\">" + cols.map(function (c) {
          var v = r[c.key];
          if (c.type === "money") v = money(v);
          else if (c.type === "conf") return "<td class=\"num\">" + conf(r[c.key]) + "</td>";
          else if (c.type === "badge") return "<td>" + badge(r[c.key], typeof c.tone === "function" ? c.tone(r) : c.tone) + "</td>";
          return "<td class=\"" + (c.num ? "num" : "") + (c.mono ? " mono" : "") + "\">" + esc(v) + "</td>";
        }).join("") + "</tr>";
      }).join("");
      return '<div class="pa-section">' + (opts.title ? '<h4>' + esc(opts.title) + "</h4>" : "") +
        '<div class="pa-blockscroll"><table class="pa-blocktable"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div></div>";
    },
    ai: function (o) {
      var flags = (o.flags || []).map(function (f) {
        return '<div class="ai-flag">' + icon(f.tone === "ok" ? "check" : "warn") + "<span>" + esc(f.text) + "</span></div>";
      }).join("");
      var actions = o.actions === false ? "" :
        '<div class="ai-actions"><button class="pa-btn accent">' + (o.accept || "Accept strawman") + '</button><button class="pa-btn">' + (o.edit || "Edit &amp; send back") + "</button></div>";
      return '<div class="pa-ai"><div class="ai-head">' + icon("ai") + (o.title || ("AI strawman, " + PA.client + " reacts")) + "</div>" +
        (o.body ? "<p>" + o.body + "</p>" : "") +
        (flags ? '<div class="ai-flags">' + flags + "</div>" : "") + actions + "</div>";
    },
    note: function (text, tone) {
      return '<div class="pa-note ' + (tone || "") + '">' + icon(tone === "straw" ? "warn" : "info") + "<span>" + text + "</span></div>";
    },
    steps: function (list) {
      return '<div class="pa-steps">' + list.map(function (s, i) {
        return '<div class="pa-step ' + (s.state || "") + '"><div class="st-dot">' + (s.state === "done" ? icon("check") : (i + 1)) +
          '</div><div class="st-body"><h5>' + esc(s.title) + "</h5>" + (s.body ? "<p>" + esc(s.body) + "</p>" : "") +
          (s.meta ? '<div class="st-meta">' + esc(s.meta) + "</div>" : "") + "</div></div>";
      }).join("") + "</div>";
    },
    tree: function (nodes) {
      return '<div class="pa-tree">' + nodes.map(function (n) {
        return '<div class="pa-node lvl' + (n.level || 0) + '"><span class="n-type">' + esc(n.type) + '</span><span class="n-name">' + esc(n.name) + "</span>" +
          (n.edge ? '<span class="n-edge">' + esc(n.edge) + "</span>" : "") +
          (n.conf != null ? conf(n.conf) : "") + "</div>";
      }).join("") + "</div>";
    },
    bars: function (rows, opts) {
      opts = opts || {};
      var max = opts.max || Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); }));
      return '<div class="pa-bars">' + rows.map(function (r) {
        var w = max ? Math.round((Math.abs(r.value) / max) * 100) : 0;
        return '<div class="pa-barrow ' + (r.tone || "") + '"><span class="b-label">' + esc(r.label) + '</span>' +
          '<span class="b-track"><span class="b-fill" style="width:' + w + '%"></span></span>' +
          '<span class="b-val">' + esc(r.display != null ? r.display : r.value) + "</span></div>";
      }).join("") + "</div>";
    },
    checks: function (list) {
      return '<div class="pa-checks">' + list.map(function (c) {
        var st = c.result === "pass" ? "pass" : c.result === "fail" ? "fail" : "review";
        var ic = st === "pass" ? "check" : st === "fail" ? "x" : "warn";
        return '<div class="pa-check ' + st + '"><span class="c-ico">' + icon(ic) + '</span><div><div class="c-rule">' + esc(c.rule) +
          '</div><div class="c-ev">' + esc(c.evidence) + "</div></div><div>" + badge(c.status || st, st === "pass" ? "ok" : st === "fail" ? "err" : "warn") + "</div></div>";
      }).join("") + "</div>";
    },
    side: function (title, rows) {
      return '<div class="pa-side"><h4>' + esc(title) + "</h4>" + rows.map(function (r) {
        return '<div class="s-row"><span class="l">' + esc(r[0]) + '</span><span class="v">' + (r[2] ? r[1] : esc(r[1])) + "</span></div>";
      }).join("") + "</div>";
    },
    related: function (title, items) {
      return '<div class="pa-side" style="padding-bottom:6px"><h4>' + esc(title) + '</h4><div class="pa-rel">' + items.map(function (it) {
        return '<div class="r-item"><div><div class="r-name">' + esc(it.name) + '</div><div class="r-meta">' + esc(it.meta || "") + "</div></div>" + (it.right || "") + "</div>";
      }).join("") + "</div></div>";
    }
  };

  // ---- main app renderer ----
  function PA_app(spec) {
    PA.client = spec.client || window.PORTAL_CLIENT || "Client";
    var accent = spec.accent || "#0f6cbd";
    var rows = spec.rows || [];
    var byId = {};
    rows.forEach(function (r) { byId[r.id] = r; });
    var mq = window.matchMedia ? window.matchMedia("(max-width:720px)") : null;
    // A demo rendered in the phone frame is a phone regardless of how wide the
    // window behind it is, so the drawer starts shut there too. Without this the
    // rail docks open inside a 412px frame and covers the app it is docked in.
    var isMobile = function () {
      return !!(mq && mq.matches) || document.body.classList.contains("phone");
    };
    // phones start with the drawer shut; docked layouts start with the rail open
    var railCollapsed = isMobile();

    document.documentElement.style.setProperty("--accent", accent);
    // derive a soft wash from accent
    document.documentElement.style.setProperty("--accent-wash", hexWash(accent));
    document.title = PA.client + " \u00b7 " + spec.name;

    var slug = spec.idea || location.pathname.split("/").filter(function (p) { return p && p !== "index.html"; }).pop();

    var nav = (spec.nav || [{ label: spec.entityPlural || "Records", icon: "grid", primary: true }]);

    function frame(inner, crumb) {
      var tools = '<button class="pa-iconbtn" title="Search">' + icon("search") + "</button>" +
        '<button class="pa-iconbtn" title="Settings">' + icon("settings") + "</button>" +
        '<button class="pa-iconbtn" title="Help">' + icon("help") + "</button>" +
        '<span class="pa-env">' + esc(spec.env || (PA.client + ", Production")) + "</span>" +
        '<span class="pa-avatar" title="Ben Vollmer">BV</span>';
      var navHtml = nav.map(function (n, i) {
        return '<button class="pa-nav' + (i === 0 ? " active" : "") + '" data-nav="' + i + '">' + icon(n.icon || "grid") +
          '<span class="pa-nav-label">' + esc(n.label) + "</span></button>";
      }).join("");
      return '<div class="pa"><header class="pa-appbar">' +
        '<button class="pa-waffle" id="pa-waffle" title="Navigation">' + icon("waffle") + "</button>" +
        '<a class="pa-briefback" href="/i/' + esc(slug) + '" title="Back to the idea brief">' + icon("chevL") + "<span>Idea brief</span></a>" +
        '<div class="pa-appname">' + esc(spec.name) + (spec.subtitle ? ' <span class="dot">·</span> <small>' + esc(spec.subtitle) + "</small>" : "") + "</div>" +
        '<div class="pa-appbar-sp"></div><div class="pa-appbar-tools">' + tools + "</div></header>" +
        '<div class="pa-body"><nav class="pa-rail' + (railCollapsed ? " collapsed" : "") + '" id="pa-rail">' +
        (spec.navGroup ? '<div class="pa-nav-group">' + esc(spec.navGroup) + "</div>" : "") + navHtml + "</nav>" +
        '<div class="pa-scrim" id="pa-scrim"></div>' +
        '<div class="pa-content" id="pa-content">' + inner + "</div></div></div>";
    }

    // ---------- level 1 : list ----------
    function listView() {
      var kpis = (spec.kpis || []).map(function (k) {
        return '<div class="pa-kpi ' + (k.tone || "") + '"><span class="k-tone"></span><div class="k-label">' + esc(k.label) +
          '</div><div class="k-val">' + esc(k.value) + '</div><div class="k-sub">' + esc(k.sub || "") + "</div></div>";
      }).join("");

      var cmds = '<div class="pa-cmdgroup">' +
        '<button class="pa-cmd primary">' + icon("add") + "New</button>" +
        '<button class="pa-cmd">' + icon("refresh") + "Refresh</button>" +
        '<div class="pa-cmd-sep"></div>' +
        '<button class="pa-cmd">' + icon("edit") + "Edit</button>" +
        '<button class="pa-cmd">' + icon("flow") + "Flow</button>" +
        '<button class="pa-cmd">' + icon("exp") + "Export</button>" +
        '</div>' +
        '<div class="pa-search">' + icon("search") + '<input id="pa-q" placeholder="Filter by keyword" autocomplete="off"></div>';

      var view = '<div class="pa-cmdbar">' + cmds + '</div><div class="pa-page' + (spec.wide ? " pa-page-wide" : "") + '">' +
        '<div class="pa-viewhead"><h1>' + esc(spec.viewTitle || nav[0].label) + '</h1><span class="sub">' + esc(spec.viewSub || "") + "</span></div>" +
        (kpis ? '<div class="pa-kpis">' + kpis + "</div>" : "") +
        '<div id="pa-listbody"></div>' + (spec.legend || "") + "</div>";
      return view;
    }

    function renderRows(list) {
      var target = document.getElementById("pa-listbody");
      if (!list.length) { target.innerHTML = '<div class="pa-gridwrap"><div class="pa-empty">No matching records.</div></div>'; return; }
      if (spec.render === "gallery") {
        target.innerHTML = '<div class="pa-gallery">' + list.map(function (r) {
          var body = (spec.card.rows || []).map(function (f) {
            return '<div class="g-row"><span class="l">' + esc(f.label) + '</span><span class="v">' + (f.html ? f.html(r) : esc(r[f.key])) + "</span></div>";
          }).join("");
          return '<div class="pa-gcard" data-id="' + esc(r.id) + '"><h3>' + esc(spec.card.title(r)) + '</h3><div class="g-sub">' +
            esc(spec.card.sub(r)) + "</div>" + body + "</div>";
        }).join("") + "</div>";
        bindOpen(target, ".pa-gcard");
      } else {
        var head = "<tr><th class=\"checkcol\"></th>" + spec.columns.map(function (c) {
          return "<th class=\"" + (c.num ? "cell-num" : "") + "\">" + esc(c.label) + (c.sort ? '<span class="sortarrow">▾</span>' : "") + "</th>";
        }).join("") + "</tr>";
        var body = list.map(function (r) {
          return '<tr data-id="' + esc(r.id) + '"><td class="checkcol">◻</td>' + spec.columns.map(function (c) {
            return "<td class=\"" + (c.num ? "cell-num" : "") + "\">" + cell(c, r) + "</td>";
          }).join("") + "</tr>";
        }).join("");
        target.innerHTML = '<div class="pa-gridwrap"><div class="pa-tablescroll"><table class="pa-grid"><thead>' + head +
          "</thead><tbody>" + body + "</tbody></table></div><div class=\"pa-rowcount\">" + list.length + " of " + rows.length +
          " records" + (spec.selectedNote ? " · " + spec.selectedNote : "") + "</div></div>";
        bindOpen(target, "tbody tr");
      }
    }

    function bindOpen(scope, sel) {
      scope.querySelectorAll(sel).forEach(function (el) {
        el.addEventListener("click", function () { location.hash = "#/" + el.getAttribute("data-id"); });
      });
    }

    function filterList(q) {
      q = (q || "").toLowerCase().trim();
      if (!q) return rows;
      var keys = spec.search || spec.columns.map(function (c) { return c.key; });
      return rows.filter(function (r) {
        return keys.some(function (k) { return String(r[k] == null ? "" : r[k]).toLowerCase().indexOf(q) >= 0; });
      });
    }

    // ---------- level 2 : detail ----------
    function detailView(r) {
      var d = spec.detail(r, C);
      var tabsNav = d.tabs.map(function (t, i) {
        return '<button class="pa-tab' + (i === 0 ? " active" : "") + '" data-tab="' + i + '">' + esc(t.label) + "</button>";
      }).join("");
      var tabsBody = d.tabs.map(function (t, i) {
        var main = t.html != null ? t.html : (t.blocks || []).join("");
        var wrapped = t.aside
          ? '<div class="pa-cols"><div>' + main + "</div><div>" + t.aside + "</div></div>"
          : main;
        return '<div class="pa-tabpane' + (i === 0 ? "" : " tabhide") + '" data-pane="' + i + '">' + wrapped + "</div>";
      }).join("");

      var status = (d.status || []).map(function (s) { return badge(s.label, s.tone); }).join("");
      var quick = (d.facts || []).map(function (f) {
        return '<div class="pa-quickfact"><div class="qf-l">' + esc(f[0]) + '</div><div class="qf-v">' + (f[2] ? f[1] : esc(f[1])) + "</div></div>";
      }).join("");

      var cmd = '<div class="pa-cmdbar"><div class="pa-crumb"><a data-back>' + esc(spec.viewTitle || nav[0].label) +
        "</a>" + icon("chevR") + "<b>" + esc(d.title) + "</b></div>" +
        '<div class="pa-cmdgroup right">' +
        '<button class="pa-cmd primary">' + icon("check") + "Save</button>" +
        '<button class="pa-cmd">' + icon("edit") + "Edit</button>" +
        '<button class="pa-cmd">' + icon("flow") + "Flow</button>" +
        '<div class="pa-cmd-sep"></div><button class="pa-cmd backbtn" data-back>' + icon("chevL") + "Back to list</button>" +
        "</div></div>";

      return cmd + '<div class="pa-page"><div class="pa-detail"><div class="pa-detailhead"><div class="dh-top"><div>' +
        "<h1>" + esc(d.title) + '</h1><div class="dh-sub">' + esc(d.subtitle || "") + '</div></div><div class="dh-status">' + status + "</div></div>" +
        (quick ? '<div class="pa-quickfacts">' + quick + "</div>" : "") + "</div>" +
        '<div class="pa-tabs">' + tabsNav + "</div><div class=\"pa-tabbody\">" + tabsBody + "</div></div></div>";
    }

    // ---------- router ----------
    function route() {
      var h = location.hash.replace(/^#\/?/, "");
      var content;
      if (h && byId[h]) {
        document.getElementById("app").innerHTML = frame(detailView(byId[h]));
        wireChrome();
        document.querySelectorAll("[data-back]").forEach(function (b) {
          b.addEventListener("click", function (e) { e.preventDefault(); location.hash = ""; });
        });
        document.querySelectorAll(".pa-tab").forEach(function (tab) {
          tab.addEventListener("click", function () {
            var i = tab.getAttribute("data-tab");
            document.querySelectorAll(".pa-tab").forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");
            document.querySelectorAll(".pa-tabpane").forEach(function (p) {
              p.classList.toggle("tabhide", p.getAttribute("data-pane") !== i);
            });
          });
        });
        document.getElementById("pa-content").scrollTop = 0;
      } else {
        if (h) { location.replace("#"); }
        document.getElementById("app").innerHTML = frame(listView());
        wireChrome();
        renderRows(rows);
        var q = document.getElementById("pa-q");
        if (q) q.addEventListener("input", function () { renderRows(filterList(q.value)); });
      }
    }

    function setRail(collapsed) {
      railCollapsed = collapsed;
      var rail = document.getElementById("pa-rail");
      if (rail) rail.classList.toggle("collapsed", railCollapsed);
      var w = document.getElementById("pa-waffle");
      if (w) w.setAttribute("aria-expanded", railCollapsed ? "false" : "true");
    }
    function wireChrome() {
      var w = document.getElementById("pa-waffle");
      if (w) {
        w.setAttribute("aria-expanded", railCollapsed ? "false" : "true");
        w.addEventListener("click", function () { setRail(!railCollapsed); });
      }
      var scrim = document.getElementById("pa-scrim");
      if (scrim) scrim.addEventListener("click", function () { setRail(true); });
      document.querySelectorAll(".pa-nav").forEach(function (n) {
        n.addEventListener("click", function () {
          document.querySelectorAll(".pa-nav").forEach(function (x) { x.classList.remove("active"); });
          n.classList.add("active");
          if (location.hash) location.hash = "";
          if (isMobile()) setRail(true);
        });
      });
    }

    if (!document.getElementById("app")) {
      var d = document.createElement("div"); d.id = "app"; document.body.appendChild(d);
    }
    // crossing the drawer breakpoint resets the rail to that layout's default,
    // so a drawer left open on a phone doesn't reappear docked-and-collapsed.
    if (mq) {
      var onBreak = function () { setRail(isMobile()); };
      if (mq.addEventListener) mq.addEventListener("change", onBreak);
      else if (mq.addListener) mq.addListener(onBreak);
    }

    window.addEventListener("hashchange", route);
    route();
  }

  function hexWash(hex) {
    var m = hex.replace("#", "");
    if (m.length === 3) m = m.split("").map(function (c) { return c + c; }).join("");
    var r = parseInt(m.substr(0, 2), 16), g = parseInt(m.substr(2, 2), 16), b = parseInt(m.substr(4, 2), 16);
    return "rgba(" + r + "," + g + "," + b + ",0.10)";
  }

  window.PA = { app: PA_app, C: C, icon: icon };
})();
