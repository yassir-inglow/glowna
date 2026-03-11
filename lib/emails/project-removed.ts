export function projectRemovedEmail({
  projectName,
  removerName,
  dashboardUrl,
}: {
  projectName: string
  removerName: string
  dashboardUrl: string
}) {
  return {
    subject: `You've been removed from "${projectName}" on Glowna`,
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
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#111827;">${removerName} removed you from "${projectName}"</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#6b7280;">You no longer have access to this project. If you think this was a mistake, reach out to the project owner.</p>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background:#FF004A;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:500;">Go to dashboard</a>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#9ca3af;">If you have any questions, contact the project owner directly.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
