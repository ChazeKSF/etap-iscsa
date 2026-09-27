import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy_id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
  async signIn({ user }) {
    // Check if the user has an email and if it ends with @etapinc.com
    const isAllowedDomain = user.email?.toLowerCase().endsWith("@etapinc.com");

    if (isAllowedDomain) {
      return true; // Allow access
    }

    return false; // Deny access for any other domain
  },
    async session({ session }) {
      if (session.user) {
        session.user.isGRC = true;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-1234567890',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };