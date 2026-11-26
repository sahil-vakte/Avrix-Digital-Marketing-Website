/** Default pipelines for new applications, by kind. */
export const STAGE_PRESETS: Record<string, { name: string; color: string; isWon?: boolean; isLost?: boolean }[]> = {
  sales: [
    { name: "New", color: "#3563f2" }, { name: "Contacted", color: "#0ea5e9" }, { name: "Qualified", color: "#8b5cf6" },
    { name: "Proposal sent", color: "#f97316" }, { name: "Won", color: "#16a34a", isWon: true }, { name: "Lost", color: "#9ca3af", isLost: true },
  ],
  clinic: [
    { name: "New enquiry", color: "#3563f2" }, { name: "Contacted", color: "#0ea5e9" }, { name: "Appointment booked", color: "#f59e0b" },
    { name: "Seen", color: "#16a34a", isWon: true }, { name: "Not proceeding", color: "#9ca3af", isLost: true },
  ],
  medicolegal: [
    { name: "New instruction", color: "#3563f2" }, { name: "Acknowledged", color: "#0ea5e9" }, { name: "Appointment booked", color: "#f59e0b" },
    { name: "Report sent", color: "#16a34a", isWon: true }, { name: "Declined", color: "#9ca3af", isLost: true },
  ],
  agency: [
    { name: "New", color: "#3563f2" }, { name: "Contacted", color: "#0ea5e9" }, { name: "Qualified", color: "#8b5cf6" },
    { name: "Proposal sent", color: "#f97316" }, { name: "Won", color: "#16a34a", isWon: true }, { name: "Lost", color: "#9ca3af", isLost: true },
    { name: "Spam", color: "#6b7280", isLost: true },
  ],
};

