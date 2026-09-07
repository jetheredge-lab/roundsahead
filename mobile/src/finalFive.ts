import type { FinalFiveItem } from '@shared';

type ChecklistKey = keyof FinalFiveItem['checklist'];

// The 12-point application checklist, grouped into the same four sections the
// web app uses. Order is stable so progress reads the same on every device.
export const CHECKLIST_SECTIONS: {
  title: string;
  items: { key: ChecklistKey; label: string }[];
}[] = [
  {
    title: 'Common App & transcripts',
    items: [
      { key: 'commonAppAdded', label: 'Added college to Common App / Coalition account' },
      { key: 'transcriptRequested', label: 'Official transcript ordered & sent by counselor' },
      { key: 'satActSent', label: 'SAT / ACT report sent (or marked test-optional)' },
    ],
  },
  {
    title: 'Letters of recommendation',
    items: [
      { key: 'counselorRecRequested', label: 'Counselor recommendation requested with brag sheet' },
      { key: 'teacherRec1Requested', label: 'Teacher rec #1 (STEM) requested & submitted' },
      { key: 'teacherRec2Requested', label: 'Teacher rec #2 (Math / Humanities) requested' },
    ],
  },
  {
    title: 'Essays & supplements',
    items: [
      { key: 'supplementEssayDrafted', label: 'Drafted school-specific essays (Why this school)' },
      { key: 'supplementEssayPolished', label: 'Essays proofread and word counts verified' },
    ],
  },
  {
    title: 'Financial aid & submission',
    items: [
      { key: 'fafsaSubmitted', label: 'FAFSA submitted with the school code' },
      { key: 'cssProfileSubmitted', label: 'CSS Profile submitted (private schools)' },
      { key: 'applicationSubmitted', label: 'Application formally submitted & fee paid' },
      { key: 'portalLoginCreated', label: 'Applicant portal login created & verified' },
    ],
  },
];

export const CHECKLIST_TOTAL = CHECKLIST_SECTIONS.reduce((n, s) => n + s.items.length, 0);

export const completionPercent = (checklist: FinalFiveItem['checklist']): number => {
  const done = Object.values(checklist).filter(Boolean).length;
  return Math.round((done / CHECKLIST_TOTAL) * 100);
};

export type Category = FinalFiveItem['category'];

// Tailwind classes per tier (matches the web palette: safety green, target blue,
// reach rose). Kept as full class strings so NativeWind can see them statically.
export const CATEGORY_STYLE: Record<Category, { chip: string; text: string }> = {
  Safety: { chip: 'bg-emerald-100', text: 'text-emerald-800' },
  Target: { chip: 'bg-blue-100', text: 'text-blue-800' },
  Reach: { chip: 'bg-rose-100', text: 'text-rose-800' },
};

export const CATEGORIES: Category[] = ['Safety', 'Target', 'Reach'];

export const APPLICATION_PLANS: { value: FinalFiveItem['applicationType']; label: string }[] = [
  { value: 'EA', label: 'Early Action' },
  { value: 'ED', label: 'Early Decision' },
  { value: 'RD', label: 'Regular' },
  { value: 'Rolling', label: 'Rolling' },
];

export const MAX_FINAL_FIVE = 5;

// A balanced list has at least one safety, two targets, and one reach.
export const isBalanced = (items: FinalFiveItem[]): boolean => {
  const by = (c: Category) => items.filter((i) => i.category === c).length;
  return by('Safety') >= 1 && by('Target') >= 2 && by('Reach') >= 1;
};
