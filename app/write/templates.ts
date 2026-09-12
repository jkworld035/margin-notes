export const TEMPLATES: { id: string; label: string; description: string; content: string }[] = [
  {
    id: "personal-essay",
    label: "Personal Essay",
    description: "A reflective piece built around a moment that changed your thinking.",
    content: `## The moment

Start with a specific scene — where you were, what you noticed, what happened. Keep it concrete.

## The context

Zoom out. Why does this moment matter? What was going on in your life or thinking at the time?

## The turn

What shifted? What did you realize, or what changed after this moment?

## The reflection

What does this mean now, looking back? What would you tell someone in your earlier situation?`,
  },
  {
    id: "short-story",
    label: "Short Story",
    description: "A simple five-part shape for fiction: setup, spark, rise, peak, landing.",
    content: `## Setting & character

Where are we, and who is this about? Introduce your protagonist and their world in a few lines.

## The inciting incident

What happens that disrupts the ordinary world and sets the story moving?

## Rising action

What does the character try, and what gets in the way? Build tension here.

## The climax

The turning point — the moment everything comes to a head.

## Resolution

What's different now? How does the character (or their situation) end up changed?`,
  },
  {
    id: "poem",
    label: "Poem (free verse starter)",
    description: "A loose prompt structure to get words on the page — break the rules freely.",
    content: `*A first line — an image, not an explanation.*

*A second stanza that turns the image somewhere unexpected.*

*A line that repeats or echoes something from earlier.*

*An ending that doesn't explain itself.*`,
  },
  {
    id: "listicle",
    label: "Listicle",
    description: "A scannable numbered-points piece with a hook and a wrap-up.",
    content: `Open with why this list matters — what problem it solves or curiosity it satisfies.

## 1. First point

Explain it in a short paragraph.

## 2. Second point

Explain it in a short paragraph.

## 3. Third point

Explain it in a short paragraph.

## Wrapping up

A short closing thought tying the points together.`,
  },
  {
    id: "how-to",
    label: "How-To Guide",
    description: "A practical step-by-step structure with a clear promise up front.",
    content: `## What you'll accomplish

One or two sentences on the outcome this guide delivers.

## What you'll need

- Item or prerequisite one
- Item or prerequisite two

## Step 1: [First action]

Explain what to do and why it matters.

## Step 2: [Next action]

Explain what to do and why it matters.

## Step 3: [Final action]

Explain what to do and why it matters.

## A few tips

Anything that trips people up, or ways to go further.`,
  },
  {
    id: "opinion",
    label: "Opinion Piece",
    description: "A structured argument: claim, support, counterpoint, close.",
    content: `## The claim

State your position clearly and directly in the first lines — don't bury it.

## Why it matters

Give the reader a reason to care before you argue the case.

## The case for it

Your strongest supporting point, with a concrete example.

## The other side

Acknowledge the strongest counterargument — and explain why you still hold your position.

## The close

Leave the reader with something to think about, or a call to action.`,
  },
];