import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      image?: string | null;
      isGRC?: boolean;
    } & DefaultSession['user'];
  }
}