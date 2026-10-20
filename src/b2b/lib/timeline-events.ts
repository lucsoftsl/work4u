// Every timeline event type (the API's audit `action`) the job timeline can show. The sentence for each lives in
// `describeTimelineEntry` (workspace.ts) under `b2b.timeline.*`; timeline-events.test.ts fails when one has no text in en/ro/es.
export const TIMELINE_ACTIONS = [
  "job.created", "job.draft_saved", "job.promoted", "job.updated", "job.status_changed", "job.transitioned",
  "job.assigned", "job.assigned_with_override", "job.unassigned", "job.rescheduled", "job.rescheduled_with_override",
  "job.review_requested", "job.review_started", "job.review_approved", "job.review_sent_back", "job.approved", "job.sent_back",
  "job.approved_without_evidence", "job.attachment_added", "job.attachment_removed", "job.photo_added", "job.note_added",
  "job.journey_started", "job.arrived", "job.started", "job.completed", "job.blocked", "job.resumed",
  "job.paused", "job.work_resumed", "job.resumed_work", "job.work_time_corrected",
  "job.status_undone", "job.pause_undone", "job.resume_undone",
  "job.part_added", "job.part_updated", "job.part_removed", "job.part_change_undone",
  "job.checklist_item_changed", "job.checklist_item_undone",
] as const;
export type TimelineAction = (typeof TIMELINE_ACTIONS)[number];

/** Events that are a plain statement: action -> [key, English text]. */
export const SIMPLE_EVENTS: Partial<Record<string, readonly [string, string]>> = {
  "job.review_requested": ["b2b.timeline.ev.reviewRequested", "Review requested"],
  "job.review_approved": ["b2b.timeline.ev.reviewApproved", "Review approved"],
  "job.approved": ["b2b.timeline.ev.reviewApproved", "Review approved"],
  "job.review_sent_back": ["b2b.timeline.ev.sentBack", "Sent back for changes"],
  "job.sent_back": ["b2b.timeline.ev.sentBack", "Sent back for changes"],
  "job.approved_without_evidence": ["b2b.timeline.ev.approvedNoEvidence", "Approved without the required evidence"],
  "job.journey_started": ["b2b.timeline.ev.journeyStarted", "Journey started"],
  "job.arrived": ["b2b.timeline.ev.arrived", "Arrived"],
  "job.started": ["b2b.timeline.ev.started", "Started"],
  "job.completed": ["b2b.timeline.ev.completed", "Completed"],
  "job.blocked": ["b2b.timeline.ev.blocked", "Blocked"],
  "job.resumed": ["b2b.timeline.ev.resumed", "Resumed"],
  "job.paused": ["b2b.timeline.ev.paused", "Work paused"],
  "job.work_resumed": ["b2b.timeline.ev.workResumed", "Work resumed"],
  "job.resumed_work": ["b2b.timeline.ev.workResumed", "Work resumed"],
  "job.work_time_corrected": ["b2b.timeline.ev.timeCorrected", "Work time corrected"],
  "job.status_undone": ["b2b.timeline.ev.statusUndone", "Status change undone"],
  "job.pause_undone": ["b2b.timeline.ev.pauseUndone", "Pause undone"],
  "job.resume_undone": ["b2b.timeline.ev.resumeUndone", "Resume undone"],
  "job.part_added": ["b2b.timeline.ev.partAdded", "Part added"],
  "job.part_updated": ["b2b.timeline.ev.partUpdated", "Part updated"],
  "job.part_removed": ["b2b.timeline.ev.partRemoved", "Part removed"],
  "job.part_change_undone": ["b2b.timeline.ev.partUndone", "Part change undone"],
  "job.checklist_item_changed": ["b2b.timeline.ev.checklistChanged", "Checklist updated"],
  "job.checklist_item_undone": ["b2b.timeline.ev.checklistUndone", "Checklist change undone"],
};
