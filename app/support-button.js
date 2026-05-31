"use client";

import { useEffect, useId, useState } from "react";

const PAYPAL_URL = "https://www.paypal.com/ncp/payment/VZ3CFJK4YDBML";
const SUPPORT_NAME = "José Abanto";

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border-2 border-support text-support bg-background hover:bg-support hover:text-white font-medium rounded-full px-6 py-3 transition"
      >
        <span aria-hidden="true">💚</span>
        Apóyanos voluntariamente
        <span aria-hidden="true">🙏</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-[360px] max-h-[90vh] overflow-y-auto p-6"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="absolute top-2 right-2 text-2xl text-gray-500 hover:text-gray-800 w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
            >
              ×
            </button>

            <h2 id={titleId} className="text-xl font-bold text-center mb-2">
              Apóyanos voluntariamente
            </h2>
            <p className="text-center text-gray-500 mb-6">
              Tu apoyo es totalmente voluntario y ayuda a mantener la app. ¡Gracias! 🙏
            </p>

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-support mb-3">
                Yape (Perú)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/yape-qr.png"
                alt={`Código QR de Yape — ${SUPPORT_NAME}`}
                className="w-full max-w-[240px] h-auto rounded-lg mx-auto"
              />
              <p className="text-xs text-gray-500 mt-3">
                Escanéalo desde otro dispositivo con la app Yape.
              </p>
            </div>

            <hr className="border-gray-200 my-6" />

            <div className="text-center pb-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-support mb-3">
                Internacional
              </p>
              <a
                href={PAYPAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-support text-white font-medium rounded-full px-6 py-3 hover:opacity-90 transition"
              >
                Donar con PayPal
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
