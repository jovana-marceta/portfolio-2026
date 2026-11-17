import { PROFILE } from "../../data/profile";
import type { BookingInput, BookingResult } from "../../lib/api";
import { fmtLong } from "../../lib/format";
import { Icon } from "../ui/Icon";

const gcalDate = (iso: string) => iso.replace(/[-:]|\.\d{3}/g, "");

/** Step 3: confirmation with calendar links. */
export function BookingDone({ result, input, timezoneLabel }: { result: BookingResult; input: BookingInput; timezoneLabel: string }) {
  const details = `Topic: ${input.topic}${result.meetingLink ? `\nJoin: ${result.meetingLink}` : ""}`;
  const gcal =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(`Call with ${PROFILE.name}`)}` +
    `&dates=${gcalDate(result.start)}/${gcalDate(result.end)}` +
    `&details=${encodeURIComponent(details)}` +
    (result.meetingLink ? `&location=${encodeURIComponent(result.meetingLink)}` : "") +
    `&add=${encodeURIComponent(PROFILE.email)}`;

  return (
    <div className="done">
      <div className="check"><Icon name="check" /></div>
      <h3>You're booked!</h3>
      <p>{fmtLong(result.start)} ({timezoneLabel}). See you then, {input.name.trim().split(" ")[0]}!</p>
      <div className="btns">
        <a className="btn btn-primary" href={gcal} target="_blank" rel="noopener">Add to Google Calendar ↗</a>
        {result.ics && <a className="btn btn-ghost" href={result.ics}>Apple / Outlook (.ics)</a>}
        {result.meetingLink && <a className="btn btn-ghost" href={result.meetingLink} target="_blank" rel="noopener">Meeting link ↗</a>}
      </div>
      <p className="note-preview">
        {result.preview
          ? "Preview mode — nothing was saved. Bookings are stored once the API server is running."
          : `A confirmation is in my calendar. Need to cancel? Reply to the invite or email ${PROFILE.email}.`}
      </p>
    </div>
  );
}
