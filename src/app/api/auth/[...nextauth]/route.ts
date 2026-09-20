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
      if (!user.email) return false;

      const allowedEmails = (process.env.ALLOWED_GRC_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email !== '');

      if (allowedEmails.length > 0) {
        const isAuthorized = allowedEmails.includes(user.email.toLowerCase());
        if (!isAuthorized) {
          console.warn(`Unauthorized login attempt by: ${user.email}`);
          return false;
        }
      }

      return true;
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