import { useState } from "react";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import PageShell, { Block } from "./PageShell";
import { useTranslation } from "react-i18next";

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, open mailto with pre-filled body.
    const subject = encodeURIComponent("Inquiry from OAM contact form");
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\nMessage:\n${form.message}`
    );
    window.location.href = `mailto:info@oam-app.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <PageShell
      title={t("company.contact.title")}
      intro={t("company.contact.intro")}
    >
      <Block heading={t("company.contact.emailTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Mail size={17} strokeWidth={1.75} />
          </span>
          <div>
            <a
              href="mailto:info@oam-app.com"
              className="text-[16px] font-semibold text-ink underline decoration-brand-green/40 underline-offset-4"
            >
              info@oam-app.com
            </a>
            <p className="mt-1">{t("company.contact.emailBody")}</p>
          </div>
        </div>
      </Block>

      <Block heading={t("company.contact.phoneTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <Phone size={17} strokeWidth={1.75} />
          </span>
          <div>
            <a
              href="tel:+2348161829560"
              className="text-[16px] font-semibold text-ink underline decoration-brand-green/40 underline-offset-4"
            >
              +234 816 182 9560
            </a>
            <p className="mt-1">{t("company.contact.phoneBody")}</p>
          </div>
        </div>
      </Block>

      <Block heading={t("company.contact.addressTitle")}>
        <div className="flex gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
            <MapPin size={17} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-[16px] font-semibold text-ink">
              Block Shop 11, No 2, Akinwunmi Street, Ojo, Lagos, Nigeria
            </p>
            <p className="mt-1">{t("company.contact.addressBody")}</p>
          </div>
        </div>
      </Block>

      <Block heading={t("company.contact.formTitle")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-[13px] font-medium text-ink">
              {t("company.contact.formName")}
            </label>
            <input
              id="name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-ink">
              {t("company.contact.formEmail")}
            </label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 h-11 w-full rounded-[11px] border border-hairline bg-paper px-3.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-[13px] font-medium text-ink">
              {t("company.contact.formMessage")}
            </label>
            <textarea
              id="message"
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="mt-1 w-full resize-none rounded-[11px] border border-hairline bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-brand-green focus:ring-[3px] focus:ring-brand-green/10"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-brand-red text-[15px] font-semibold text-white transition hover:brightness-95 active:scale-[0.99]"
          >
            <Send size={18} strokeWidth={1.75} />
            {t("company.contact.submit")}
          </button>
          {submitted && (
            <p className="text-center text-[13px] text-brand-green">
              {t("company.contact.thanks")}
            </p>
          )}
        </form>
      </Block>
    </PageShell>
  );
}