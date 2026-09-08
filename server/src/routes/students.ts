import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { type AuthedRequest } from '../auth.js';
import { requirePaid, callerEntitled } from '../requirePaid.js';
import {
  pickProfileFields,
  profileOut,
  finalFiveOut,
  taskOut,
  essayOut,
  visitOut,
  awardLetterOut,
  courseEntryOut,
} from '../serialize.js';

export const studentsRouter = Router();

const asJson = (v: unknown): Prisma.InputJsonValue => (v ?? null) as Prisma.InputJsonValue;

const DEFAULT_CHECKLIST = {
  commonAppAdded: true,
  transcriptRequested: false,
  satActSent: false,
  counselorRecRequested: false,
  teacherRec1Requested: false,
  teacherRec2Requested: false,
  supplementEssayDrafted: false,
  supplementEssayPolished: false,
  fafsaSubmitted: false,
  cssProfileSubmitted: false,
  applicationSubmitted: false,
  portalLoginCreated: false,
};

const DEFAULT_RATINGS = {
  campusVibe: 0,
  academicFacilities: 0,
  dormAndFood: 0,
  preMedNursingAdvising: 0,
  locationSafety: 0,
};

// Verify the student exists and belongs to the caller. Returns the id or null
// (having already sent a 404).
async function ownStudentId(req: AuthedRequest, res: import('express').Response): Promise<string | null> {
  const id = req.params.id;
  const student = await prisma.student.findFirst({
    where: { id, userId: req.userId! },
    select: { id: true },
  });
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return null;
  }
  return student.id;
}

// Build nested-create arrays for a bundle of resources (used by create + bulk replace).
function buildChildCreates(body: Record<string, any>) {
  const savedColleges = Array.isArray(body.savedColleges)
    ? body.savedColleges.map((collegeId: string) => ({ collegeId }))
    : [];
  const finalFive = Array.isArray(body.finalFive)
    ? body.finalFive.map((f: any) => ({
        collegeId: f.collegeId,
        applicationType: f.applicationType ?? 'EA',
        status: f.status ?? 'researching',
        category: f.category ?? 'Target',
        checklist: asJson(f.checklist ?? DEFAULT_CHECKLIST),
        notes: f.notes ?? '',
        targetMajor: f.targetMajor ?? '',
        portalUrl: f.portalUrl ?? null,
      }))
    : [];
  const timelineTasks = Array.isArray(body.timelineTasks)
    ? body.timelineTasks.map((t: any) => ({
        id: t.id,
        title: t.title ?? '',
        category: t.category ?? 'academics',
        targetMonth: t.targetMonth ?? '',
        gradeLevel: t.gradeLevel ?? 'Junior Year (11th)',
        priority: t.priority ?? 'medium',
        description: t.description ?? '',
        actionItems: asJson(t.actionItems ?? []),
        completed: !!t.completed,
        isCustom: !!t.isCustom,
        dueDate: t.dueDate ?? null,
        associatedCollegeId: t.associatedCollegeId ?? null,
      }))
    : [];
  const essays = Array.isArray(body.essays)
    ? body.essays.map((e: any) => ({
        id: e.id,
        title: e.title ?? '',
        type: e.type ?? 'custom',
        promptText: e.promptText ?? '',
        associatedCollegeId: e.associatedCollegeId ?? null,
        targetWordCount: e.targetWordCount ?? 650,
        currentDraft: e.currentDraft ?? '',
        outline: e.outline ?? '',
        status: e.status ?? 'brainstorming',
        lastEdited: e.lastEdited ?? '',
      }))
    : [];
  const campusVisits = Array.isArray(body.campusVisits)
    ? body.campusVisits.map((v: any) => ({
        id: v.id,
        collegeId: v.collegeId ?? '',
        collegeName: v.collegeName ?? '',
        visitDate: v.visitDate ?? '',
        overallRating: v.overallRating ?? 0,
        ratings: asJson(v.ratings ?? DEFAULT_RATINGS),
        pros: asJson(v.pros ?? []),
        cons: asJson(v.cons ?? []),
        notes: v.notes ?? '',
        talkedToCurrentStudents: !!v.talkedToCurrentStudents,
        visitedSimulationLabOrHospital: !!v.visitedSimulationLabOrHospital,
      }))
    : [];
  const awardLetters = Array.isArray(body.awardLetters)
    ? body.awardLetters.map((a: any) => ({
        id: a.id,
        collegeId: a.collegeId ?? null,
        collegeName: a.collegeName ?? '',
        academicYear: a.academicYear ?? '',
        tuitionAndFees: a.tuitionAndFees ?? 0,
        housingAndMeals: a.housingAndMeals ?? 0,
        booksAndSupplies: a.booksAndSupplies ?? 0,
        transportation: a.transportation ?? 0,
        personalExpenses: a.personalExpenses ?? 0,
        grants: asJson(a.grants ?? []),
        workStudy: a.workStudy ?? 0,
        loanSubsidized: a.loanSubsidized ?? 0,
        loanUnsubsidized: a.loanUnsubsidized ?? 0,
        loanParentPlus: a.loanParentPlus ?? 0,
        loanOther: a.loanOther ?? 0,
        notes: a.notes ?? '',
      }))
    : [];
  const courseEntries = Array.isArray(body.courseEntries)
    ? body.courseEntries.map((c: any) => ({
        id: c.id,
        grade: c.grade ?? 9,
        subject: c.subject ?? 'Other',
        name: c.name ?? '',
        level: c.level ?? 'regular',
        completed: !!c.completed,
      }))
    : [];
  return { savedColleges, finalFive, timelineTasks, essays, campusVisits, awardLetters, courseEntries };
}

