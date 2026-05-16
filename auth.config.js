import Google from "next-auth/providers/google";

export default {
  trustHost: true,
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
};
