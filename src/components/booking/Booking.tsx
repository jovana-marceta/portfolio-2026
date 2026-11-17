import { useState } from "react";
import type { Slot } from "../../../shared/slots.js";
import type { BookingInput, BookingResult } from "../../lib/api";
import { vars } from "../../lib/css";
import { Icon, type IconName } from "../ui/Icon";
import { SectionHeading } from "../ui/SectionHeading";
import { BookingDone } from "./BookingDone";
import { BookingForm } from "./BookingForm";
import { SlotPicker } from "./SlotPicker";
import { useAvailability } from "./useAvailability";
import "./Booking.css";

type Step = { name: "pick" } | { name: "details" } | { name: "done"; result: BookingResult; input: BookingInput };

export function Booking() {
  const { data, byDay, preview, removeSlot } = useAvailability();
  const [step, setStep] = useState<Step>({ name: "pick" });
  const [slot, setSlot] = useState<Slot | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, " ");
  const minutes = data?.slotMinutes ?? 30;

  const perks: [IconName, string][] = [
    ["clock", `${minutes}-minute video call`],
    ["calendar", "Shown in your own time zone"],
    ["mail", "Invite for Google, Apple & Outlook calendars"],
  ];

  return (
    <section className="section" id="book" aria-labelledby="bookTitle">
      <div className="wrap book">
        <div className="book-intro">
          <SectionHeading id="bookTitle" index="07" label="Book a call" lines={["Let's", <em className="serif">talk.</em>]} />
          <p className="rv">Pick a time that works for you. You'll get a calendar invite right away, and the slot shows up in my calendar too.</p>
          <ul>
            {perks.map(([icon, text], i) => (
              <li className="rv" style={vars({ "--i": i + 1 })} key={text}><span><Icon name={icon} strokeWidth={1.8} /></span>{text}</li>
            ))}
          </ul>
        </div>

        <div className="booker rv">
          {!data ? (
            <p style={{ color: "var(--mute)" }}>Loading available times…</p>
          ) : step.name === "pick" ? (
            <div className="booker-step on" key="pick">
              <SlotPicker byDay={byDay} timezoneLabel={tz} selected={slot} onSelect={setSlot} onContinue={() => setStep({ name: "details" })} />
            </div>
          ) : step.name === "details" && slot ? (
            <div className="booker-step on" key="details">
              <BookingForm
                slot={slot}
                minutes={minutes}
                preview={preview}
                onBack={() => setStep({ name: "pick" })}
                onTaken={(start) => { removeSlot(start); setSlot(null); setStep({ name: "pick" }); }}
                onBooked={(result, input) => { removeSlot(result.start); setSlot(null); setStep({ name: "done", result, input }); }}
              />
            </div>
          ) : step.name === "done" ? (
            <div className="booker-step on" key="done">
              <BookingDone result={step.result} input={step.input} timezoneLabel={tz} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