// Paid features (Phase 9) can't be seeded through the bulk create/replace paths
// by a free account. Saved colleges + profile stay free so onboarding and
// import still work; everything else is dropped unless the caller is entitled.
type ChildCreates = ReturnType<typeof buildChildCreates>;
function stripPaidChildren(children: ChildCreates, entitled: boolean): ChildCreates {
  if (entitled) return children;
  return {
    savedColleges: children.savedColleges,
    finalFive: [],
    timelineTasks: [],
    essays: [],
    campusVisits: [],
    awardLetters: [],
    courseEntries: [],
  };
}

// Load the full bundle for a student.
async function loadBundle(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      savedColleges: true,
      finalFive: true,
      timelineTasks: { orderBy: { createdAt: 'asc' } },
      essays: { orderBy: { createdAt: 'desc' } },
      campusVisits: { orderBy: { createdAt: 'desc' } },
      awardLetters: { orderBy: { createdAt: 'asc' } },
      courseEntries: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!student) return null;
  return {
    profile: profileOut(student),
    savedColleges: student.savedColleges.map((c) => c.collegeId),
    finalFive: student.finalFive.map(finalFiveOut),
    timelineTasks: student.timelineTasks.map(taskOut),
    essays: student.essays.map(essayOut),
    campusVisits: student.campusVisits.map(visitOut),
    awardLetters: student.awardLetters.map(awardLetterOut),
    courseEntries: student.courseEntries.map(courseEntryOut),
  };
}

// ── Students ────────────────────────────────────────────────────────

// GET /api/students — summaries for the account.
studentsRouter.get('/', async (req: AuthedRequest, res) => {
  const students = await prisma.student.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'asc' },
    select: { id: true, fullName: true, gradYear: true, currentGrade: true, updatedAt: true },
  });
  res.json({ students });
});

