// TODO: Replace with real testimonials from mentees/students
export type Testimonial = {
  name: string;
  role: string;
  text: string;
  avatarInitials: string;
};

export const testimonials: Testimonial[] = [
  {
    name: "A.K.",
    role: "Mentee",
    text: "Ahsan's mentorship completely transformed how I approach frontend architecture. His guidance helped me land my first senior engineering role.",
    avatarInitials: "AK",
  },
  {
    name: "S.R.",
    role: "Angular Cookbook reader",
    text: "The Angular Cookbook is a must-have. Every recipe is practical and well-explained. I reference it constantly in my day-to-day work.",
    avatarInitials: "SR",
  },
  {
    name: "M.T.",
    role: "Workshop attendee",
    text: "Attended Ahsan's Angular workshop at a conference — incredibly clear, hands-on, and applicable immediately. Best technical session I've been to.",
    avatarInitials: "MT",
  },
  {
    name: "F.N.",
    role: "Student",
    text: "The Code With Ahsan community is unlike any other. Real projects, real feedback, and a mentor who genuinely cares about your growth.",
    avatarInitials: "FN",
  },
  {
    name: "R.B.",
    role: "Mentee",
    text: "In six months of mentorship with Ahsan I went from struggling with TypeScript to confidently building full Angular applications from scratch.",
    avatarInitials: "RB",
  },
];
