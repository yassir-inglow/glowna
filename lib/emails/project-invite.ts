export function projectInviteEmail({
  projectName,
  inviterName,
  acceptUrl,
  isExistingUser,
}: {
  projectName: string
  inviterName: string
  acceptUrl: string
  isExistingUser: boolean
}) {
  const headline = isExistingUser
    ? `${inviterName} invited you to join "${projectName}"`
    : `${inviterName} invited you to collaborate on "${projectName}"`

  const cta = isExistingUser ? "Open project" : "Create account & join"

  const subtitle = isExistingUser
    ? "Click below to accept the invitation and start collaborating."
    : "You'll need to create a free Glowna account first, then you'll be added to the project automatically."

  return {
    subject: `You're invited to "${projectName}" on Glowna`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:40px 32px 32px;">
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Glowna</p>
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">${headline}</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#6b7280;">${subtitle}</p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 28px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:500;">${cta}</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#9ca3af;">If you weren't expecting this invitation, you can safely ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
