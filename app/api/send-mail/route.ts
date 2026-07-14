import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { google } from "googleapis";
import { auth0 } from "@/lib/auth0";
import { getMailTemplates, getTemplateAttachment } from "@/lib/mail-templates";
import { getFloorPlanByAptName } from "@/lib/floor-plans";
import { getGmailToken } from "@/lib/gmail-tokens";
import { formatForEmail } from "@/lib/mail-utils";
import { requireNationsId } from "@/lib/nations";

async function requireAuth() {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return { userId: session.user.sub as string, nationsId: requireNationsId(session.user) };
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 403 });
  }
}

function resolvePlaceholders(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function extractBase64Images(
  html: string
): { html: string; attachments: Mail.Attachment[] } {
  const attachments: Mail.Attachment[] = [];
  let i = 0;
  const processed = html.replace(
    /src="data:([^;]+);base64,([^"]+)"/g,
    (_: string, mimeType: string, b64: string) => {
      const cid = `sig-img-${i}@lnd`;
      const ext = mimeType.split("/")[1] ?? "png";
      attachments.push({
        filename: `signature-image-${i}.${ext}`,
        content: Buffer.from(b64, "base64"),
        contentType: mimeType,
        cid,
      });
      i++;
      return `src="cid:${cid}"`;
    }
  );
  return { html: processed, attachments };
}

async function embedUrlImages(
  html: string
): Promise<{ html: string; attachments: Mail.Attachment[] }> {
  const attachments: Mail.Attachment[] = [];
  const seen = new Map<string, string>();
  let i = 0;
  const imgRegex = /<img([^>]*?)\bsrc="(https?:\/\/[^"]+)"([^>]*?)>/gi;
  const matches = [...html.matchAll(imgRegex)];
  let processedHtml = html;

  for (const match of matches) {
    const [full, before, url, after] = match;
    if (seen.has(url!)) {
      processedHtml = processedHtml.replace(
        full!,
        `<img${before}src="cid:${seen.get(url!)}"${after}>`
      );
      continue;
    }
    try {
      const res = await fetch(url!, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.startsWith("image/")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const ext = contentType.split("/")[1]?.split(";")[0] ?? "png";
      const cid = `url-img-${i}@lnd`;
      attachments.push({ filename: `img${i}.${ext}`, content: buffer, contentType, cid });
      seen.set(url!, cid);
      processedHtml = processedHtml.replace(
        full!,
        `<img${before}src="cid:${cid}"${after}>`
      );
      i++;
    } catch {
      // Leave original URL if unreachable
    }
  }
  return { html: processedHtml, attachments };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { to, bcc: useBcc, subject, templateId, variables } = (await request.json()) as {
    to: string | string[];
    bcc?: boolean;
    subject: string;
    templateId: string;
    variables: Record<string, string>;
  };

  const toList = (Array.isArray(to) ? to : [to]).filter(Boolean);

  if (!toList.length || !templateId)
    return Response.json({ error: "Missing required fields" }, { status: 400 });

  const gmailToken = await getGmailToken(auth.userId);
  if (!gmailToken)
    return Response.json(
      { error: "Gmail är inte anslutet. Gå till Profil för att ansluta ditt Google-konto." },
      { status: 400 }
    );

  const templates = await getMailTemplates(auth.nationsId);
  const template = templates.find((t) => t.id === templateId);
  if (!template) return Response.json({ error: "Template not found" }, { status: 404 });

  const formattedVars: Record<string, string> = Object.fromEntries(
    Object.entries(variables ?? {}).map(([k, v]) => [k, formatForEmail(k, v)])
  );

  const resolvedBody = resolvePlaceholders(template.message, formattedVars);
  const signatureHtml = gmailToken.signature ?? "";
  const plainSignature = signatureHtml ? stripHtml(signatureHtml) : "";
  const bodyText = plainSignature ? `${resolvedBody}\n\n${plainSignature}` : resolvedBody;

  const { html: afterBase64, attachments: base64Attachments } = extractBase64Images(signatureHtml);
  const { html: processedSignature, attachments: urlAttachments } =
    await embedUrlImages(afterBase64);

  const attachments: Mail.Attachment[] = [...base64Attachments, ...urlAttachments];

  const templateAttachment = await getTemplateAttachment(auth.nationsId, templateId);
  if (templateAttachment) {
    attachments.push({
      filename: templateAttachment.filename,
      content: templateAttachment.data,
      contentType: templateAttachment.contentType,
    });
  }

  const aptName = variables?.aptName;
  if (aptName) {
    const plan = await getFloorPlanByAptName(auth.nationsId, aptName);
    if (plan) {
      attachments.push({
        filename: `${aptName}.pdf`,
        content: plan.data,
        contentType: plan.contentType ?? "application/pdf",
      });
    }
  }

  const emailSubject = [subject || template.name, variables?.aptName].filter(Boolean).join(" ");

  const mailTo = useBcc ? gmailToken.email : toList.join(", ");
  const mailBcc = useBcc ? toList.join(", ") : undefined;

  const compiler = nodemailer.createTransport({ streamTransport: true, newline: "unix", buffer: true });
  const info = await compiler.sendMail({
    from: `"${gmailToken.name || gmailToken.email}" <${gmailToken.email}>`,
    to: mailTo,
    ...(mailBcc && { bcc: mailBcc }),
    subject: emailSubject,
    text: bodyText,
    html: [
      resolvedBody.replace(/\n/g, "<br>"),
      processedSignature ? `<br><br>${processedSignature}` : "",
    ].join(""),
    attachments,
  });

  const rawBuffer = info.message as Buffer;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: gmailToken.refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: rawBuffer.toString("base64url") },
  });

  return Response.json({ success: true });
}
