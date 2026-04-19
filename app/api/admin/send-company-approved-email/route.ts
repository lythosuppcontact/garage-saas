import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      companyName,
      recipientEmail,
      loginUrl,
    }: {
      companyName?: string;
      recipientEmail?: string;
      loginUrl?: string;
    } = body;

    if (!companyName || !recipientEmail) {
      return NextResponse.json(
        { error: "Données manquantes." },
        { status: 400 }
      );
    }

    const finalLoginUrl =
      loginUrl || `${process.env.APP_BASE_URL || "http://localhost:3000"}/login`;

    const response = await resend.emails.send({
      from: "Lytho Devis <onboarding@ton-domaine.com>",
      to: recipientEmail,
      subject: "Votre accès à Lytho Devis a été validé",
      html: `
        <div style="font-family: Arial, sans-serif; background: #0b0b0b; color: #ffffff; padding: 32px;">
          <div style="max-width: 560px; margin: 0 auto; background: #111111; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px;">
            <div style="font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.45);">
              Lytho Devis
            </div>

            <h1 style="margin: 16px 0 12px; font-size: 30px; line-height: 1.15;">
              Votre accès a été validé
            </h1>

            <p style="margin: 0 0 16px; color: rgba(255,255,255,0.72); font-size: 15px; line-height: 1.6;">
              Bonjour,
            </p>

            <p style="margin: 0 0 16px; color: rgba(255,255,255,0.72); font-size: 15px; line-height: 1.6;">
              Votre entreprise <strong style="color: #ffffff;">${companyName}</strong> a été approuvée.
              Vous pouvez maintenant vous connecter à votre espace et finaliser votre configuration.
            </p>

            <div style="margin: 28px 0;">
              <a href="${finalLoginUrl}" style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-weight: 700;">
                Se connecter
              </a>
            </div>

            <p style="margin: 0; color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.6;">
              Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error("Erreur envoi email validation entreprise:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'envoi de l'email." },
      { status: 500 }
    );
  }
}