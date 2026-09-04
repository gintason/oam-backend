import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, LogOut, Loader2 } from "lucide-react";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../auth/authApi";
import { apiErrorMessage } from "../lib/api";

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFirstName(user?.first_name ?? "");
    setLastName(user?.last_name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.first_name, user?.last_name, user?.phone]);

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Your account";
  const initial = (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();

  const save = useMutation({
    mutationFn: () => authApi.updateProfile({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() }),
    onSuccess: async () => { await refreshUser(); setError(undefined); setSaved(true); setTimeout(() => setSaved(false), 1800); },
    onError: (err) => { setSaved(false); setError(apiErrorMessage(err, "Couldn't save your changes. Try again.")); },
  });

  const dirty =
    firstName.trim() !== (user?.first_name ?? "") ||
    lastName.trim() !== (user?.last_name ?? "") ||
    phone.trim() !== (user?.phone ?? "");

  async function onLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  const inputCls = "h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10";

  return (
    <div className="min-h-screen bg-mist pb-24 md:pb-0">
      <AppHeader />
      <main className="mx-auto max-w-lg px-5 py-8">
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink">Profile</h1>

        {/* Identity */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-hairline bg-paper p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green/10 text-lg font-semibold text-brand-green">{initial}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-[16px] font-semibold text-ink">{fullName}</p>
              {user?.is_verified && <BadgeCheck size={16} strokeWidth={2} className="shrink-0 text-brand-green" />}
            </div>
            <p className="truncate text-[13px] text-muted">{user?.email || user?.phone || ""}</p>
          </div>
        </div>

        {/* Edit form */}
        <div className="rounded-2xl border border-hairline bg-paper p-5">
          <p className="mb-4 text-[12.5px] font-semibold text-ink">Edit your details</p>
          {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3.5 py-2.5 text-[13px] text-danger">{error}</div>}

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">First name</label>
          <input value={firstName} onChange={(e) => { setFirstName(e.target.value); setSaved(false); }} placeholder="Jane" className={`${inputCls} mb-4`} />
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Last name</label>
          <input value={lastName} onChange={(e) => { setLastName(e.target.value); setSaved(false); }} placeholder="Doe" className={`${inputCls} mb-4`} />
          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Phone</label>
          <input value={phone} onChange={(e) => { setPhone(e.target.value.replace(/[^\d+]/g, "")); setSaved(false); }} placeholder="0803..." className={`${inputCls} mb-4`} />

          <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Email</label>
          <div className="mb-1.5 flex h-11 items-center rounded-[11px] border border-hairline bg-mist px-3.5 text-[14px] text-muted">{user?.email || "—"}</div>
          <p className="mb-5 text-[12px] text-muted">Email can't be changed — it's your login.</p>

          <button onClick={() => save.mutate()} disabled={save.isPending || (!dirty && !saved)} className="flex h-11 w-full items-center justify-center rounded-[11px] bg-brand-green text-[14px] font-semibold text-white transition hover:brightness-95 disabled:opacity-60">
            {save.isPending ? <Loader2 size={18} className="animate-spin" /> : saved ? "Saved!" : "Save changes"}
          </button>
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-brand-red/25 bg-[linear-gradient(150deg,rgba(11,115,39,0.10),rgba(227,16,18,0.06))] text-[14px] font-medium text-brand-red transition hover:border-brand-red/40">
          <LogOut size={16} strokeWidth={1.75} /> Sign out
        </button>
      </main>
    </div>
  );
}
