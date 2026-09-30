#!/usr/bin/env python3
"""
ESSA local-dev patcher. Safe to run any number of times (idempotent).
Re-applies the local settings that a `git reset` / `git pull` wipes out:
  BE .env.dev : port 8095, DB -> 127.0.0.1/vendor_portal, disable SAP IAS, mac upload path
  FE .env     : API base -> http://localhost:8095/vendor-portal
  FE Login    : no auto silent-SSO redirect + local email/password form
"""
import os, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BE = ROOT / "vp-be-essa"
FE = ROOT / "vp-fe-essa"
BE_PORT = "8095"
FE_PORT = "9080"
changed = []

def rw(path, fn):
    p = pathlib.Path(path)
    if not p.exists():
        print(f"  skip (missing): {p}"); return
    old = p.read_text()
    new = fn(old)
    if new != old:
        p.write_text(new); changed.append(str(p.relative_to(ROOT)))

def set_env(text, key, value):
    """Set KEY=value, uncommenting or appending as needed."""
    pat = re.compile(rf"^(#\s*)?(?:# LOCAL-DISABLED )?{re.escape(key)}=.*$", re.M)
    if pat.search(text):
        return pat.sub(f"{key}={value}", text, count=1)
    return text.rstrip("\n") + f"\n{key}={value}\n"

# ---------------- backend .env.dev ----------------
def patch_be_env(t):
    t = set_env(t, "PORT", BE_PORT)
    t = set_env(t, "BASE_URL", f"http://localhost:{BE_PORT}")
    t = set_env(t, "APP_HOST", f"http://localhost:{BE_PORT}")
    t = set_env(t, "ENTRA_REDIRECT_URI", f"http://localhost:{BE_PORT}/vendor-portal/auth/entra/callback")
    t = set_env(t, "FE_URL", f"http://localhost:{FE_PORT}")
    # Force IPv4 so we hit the Docker essa-pg container, not a native Postgres on ::1
    t = set_env(t, "DB_HOST", "127.0.0.1")
    t = set_env(t, "DB_PORT", "5432")
    t = set_env(t, "DB_USER_NAME", "postgres")
    t = set_env(t, "DB_PASSWORD", "root")
    t = set_env(t, "DATABASE_NAME", "vendor_portal")   # matches the restored backup
    t = set_env(t, "IAS_SSO_ENABLED", "false")          # dead SAP trial tenant
    t = set_env(t, "VENDOR_FOLDER_PATH", "/Users/suka_3112/Documents/Avensys AI/Invoice sample document")   # uploads / missing docs
    t = set_env(t, "MISSING_DOC_VENDOR_EMAIL_OVERRIDE", "suganth@aven-sys.com")
    t = set_env(t, "GRAPH_MAILBOX", "suganth@aven-sys.com")   # invoice intake mailbox
    t = set_env(t, "REQ_DECRYPTION", "false")
    t = set_env(t, "RES_ENCRYPTION", "false")
    return t
rw(BE / ".env.dev", patch_be_env)
(BE / "data" / "vendor_portal_images").mkdir(parents=True, exist_ok=True)

# ---------------- backend index.ts: make SAP IAS discovery non-fatal too ----------------
def patch_be_index(t):
    old = "  oidcInits.push(sapSsoService.initOidcClient());"
    new = ('  oidcInits.push(sapSsoService.initOidcClient().catch((e: any): null => {\n'
           '    logger.error("SAP IAS OIDC discovery failed; continuing without it", e?.message || e);\n'
           '    return null;\n  }));')
    return t.replace(old, new) if old in t else t
rw(BE / "src" / "index.ts", patch_be_index)

# ---------------- frontend .env ----------------
def patch_fe_env(t):
    t = re.sub(r"localhost:80\d\d/vendor-portal", f"localhost:{BE_PORT}/vendor-portal", t)
    if not re.search(r"^PORT=", t, re.M):
        t = f"PORT={FE_PORT}\n" + t
    else:
        t = re.sub(r"^PORT=.*$", f"PORT={FE_PORT}", t, count=1, flags=re.M)
    return t
rw(FE / ".env", patch_fe_env)

# ---------------- frontend Login: no auto-redirect + password form ----------------
LOGIN = FE / "src" / "components" / "Auth" / "Login" / "index.jsx"
DEV_FORM = r'''
function DevPasswordLogin() {
  const [email, setEmail] = useState("ap.team@essa.com");
  const [password, setPassword] = useState("Essa@2026");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const apiBase = (process.env.REACT_APP_DEFAULT_API_BASE_URL || "").replace(/\/$/, "");
      const r = await fetch(apiBase + "/users/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember_me: false }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.message || ("HTTP " + r.status));
      const data = json?.data || json || {};
      if (!data.token) throw new Error("No token in response");
      localStorage.setItem("token", data.token);
      localStorage.setItem("rememberMe", "true");
      if (data.role_id != null) localStorage.setItem("role_id", String(data.role_id));
      if (data.vendor_id != null) localStorage.setItem("vendorId", String(data.vendor_id));
      const roleToType = { 1: "vendor", 2: "finance", 3: "business", 4: "admin" };
      localStorage.setItem("userType", roleToType[data.role_id] || "finance");
      window.location.href = "/";
    } catch (ex) { setErr(ex?.message || "Login failed"); } finally { setBusy(false); }
  };
  const box = { padding: 8, borderRadius: 4, border: "1px solid #334155", background: "#0f172a", color: "#e2e8f0" };
  return (
    <form onSubmit={submit} style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxWidth: 320 }}>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>— or local dev login —</div>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={box} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={box} />
      <button type="submit" disabled={busy} style={{ padding: 8, borderRadius: 4, background: "#2563eb", color: "white", border: 0 }}>
        {busy ? "Signing in…" : "Sign in with password"}
      </button>
      {err ? <div style={{ color: "#fca5a5", fontSize: 12 }}>{err}</div> : null}
    </form>
  );
}

'''
def patch_login(t):
    # 1. never auto-redirect to Microsoft on page load
    t = t.replace('completing || shouldSkipSilentSso() ? null : "silent"',
                  'null /* LOCAL-DEV: silent-SSO auto-redirect disabled */')
    # 2. add the password form under the Microsoft button (once)
    if "DevPasswordLogin" not in t:
        btn = re.search(r'(<button\s+type="button"\s+className="ms-signin-button"\s+onClick=\{handleSsoLogin\}\s*>\s*<MicrosoftMark />\s*Sign in with Microsoft\s*</button>)', t)
        if btn:
            t = t.replace(btn.group(1), "<>\n          " + btn.group(1) + "\n          <DevPasswordLogin />\n        </>")
            t = t.replace("export default LoginComp;", DEV_FORM + "export default LoginComp;")
        else:
            print("  WARNING: Microsoft button anchor not found; password form not added")
    return t
rw(LOGIN, patch_login)

print("patched:" if changed else "nothing to change (already patched)")
for c in changed: print("  -", c)
