import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Slot } from "../../../shared/slots.js";
import { BOOKING_TOPICS } from "../../data/profile";
import {
  ApiError,
  api,
  type BookingInput,
  type BookingResult,
} from "../../lib/api";
import { fmtLong, isEmail } from "../../lib/format";

interface Props {
  slot: Slot;
  minutes: number;
  preview: boolean;
  onBack: () => void;
  onBooked: (result: BookingResult, input: BookingInput) => void;
  onTaken: (start: string) => void;
}

/** Step 2: visitor details → POST /api/bookings */
export function BookingForm({
  slot,
  minutes,
  preview,
  onBack,
  onBooked,
  onTaken,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: BOOKING_TOPICS[0],
    note: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Please enter your name.");
      nameRef.current?.focus();
      return;
    }
    if (!isEmail(form.email)) {
      setError("Please enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    const input: BookingInput = { ...form, start: slot.start };
    setBusy(true);
    try {
      const result = preview
        ? { start: slot.start, end: slot.end, preview: true }
        : await api<BookingResult>("/api/bookings", "POST", input);
      onBooked(result, input);
    } catch (ex) {
      const err = ex as ApiError;
      setError(err.message || "Something went wrong - please try again.");
      if (err.status === 409) setTimeout(() => onTaken(slot.start), 1600);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className='picked'>
        <span>
          {fmtLong(slot.start)} · {minutes} min
        </span>
        <button type='button' onClick={onBack}>
          Change
        </button>
      </div>
      <form className='form' onSubmit={submit} noValidate>
        <div className='field'>
          <label htmlFor='bName'>Your name</label>
          <input
            id='bName'
            ref={nameRef}
            autoComplete='name'
            required
            maxLength={100}
            value={form.name}
            onChange={set("name")}
          />
        </div>
        <div className='field'>
          <label htmlFor='bEmail'>Email</label>
          <input
            id='bEmail'
            ref={emailRef}
            type='email'
            autoComplete='email'
            required
            maxLength={160}
            value={form.email}
            onChange={set("email")}
          />
        </div>
        <div className='field'>
          <label htmlFor='bTopic'>What's it about?</label>
          <select id='bTopic' value={form.topic} onChange={set("topic")}>
            {BOOKING_TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className='field'>
          <label htmlFor='bNote'>
            Anything I should know?{" "}
            <span style={{ color: "var(--mute)", fontWeight: 500 }}>
              (optional)
            </span>
          </label>
          <textarea
            id='bNote'
            maxLength={1000}
            value={form.note}
            onChange={set("note")}
          />
        </div>
        {/* Honeypot for bots */}
        <input
          className='hp'
          name='website'
          tabIndex={-1}
          autoComplete='off'
          aria-hidden='true'
          value={form.website}
          onChange={set("website")}
        />
        <p className='form-err' role='alert'>
          {error}
        </p>
        <button
          className='btn btn-primary'
          type='submit'
          disabled={busy}
          style={{ justifyContent: "center" }}>
          {busy ? "Booking…" : "Confirm booking"}
        </button>
      </form>
    </>
  );
}
