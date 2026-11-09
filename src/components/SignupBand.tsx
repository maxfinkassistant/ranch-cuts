import SignupForm from "./SignupForm";
import { PLANNED } from "../data/partnerships";

/* The sign-up prompt that sits on the other pages: a headline, one line
   of why, and the zip + email form. Navy by default; `tone="paper"` where
   the page already ends on a navy panel. */
export default function SignupBand({
  source,
  title = "Not near a Ranch Cuts ranch yet?",
  children,
  tone = "navy",
  cta,
}: {
  source: string;
  title?: string;
  children?: React.ReactNode;
  tone?: "navy" | "paper";
  cta?: string;
}) {
  const dark = tone === "navy";
  return (
    <div className={"signup-band " + tone}>
      <div className="signup-band-text">
        <span className="tag">Get notified</span>
        <h2 className="d">{title}</h2>
        <p>
          {children ?? (
            <>
              We open one city at a time, wherever the most families ask. Tell us where you live and we'll email you once, the
              day a ranch and a butcher open near you. {PLANNED.length} metros are planned next.
            </>
          )}
        </p>
      </div>
      <SignupForm source={source} dark={dark} id={`band-${source}`} cta={cta} />
    </div>
  );
}