// POST /api/students — create a student, seeding any provided resources.
studentsRouter.post('/', async (req: AuthedRequest, res) => {
  const body = (req.body ?? {}) as Record<string, any>;
  const profile = pickProfileFields(body.profile ?? {});
  const children = stripPaidChildren(buildChildCreates(body), await callerEntitled(req));
  const student = await prisma.student.create({
    data: {
      user: { connect: { id: req.userId! } },
      ...profile,
      savedColleges: { create: children.savedColleges },
      finalFive: { create: children.finalFive },
      timelineTasks: { create: children.timelineTasks },
      essays: { create: children.essays },
      campusVisits: { create: children.campusVisits },
        awardLetters: { create: children.awardLetters },
        courseEntries: { create: children.courseEntries },
    } as unknown as Prisma.StudentCreateInput,
  });
  const bundle = await loadBundle(student.id);
  res.status(201).json(bundle);
});

// GET /api/students/:id — full bundle.
studentsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  res.json(await loadBundle(id));
});

// PATCH /api/students/:id — update profile fields.
studentsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const data = pickProfileFields(req.body ?? {});
  const updated = await prisma.student.update({ where: { id }, data: data as Prisma.StudentUpdateInput });
  res.json({ profile: profileOut(updated) });
});

// DELETE /api/students/:id — remove student and all its data.
studentsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.student.delete({ where: { id } });
  res.json({ ok: true });
});

// PUT /api/students/:id/state — wholesale replace of all resources (used by
// import / load-sample / reset). Profile + all children are replaced atomically.
studentsRouter.put('/:id/state', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const body = (req.body ?? {}) as Record<string, any>;
  const profile = pickProfileFields(body.profile ?? {});
  const children = stripPaidChildren(buildChildCreates(body), await callerEntitled(req));

  await prisma.$transaction([
    prisma.savedCollege.deleteMany({ where: { studentId: id } }),
    prisma.finalFiveItem.deleteMany({ where: { studentId: id } }),
    prisma.timelineTask.deleteMany({ where: { studentId: id } }),
    prisma.essayDraft.deleteMany({ where: { studentId: id } }),
    prisma.campusVisit.deleteMany({ where: { studentId: id } }),
    prisma.awardLetter.deleteMany({ where: { studentId: id } }),
    prisma.courseEntry.deleteMany({ where: { studentId: id } }),
    prisma.student.update({
      where: { id },
      data: {
        ...profile,
        savedColleges: { create: children.savedColleges },
        finalFive: { create: children.finalFive },
        timelineTasks: { create: children.timelineTasks },
        essays: { create: children.essays },
        campusVisits: { create: children.campusVisits },
        awardLetters: { create: children.awardLetters },
        courseEntries: { create: children.courseEntries },
      } as unknown as Prisma.StudentUpdateInput,
    }),
  ]);
  res.json(await loadBundle(id));
});

// ── Saved colleges ──────────────────────────────────────────────────

studentsRouter.post('/:id/saved-colleges', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const collegeId = String((req.body ?? {}).collegeId ?? '');
  if (!collegeId) {
    res.status(400).json({ error: 'collegeId required' });
    return;
  }
  await prisma.savedCollege.upsert({
    where: { studentId_collegeId: { studentId: id, collegeId } },
    create: { studentId: id, collegeId },
    update: {},
  });
  res.status(201).json({ ok: true });
});

studentsRouter.delete('/:id/saved-colleges/:collegeId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.savedCollege.deleteMany({ where: { studentId: id, collegeId: req.params.collegeId } });
  res.json({ ok: true });
});

// ── Final five (keyed by collegeId) ─────────────────────────────────

studentsRouter.post('/:id/final-five', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const body = (req.body ?? {}) as any;
  const collegeId = String(body.collegeId ?? '');
  if (!collegeId) {
    res.status(400).json({ error: 'collegeId required' });
    return;
  }
  const item = await prisma.finalFiveItem.upsert({
    where: { studentId_collegeId: { studentId: id, collegeId } },
    create: {
      studentId: id,
      collegeId,
      category: body.category ?? 'Target',
      targetMajor: body.targetMajor ?? '',
      checklist: asJson(DEFAULT_CHECKLIST),
    },
    update: {},
  });
  res.status(201).json({ item: finalFiveOut(item) });
});

