/** Shared B2B lead filter / badge option constants */

export const B2B_STATUS_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "follow_up", label: "Follow Up" },
  { value: "on_hold", label: "On Hold" },
  { value: "converted", label: "Converted" },
  { value: "not_interested", label: "Not Interested" },
];

export const B2B_PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export const B2B_PIPELINE_STAGE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "proposal", label: "Proposal" },
  { value: "negotiation", label: "Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export const B2B_LOST_REASON_OPTIONS = [
  { value: "not_interested", label: "Not Interested" },
  { value: "price", label: "Price" },
  { value: "competitor", label: "Competitor" },
  { value: "budget", label: "Budget" },
  { value: "timing", label: "Timing" },
  { value: "no_response", label: "No Response" },
  { value: "other", label: "Other" },
];

export const B2B_OPEN_STATUSES = ["created", "follow_up", "on_hold"];
export const NON_EDITABLE_STATUSES = ["converted", "not_interested"];
export const REOPENABLE_STATUSES = ["converted", "not_interested"];

export const B2B_STAGE_COLORS = {
  new: "#3b82f6",
  contacted: "#0ea5e9",
  qualified: "#8b5cf6",
  proposal: "#f59e0b",
  negotiation: "#f97316",
  won: "#22c55e",
  lost: "#ef4444",
};

export const B2B_STATUS_COLORS = {
  created: "#3b82f6",
  follow_up: "#8b5cf6",
  on_hold: "#f59e0b",
  converted: "#22c55e",
  not_interested: "#ef4444",
};
