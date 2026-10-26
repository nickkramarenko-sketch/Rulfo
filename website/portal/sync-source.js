/* ================= Storage layer (stream A): ZZsync + the mode badge =================
   A normal statement block. build2 puts it right before `var Xj=e=>"cdweb:"+e;` (patch A01), so it runs
   once at load, before the root render; every bundle name it uses is read only when a function runs.

   A0 = local only: the page keeps today's behavior (the whole doc in localStorage, cdweb:cd6:doc).
   A1 fills in shared mode behind the same interface; nobody else needs to change:
     mode         'local' | 'db' | 'db-offline'
     start()      -> Promise<mode>. Patch A02 sets window.ZZready = ZZsync.start(); the first load waits for it.
     read()       -> the live doc (shared mode only; local mode returns null, gA reads localStorage itself)
     write(next)  -> save a whole doc (shared mode: diff + queued writes); local mode writes cdweb:cd6:doc
     seed()       -> the doc to start from when there is none (local: tx(), the demo, exactly as today)
     fresh()      -> tx() in local mode; throws in shared mode so bQ can never write a demo over shared data
     failed(err, kind?)  -> show why a save failed in the red banner (event cd6:sync {text, kind})
     lease(name, fn)     -> run fn while holding a lock (local: just runs fn)
     photoGet(key) / photoSet(key, value) -> photo storage used by window.storage in shared mode
     importLocal(onProgress?) -> owner's "move this computer's data into the shared database" (shared mode only)
   Events: cd6:sync {text, kind} (banner; text "" clears it), cd6:remote (data changed elsewhere),
   cd6:mode (mode changed). */
var ZZsync = (() => {
  let bad = {}, shown = null;
  const fire = (name, detail) => { try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch (e) {} };
  const isFull = err => {
    if (!err) return false;
    const n = String(err.name || ""), c = err.code, msg = String(err.message || err);
    return n === "QuotaExceededError" || n === "NS_ERROR_DOM_QUOTA_REACHED" || c === 22 || c === 1014 || /quota|storage.*full|exceeded/i.test(msg);
  };
  const api = {
    mode: "local",
    start: async () => { api.mode = "local"; fire("cd6:mode", { mode: api.mode }); return api.mode; },
    read: async () => null,
    write: async next => { await window.ZZlocal.set(Rj, JSON.stringify(next), true); return next; },
    seed: async () => tx(),
    fresh: () => { if (api.mode !== "local") throw new Error("ZZsync.fresh: no demo over shared data"); return tx(); },
    failed: (err, kind) => {
      kind = kind || "doc";
      bad[kind] = true;
      shown = kind;
      const full = isFull(err);
      const text = kind === "photo"
        ? (full ? "Photo NOT saved: storage on this device is full. Delete old photos or use another device, and tell the office."
                : "Photo NOT saved on this device. Please try again.")
        : (full ? "Storage on this device is full: your last change was NOT saved. Delete old photos or use another device, and tell the office."
                : "Your last change was NOT saved on this device. Please try again.");
      fire("cd6:sync", { text, kind, full });
      return text;
    },
    /* internal: a save of this kind worked again, so clear the banner if it is still showing that kind's message */
    ok: kind => { kind = kind || "doc"; if (bad[kind]) { bad[kind] = false; if (shown === kind) { shown = null; fire("cd6:sync", { text: "", kind }); } } },
    lease: async (name, fn) => fn(),
    photoGet: async key => window.ZZlocal.get(key),
    photoSet: async (key, value) => window.ZZlocal.set(key, value),
    importLocal: async () => ({ ok: false, done: 0, total: 0, reason: "Shared data is not switched on for this page." })
  };
  return api;
})();
/* "Live · shared" / "Saved on this device only" strip on staff screens (office and crew), patch A08 */
var ZZModeBadge = ({ role }) => {
  const [md, setMd] = (0, H.useState)(ZZsync.mode);
  (0, H.useEffect)(() => {
    const f = () => setMd(ZZsync.mode);
    window.addEventListener("cd6:mode", f);
    f();
    return () => window.removeEventListener("cd6:mode", f);
  }, []);
  if (role !== "office" && role !== "crew") return null;
  const live = md === "db", off = md === "db-offline";
  return (0, i.jsx)("div", {
    "data-zz": "mode",
    className: "text-[11px] text-center",
    style: { padding: "2px 8px", color: live ? m.green : off ? m.amber : m.dim, background: m.panel, borderBottom: `1px solid ${m.line}`, letterSpacing: ".02em" },
    children: live ? R("Live \xB7 shared") : off ? R("Shared data offline \xB7 look only") : R("Saved on this device only")
  });
};