studentsRouter.patch('/:id/final-five/:collegeId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const b = (req.body ?? {}) as any;
  const data: Prisma.FinalFiveItemUpdateInput = {};
  for (const k of ['applicationType', 'status', 'category', 'notes', 'targetMajor', 'portalUrl'] as const) {
    if (k in b) (data as any)[k] = b[k];
  }
  if ('checklist' in b) data.checklist = asJson(b.checklist);
  const result = await prisma.finalFiveItem.updateMany({
    where: { studentId: id, collegeId: req.params.collegeId },
    data,
  });
  if (result.count === 0) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  const item = await prisma.finalFiveItem.findFirst({ where: { studentId: id, collegeId: req.params.collegeId } });
  res.json({ item: item ? finalFiveOut(item) : null });
});

studentsRouter.delete('/:id/final-five/:collegeId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.finalFiveItem.deleteMany({ where: { studentId: id, collegeId: req.params.collegeId } });
  res.json({ ok: true });
});

// ── Timeline tasks ──────────────────────────────────────────────────

// PUT upsert by client-provided id, scoped to the student.
studentsRouter.put('/:id/tasks/:taskId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const t = (req.body ?? {}) as any;
  const taskId = req.params.taskId;
  const fields = {
    title: t.title ?? '',
    category: t.category ?? 'academics',
    targetMonth: t.targetMonth ?? '',
    gradeLevel: t.gradeLevel ?? 'Junior Year (11th)',
    priority: t.priority ?? 'medium',
    description: t.description ?? '',
    actionItems: asJson(t.actionItems ?? []),
    completed: !!t.completed,
    isCustom: t.isCustom ?? true,
    dueDate: t.dueDate ?? null,
    associatedCollegeId: t.associatedCollegeId ?? null,
  };
  const existing = await prisma.timelineTask.findFirst({ where: { id: taskId, studentId: id }, select: { id: true } });
  const task = existing
    ? await prisma.timelineTask.update({ where: { id: taskId }, data: fields })
    : await prisma.timelineTask.create({ data: { id: taskId, studentId: id, ...fields } });
  res.json({ task: taskOut(task) });
});

studentsRouter.delete('/:id/tasks/:taskId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.timelineTask.deleteMany({ where: { id: req.params.taskId, studentId: id } });
  res.json({ ok: true });
});

// ── Essays ──────────────────────────────────────────────────────────

// PUT upsert by client-provided id, scoped to the student.
studentsRouter.put('/:id/essays/:essayId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const e = (req.body ?? {}) as any;
  const essayId = req.params.essayId;
  const fields = {
    title: e.title ?? '',
    type: e.type ?? 'custom',
    promptText: e.promptText ?? '',
    associatedCollegeId: e.associatedCollegeId ?? null,
    targetWordCount: e.targetWordCount ?? 650,
    currentDraft: e.currentDraft ?? '',
    outline: e.outline ?? '',
    status: e.status ?? 'brainstorming',
    lastEdited: e.lastEdited ?? '',
  };
  const existing = await prisma.essayDraft.findFirst({ where: { id: essayId, studentId: id }, select: { id: true } });
  const essay = existing
    ? await prisma.essayDraft.update({ where: { id: essayId }, data: fields })
    : await prisma.essayDraft.create({ data: { id: essayId, studentId: id, ...fields } });
  res.json({ essay: essayOut(essay) });
});

studentsRouter.delete('/:id/essays/:essayId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.essayDraft.deleteMany({ where: { id: req.params.essayId, studentId: id } });
  res.json({ ok: true });
});

// ── Campus visits ───────────────────────────────────────────────────

