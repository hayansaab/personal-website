// Everything the assistant knows about Hayan. Edit this file to change what it can answer.
export const PROFILE = `
# Hayan Saab

## Contact
- Email: saabh@whitman.edu
- LinkedIn: linkedin.com/in/hayan-saab
- GitHub: github.com/hayansaab
- Resume: available as a PDF on this website (the "Resume" link in the "Who am I" section)

## Background
- Born and raised in Syria, with formative years in Hong Kong
- UWC Li Po Chun (Hong Kong), IB Diploma
- Now at Whitman College in Walla Walla, Washington
- Languages: proficient in English and Arabic
- Outside of work: guitar, basketball, photography, camping, astronomy, and telling stories through writing and video

## Education
Whitman College, Class of 2028 (currently a junior). GPA: 3.6
- Major: Computer Science
- Minors: Data Science, Finance

Coursework
- Computer Science: CS 167 Intro to Computational Problem Solving in Python (Python basics, programming, OOP, classes); CS 170 Discrete Math (proof, logic, induction); CS 267 Human-Computer Interaction (design principles); CS 270 Data Structures and Algorithms in C++; CS 327 Algorithms
- Mathematics: Math 125 and 126, Calculus 1 and 2; Math 247 Statistics (fall 2026)
- Economics and Finance: Econ 101 Introductory Microeconomics; Econ 102 Introductory Macroeconomics; Econ 358 Corporate Finance (financial statements, financial markets, leverage, liquidity, time value of money)
- Other: Environmental Geology; Principles of Sociology; a reproductive justice politics course

## Leadership and experience

### Founder and Program Lead, Whitman Innovation Lab (WIL), April 2026 to present
- Founded a semester-long, accelerator-style program in which student teams build prototypes for real industry problems proposed by alumni mentors
- Designed the 2026-2027 curriculum and schedule covering software engineering, version control, system design, AI-assisted (agentic) development, and team-based building, with lectures, hands-on labs, weekly presentations and set milestones
- Wrote the grading policy, AI policy, and mentor evaluation rubric for the San Francisco career trek
- Grading: group project 40%, GitHub commits 30%, attendance and participation 10%, group presentations 10%, pre-class work 5%, post-class tasks 5%. Shipping code counts for more than showing up.
- AI policy: students must be able to explain every line of AI-assisted code they submit
- First cohort: 24 students in 6 teams, two teams per alumni mentor. The strongest team per mentor earns 3 nights in San Francisco (12-student trek)
- Built the program budget model with High, Low, and Pilot scenarios
- Wrote the student guide and the alumni mentor volunteer tracks
- Sourced Bay Area companies and cross-referenced them with a Whitman alumni list; manages an outreach tracker of about 47 industry contacts (from companies like Apple and Nvidia to OpenAI and Anthropic)
- Leads mentor outreach with a co-organizer
- Focus areas: AI, security, fintech, health

### President, ACM Student Chapter, Whitman College, July 2025 to October 10, 2026
- Led the executive board; scheduled rooms, ordered food, and managed budget requests for chapter events
- Managed the chapter Google Group
- Coordinated with faculty, the CCEC, and alumni to launch the Whitman Innovation Lab as a chapter initiative
- Organized Whithack, a hackathon (whithack.com)

### ASWC Senator, Finance Committee, Whitman College
- Reviews club budgets, funding requests, and policy for the Associated Students of Whitman College

### Member, President's Budget Advisory Committee (PBAC), Whitman College
- Attends regular meetings with the VP of Finance, the college president, the faculty committee, students, and sometimes trustees
- Advises on college budget allocations, analyzes financial sheets and Excel reports, and raises student concerns

### IT Consultant, Whitman Technology Services, September 2024 to present
- Ticketing, client support, and troubleshooting for students, faculty and staff
- Administers Duo multi-factor authentication and supports Microsoft 365 users
- About 15 hours per week alongside a full course load

### Content Creator, Whitman Digital Fluencies, October 2024 to May 2026
- Designed social media posts, video visuals, flyers, and posters in Canva, Photoshop, and Illustrator
- Wrote articles, including pieces on Apple Notes features and on AI and humans

### Whitman Finance Accelerator (CCEC), September 2025 to March 2026
- Completed the program
- Led a consulting project on embedding AI in healthcare: costs, benefits, and a holistic analysis of effects on organizations and patients

## Research: Credit card fraud detection and fairness (summer 2026)
Supervised by Professor Richard Torres Molina, Whitman College
- Built a stacked ensemble classifier on the Sparkov synthetic transaction dataset, comparing random forests, XGBoost and neural networks
- Because fraud is rare, evaluated with precision, recall, and precision-recall curves rather than accuracy
- Audited fairness across cardholder groups using statistical parity, equalized odds, and equal opportunity. The question driving it: fraud models are judged on how much fraud they catch, but who do they wrongly flag?
- Preprocessing and feature engineering in Python with pandas, NumPy and scikit-learn, including log transforms for skewed features like city population
- Systematic literature review on ML-based fraud detection and algorithmic fairness (Kozodoi et al. 2022, Kamalaruban et al. 2024, Hardt et al. 2016, the Bank Account Fraud (BAF) dataset suite)
- Wrote methods sections on fraud-injection calibration, preprocessing and skewness analysis, and a closing research statement for Whitman
- Paper in preparation: "Exploring Ensemble Machine Learning Models to Enhance Credit Card Fraud Detection"

## Other projects
- Quak: a hub for carpooling, housing, events and a marketplace
- Side projects built with agentic coding (Claude Code): a carpool app for Whitman students, a budgeting system, and a course analytics dashboard

## Skills
- Programming: Python, C++, R
- Data and ML: pandas, NumPy, scikit-learn, Jupyter, R Markdown, regex, ensemble methods, fairness auditing
- Finance and analysis: Excel financial analysis, budget review
- Tools: Git, Claude Code, Google Workspace, Microsoft Suite, Notion, Duo
- Design: Canva, Photoshop, Illustrator

## Beliefs
1. Understand every part of what you build. Hayan wants to lead engineering teams and still know how each piece works.
2. Shipping beats showing up.
3. Own the code AI writes.
4. Ask who a model gets wrong.

## Goals
- Long term: found a technology company, lead its engineering team, and still understand every part of what is built. Wants to lead teams while keeping deep technical ownership.
- Next two years: go deep on fundamentals (80% software engineering fundamentals, 15% cloud, 5% security); ship one project of their own every semester, start to finish; code two hours every day.
- Currently looking for: mentors for the Innovation Lab, research collaborators, and summer engineering roles.
`;
