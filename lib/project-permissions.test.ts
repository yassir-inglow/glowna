import { describe, expect, it } from "vitest"

import {
  canWriteProject,
  getProjectPermission,
  getProjectPermissionLabel,
  isMissingProjectRoleSchemaError,
  isProjectPermissionHelperError,
  normalizeProjectRole,
} from "./project-permissions"

const members = [
  { id: "editor-1", role: "editor" },
  { id: "viewer-1", role: "viewer" },
]

describe("project permissions", () => {
  it("resolves the owner permission from the project owner id", () => {
    expect(
      getProjectPermission({
        ownerId: "owner-1",
        userId: "owner-1",
        members,
      }),
    ).toBe("owner")
  })

  it("resolves collaborator roles from membership rows", () => {
    expect(
      getProjectPermission({
        ownerId: "owner-1",
        userId: "editor-1",
        members,
      }),
    ).toBe("editor")

    expect(
      getProjectPermission({
        ownerId: "owner-1",
        userId: "viewer-1",
        members,
      }),
    ).toBe("viewer")
  })

  it("returns null when the user has no access", () => {
    expect(
      getProjectPermission({
        ownerId: "owner-1",
        userId: "outsider-1",
        members,
      }),
    ).toBeNull()
  })

  it("treats unknown role values as editor to preserve legacy rows", () => {
    expect(normalizeProjectRole("unexpected")).toBe("editor")
    expect(canWriteProject("owner")).toBe(true)
    expect(canWriteProject("editor")).toBe(true)
    expect(canWriteProject("viewer")).toBe(false)
  })

  it("maps permission labels to the share UI copy", () => {
    expect(getProjectPermissionLabel("owner")).toBe("Full access")
    expect(getProjectPermissionLabel("editor")).toBe("Can edit")
    expect(getProjectPermissionLabel("viewer")).toBe("Can view only")
  })

  it("detects missing-role schema errors from Supabase", () => {
    expect(
      isMissingProjectRoleSchemaError({
        code: "42703",
        message: 'column project_members.role does not exist',
      }),
    ).toBe(true)
  })

  it("detects helper-policy recursion and timeout errors", () => {
    expect(
      isProjectPermissionHelperError({
        code: "57014",
        message: "canceling statement due to statement timeout",
      }),
    ).toBe(true)

    expect(
      isProjectPermissionHelperError({
        code: "42P17",
        message: "infinite recursion detected in policy",
      }),
    ).toBe(true)

    expect(
      isProjectPermissionHelperError({
        code: "54001",
        message: "stack depth limit exceeded",
      }),
    ).toBe(true)
  })
})
