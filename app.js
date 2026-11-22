/* Majid's Dashboard v1.0.0 — own code, from scratch.
   Data rule: read saved JSON first. Call GitHub live ONLY when the cache is
   older than 24 hours, or when Refresh is tapped. Never show fake numbers:
   before any data loads, the page says "not loaded yet". */
(function () {
  "use strict";
  var USERNAME = "Majid7692";
  var STATUSES = ["Idea", "Planned", "In Progress", "Done"];
  var DAY = 24 * 60 * 60 * 1000;
  var LANG_COLORS = {
    TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5",
    Rust: "#dea584", Go: "#00ADD8", Shell: "#89e051", C: "#555555",
    "C++": "#f34b7d", Java: "#b07219", HTML: "#e34c26", CSS: "#563d7c",
    Ruby: "#701516", Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB",
    PHP: "#4F5D95",
  };
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- theme ---------- */
  var root = document.documentElement;
  function applyTheme(mode, persist) {
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else { root.removeAttribute("data-theme"); mode = "system"; }
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-theme-set") === mode ? "true" : "false");
    });
    if (persist === false) return; // link-only theme (?theme=dark) never overwrites the saved choice
    try { localStorage.setItem("majid-dashboard-theme", mode); } catch (e) {}
  }
  document.querySelectorAll("[data-theme-set]").forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.getAttribute("data-theme-set")); });
  });
  try { applyTheme(localStorage.getItem("majid-dashboard-theme") || "system"); } catch (e) { applyTheme("system"); }
  /* Shareable theme link: ?theme=dark, ?theme=light or ?theme=system */
  try {
    var themeParam = new URLSearchParams(window.location.search).get("theme");
    if (themeParam === "light" || themeParam === "dark" || themeParam === "system") applyTheme(themeParam, false);
  } catch (e) {}

  /* ---------- manual data (statuses, ideas, focus, token box) ---------- */
  var manual = { statuses: {}, ideas: [], focus: null, token: { limit: "", remaining: "", note: "" } };
  function loadManual() {
    try {
      var saved = localStorage.getItem("majid-dashboard-manual");
      if (saved) manual = Object.assign(manual, JSON.parse(saved));
    } catch (e) {}
    return fetch("data/manual.json").then(function (r) {
      if (!r.ok) return;
      return r.json();
    }).then(function (d) {
      if (!d) return;
      // localStorage wins if the user already changed something in the browser;
      // otherwise seed from the file shipped with the repo.
      if (!localStorage.getItem("majid-dashboard-manual")) manual = Object.assign(manual, d);
    }).catch(function () {});
  }
  function saveManual() {
    try { localStorage.setItem("majid-dashboard-manual", JSON.stringify(manual)); } catch (e) {}
  }
  function statusOf(repo) { return manual.statuses[repo.name] || "Idea"; }
  function setStatus(name, s) { manual.statuses[name] = s; saveManual(); render(); }

  /* ---------- state ---------- */
  var data = null;      // data/current.json (or live fetch)
  var events = [];      // data/events.json
  var filter = { q: "", status: "All", lang: null, sort: "stars" };

  function daysSince(iso) {
    if (!iso) return null;
    return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  }
  function isStale(repo) {
    var s = statusOf(repo);
    if (s !== "In Progress" && s !== "Planned") return false;
    var d = daysSince(repo.pushed_at);
    return d !== null && d >= 30;
  }
  function fmtDate(iso) {
    if (!iso) return "not loaded yet";
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function fmtUpdated(iso) {
    if (!iso) return "not loaded yet";
    return new Date(iso).toLocaleString();
  }

  /* ---------- render ---------- */
  function render() {
    if (!data) return;
    $("lastUpdated").textContent = fmtUpdated(data.last_updated);
    $("statRepos").textContent = data.totals.repos;
    $("statStars").textContent = data.totals.stars;
    $("statForks").textContent = data.totals.forks_received;
    $("statFollowers").textContent = data.totals.followers;
    renderFocus(); renderTop(); renderLangs(); renderFeed(); renderRepos(); renderBoard();
  }

  function renderFocus() {
    var el = $("focusText");
    if (manual.focus) {
      el.textContent = "Today: " + manual.focus;
      return;
    }
    var inProg = data.repos.filter(function (r) { return statusOf(r) === "In Progress"; });
    if (!inProg.length) { el.textContent = "No In Progress repo yet — pick one below as today's focus."; return; }
    inProg.sort(function (a, b) { return new Date(a.pushed_at) - new Date(b.pushed_at); });
    var s = inProg[0];
    el.innerHTML = "";
    var t = document.createTextNode("Suggested (stalest In Progress): " + s.name + " — last push " + fmtDate(s.pushed_at) + ". ");
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn"; btn.textContent = "Set as today's focus";
    btn.addEventListener("click", function () { manual.focus = s.name; saveManual(); render(); });
    el.appendChild(t); el.appendChild(btn);
  }

  function showError(msg) {
    $("errorText").textContent = msg;
    $("errorBox").hidden = false;
  }
  function hideError() { $("errorBox").hidden = true; }

  function renderTop() {
    var top = data.repos.slice().sort(function (a, b) { return b.stars - a.stars; }).slice(0, 3);
    var el = $("topRepo");
    el.innerHTML = "";
    if (!top.length) {
      el.textContent = "No repos yet. ";
      var a = document.createElement("a");
      a.href = "https://github.com/new"; a.textContent = "Add a repo on GitHub";
      a.target = "_blank"; a.rel = "noopener";
      el.appendChild(a);
      return;
    }
    top.forEach(function (r) {
      var d = document.createElement("div");
      var a = document.createElement("a"); a.href = r.html_url; a.textContent = r.name; a.target = "_blank"; a.rel = "noopener";
      d.appendChild(a);
      d.appendChild(document.createTextNode(" — ★ " + r.stars + " · " + (r.language || "—") + " · last push " + fmtDate(r.pushed_at)));
      el.appendChild(d);
    });
  }

  function renderLangs() {
    var counts = {};
    data.repos.forEach(function (r) { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    var list = Object.keys(counts).map(function (k) { return [k, counts[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 5);
    var el = $("langBar"); el.innerHTML = "";
    if (!list.length) { el.textContent = "not loaded yet"; return; }
    var total = list.reduce(function (s, x) { return s + x[1]; }, 0);
    var bar = document.createElement("div"); bar.className = "langbar";
    list.forEach(function (x) {
      var s = document.createElement("span");
      s.style.width = (x[1] / total * 100) + "%";
      s.style.background = LANG_COLORS[x[0]] || "#888";
      s.title = x[0] + " — " + x[1];
      bar.appendChild(s);
    });
    el.appendChild(bar);
    var wrap = document.createElement("div"); wrap.className = "langlist";
    list.forEach(function (x) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-pressed", filter.lang === x[0] ? "true" : "false");
      var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = LANG_COLORS[x[0]] || "#888";
      b.appendChild(dot); b.appendChild(document.createTextNode(x[0] + " · " + x[1]));
      b.addEventListener("click", function () { filter.lang = (filter.lang === x[0]) ? null : x[0]; render(); });
      wrap.appendChild(b);
    });
    el.appendChild(wrap);
  }

  function renderFeed() {
    var el = $("feed"); el.innerHTML = "";
    if (!events.length) { el.innerHTML = "<li>No pushes, PRs or releases in the cached events yet.</li>"; return; }
    events.slice(0, 10).forEach(function (e) {
      var li = document.createElement("li");
      var label = e.type === "PushEvent" ? "Push" : e.type === "PullRequestEvent" ? "Pull request" : "Release";
      li.textContent = label + " · " + (e.repo || "—") + " · " + fmtDate(e.created_at);
      el.appendChild(li);
    });
  }

  function visibleRepos() {
    var list = data.repos.filter(function (r) {
      if (filter.status !== "All" && statusOf(r) !== filter.status) return false;
      if (filter.lang && r.language !== filter.lang) return false;
      if (filter.q) {
        var q = filter.q.toLowerCase();
        if ((r.name || "").toLowerCase().indexOf(q) === -1 &&
            (r.description || "").toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
    if (filter.sort === "stars") list.sort(function (a, b) { return b.stars - a.stars; });
    else if (filter.sort === "pushed") list.sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); });
    else list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return list;
  }

  function renderRepos() {
    var el = $("repoList"); el.innerHTML = "";
    var list = visibleRepos();
    $("repoCount").textContent = "Showing " + list.length + " of " + data.repos.length + " repos";
    if (!data.repos.length) {
      var li0 = document.createElement("li"); li0.className = "empty";
      li0.textContent = "No repos yet — your GitHub account has no public repos. ";
      var add = document.createElement("a");
      add.href = "https://github.com/new"; add.textContent = "Add a repo on GitHub";
      add.target = "_blank"; add.rel = "noopener";
      li0.appendChild(add);
      el.appendChild(li0);
      return;
    }
    if (!list.length) {
      var li1 = document.createElement("li"); li1.className = "empty";
      li1.textContent = "No repos match this search or filter. ";
      var clear = document.createElement("button");
      clear.type = "button"; clear.className = "btn"; clear.textContent = "Clear search";
      clear.addEventListener("click", function () {
        filter.q = ""; filter.status = "All"; filter.lang = null;
        $("search").value = "";
        document.querySelectorAll("#statusChips button").forEach(function (x) {
          x.setAttribute("aria-pressed", x.getAttribute("data-status") === "All" ? "true" : "false");
        });
        renderRepos();
      });
      li1.appendChild(clear);
      el.appendChild(li1);
      return;
    }
    list.forEach(function (r) {
      var li = document.createElement("li"); li.className = "repo";
      var a = document.createElement("a"); a.className = "name"; a.href = r.html_url; a.textContent = r.name; a.title = r.name; a.target = "_blank"; a.rel = "noopener";
      li.appendChild(a);
      if (isStale(r)) {
        var flag = document.createElement("span"); flag.className = "stale";
        flag.textContent = "⚠ not touched in " + daysSince(r.pushed_at) + " days";
        li.appendChild(flag);
      }
      var meta = document.createElement("div"); meta.className = "meta";
      meta.textContent = "★ " + r.stars + " · forks " + r.forks + " · " + (r.language || "—") + " · last push " + fmtDate(r.pushed_at);
      li.appendChild(meta);
      if (r.description) { var d = document.createElement("div"); d.className = "desc"; d.textContent = r.description; li.appendChild(d); }
      var sel = document.createElement("select");
      sel.setAttribute("aria-label", "Status for " + r.name);
      STATUSES.forEach(function (s) {
        var o = document.createElement("option"); o.value = s; o.textContent = s;
        if (statusOf(r) === s) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () { setStatus(r.name, sel.value); });
      li.appendChild(sel);
      var focusBtn = document.createElement("button");
      focusBtn.type = "button"; focusBtn.className = "btn"; focusBtn.textContent = "Set as today's focus";
      focusBtn.style.marginLeft = "8px";
      focusBtn.addEventListener("click", function () { manual.focus = r.name; saveManual(); render(); });
      li.appendChild(focusBtn);
      el.appendChild(li);
    });
  }

  function renderBoard() {
    var board = $("board"); board.innerHTML = "";
    STATUSES.forEach(function (s) {
      var col = document.createElement("div"); col.className = "col";
      var h = document.createElement("h3"); h.textContent = (s === "Idea" ? "Ideas" : s); col.appendChild(h);
      var ul = document.createElement("ul");
      var colItems = data.repos.filter(function (r) { return statusOf(r) === s; }).length +
        manual.ideas.filter(function (i) { return i.status === s; }).length;
      if (!colItems) {
        var empty = document.createElement("li"); empty.className = "empty";
        empty.textContent = "Nothing here yet.";
        ul.appendChild(empty);
      }
      data.repos.filter(function (r) { return statusOf(r) === s; }).forEach(function (r) {
        var li = document.createElement("li"); li.textContent = r.name + " ★ " + r.stars; ul.appendChild(li);
      });
      manual.ideas.filter(function (i) { return i.status === s; }).forEach(function (idea, idx) {
        var li = document.createElement("li"); li.textContent = idea.text + " (idea)";
        var del = document.createElement("button"); del.type = "button"; del.textContent = "Remove";
        del.addEventListener("click", function () {
          manual.ideas = manual.ideas.filter(function (x) { return x !== idea; });
          saveManual(); render();
        });
        li.appendChild(del); ul.appendChild(li);
      });
      col.appendChild(ul); board.appendChild(col);
    });
  }

  /* ---------- data loading ---------- */
  function cacheLocal(d, ev) {
    try { localStorage.setItem("majid-dashboard-cache", JSON.stringify({ data: d, events: ev })); } catch (e) {}
  }
  function loadLocalCache() {
    try {
      var c = JSON.parse(localStorage.getItem("majid-dashboard-cache") || "null");
      if (c && c.data) { data = c.data; events = c.events || []; return true; }
    } catch (e) {}
    return false;
  }
  function loadFiles() {
    return Promise.all([
      fetch("data/current.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch("data/events.json").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      if (res[0]) { data = res[0]; events = (res[1] && res[1].events) || []; cacheLocal(data, events); return true; }
      return loadLocalCache();
    });
  }
  function fetchLive() {
    // Old data stays on screen while updating; only "updating…" shows.
    hideError();
    var btn = $("refreshBtn");
    btn.disabled = true; btn.textContent = "Updating…";
    $("refreshState").textContent = "updating…";
    var headers = { Accept: "application/vnd.github+json" };
    return Promise.all([
      fetch("https://api.github.com/users/" + USERNAME, { headers: headers }).then(function (r) { return r.json(); }),
      fetch("https://api.github.com/users/" + USERNAME + "/repos?per_page=100&sort=updated", { headers: headers }).then(function (r) { return r.json(); }),
      fetch("https://api.github.com/users/" + USERNAME + "/events/public?per_page=30", { headers: headers }).then(function (r) { return r.json(); }).catch(function () { return []; })
    ]).then(function (res) {
      var user = res[0], repos = res[1], evs = res[2];
      if (!Array.isArray(repos)) throw new Error("GitHub API error");
      var stamp = new Date().toISOString();
      var stars = 0, forks = 0;
      var list = repos.map(function (r) {
        stars += r.stargazers_count || 0; forks += r.forks_count || 0;
        return { name: r.name, full_name: r.full_name, html_url: r.html_url,
          description: r.description, language: r.language, stars: r.stargazers_count || 0,
          forks: r.forks_count || 0, open_issues: r.open_issues_count || 0,
          pushed_at: r.pushed_at, created_at: r.created_at, is_fork: !!r.fork };
      });
      data = { generated_at: stamp, last_updated: stamp, username: USERNAME,
        user: { login: user.login, html_url: user.html_url, avatar_url: user.avatar_url,
          public_repos: user.public_repos, followers: user.followers, following: user.following },
        totals: { repos: list.length, stars: stars, forks_received: forks, followers: user.followers },
        repos: list };
      events = (Array.isArray(evs) ? evs : []).filter(function (e) {
        return ["PushEvent", "PullRequestEvent", "ReleaseEvent"].indexOf(e.type) !== -1;
      }).slice(0, 10).map(function (e) {
        return { type: e.type, created_at: e.created_at, repo: (e.repo || {}).name, actor: (e.actor || {}).login };
      });
      cacheLocal(data, events);
      $("refreshState").textContent = "";
      btn.disabled = false; btn.textContent = "Refresh";
      render();
    }).catch(function (err) {
      // Human words only — never error codes or stack traces.
      // Old numbers stay visible, but they are never shown as today's:
      // the "last updated" time next to them tells the truth.
      $("refreshState").textContent = "";
      btn.disabled = false; btn.textContent = "Refresh";
      if (data) {
        showError("Couldn't reach GitHub right now — showing your last saved data from " +
          fmtUpdated(data.last_updated) + ". Those numbers are not today's until a refresh works. Tap Retry to try again.");
        render();
      } else {
        showError("Couldn't load the dashboard — check your connection, then tap Retry.");
      }
    });
  }

  /* ---------- controls ---------- */
  $("search").addEventListener("input", function (e) { filter.q = e.target.value; renderRepos(); });
  $("sortSel").addEventListener("change", function (e) { filter.sort = e.target.value; renderRepos(); });
  document.querySelectorAll("#statusChips button").forEach(function (b) {
    b.addEventListener("click", function () {
      filter.status = b.getAttribute("data-status");
      document.querySelectorAll("#statusChips button").forEach(function (x) {
        x.setAttribute("aria-pressed", x === b ? "true" : "false");
      });
      renderRepos();
    });
  });
  $("refreshBtn").addEventListener("click", function () { fetchLive(); });
  $("retryBtn").addEventListener("click", function () { fetchLive(); });
  $("newIdeaBtn").addEventListener("click", function () {
    var text = prompt("New idea (one line):");
    if (!text) return;
    manual.ideas.push({ text: text, status: "Idea" });
    saveManual(); render();
  });
  $("tokenForm").addEventListener("submit", function (e) {
    e.preventDefault();
    manual.token = { limit: $("tokenLimit").value, remaining: $("tokenRemaining").value, note: $("tokenNote").value };
    saveManual();
    $("tokenSaved").textContent = "Saved.";
  });
  $("exportBtn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(manual, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "dashboard-manual-backup.json"; a.click();
    $("backupMsg").textContent = "Exported manual data only.";
  });
  $("importFile").addEventListener("change", function (e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var d = JSON.parse(reader.result);
        manual = Object.assign(manual, d); saveManual();
        $("tokenLimit").value = manual.token.limit || "";
        $("tokenRemaining").value = manual.token.remaining || "";
        $("tokenNote").value = manual.token.note || "";
        $("backupMsg").textContent = "Imported.";
        render();
      } catch (err) { $("backupMsg").textContent = "Import failed — not a valid backup file."; }
    };
    reader.readAsText(file);
  });

  /* ---------- start ---------- */
  loadManual().then(function () {
    $("tokenLimit").value = manual.token.limit || "";
    $("tokenRemaining").value = manual.token.remaining || "";
    $("tokenNote").value = manual.token.note || "";
    return loadFiles();
  }).then(function (loaded) {
    document.body.classList.remove("loading");
    if (!loaded) {
      // Stays on "not loaded yet" — no fake numbers — with a Retry.
      showError("Couldn't load your saved dashboard data — check your connection, then tap Retry.");
      return;
    }
    render();
    var age = data.last_updated ? Date.now() - new Date(data.last_updated).getTime() : Infinity;
    if (age > DAY) fetchLive(); // auto-refresh only when cache is older than 24h
  });
})();
