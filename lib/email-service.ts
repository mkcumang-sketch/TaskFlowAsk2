interface TaskEmailPayload {
  to: string;
  recipientName: string;
  taskTitle: string;
  taskId: string;
  priority: string;
  dueAt?: Date | string | null;
  actorName: string;
  type: "TASK_ASSIGNED" | "TASK_REVIEW_SUBMITTED" | "TASK_APPROVED" | "TASK_REJECTED";
  note?: string;
}

export async function sendTaskNotificationEmail(payload: TaskEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "TaskFlow <notifications@taskflow.dev>";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Agar Resend API key configured nahi hai toh gracefully skip karo
  if (!apiKey) {
    console.log(`[EMAIL SKIPPED - NO API KEY] Type: ${payload.type} To: ${payload.to}`);
    return { success: false, reason: "NO_RESEND_KEY" };
  }

  const taskUrl = `${baseUrl}/tasks/${payload.taskId}`;

  let subject = "";
  let heading = "";
  let accentColor = "#2563eb"; // Blue

  switch (payload.type) {
    case "TASK_ASSIGNED":
      subject = `[New Task Assigned] ${payload.taskTitle}`;
      heading = "You have been assigned a new task";
      break;
    case "TASK_REVIEW_SUBMITTED":
      subject = `[Review Requested] ${payload.taskTitle}`;
      heading = "Work submitted for your approval";
      accentColor = "#d97706"; // Amber
      break;
    case "TASK_APPROVED":
      subject = `[Task Approved] ${payload.taskTitle}`;
      heading = "Your task has been approved!";
      accentColor = "#16a34a"; // Green
      break;
    case "TASK_REJECTED":
      subject = `[Changes Requested] ${payload.taskTitle}`;
      heading = "Changes requested on your submission";
      accentColor = "#dc2626"; // Red
      break;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; padding: 32px;">
          <div style="font-size: 13px; font-weight: 700; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;">TASKFLOW WORKFLOW</div>
          <h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 8px;">${heading}</h2>
          <p style="font-size: 14px; color: #475569;">Hello ${payload.recipientName},</p>
          
          <div style="background-color: #f1f5f9; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${payload.taskTitle}</p>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
              Priority: <strong>${payload.priority}</strong> &bull; Action by: <strong>${payload.actorName}</strong>
            </p>
            ${payload.note ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #334155; font-style: italic;">&ldquo;${payload.note}&rdquo;</p>` : ""}
          </div>

          <a href="${taskUrl}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; margin-top: 12px;">
            Open Task Details
          </a>

          <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Automated notification sent from TaskFlow Platform.
          </p>
        </div>
      </body>
    </html>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error) {
    console.error("Failed to send notification email:", error);
    return { success: false, error: String(error) };
  }
}