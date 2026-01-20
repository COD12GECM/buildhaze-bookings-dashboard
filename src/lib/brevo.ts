const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  sender?: {
    email: string;
    name: string;
  };
  replyTo?: EmailRecipient;
  tags?: string[];
}

interface BrevoResponse {
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<BrevoResponse> {
  if (!BREVO_API_KEY) {
    console.error('BREVO_API_KEY not configured');
    return { error: 'Email service not configured' };
  }

  const {
    to,
    subject,
    htmlContent,
    textContent,
    sender = { email: 'bookingsbuildhaze@gmail.com', name: 'BuildHaze' },
    replyTo,
    tags,
  } = params;

  try {
    const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        to,
        subject,
        htmlContent,
        textContent,
        replyTo,
        tags,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API error:', errorData);
      return { error: errorData.message || 'Failed to send email' };
    }

    const data = await response.json();
    return { messageId: data.messageId };
  } catch (error) {
    console.error('Brevo send error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Email Templates

export function generateAdminInviteEmail(params: {
  recipientName: string;
  inviteCode: string;
  inviterName: string;
  businessName?: string;
  appUrl: string;
}): { subject: string; htmlContent: string } {
  const { recipientName, inviteCode, inviterName, appUrl } = params;
  const inviteLink = `${appUrl}/invite/${inviteCode}`;

  return {
    subject: 'You\'ve been invited to BuildHaze Dashboard',
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BuildHaze Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                <span style="color: #60a5fa;">build</span>haze.
              </h1>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Booking & Management Dashboard</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Welcome, ${recipientName}!</h2>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${inviterName} has invited you to join BuildHaze as a <strong>Business Admin</strong>. 
                Click the button below to set up your account and start managing your bookings.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Or copy this link: <br>
                <a href="${inviteLink}" style="color: #3b82f6; word-break: break-all;">${inviteLink}</a>
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  <strong>Note:</strong> This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} BuildHaze. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function generateTeamInviteEmail(params: {
  recipientName: string;
  inviteCode: string;
  inviterName: string;
  businessName: string;
  role: 'STAFF' | 'PROVIDER';
  appUrl: string;
}): { subject: string; htmlContent: string } {
  const { recipientName, inviteCode, inviterName, businessName, role, appUrl } = params;
  const inviteLink = `${appUrl}/invite/${inviteCode}`;
  const roleLabel = role === 'STAFF' ? 'Staff Member' : 'Service Provider';

  return {
    subject: `You've been invited to join ${businessName}`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Team Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${businessName}</h1>
              <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Powered by BuildHaze</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Welcome to the team, ${recipientName}!</h2>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                ${inviterName} has invited you to join <strong>${businessName}</strong> as a <strong>${roleLabel}</strong>.
              </p>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Click the button below to set up your account and access the dashboard.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Join Team
                </a>
              </div>
              
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Or copy this link: <br>
                <a href="${inviteLink}" style="color: #10b981; word-break: break-all;">${inviteLink}</a>
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <p style="color: #64748b; font-size: 14px; margin: 0;">
                  <strong>Note:</strong> This invitation expires in 7 days. If you didn't expect this email, please contact ${businessName}.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} BuildHaze. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function generateBookingConfirmationEmail(params: {
  clientName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  businessName: string;
  businessPhone?: string;
  cancelLink?: string;
}): { subject: string; htmlContent: string } {
  const { clientName, serviceName, providerName, date, time, businessName, businessPhone, cancelLink } = params;

  return {
    subject: `Booking Confirmed - ${serviceName} on ${date}`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center;">
              <div style="width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 30px;">✓</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Booking Confirmed!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${clientName},
              </p>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your appointment has been confirmed. Here are the details:
              </p>
              
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #94a3b8; font-size: 14px;">Service</span><br>
                      <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${serviceName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #94a3b8; font-size: 14px;">Provider</span><br>
                      <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${providerName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                      <span style="color: #94a3b8; font-size: 14px;">Date</span><br>
                      <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${date}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <span style="color: #94a3b8; font-size: 14px;">Time</span><br>
                      <span style="color: #1e293b; font-size: 16px; font-weight: 600;">${time}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${cancelLink ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="${cancelLink}" style="color: #ef4444; font-size: 14px; text-decoration: underline;">
                  Need to cancel or reschedule?
                </a>
              </div>
              ` : ''}
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions, please contact us${businessPhone ? ` at ${businessPhone}` : ''}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${businessName}</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Powered by BuildHaze
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function generateBookingCancellationEmail(params: {
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName: string;
  reason?: string;
}): { subject: string; htmlContent: string } {
  const { clientName, serviceName, date, time, businessName, reason } = params;

  return {
    subject: `Booking Cancelled - ${serviceName} on ${date}`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Booking Cancelled</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${clientName},
              </p>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Your appointment has been cancelled. Here were the details:
              </p>
              
              <div style="background-color: #fef2f2; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
                <p style="color: #1e293b; margin: 0;">
                  <strong>${serviceName}</strong><br>
                  ${date} at ${time}
                </p>
                ${reason ? `<p style="color: #64748b; margin: 15px 0 0 0; font-size: 14px;">Reason: ${reason}</p>` : ''}
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                We hope to see you again soon. Feel free to book a new appointment at your convenience.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${businessName}</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Powered by BuildHaze
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

export function generateBookingReminderEmail(params: {
  clientName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  businessName: string;
  businessAddress?: string;
}): { subject: string; htmlContent: string } {
  const { clientName, serviceName, providerName, date, time, businessName, businessAddress } = params;

  return {
    subject: `Reminder: ${serviceName} tomorrow at ${time}`,
    htmlContent: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f7fa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7fa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">⏰ Appointment Reminder</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hi ${clientName},
              </p>
              
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                This is a friendly reminder about your upcoming appointment:
              </p>
              
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
                <p style="color: #1e293b; margin: 0; font-size: 18px; font-weight: 600;">
                  ${serviceName}
                </p>
                <p style="color: #64748b; margin: 10px 0 0 0;">
                  with ${providerName}<br>
                  📅 ${date} at ${time}
                </p>
                ${businessAddress ? `<p style="color: #64748b; margin: 10px 0 0 0;">📍 ${businessAddress}</p>` : ''}
              </div>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                We look forward to seeing you!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #1e293b; font-size: 14px; font-weight: 600; margin: 0 0 5px 0;">${businessName}</p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Powered by BuildHaze
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };
}

// Send invitation email
export async function sendAdminInvitation(params: {
  email: string;
  name: string;
  inviteCode: string;
  inviterName: string;
}): Promise<BrevoResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, htmlContent } = generateAdminInviteEmail({
    recipientName: params.name,
    inviteCode: params.inviteCode,
    inviterName: params.inviterName,
    appUrl,
  });

  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject,
    htmlContent,
    tags: ['admin-invitation'],
  });
}

export async function sendTeamInvitation(params: {
  email: string;
  name: string;
  inviteCode: string;
  inviterName: string;
  businessName: string;
  role: 'STAFF' | 'PROVIDER';
}): Promise<BrevoResponse> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { subject, htmlContent } = generateTeamInviteEmail({
    recipientName: params.name,
    inviteCode: params.inviteCode,
    inviterName: params.inviterName,
    businessName: params.businessName,
    role: params.role,
    appUrl,
  });

  return sendEmail({
    to: [{ email: params.email, name: params.name }],
    subject,
    htmlContent,
    tags: ['team-invitation', params.role.toLowerCase()],
  });
}

export async function sendBookingConfirmation(params: {
  clientEmail: string;
  clientName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  businessName: string;
  businessPhone?: string;
  cancelLink?: string;
}): Promise<BrevoResponse> {
  const { subject, htmlContent } = generateBookingConfirmationEmail({
    clientName: params.clientName,
    serviceName: params.serviceName,
    providerName: params.providerName,
    date: params.date,
    time: params.time,
    businessName: params.businessName,
    businessPhone: params.businessPhone,
    cancelLink: params.cancelLink,
  });

  return sendEmail({
    to: [{ email: params.clientEmail, name: params.clientName }],
    subject,
    htmlContent,
    tags: ['booking-confirmation'],
  });
}

export async function sendBookingCancellation(params: {
  clientEmail: string;
  clientName: string;
  serviceName: string;
  date: string;
  time: string;
  businessName: string;
  reason?: string;
}): Promise<BrevoResponse> {
  const { subject, htmlContent } = generateBookingCancellationEmail({
    clientName: params.clientName,
    serviceName: params.serviceName,
    date: params.date,
    time: params.time,
    businessName: params.businessName,
    reason: params.reason,
  });

  return sendEmail({
    to: [{ email: params.clientEmail, name: params.clientName }],
    subject,
    htmlContent,
    tags: ['booking-cancellation'],
  });
}

export async function sendBookingReminder(params: {
  clientEmail: string;
  clientName: string;
  serviceName: string;
  providerName: string;
  date: string;
  time: string;
  businessName: string;
  businessAddress?: string;
}): Promise<BrevoResponse> {
  const { subject, htmlContent } = generateBookingReminderEmail({
    clientName: params.clientName,
    serviceName: params.serviceName,
    providerName: params.providerName,
    date: params.date,
    time: params.time,
    businessName: params.businessName,
    businessAddress: params.businessAddress,
  });

  return sendEmail({
    to: [{ email: params.clientEmail, name: params.clientName }],
    subject,
    htmlContent,
    tags: ['booking-reminder'],
  });
}
