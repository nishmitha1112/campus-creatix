import { User, BRANCHES } from "../types";

export const parseEmail = (
  email: string
): { role: User["role"]; branch?: string; rollNumber?: string } | null => {
  const domain = "sreenidhi.edu.in";

  if (!email.endsWith(domain)) return null;

  const studentRegex = new RegExp(
    `^(\\w+)@(${BRANCHES.join("|")})\\.sreenidhi\\.edu\\.in$`
  );

  const match = email.match(studentRegex);

  if (match) {
    return {
      role: "student",
      rollNumber: match[1],
      branch: match[2],
    };
  }

  // If not student pattern but still SNIST email → faculty
  return {
    role: "faculty",
  };
};