import React, { useState, useEffect } from "react";
import { LegalCase, SavedCase, HearingFeedback, LegalDeadline, GanttPhase } from "./types";
import { INITIAL_SEED_CASES } from "./initialSeedCases";
import NotesInput from "./components/NotesInput";
import CaseDashboardView from "./components/CaseDashboardView";
import CourtSimulatorView from "./components/CourtSimulatorView";
import CalendarGanttView from "./components/CalendarGanttView";
import CopilotChat from "./components/CopilotChat";
import CasesArchiveView from "./components/CasesArchiveView";
import RemindersView from "./components/RemindersView";
import DashboardOverviewCards from "./components/DashboardOverviewCards";
import LegalRatesModal from "./components/LegalRatesModal";
import CasePrintModal from "./components/CasePrintModal";
import { 
  Scale, 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  MessageSquare, 
  Calendar, 
  HelpCircle, 
  CheckCircle, 
  RefreshCw,
  Folder,
  Bell,
  ListTodo,
  LayoutDashboard,
  Brain,
  AlertTriangle,
  PlusCircle,
  FolderOpen,
  Power,
  X,
  Printer,
  ChevronLeft,
  Gavel,
  ShieldCheck,
  Menu
} from "lucide-react";

export default function App() {
  const [currentCase, setCurrentCase] = useState<LegalCase | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "cases" | "calendar" | "reminders" | "copilot" | "simulator">("dashboard");
  const [isLoading, setIsLoading] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thinkingMode, setThinkingMode] = useState(false);

  // Modals state
  const [isLegalRatesOpen, setIsLegalRatesOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Archive & LocalStorage State
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Load saved cases on startup and seed if empty
  useEffect(() => {
    try {
      const stored = localStorage.getItem("smart_legal_assistant_cases");
      if (stored && JSON.parse(stored).length > 0) {
        const parsed: SavedCase[] = JSON.parse(stored);
        setSavedCases(parsed);
        setCurrentCase(parsed[0]);
        setActiveCaseId(parsed[0].id);
      } else {
        setSavedCases(INITIAL_SEED_CASES);
        localStorage.setItem("smart_legal_assistant_cases", JSON.stringify(INITIAL_SEED_CASES));
        setCurrentCase(INITIAL_SEED_CASES[0]);
        setActiveCaseId(INITIAL_SEED_CASES[0].id);
      }
    } catch (err) {
      console.error("Failed to load saved cases:", err);
      setSavedCases(INITIAL_SEED_CASES);
      setCurrentCase(INITIAL_SEED_CASES[0]);
      setActiveCaseId(INITIAL_SEED_CASES[0].id);
    }
  }, []);

  // Save to localStorage
  const saveCasesToStorage = (updated: SavedCase[]) => {
    try {
      localStorage.setItem("smart_legal_assistant_cases", JSON.stringify(updated));
      setSavedCases(updated);
    } catch (err) {
      console.error("Failed to save cases:", err);
    }
  };

  const handleGenerate = async (
    notes: string,
    category: 'criminal' | 'civil',
    customRules: string,
    title: string,
    thinkingModeVal: boolean,
    plaintiff?: string,
    defendant?: string,
    activityType?: string
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentCase(null);
    setThinkingMode(thinkingModeVal);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          category,
          customRules: customRules.trim() || undefined,
          title: title.trim() || undefined,
          thinkingMode: thinkingModeVal,
          plaintiff: plaintiff?.trim() || undefined,
          defendant: defendant?.trim() || undefined,
          activityType: activityType?.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "خطا در برقراری ارتباط با مدل هوشمند قضایی.");
      }

      const data = await response.json();
      if (!data.case) {
        throw new Error("داده‌های پرونده بازگردانده نشد.");
      }

      setCurrentCase(data.case);
      setActiveCaseId(null);
      setActiveTab("dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "یک خطای غیرمنتظره در پردازش شواهد رخ داد.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftPleading = async (answers: Record<string, string>) => {
    if (!currentCase) return;
    setIsDrafting(true);
    setError(null);

    try {
      const response = await fetch("/api/draft-pleading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          caseData: currentCase,
          thinkingMode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "تنظیم لایحه قضایی با خطا مواجه شد.");
      }

      const data = await response.json();
      if (!data.case) {
        throw new Error("پرونده آپدیت‌شده بازگردانده نشد.");
      }

      setCurrentCase(data.case);
      
      // If active case was previously saved, update it in archive immediately
      if (activeCaseId) {
        const updated = savedCases.map(sc => {
          if (sc.id === activeCaseId) {
            return {
              ...sc,
              pleading: data.case.pleading,
              roadmap: data.case.roadmap
            };
          }
          return sc;
        });
        saveCasesToStorage(updated);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "خطا در حین تنظیم لایحه رخ داد.");
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSaveCurrent = () => {
    if (!currentCase) return;

    const newCase: SavedCase = {
      ...currentCase,
      id: `case-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newCase, ...savedCases];
    saveCasesToStorage(updated);
    setActiveCaseId(newCase.id);
  };

  const handleSaveToExistingCase = (
    caseId: string,
    notes: string,
    plaintiff?: string,
    defendant?: string,
    activityType?: string
  ) => {
    const targetCase = savedCases.find(sc => sc.id === caseId);
    if (!targetCase) return;

    const dateStr = new Date().toLocaleDateString('fa-IR');
    const appendText = `\n\n[افزوده شده در تاریخ ${dateStr} - فعالیت قضایی: ${activityType || "ثبت نشده"}]\n${notes}`;
    const newNotes = targetCase.notes ? (targetCase.notes + appendText) : notes;

    const updatedCase: SavedCase = {
      ...targetCase,
      notes: newNotes,
      rawNotes: newNotes,
      parties: {
        plaintiff: plaintiff || targetCase.parties?.plaintiff || targetCase.extractedMetadata?.plaintiff || "",
        defendant: defendant || targetCase.parties?.defendant || targetCase.extractedMetadata?.defendant || "",
      },
      extractedMetadata: {
        ...targetCase.extractedMetadata,
        plaintiff: plaintiff || targetCase.extractedMetadata?.plaintiff || targetCase.parties?.plaintiff,
        defendant: defendant || targetCase.extractedMetadata?.defendant || targetCase.parties?.defendant,
        activityType: activityType || targetCase.extractedMetadata?.activityType,
      }
    };

    const updatedList = savedCases.map(sc => sc.id === caseId ? updatedCase : sc);
    saveCasesToStorage(updatedList);

    // Set as current active case & redirect to dashboard to see it
    setCurrentCase({
      id: updatedCase.id,
      title: updatedCase.title,
      category: updatedCase.category,
      notes: updatedCase.notes,
      rawNotes: updatedCase.rawNotes,
      createdAt: updatedCase.createdAt,
      customRules: updatedCase.customRules,
      parties: updatedCase.parties,
      caseNumber: updatedCase.caseNumber,
      declarationNumber: updatedCase.declarationNumber,
      extractedMetadata: updatedCase.extractedMetadata,
      roadmap: updatedCase.roadmap,
      courtSimulator: updatedCase.courtSimulator,
      deadlines: updatedCase.deadlines,
      ganttPhases: updatedCase.ganttPhases,
      hearingsFeedbackHistory: updatedCase.hearingsFeedbackHistory,
      pleading: updatedCase.pleading
    });
    setActiveCaseId(caseId);
    setActiveTab("dashboard");
  };

  const handleSaveNewCase = (
    title: string,
    notes: string,
    category: 'criminal' | 'civil',
    plaintiff?: string,
    defendant?: string,
    activityType?: string
  ) => {
    const isoDate = new Date().toISOString().split('T')[0];
    const newCaseId = `case-${Date.now()}`;

    const newCase: SavedCase = {
      id: newCaseId,
      title: title || `${activityType || "پرونده جدید"} - ${new Date().toLocaleDateString('fa-IR')}`,
      category,
      notes,
      rawNotes: notes,
      createdAt: isoDate,
      customRules: "",
      parties: {
        plaintiff: plaintiff || "",
        defendant: defendant || "",
      },
      caseNumber: `شماره موقت-${Math.floor(1000 + Math.random() * 9000)}`,
      declarationNumber: `اظهارنامه موقت-${Math.floor(1000 + Math.random() * 9000)}`,
      extractedMetadata: {
        plaintiff,
        defendant,
        activityType,
        subject: title || activityType,
        caseNumber: `شماره موقت-${Math.floor(1000 + Math.random() * 9000)}`,
        declarationNumber: `اظهارنامه موقت-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      roadmap: { 
        steps: [
          { id: 1, title: "تشکیل پرونده", description: "ثبت اولیه اطلاعات و مستندات پرونده", status: "completed" },
          { id: 2, title: "تحلیل قضایی", description: "بررسی مواد قانونی و آرای مشابه به صورت هوشمند", status: "active" },
          { id: 3, title: "تبادل لایحه", description: "آماده‌سازی پیش‌نویس لوایح دفاعیه", status: "pending" },
          { id: 4, title: "جلسه دادرسی", description: "شبیه‌سازی جلسه دادگاه غیرعلنی", status: "pending" }
        ], 
        missingDetails: [
          { id: "q1", question: "آیا مستندات دیگری مانند بیع‌نامه یا شهادت‌نامه شهود موجود است؟", field: "evidence" },
          { id: "q2", question: "آیا ابلاغیه قانونی به صورت واقعی ابلاغ شده است یا در سامانه ثنا؟", field: "noticeType" }
        ] 
      },
      courtSimulator: { opposingArguments: [], judgeExpectedQuestions: [], scenarios: [] },
      deadlines: [
        { id: "dl1", title: "مهلت ارسال اولین لایحه", date: "2026-07-24", type: "submission", description: "ارسال پیش‌نویس دفاعیه", daysRemaining: 5 }
      ],
      ganttPhases: [
        { id: "ph1", name: "بررسی مستندات", startDate: "2026-07-19", endDate: "2026-07-22", progress: 100, color: "#4F46E5" },
        { id: "ph2", name: "تبادل لوایح دفاعیه", startDate: "2026-07-23", endDate: "2026-07-28", progress: 10, color: "#8B5CF6" }
      ],
      hearingsFeedbackHistory: [],
      pleading: null
    };

    const updated = [newCase, ...savedCases];
    saveCasesToStorage(updated);

    // Set as active case
    setCurrentCase({
      id: newCase.id,
      title: newCase.title,
      category: newCase.category,
      notes: newCase.notes,
      rawNotes: newCase.rawNotes,
      createdAt: newCase.createdAt,
      customRules: newCase.customRules,
      parties: newCase.parties,
      caseNumber: newCase.caseNumber,
      declarationNumber: newCase.declarationNumber,
      extractedMetadata: newCase.extractedMetadata,
      roadmap: newCase.roadmap,
      courtSimulator: newCase.courtSimulator,
      deadlines: newCase.deadlines,
      ganttPhases: newCase.ganttPhases,
      hearingsFeedbackHistory: newCase.hearingsFeedbackHistory,
      pleading: newCase.pleading
    });
    setActiveCaseId(newCaseId);
    setActiveTab("dashboard");
  };

  const handleSelectCase = (id: string) => {
    const sc = savedCases.find((c) => c.id === id);
    if (sc) {
      setCurrentCase({
        title: sc.title,
        category: sc.category,
        notes: sc.notes,
        parties: sc.parties,
        caseNumber: sc.caseNumber,
        extractedMetadata: sc.extractedMetadata,
        roadmap: sc.roadmap,
        courtSimulator: sc.courtSimulator,
        deadlines: sc.deadlines,
        ganttPhases: sc.ganttPhases,
        hearingsFeedbackHistory: sc.hearingsFeedbackHistory,
        pleading: sc.pleading
      });
      setActiveCaseId(id);
    }
  };

  const handleDeleteCase = (id: string) => {
    const updated = savedCases.filter((c) => c.id !== id);
    saveCasesToStorage(updated);
    if (activeCaseId === id) {
      setActiveCaseId(null);
      setCurrentCase(null);
    }
  };

  const handleUpdateFeedback = (feedbacks: HearingFeedback[]) => {
    if (!currentCase) return;
    const updatedCase = {
      ...currentCase,
      hearingsFeedbackHistory: feedbacks
    };
    setCurrentCase(updatedCase);

    if (activeCaseId) {
      const updatedList = savedCases.map(sc => {
        if (sc.id === activeCaseId) {
          return {
            ...sc,
            hearingsFeedbackHistory: feedbacks
          };
        }
        return sc;
      });
      saveCasesToStorage(updatedList);
    }
  };

  const handleUpdateDeadlines = (deadlines: LegalDeadline[]) => {
    if (!currentCase) return;
    const updatedCase = {
      ...currentCase,
      deadlines
    };
    setCurrentCase(updatedCase);

    if (activeCaseId) {
      const updatedList = savedCases.map(sc => {
        if (sc.id === activeCaseId) {
          return {
            ...sc,
            deadlines
          };
        }
        return sc;
      });
      saveCasesToStorage(updatedList);
    }
  };

  const handleUpdateGanttPhases = (ganttPhases: GanttPhase[]) => {
    if (!currentCase) return;
    const updatedCase = {
      ...currentCase,
      ganttPhases
    };
    setCurrentCase(updatedCase);

    if (activeCaseId) {
      const updatedList = savedCases.map(sc => {
        if (sc.id === activeCaseId) {
          return {
            ...sc,
            ganttPhases
          };
        }
        return sc;
      });
      saveCasesToStorage(updatedList);
    }
  };

  // Helper placeholder case for Wakilyar general chat
  const emptyCasePlaceholder: LegalCase = {
    id: "",
    title: "سوالات عمومی حقوقی",
    caseNumber: "",
    declarationNumber: "",
    parties: { plaintiff: "", defendant: "" },
    category: "civil",
    createdAt: "",
    rawNotes: "",
    customRules: "",
    extractedMetadata: {},
    roadmap: { steps: [], missingDetails: [] },
    pleading: null,
    courtSimulator: { opposingArguments: [], judgeExpectedQuestions: [], scenarios: [] },
    deadlines: [],
    ganttPhases: [],
    hearingsFeedbackHistory: []
  };

  // Switch to new empty case mode
  const handleStartNewCase = () => {
    setCurrentCase(null);
    setActiveCaseId(null);
    setActiveTab("dashboard");
  };

  // Close/unload active case from memory
  const handleCloseActiveCase = () => {
    setCurrentCase(null);
    setActiveCaseId(null);
  };

  return (
    <div dir="rtl" className="h-screen bg-[#F8FAFC] text-slate-900 antialiased font-sans flex overflow-hidden relative">
      
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/75 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Right Sidebar - Desktop permanent sidebar, mobile sliding drawer */}
      <aside 
        id="aistudio-sidebar" 
        className={`fixed md:static inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-[#0B1120] border-l border-slate-800/80 h-full flex flex-col justify-between shrink-0 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#2563eb] rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/20">
              و
            </div>
            <div>
              <h1 className="text-sm font-black text-white leading-tight">وکیلیار</h1>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">سامانه هوشمند وکالت و دادرسی</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-300 text-[9px] px-2.5 py-0.5 bg-blue-950/60 border border-blue-800/60 rounded-full font-black">
              نسخه حرفه‌ای
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="بستن منو"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          
          {/* CATEGORY 1: داشبورد و تحلیل */}
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              داشبورد و تحلیل
            </h3>
            
            {/* Dashboard Link */}
            <button
              onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === "dashboard" ? "text-white" : "text-slate-500"}`} />
                <span>میز کار و تحلیل لایحه</span>
              </div>
              {activeTab === "dashboard" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>

            {/* Cases Link */}
            <button
              onClick={() => { setActiveTab("cases"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "cases"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder className={`w-4 h-4 ${activeTab === "cases" ? "text-white" : "text-slate-500"}`} />
                <span>آرشیو پرونده‌ها و جستجو</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black ${
                  activeTab === "cases" ? "bg-[#1e40af] text-slate-100" : "bg-slate-800 text-slate-400"
                }`}>
                  {savedCases.length}
                </span>
                {activeTab === "cases" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
              </div>
            </button>
          </div>

          {/* CATEGORY 2: برنامه‌ریزی قضایی */}
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              برنامه‌ریزی قضایی
            </h3>

            {/* Gantt / Calendar Link */}
            <button
              onClick={() => { setActiveTab("calendar"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar className={`w-4 h-4 ${activeTab === "calendar" ? "text-white" : "text-slate-500"}`} />
                <span>گانت چارت و تقویم</span>
              </div>
              {activeTab === "calendar" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>

            {/* Reminders Link */}
            <button
              onClick={() => { setActiveTab("reminders"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "reminders"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Bell className={`w-4 h-4 ${activeTab === "reminders" ? "text-white" : "text-slate-500"}`} />
                <span>کارپوشه و یادآوری‌ها</span>
              </div>
              {activeTab === "reminders" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>
          </div>

          {/* CATEGORY 3: ابزار هوشمند دادرسی */}
          <div className="space-y-1">
            <h3 className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              ابزار هوشمند دادرسی
            </h3>

            {/* Copilot Chat (Wakilyar) Link */}
            <button
              onClick={() => { setActiveTab("copilot"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className={`w-4 h-4 ${activeTab === "copilot" ? "text-white" : "text-slate-500"}`} />
                <span>وکیلیار (مشاوره هوشمند)</span>
              </div>
              {activeTab === "copilot" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>

            {/* Court Simulator Link */}
            <button
              onClick={() => { setActiveTab("simulator"); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between py-2.5 px-3.5 text-xs font-bold rounded-xl transition duration-150 cursor-pointer ${
                activeTab === "simulator"
                  ? "bg-[#2563eb] text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className={`w-4 h-4 ${activeTab === "simulator" ? "text-white" : "text-slate-500"}`} />
                <span>شبیه‌ساز تهاجمی دادگاه</span>
              </div>
              {activeTab === "simulator" && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
            </button>
          </div>

          {/* MY CASES SECTION */}
          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                پرونده‌های من
              </span>
              <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full font-bold">
                {savedCases.length}
              </span>
            </div>

            <div className="space-y-1">
              {savedCases.map((sc) => {
                const isActive = sc.id === activeCaseId;
                return (
                  <button
                    key={sc.id}
                    onClick={() => { handleSelectCase(sc.id); setIsMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-2.5 py-2 px-3 text-right text-xs font-bold rounded-xl transition cursor-pointer ${
                      isActive
                        ? "bg-slate-800 text-white border border-slate-700/80 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Radio bullet indicator matching the screenshot */}
                    <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                      isActive ? "border-blue-500 bg-blue-500" : "border-slate-600"
                    }`}>
                      {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <span className="truncate flex-1 text-[11px] leading-tight">
                      {sc.title}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => { handleStartNewCase(); setIsMobileMenuOpen(false); }}
                className="w-full mt-2 py-2 px-3 text-right text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded-xl transition flex items-center gap-2 cursor-pointer border border-dashed border-blue-900/40"
              >
                <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">+ ثبت پرونده جدید</span>
              </button>
            </div>
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-[#070b14]">
          <div className="flex items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md ring-2 ring-blue-500/20">
                HA
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] font-bold text-slate-200 truncate font-mono">hadiahmadi64@gmail.com</span>
                <span className="inline-block text-[8px] font-black bg-blue-950/80 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded-md mt-0.5">
                  حساب ویژه وکلا (PRO)
                </span>
              </div>
            </div>
          </div>

          {/* Quick status controls */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-800/60">
            <button 
              onClick={() => setThinkingMode(!thinkingMode)} 
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition duration-150 cursor-pointer ${
                thinkingMode 
                  ? "bg-amber-950/40 text-amber-400 border-amber-900/60" 
                  : "bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200"
              }`}
              title="تغییر وضعیت استدلال عمیق مدل"
            >
              <Brain className={`w-3 h-3 ${thinkingMode ? "text-amber-500 animate-pulse" : "text-slate-500"}`} />
              <span>{thinkingMode ? "استدلال فعال" : "استدلال عادی"}</span>
            </button>

            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>Gemini 3.5</span>
            </div>
          </div>

        </div>

      </aside>

      {/* Main Content Workspace Panel on the LEFT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        
        {/* Top Header - Fully responsive with Hamburger Menu */}
        <header className="min-h-14 sm:h-16 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger button for mobile */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -mr-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              aria-label="باز کردن منوی ناوبری"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Title with badge matching screenshot */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <h1 className="text-xs sm:text-base font-black text-slate-800 tracking-tight truncate">
                برنامه‌ریزی و دادرسی پرونده‌های وکیل
              </h1>
              <span className="hidden sm:inline-flex text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 items-center gap-1 shadow-xs shrink-0">
                <span>پیش‌آگاهانه</span>
              </span>
            </div>

            {/* Subtitle with live dot */}
            <div className="hidden xl:flex items-center gap-2 text-xs font-medium text-slate-400 border-r border-slate-200 pr-3 mr-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>آخرین پایش وضعیت پرونده‌ها: زنده</span>
            </div>
          </div>

          {/* Action buttons on the left (in RTL) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg sm:rounded-xl transition duration-150 cursor-pointer shadow-md shadow-blue-500/20"
              title="پرینت نسخه رسمی پرونده"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">پرینت نسخه رسمی</span>
            </button>

            <button
              onClick={handleStartNewCase}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg sm:rounded-xl transition duration-150 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline sm:inline">پرونده جدید</span>
            </button>
          </div>
        </header>

        {/* Scrollable Content Pane with responsive padding and mobile bottom padding */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 pb-24 md:pb-6 bg-[#F8FAFC]">
          
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 mb-6 text-rose-800 text-xs font-medium leading-relaxed">
              <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <div>
                <strong className="block font-bold text-rose-900 mb-0.5">خطای سیستمی پرونده</strong>
                <p>{error}</p>
                <p className="text-rose-600 mt-1">لطفاً اتصال اینترنت خود یا کلید امنیتی <strong>GEMINI_API_KEY</strong> را در پنل Secrets بازبینی فرمایید.</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="min-h-[500px] bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center shadow-sm text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800">در حال تحلیل هوشمند شواهد و استخراج متادیتا (OCR)...</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed font-medium">
                سیستم در حال تطابق زمانی پرونده با تقویم، تفکیک فازهای گانت چارت، کشف طرفین دعوا و پیش‌بینی سناریوهای دفاعی بر اساس قوانین مجازات اسلامی و آیین دادرسی مدنی ایران است.
              </p>
              
              {/* Visual Step Logs */}
              <div className="mt-8 space-y-2.5 max-w-xs text-right text-xs text-slate-400 font-bold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                  <span>در حال استخراج متادیتا و اوراق پرونده (OCR)...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350"></div>
                  <span>در حال محاسبه فرجه اعتراض و روزشمار تقویم...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-350"></div>
                  <span>در حال تحلیل رفتار قاضی و شبیه‌سازی تاکتیک رقیب...</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full">
              
              {/* Dashboard Tab Workspace */}
              {activeTab === "dashboard" && (
                <div className="space-y-6">
                  {/* The 6 Pastel Overview Cards matching the screenshot! */}
                  <DashboardOverviewCards 
                    onNavigate={(tab) => setActiveTab(tab)}
                    onOpenLegalRates={() => setIsLegalRatesOpen(true)}
                    onStartNewCase={handleStartNewCase}
                    urgentCount={currentCase?.deadlines?.length || 3}
                  />

                  {currentCase ? (
                    <CaseDashboardView 
                      caseData={currentCase} 
                      onDraftPleading={handleDraftPleading} 
                      isDrafting={isDrafting} 
                    />
                  ) : (
                    <div className="space-y-6">
                      <NotesInput 
                        onGenerate={handleGenerate} 
                        isLoading={isLoading} 
                        savedCases={savedCases}
                        onSaveToExistingCase={handleSaveToExistingCase}
                        onSaveNewCase={handleSaveNewCase}
                      />
                      
                      {/* Interactive Help Banner */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs text-center">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 flex items-center justify-center mb-4 shadow-inner">
                          <Scale className="w-6 h-6" />
                        </div>
                        <h2 className="text-base font-black text-slate-800">میز کار قضایی وکیل مدافع</h2>
                        <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed font-medium">
                          اطلاعات خام پرونده خود را در کادر بالا وارد کنید، یا از پرونده‌های پیش‌فرض در منوی سمت راست برای بررسی شبیه‌ساز دادگاه، گانت چارت زمان‌بندی و تنظیم لایحه استفاده فرمایید.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cases Tab Workspace with Search */}
              {activeTab === "cases" && (
                <CasesArchiveView 
                  cases={savedCases}
                  activeId={activeCaseId}
                  onSelect={handleSelectCase}
                  onDelete={handleDeleteCase}
                  onSaveCurrent={handleSaveCurrent}
                  canSaveCurrent={currentCase !== null && activeCaseId === null}
                  currentCase={currentCase}
                  onStartNewCase={handleStartNewCase}
                  onSwitchTab={(tab) => setActiveTab(tab)}
                />
              )}

              {/* Gantt & Calendar Tab Workspace */}
              {activeTab === "calendar" && (
                currentCase ? (
                  <CalendarGanttView 
                    caseData={currentCase} 
                    onUpdateDeadlines={handleUpdateDeadlines} 
                    onUpdateGanttPhases={handleUpdateGanttPhases} 
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm h-full min-h-[300px]">
                    <Calendar className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">پرونده‌ای بارگذاری نشده است</h3>
                    <p className="text-xs text-slate-450 max-w-md leading-relaxed mt-1">
                      برای دسترسی به گانت چارت زمان‌بندی دادرسی و شمارش معکوس تقویم مواعد قضایی، ابتدا پرونده‌ای را از بخش «پرونده‌ها» بارگذاری کرده یا پرونده جدیدی در «داشبورد» ثبت کنید.
                    </p>
                  </div>
                )
              )}

              {/* Reminders Tab Workspace */}
              {activeTab === "reminders" && (
                <RemindersView 
                  caseData={currentCase}
                  onUpdateDeadlines={handleUpdateDeadlines}
                />
              )}

              {/* Copilot Chat Tab Workspace (Wakilyar Copilot) */}
              {activeTab === "copilot" && (
                <CopilotChat 
                  caseData={currentCase || emptyCasePlaceholder} 
                  thinkingMode={thinkingMode} 
                />
              )}

              {/* Court Simulator Tab Workspace */}
              {activeTab === "simulator" && (
                currentCase ? (
                  <CourtSimulatorView 
                    caseData={currentCase} 
                    onUpdateFeedback={handleUpdateFeedback} 
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center shadow-sm h-full min-h-[300px]">
                    <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-sm font-bold text-slate-700">شبیه‌ساز دادگاه غیرفعال است</h3>
                    <p className="text-xs text-slate-450 max-w-md leading-relaxed mt-1">
                      آزمون فرضیه‌ها، پیش‌بینی سؤالات قاضی و شبیه‌سازی سناریوهای تهاجمی وکیل رقیب نیازمند مستندات یک پرونده فعال است. لطفاً پرونده‌ای را بارگذاری یا ثبت فرمایید.
                    </p>
                  </div>
                )
              )}

            </div>
          )}
        </main>

        {/* Minimal status bar footer matching the real Google AI Studio workspace (desktop only) */}
        <footer className="hidden md:flex h-8 bg-white border-t border-slate-200 px-6 items-center justify-between shrink-0 text-[10px] text-slate-400 font-bold">
          <div className="flex gap-4">
            <span className="flex items-center">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full ml-1.5 animate-pulse"></span>
              سامانه هوشمند پشتیبانی تصمیم‌ساز قضایی
            </span>
          </div>
          <div>طراحی شده ویژه وکلای رسمی دادگستری ایران</div>
        </footer>

      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="منوی دسترسی سریع موبایل" className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around py-1.5 px-1 shadow-2xl">
        <button
          onClick={() => { setActiveTab("dashboard"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition ${
            activeTab === "dashboard" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>میز کار</span>
        </button>

        <button
          onClick={() => { setActiveTab("cases"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition relative ${
            activeTab === "cases" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Folder className="w-4 h-4" />
          <span>پرونده‌ها</span>
          {savedCases.length > 0 && (
            <span className="absolute 0 top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 text-white text-[8px] font-black rounded-full flex items-center justify-center">
              {savedCases.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("calendar"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition ${
            activeTab === "calendar" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>تقویم</span>
        </button>

        <button
          onClick={() => { setActiveTab("reminders"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition ${
            activeTab === "reminders" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>کارپوشه</span>
        </button>

        <button
          onClick={() => { setActiveTab("copilot"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition ${
            activeTab === "copilot" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>وکیلیار</span>
        </button>

        <button
          onClick={() => { setActiveTab("simulator"); setIsMobileMenuOpen(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[9px] font-bold transition ${
            activeTab === "simulator" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>شبیه‌ساز</span>
        </button>
      </nav>

      {/* Modals */}
      <LegalRatesModal 
        isOpen={isLegalRatesOpen} 
        onClose={() => setIsLegalRatesOpen(false)} 
      />

      <CasePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        caseData={currentCase} 
      />

    </div>
  );
}