// PUT upsert by client-provided id, scoped to the student.
studentsRouter.put('/:id/campus-visits/:visitId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const v = (req.body ?? {}) as any;
  const visitId = req.params.visitId;
  const fields = {
    collegeId: v.collegeId ?? '',
    collegeName: v.collegeName ?? '',
    visitDate: v.visitDate ?? '',
    overallRating: v.overallRating ?? 0,
    ratings: asJson(v.ratings ?? DEFAULT_RATINGS),
    pros: asJson(v.pros ?? []),
    cons: asJson(v.cons ?? []),
    notes: v.notes ?? '',
    talkedToCurrentStudents: !!v.talkedToCurrentStudents,
    visitedSimulationLabOrHospital: !!v.visitedSimulationLabOrHospital,
  };
  const existing = await prisma.campusVisit.findFirst({ where: { id: visitId, studentId: id }, select: { id: true } });
  const visit = existing
    ? await prisma.campusVisit.update({ where: { id: visitId }, data: fields })
    : await prisma.campusVisit.create({ data: { id: visitId, studentId: id, ...fields } });
  res.json({ visit: visitOut(visit) });
});

studentsRouter.delete('/:id/campus-visits/:visitId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.campusVisit.deleteMany({ where: { id: req.params.visitId, studentId: id } });
  res.json({ ok: true });
});

// ── Award letters (upsert by client-provided id, scoped to the student) ──

studentsRouter.put('/:id/award-letters/:letterId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const a = (req.body ?? {}) as any;
  const letterId = req.params.letterId;
  const fields = {
    collegeId: a.collegeId ?? null,
    collegeName: a.collegeName ?? '',
    academicYear: a.academicYear ?? '',
    tuitionAndFees: a.tuitionAndFees ?? 0,
    housingAndMeals: a.housingAndMeals ?? 0,
    booksAndSupplies: a.booksAndSupplies ?? 0,
    transportation: a.transportation ?? 0,
    personalExpenses: a.personalExpenses ?? 0,
    grants: asJson(a.grants ?? []),
    workStudy: a.workStudy ?? 0,
    loanSubsidized: a.loanSubsidized ?? 0,
    loanUnsubsidized: a.loanUnsubsidized ?? 0,
    loanParentPlus: a.loanParentPlus ?? 0,
    loanOther: a.loanOther ?? 0,
    notes: a.notes ?? '',
  };
  const existing = await prisma.awardLetter.findFirst({ where: { id: letterId, studentId: id }, select: { id: true } });
  const letter = existing
    ? await prisma.awardLetter.update({ where: { id: letterId }, data: fields })
    : await prisma.awardLetter.create({ data: { id: letterId, studentId: id, ...fields } });
  res.json({ awardLetter: awardLetterOut(letter) });
});

studentsRouter.delete('/:id/award-letters/:letterId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.awardLetter.deleteMany({ where: { id: req.params.letterId, studentId: id } });
  res.json({ ok: true });
});

// ── Course entries (4-year course planner; upsert by client id) ──

studentsRouter.put('/:id/courses/:courseId', requirePaid, async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  const c = (req.body ?? {}) as any;
  const courseId = req.params.courseId;
  const fields = {
    grade: c.grade ?? 9,
    subject: c.subject ?? 'Other',
    name: c.name ?? '',
    level: c.level ?? 'regular',
    completed: !!c.completed,
  };
  const existing = await prisma.courseEntry.findFirst({ where: { id: courseId, studentId: id }, select: { id: true } });
  const entry = existing
    ? await prisma.courseEntry.update({ where: { id: courseId }, data: fields })
    : await prisma.courseEntry.create({ data: { id: courseId, studentId: id, ...fields } });
  res.json({ courseEntry: courseEntryOut(entry) });
});

studentsRouter.delete('/:id/courses/:courseId', async (req: AuthedRequest, res) => {
  const id = await ownStudentId(req, res);
  if (!id) return;
  await prisma.courseEntry.deleteMany({ where: { id: req.params.courseId, studentId: id } });
  res.json({ ok: true });
});
