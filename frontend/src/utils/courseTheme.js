// Assigns each course a consistent visual theme based on its own id —
// NOT its position in a list. This matters because the same course can
// appear at different positions in the tutor's course list vs a
// student's enrolled-course list (different queries, different sort
// order), so position-based coloring (e.g. CSS :nth-of-type) makes the
// same course show a different color depending on which dashboard is
// viewing it. Hashing the course id instead guarantees the same course
// always gets the same color everywhere it's rendered.

const COURSE_THEMES = ["blue", "green", "violet", "amber"];

// A few specific courses are pinned to a fixed color rather than left to
// the hash below — this guarantees "Introduction to JavaScript" always
// stays green (matching a screenshot already taken of it), and that the
// three demo courses are visually distinct from one another rather than
// leaving that to chance with only 4 themes and 3 courses.
const FIXED_THEMES = {
  "introduction to javascript": "green",
  "web development fundamentals": "blue",
  "advanced programming concepts": "violet",
};

export function courseTheme(course) {
  const title = (course?.title || "").trim().toLowerCase();
  if (FIXED_THEMES[title]) return FIXED_THEMES[title];

  const key = course?.id || course?.module_code || title;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }
  return COURSE_THEMES[hash % COURSE_THEMES.length];
}