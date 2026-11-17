import type { ReactNode } from "react";
import { vars } from "../../lib/css";

interface Props {
  id: string;
  index: string;
  label: string;
  /** Lines of the heading; the last line usually ends in an <em className="serif"> accent word */
  lines: ReactNode[];
  /** Skip the reveal animation (for pinned sections) */
  static?: boolean;
}

/** "03 - Experience" tag + big heading whose lines slide up from a mask. */
export function SectionHeading({
  id,
  index,
  label,
  lines,
  static: isStatic,
}: Props) {
  return (
    <>
      <p className={`tag mono${isStatic ? "" : " rv"}`}>
        {index} - {label}
      </p>
      <h2 className='h2' id={id}>
        {isStatic
          ? lines.map((l, i) => (
              <span key={i}>
                {l}
                {i < lines.length - 1 ? " " : ""}
              </span>
            ))
          : lines.map((l, i) => (
              <span className='rv-mask' style={vars({ "--i": i })} key={i}>
                <span>{l}</span>
              </span>
            ))}
      </h2>
    </>
  );
}
