// Starting structures for new books. Each template creates the chapters below,
// with a short writing prompt in each. Authors can rename, delete, add and
// reorder chapters freely — a template is only a starting point.
//
// Note: for paid books the FIRST chapter is the free preview, so every
// template opens with real content rather than front matter.

export type TemplateChapter = { title: string; prompt: string };

export type BookTemplate = {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  chapters: TemplateChapter[];
};

type Row = [string, string];

function t(id: string, label: string, icon: string, tagline: string, rows: Row[]): BookTemplate {
  return { id, label, icon, tagline, chapters: rows.map(([title, prompt]) => ({ title, prompt })) };
}

export const BOOK_TEMPLATES: BookTemplate[] = [
  t("self-improvement", "Self-Improvement", "🌱", "Build better habits and a stronger mindset", [
    ["Introduction: Why Change Matters", "Open with a relatable struggle, then promise what readers will be able to do by the end."],
    ["Where You Are Now", "Help readers honestly assess their current habits, strengths and blind spots."],
    ["The Mindset Shift", "Explain the core belief readers need to change, with a short story or example."],
    ["Habits That Stick", "Teach your main method for building habits, step by step."],
    ["When Things Go Wrong", "Cover setbacks, relapses and how to restart without guilt."],
    ["Your 30-Day Plan", "Give a clear week-by-week action plan readers can follow."],
    ["Stories of Real Change", "Share two or three short examples of people applying your ideas."],
    ["Key Takeaways & Next Steps", "Summarise the main lessons and tell readers exactly what to do next."],
  ]),
  t("motivation", "Motivation & Inspiration", "🔥", "Inspire readers to take action", [
    ["Introduction: The Spark", "Begin with a moment that made you or someone else decide to change."],
    ["Finding Your Why", "Guide readers to the reason behind their goals."],
    ["Facing Fear", "Describe the fears that hold people back and how to move through them."],
    ["Discipline Over Mood", "Show how to keep going on days when motivation is missing."],
    ["Learning From Failure", "Share failures that became turning points."],
    ["Stories That Inspire", "Tell short, true stories that prove your message."],
    ["Daily Practices", "Offer small routines readers can start today."],
    ["A Call to Action", "End with a clear, encouraging challenge for the reader."],
  ]),
  t("business", "Business & Entrepreneurship", "💼", "Strategy, startups and growth", [
    ["Introduction: The Opportunity", "State the problem your book solves and who it is for."],
    ["The Problem Worth Solving", "Define the customer problem and why it matters now."],
    ["Know Your Market", "Explain how to research customers, competitors and demand."],
    ["The Core Framework", "Present your main model or method in a simple, repeatable form."],
    ["Strategy & Positioning", "Show how to choose a position that stands out."],
    ["The Execution Playbook", "Break the work into concrete steps and responsibilities."],
    ["Case Studies", "Walk through real or realistic examples, including what went wrong."],
    ["Mistakes to Avoid", "List the most common errors and how to spot them early."],
    ["Metrics That Matter", "Explain which numbers to track and what they tell you."],
    ["Conclusion & Roadmap", "Summarise and give readers a 90-day plan."],
  ]),
  t("finance", "Finance & Investing", "💰", "Money, saving and investing", [
    ["Introduction: Your Money Story", "Start with why money feels confusing and what readers will learn."],
    ["Budgeting Basics", "Teach a simple budgeting method with a worked example."],
    ["Saving & Emergency Funds", "Explain how much to save and where to keep it."],
    ["Understanding Debt", "Cover good vs. bad debt and a plan to pay it down."],
    ["Introduction to Investing", "Explain core ideas such as risk, return and time in plain language."],
    ["Building a Portfolio", "Show how to choose a mix of investments for a goal."],
    ["Mistakes to Avoid", "Describe common emotional and practical money mistakes."],
    ["Planning for the Long Term", "Cover retirement, insurance and goals over decades."],
    ["Important Note", "State clearly that the book is educational and not personalised financial advice."],
  ]),
  t("fiction", "Fiction / Novel", "📖", "A classic story structure for novels", [
    ["Prologue", "Hook readers with a scene that hints at the story's central question."],
    ["Chapter 1: The Ordinary World", "Introduce your main character and the life they know."],
    ["Chapter 2: The Disruption", "Break the routine with an event that changes everything."],
    ["Chapter 3: Into the Unknown", "Send your character into a new situation with new rules."],
    ["Chapter 4: Rising Stakes", "Add obstacles, allies and enemies; raise what is at risk."],
    ["Chapter 5: The Darkest Hour", "Take your character to their lowest point."],
    ["Chapter 6: The Turning Point", "Show the choice or discovery that changes the direction."],
    ["Chapter 7: The Final Challenge", "Bring the central conflict to its peak."],
    ["Epilogue", "Show how the world looks after the story ends."],
    ["Acknowledgements", "Thank the people who helped you write this book."],
    ["About the Author", "Write a short, friendly author bio."],
  ]),
  t("romance", "Romance", "💕", "Love stories with heart", [
    ["Meet the Leads", "Introduce both main characters and what each is missing."],
    ["The First Meeting", "Create a memorable first encounter full of tension or charm."],
    ["Growing Closer", "Show moments that build connection and chemistry."],
    ["The First Spark", "Write the moment they both realise this is something more."],
    ["The Conflict", "Introduce the fear, secret or circumstance that pushes them apart."],
    ["Apart", "Show how each character struggles without the other."],
    ["The Realisation", "Let each character understand what they truly want."],
    ["The Grand Gesture", "Write the scene where one of them fights for the relationship."],
    ["Happily Ever After", "Resolve the story with an earned, satisfying ending."],
    ["Epilogue", "Give readers a glimpse of life afterwards."],
  ]),
  t("mystery", "Mystery & Thriller", "🔍", "Clues, twists and suspense", [
    ["Opening Hook", "Begin with a crime, a disappearance or a shocking discovery."],
    ["Meet the Investigator", "Introduce your detective and what drives them."],
    ["The Case Begins", "Lay out the facts, the victim and the first suspects."],
    ["The First Clue", "Plant a clue that readers can follow."],
    ["Suspects & Secrets", "Give each suspect a motive and something to hide."],
    ["The Red Herring", "Lead readers confidently toward the wrong answer."],
    ["The Major Twist", "Overturn what readers believed so far."],
    ["The Confrontation", "Put the investigator face to face with the truth."],
    ["The Reveal", "Explain how the clues fit together."],
    ["Epilogue", "Show the aftermath for the characters."],
  ]),
  t("fantasy", "Fantasy", "🐉", "Worlds of magic and adventure", [
    ["Prologue: The Legend", "Open with a myth, prophecy or event from the world's past."],
    ["The Hero's Ordinary Life", "Show your hero's home and what they believe about the world."],
    ["The Call to Adventure", "Send the hero a challenge they cannot ignore."],
    ["Crossing the Threshold", "Take them into the unfamiliar part of your world."],
    ["Allies & Enemies", "Introduce companions, rivals and the force opposing them."],
    ["The Trials", "Test the hero with obstacles that build their skills."],
    ["The Revelation", "Reveal a truth that changes the meaning of the journey."],
    ["The Final Battle", "Stage the largest conflict of the book."],
    ["The Return", "Show how the hero and the world have changed."],
  ]),
  t("scifi", "Science Fiction", "🚀", "Technology, futures and big ideas", [
    ["The World as It Is", "Show your setting and what is different from today."],
    ["The Discovery", "Introduce the technology, event or secret at the centre of the story."],
    ["The Rules of This World", "Explain how your science or technology works, simply."],
    ["Crossing the Line", "Show your character making a decision they cannot undo."],
    ["Complications", "Add consequences nobody expected."],
    ["The Moral Dilemma", "Force your character to choose between two costly options."],
    ["Climax", "Bring the main conflict to its decisive moment."],
    ["Consequences", "Show what the choice meant for people and the world."],
  ]),
  t("horror", "Horror", "👻", "Fear, tension and dread", [
    ["The Calm Before", "Establish normal life so readers feel what is about to be lost."],
    ["The First Sign", "Plant something small that feels wrong."],
    ["Escalation", "Make the threat harder to ignore."],
    ["No Way Out", "Take away the character's escape routes."],
    ["The Truth", "Reveal what is really causing the fear."],
    ["The Confrontation", "Put the character directly in front of the threat."],
    ["Aftermath", "Leave readers with a lingering, unsettling final note."],
  ]),
  t("education", "Education / Textbook", "🎓", "Structured lessons with practice", [
    ["Introduction & Learning Goals", "State who the book is for and what learners will be able to do."],
    ["Fundamentals", "Teach the basic ideas and vocabulary first."],
    ["Core Concepts", "Explain the main ideas one at a time, with examples."],
    ["Applying the Concepts", "Show how the ideas are used in real situations."],
    ["Worked Examples", "Solve two or three problems step by step."],
    ["Practice Exercises", "Give exercises from easy to challenging."],
    ["Common Mistakes", "List where learners usually go wrong and how to avoid it."],
    ["Summary & Review Questions", "Recap the chapter and test understanding."],
    ["Glossary", "Define the key terms used in the book."],
    ["Further Reading", "Point learners to where they can go next."],
  ]),
  t("technology", "Technology / How-To Guide", "💻", "Tutorials and technical guides", [
    ["Introduction & Prerequisites", "Explain what readers will build and what they need to know first."],
    ["Setting Up", "Walk through the tools and setup, step by step."],
    ["Core Concepts", "Explain the key ideas before diving into code or commands."],
    ["Your First Project", "Build something small and complete together."],
    ["Going Deeper", "Add features and explain how they work."],
    ["Best Practices", "Share the habits that keep projects clean and reliable."],
    ["Troubleshooting", "List common errors and how to fix them."],
    ["A Real-World Project", "Combine everything into a larger example."],
    ["What to Learn Next", "Suggest the next skills and resources."],
  ]),
  t("biography", "Biography & Memoir", "🧑", "A life story, told well", [
    ["Introduction", "Say why this story is worth telling and why now."],
    ["Early Life", "Describe where and how the person grew up."],
    ["Formative Years", "Cover the people and events that shaped them."],
    ["Turning Points", "Show the decisions that changed their path."],
    ["Challenges", "Tell the hardest times honestly."],
    ["Achievements", "Describe the work or moments they are proud of."],
    ["Lessons Learned", "Share what the story teaches."],
    ["Today & Looking Ahead", "Bring the story to the present and what comes next."],
  ]),
  t("health", "Health & Wellness", "🧘", "Nutrition, fitness and mind", [
    ["Introduction: Your Health Journey", "Explain the goal of the book and who it helps."],
    ["Understanding Your Body", "Explain the basics in plain, accurate language."],
    ["Eating Well", "Cover simple nutrition principles and sample meals."],
    ["Moving More", "Describe activity options for different levels."],
    ["Sleep & Recovery", "Explain why rest matters and how to improve it."],
    ["Mental Well-being", "Cover stress, mood and healthy coping habits."],
    ["Building a Routine", "Show how to turn the advice into a daily schedule."],
    ["A 4-Week Starter Plan", "Give a week-by-week plan readers can follow."],
    ["Important Note", "Remind readers to consult a qualified professional before making health changes."],
  ]),
  t("spirituality", "Spirituality & Philosophy", "🕊️", "Reflection, meaning and practice", [
    ["Introduction: The Question", "Begin with the question that drives the book."],
    ["Foundations", "Explain the main ideas and where they come from."],
    ["Core Teachings", "Present the key principles with short reflections."],
    ["Daily Practice", "Offer practices readers can try each day."],
    ["Challenges on the Path", "Address doubt, distraction and difficult times."],
    ["Reflections", "Share personal insights and questions for the reader."],
    ["Closing Thoughts", "End with a calm, memorable message."],
  ]),
  t("poetry", "Poetry Collection", "✒️", "Poems arranged in sections", [
    ["Foreword", "Write a short note about what inspired this collection."],
    ["Part One", "Add your first group of poems. Use blank lines between stanzas."],
    ["Part Two", "Add the next group, shifting theme or tone."],
    ["Part Three", "Add the final group of poems."],
    ["Closing Poem", "End with a poem that ties the collection together."],
    ["About the Poet", "Write a brief bio."],
  ]),
  t("childrens", "Children's Story", "🧸", "Simple, warm stories for young readers", [
    ["Meet the Character", "Introduce a lovable character and their world in a few lines."],
    ["A New Day", "Show something exciting or unusual starting."],
    ["The Problem", "Give the character a small problem to solve."],
    ["Trying Again", "Show the character trying, failing and trying a different way."],
    ["Help Arrives", "Add a friend or idea that helps."],
    ["The Big Moment", "Write the happiest, most exciting part."],
    ["The Happy Ending", "Wrap up with a warm, satisfying ending."],
    ["What We Learned", "Add a gentle lesson or a question for parents to ask."],
  ]),
  t("travel", "Travel", "🧳", "Guides and travel stories", [
    ["Introduction: Why This Place", "Explain what makes this destination worth visiting."],
    ["Planning & Getting There", "Cover timing, budget, visas and transport."],
    ["Highlights", "Describe the best places and experiences."],
    ["Food & Culture", "Introduce local food, customs and etiquette."],
    ["Hidden Gems", "Share places most visitors miss."],
    ["Budget & Practical Tips", "Offer money-saving advice and safety notes."],
    ["Itineraries", "Give sample plans for different trip lengths."],
    ["Final Reflections", "Close with what the trip meant to you."],
  ]),
  t("cooking", "Cooking & Recipes", "🍳", "Recipes with technique and tips", [
    ["Introduction: My Kitchen", "Share your approach to food and who this book is for."],
    ["Pantry Essentials", "List the ingredients and tools readers need."],
    ["Techniques", "Explain the basic methods used throughout the book."],
    ["Starters & Snacks", "Add your first group of recipes with ingredients and steps."],
    ["Main Dishes", "Add your main recipes."],
    ["Desserts", "Add sweet recipes."],
    ["Quick Meals", "Add fast recipes for busy days."],
    ["Tips & Substitutions", "Explain how to adapt recipes and fix common problems."],
  ]),
  t("history", "History", "🏛️", "People, events and their impact", [
    ["Introduction & Context", "Set the scene and explain why this history matters."],
    ["Origins", "Describe how the story began."],
    ["Rise", "Cover the growth and key developments."],
    ["People & Turning Points", "Profile the key figures and decisive moments."],
    ["Conflict & Change", "Describe the struggles that reshaped events."],
    ["Legacy", "Explain what remained after the events ended."],
    ["Why It Matters Today", "Connect the history to the present."],
    ["Sources & Further Reading", "List the sources you used."],
  ]),
];

export function getBookTemplate(id: string): BookTemplate | undefined {
  return BOOK_TEMPLATES.find((tpl) => tpl.id === id);
}

// What a new chapter contains: a quote-style prompt (so it looks different from
// real text) plus a spot to start writing. Authors delete the prompt as they write.
export function chapterStarter(prompt: string): string {
  return `> ✎ Writing prompt: ${prompt}\n\nStart writing here…`;
}