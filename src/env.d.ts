import type { Session, User } from "better-auth";

declare global {
  interface ImportMetaEnv {
    readonly BETTER_AUTH_URL?: string;
    readonly BETTER_AUTH_SECRET?: string;
    readonly GITHUB_CLIENT_ID?: string;
    readonly GITHUB_CLIENT_SECRET?: string;
    readonly MICROSOFT_CLIENT_ID?: string;
    readonly MICROSOFT_CLIENT_SECRET?: string;
    readonly COMMENT_ADMIN_EMAILS?: string;
  }

  namespace App {
    interface Locals {
      user: User | null;
      session: Session | null;
    }
  }
}

export {};
