import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/login",
  },
});

export const config = {
  matcher: ["/((?!auth|api/auth|_next|favicon\\.ico).*)"],
};