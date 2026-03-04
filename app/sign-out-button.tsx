"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button variant="ghost" size="xs" onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
