import { auth, signOut } from "@/auth";

export default async function HeaderUser() {
  const session = await auth();
  if (!session?.user) return null;
  const { name, email, image } = session.user;
  const initial = (name || email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 text-sm">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || ""} className="w-8 h-8 rounded-full" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-blue-300 text-blue-900 flex items-center justify-center font-semibold">
          {initial}
        </span>
      )}
      <span className="hidden sm:inline">{name || email}</span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button
          type="submit"
          className="text-xs bg-white/10 hover:bg-white/20 border border-white/30 rounded px-2 py-1"
          title="Cerrar sesión"
        >
          Salir
        </button>
      </form>
    </div>
  );
}
