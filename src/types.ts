export interface ExtractedMetadata {
  caseNumber?: string;
  declarationNumber?: string;
  plaintiff?: string;
  defendant?: string;
  courtName?: string;
  subject?: string;
  activityType?: string;
  keyDates?: { label: string; date: string }[];
}

export interface RoadmapStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'active';
}

export interface MissingDetailQuestion {
  id: string;
  question: string;
  field: string;
  userAnswer?: string;
}

export interface LegalRoadmap {
  steps: RoadmapStep[];
  missingDetails: MissingDetailQuestion[];
}

export interface LegalPleading {
  title: string;
  introduction: string; // مقدمه لایحه
  legalArguments: string[]; // استدلال‌های حقوقی و مواد قانونی
  conclusion: string; // بخش نتیجه‌گیری و درخواست از دادگاه
  fullTextMarkdown: string; // متن کامل ماردون لایحه آماده کپی و چاپ
}

export interface OpposingArgument {
  point: string;
  counterStrategy: string;
}

export interface JudgeQuestion {
  question: string;
  suggestedAnswer: string;
}

export interface WhatIfScenario {
  condition: string;
  defenseStrategy: string;
}

export interface CourtSimulator {
  opposingArguments: OpposingArgument[];
  judgeExpectedQuestions: JudgeQuestion[];
  scenarios: WhatIfScenario[];
}

export interface LegalDeadline {
  id: string;
  title: string; // مثلاً: مهلت واخواهی، جلسه اول دادرسی، مهلت تجدیدنظرخواهی
  date: string; // YYYY-MM-DD
  type: 'hearing' | 'objection' | 'submission'; // نوع رویداد: جلسه، اعتراض، ثبت لایحه
  description: string;
  daysRemaining: number;
}

export interface GanttPhase {
  id: string;
  name: string; // نام فاز (مثلاً: بررسی پرونده، تبادل لوایح، جلسه اول، صدور رای)
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  progress: number; // 0 to 100
  color: string; // hex or CSS color
}

export interface HearingFeedback {
  id: string;
  date: string;
  summary: string;
  actionsTaken: string;
}

export interface LegalCase {
  id: string;
  title: string; // عنوان پرونده
  caseNumber: string; // شماره پرونده
  declarationNumber: string; // شماره اظهارنامه
  parties: { plaintiff: string; defendant: string };
  category: 'criminal' | 'civil'; // کیفری یا حقوقی
  createdAt: string;
  rawNotes: string; // یادداشت‌های اولیه وکیل
  notes?: string; // یادداشت‌های اختیاری پرونده برای انطباق و سازگاری بالا
  customRules: string; // قواعد سفارشی یا پرامپت اختصاصی وکیل
  extractedMetadata: ExtractedMetadata;
  roadmap: LegalRoadmap;
  pleading: LegalPleading | null; // لایحه نهایی (ممکن است ابتدا نال باشد تا مرحله‌به‌مرحله جلو رود)
  courtSimulator: CourtSimulator;
  deadlines: LegalDeadline[];
  ganttPhases: GanttPhase[];
  hearingsFeedbackHistory: HearingFeedback[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export type BotPersona = 'refiner' | 'simulator' | 'coach';

export interface SavedCase extends LegalCase {
  chatHistory?: ChatMessage[];
}
