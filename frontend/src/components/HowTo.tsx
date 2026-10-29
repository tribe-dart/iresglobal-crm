const stages = [
  {
    percent: "15%",
    name: "Inquiry",
    meaning: "They just got in touch. Website messages, Facebook leads, and Google form replies land here.",
  },
  {
    percent: "50%",
    name: "Discovery",
    meaning: "You are learning the land, the budget, and what they want to build.",
  },
  {
    percent: "75%",
    name: "Proposal",
    meaning: "A price has gone out. You are waiting on their decision.",
  },
  {
    percent: "100%",
    name: "Closed",
    meaning: "The contract is signed. The job can start.",
  },
];

const day = [
  "Open Probability Pipeline. New messages sit in the 15% column.",
  "Click the person’s card.",
  "Call, WhatsApp, or email them. Their phone and email are on the card in Client Repository.",
  "Write what you agreed in the note box, then press the send arrow.",
  "Move them to the next stage when the conversation moves forward.",
];

export default function HowTo() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <section className="rounded-lg border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-(--color-accent)">Start here</p>
        <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-(--color-text)">How to use the CRM</h3>
        <p className="mt-3 text-sm leading-7 text-(--color-text)">
          This is the sales board. Every person who wants an IRES home stays here, from the first message to a signed contract. You do not need to set anything up. Sign in, then follow the buttons on the left.
        </p>
      </section>

      <section className="rounded-lg border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-(--color-text)">A normal day</h3>
        <ol className="mt-4 space-y-3">
          {day.map((step, index) => (
            <li key={step} className="flex gap-3 text-sm leading-6 text-(--color-text)">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--color-accent) text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-(--color-text)">The four stages</h3>
        <p className="mt-2 text-sm leading-6 text-(--color-muted)">
          Probability Pipeline shows these as four columns, from first interest on the left to a signed job on the right. The number on a column is how many people are in it.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {stages.map((stage) => (
            <article key={stage.percent} className="rounded-lg border border-(--color-line) bg-(--color-bg) p-4">
              <p className="font-mono text-lg font-extrabold text-(--color-accent)">{stage.percent}</p>
              <h4 className="mt-1 text-sm font-bold text-(--color-text)">{stage.name}</h4>
              <p className="mt-1 text-sm leading-6 text-(--color-muted)">{stage.meaning}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <GuideBlock
          title="Probability Pipeline"
          body="This is the home screen. Each card is one person. Click a card to open them. Empty columns simply mean nobody is at that stage today."
        />
        <GuideBlock
          title="Client Repository"
          body="This is the full list. Click a row to open the person on the right. Change their stage with the menu in the Stage column, or with the four percentage buttons. Click their email to write to them. Click their phone to call. Type a follow-up in “Add progress note” and press the send arrow. Close Drawer hides that side panel."
        />
        <GuideBlock
          title="Rammed Earth Calculator"
          body="Use this when you are ready to give a price. Enter the person’s name and email. Slide the floor size. Pick one of the three build types. The price on the right changes as you do. Attach a floor plan if you have one, then press Generate Quote & Create Client Lead. They are added to the board at 50%, and they receive the estimate by email."
        />
        <GuideBlock
          title="Discovery Intake Form"
          body="Use this during a first conversation, once you know the site, the budget, and the timing. Fill in the form and press Submit Discovery. That person is placed at 50% Discovery."
        />
      </section>

      <section className="rounded-lg border border-(--color-line) bg-(--color-surface) p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-(--color-text)">The other buttons</h3>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-(--color-text)">
          <li>
            <strong>Add Client</strong>, at the top right, is for someone who called or walked in and is not on the board yet. Website enquiries, Facebook leads, and Google form replies appear on their own. You do not type those in.
          </li>
          <li>
            <strong>Search</strong> finds a person by name, phone, email, or a word in their notes.
          </li>
          <li>
            <strong>The round arrow</strong> reloads the board if something new has just come in.
          </li>
          <li>
            <strong>Export CRM CSV</strong>, at the bottom of this menu, downloads a spreadsheet of the clients.
          </li>
          <li>
            <strong>Sign out</strong> is under this menu. The sun or moon beside it switches between light and dark.
          </li>
        </ul>
      </section>
    </div>
  );
}

function GuideBlock({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-lg border border-(--color-line) bg-(--color-surface) p-5 shadow-xs">
      <h3 className="text-sm font-extrabold text-(--color-text)">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-(--color-text)">{body}</p>
    </article>
  );
}
