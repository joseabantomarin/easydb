import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  const sp = await searchParams;
  const callbackUrl = sp?.callbackUrl || "/";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2">EasyDB</h1>
        <p className="text-gray-600 mb-8">Crea bases de datos sin saber programar.</p>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg px-4 py-3 font-medium hover:bg-gray-50 transition shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z" />
            </svg>
            Iniciar sesión con Google
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-6">
          Al iniciar sesión aceptas que EasyDB almacene tu nombre, correo y avatar para identificarte.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <a
            href="/manual"
            className="inline-block text-sm text-blue-600 hover:underline"
          >
            📖 ¿Cómo usarlo? Ver el manual
          </a>
        </div>
      </div>
    </div>
  );
}
