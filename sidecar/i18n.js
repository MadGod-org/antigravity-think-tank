(function exposeThinkTankI18n(root) {
  const copy = {
    "اتاق فکر (Think Tank)": "Think Tank", "اتاق فکر": "Think Tank", "Think Tank · فضای مستقل": "Think Tank · Workspace", "Think Tank · هم‌فکری زنده": "Think Tank · Live Collaboration",
    "گفت‌وگوی تازه": "New conversation", "نمای کلی": "Overview", "گفت‌وگوها": "Conversations", "اعضای تیم": "Team",
    "جریان کار": "Activity", "تنظیمات": "Settings", "گفت‌وگوهای ساخته‌شده از پنل": "Conversations created in this panel",
    "هنوز گفت‌وگویی ساخته نشده": "No conversations created yet", "در حال اتصال به اتاق فکر": "Connecting to Think Tank",
    "نسخهٔ رابط ۰٫۲": "Panel version 0.2", "جریان زنده": "Live activity", "این فعالیت در گفت‌وگوی جاری اتاق فکر است": "This activity belongs to the current Think Tank session",
    "نشست جاری": "Current session", "دیدن گفت‌وگوهای اتاق": "View room conversations", "فضای مستقل اتاق فکر": "Standalone Think Tank workspace", "اتاق فکر زنده و پیوسته": "Live and continuous Think Tank",
    "هم‌فکری پروژه، با جریان واقعی": "Project collaboration, with live activity", "گفت‌وگوها، پیام‌ها، اجرای ابزارها و وضعیت زیرعامل‌ها از ساب‌ایجنت‌ها می‌آیند؛ این پنل رویداد ساختگی نشان نمی‌دهد.": "Conversations, messages, tool calls, and subagent status are live. This panel does not show simulated events.",
    "گفت‌وگوها، پیام‌ها، اجرای ابزارها و وضعیت زیرعامل‌ها به صورت زنده ثبت می‌شوند؛ این پنل رویداد ساختگی نشان نمی‌دهد.": "Conversations, messages, tool calls, and subagent status are live. This panel does not show simulated events.",
    "وضعیت اتصال": "Connection status", "در حال بررسی": "Checking", "اتاق فکر محلی": "Local Think Tank", "Think Tank زنده": "Live Think Tank", "گفت‌وگوهای ثبت‌شده": "Conversations recorded",
    "فقط گفت‌وگوهایی که از این اتاق فکر ساخته شده‌اند": "Only conversations created from this Think Tank", "زیرعامل‌های فعال": "Active subagents",
    "از رویدادهای واقعی همکاری ساب‌ایجنت‌ها": "Based on real subagent collaboration events", "رویدادهای جریان پنل": "Panel activity events",
    "پیام، ابزار، بازبینی و وضعیت رسیده از ساب‌ایجنت‌ها": "Messages, tools, reviews, and status updates received from subagents", "پیام، ابزار، بازبینی و وضعیت رسیده از زیرعامل‌ها": "Messages, tools, reviews, and status updates received from subagents", "سقف دور هر نقش": "Round limit per role",
    "۰": "0", "۵۰": "50", "قابل تنظیم؛ سقف حداکثر است، نه سهمیهٔ مصرف": "Configurable maximum, not a quota to use up", "شروع کار": "Get started",
    "یک گفت‌وگوی تازه بساز": "Start a new conversation", "عنوان گفت‌وگو": "Conversation title", "مسیر پروژه": "Project path", "دسترسی فایل‌ها": "File access",
    "طبق تنظیم پیش‌فرض": "Use default settings", "فقط‌خواندنی": "Read only", "نوشتن فقط در پوشهٔ پروژه": "Write only in the project folder",
    "این انتخاب فقط برای همین گفت‌وگوست؛ تنظیم تأییدهای امنیتی هم برقرار می‌ماند.": "This applies only to this conversation. Security settings still apply.",
    "شرح کار": "Task details", "ابزارها و تغییرات از سیاست تأیید و حاکمیت پیروی می‌کنند.": "Tools and changes follow approval and governance policies.",
    "ساخت گفت‌وگو": "Create conversation", "روند اجرا": "How it works", "از درخواست تا بازبینی": "From request to review", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "تقسیم کار": "Delegate work", "عامل اصلی بخش‌های مستقل را به زیرعامل‌ها می‌سپارد.": "The main agent assigns independent parts of the task to subagents.", "با رخداد واقعی": "Real events",
    "هم‌کاری و اجرا": "Collaboration and execution", "پیام‌ها و فراخوانی ابزارها به محض دریافت نمایش داده می‌شوند.": "Messages and tool calls appear as soon as they arrive.",
    "بازبینی مدیریتی": "Manager review", "پیش از تحویل، نتیجه و دلیل‌های موافق و مخالف ثبت می‌شوند.": "The result and reasons for or against further work are recorded before delivery.",
    "درخواست از عامل": "Requested from the agent", "تصمیم با اطمینان پایین": "Decision when confidence is low", "اگر برآورد عامل زیر ۹۵٪ باشد، ادامه یا توقف را از کاربر می‌پرسد.": "If the agent's estimate is below 95%, it asks the user whether to continue or stop.",
    "نیازمند کاربر": "Needs your input", "عدد اطمینان، برآورد خوداظهاری عامل است و احتمال کالیبره‌شده نیست.": "The confidence value is the agent's own estimate, not a calibrated probability.",
    "گفت‌وگوی جاری و زیرعامل‌ها": "Current conversation and subagents",
    "نام گفت‌وگوی اصلی بالا مشخص است؛ فهرست کنار صفحه گفت‌وگوهای ساخته‌شده در همین نشست را نشان می‌دهد.": "The current conversation is shown above. The side list contains only conversations created in this session.",
    "＋ گفت‌وگوی تازه": "+ New conversation", "گفت‌وگوی اصلی این فعالیت": "Main conversation for this activity",
    "پیام‌های این گفت‌وگوی اصلی در نشست ثبت می‌شوند؛ فهرست زیر فقط مکالمه‌های همین نشست میزبان را دارد.": "Messages from the main conversation are recorded in the session. The list below contains only conversations created in this host session.",
    "گفت‌وگوهای ساخته‌شده در پنل": "Conversations created in this panel", "گفت‌وگویی انتخاب نشده": "No conversation selected", "یک گفت‌وگوی تازه بساز یا از فهرست کناری یکی را انتخاب کن.": "Start a new conversation or choose one from the side list.",
    "پروژه": "Project", "گفت‌وگو": "Conversation", "آماده": "Ready", "پیام‌ها": "Messages", "اقدام‌ها": "Actions",
    "نمایش پیام‌های همین گفت‌وگو؛ پیام‌های نشست‌های دیگر در این بخش نمی‌آیند.": "Messages from this conversation only. Messages from other sessions do not appear here.",
    "ارسال": "Send",
    "پیام‌ها، واگذاری‌ها و وضعیت ابزارها از رخدادهای واقعی ساب‌ایجنت‌ها می‌آیند.": "Messages, delegations, and tool status come from real subagent events.",
    "نقش‌ها و مسئولیت‌ها": "Roles and responsibilities",
    "پروفایل‌ها نقش‌های آماده را نشان می‌دهند؛ وضعیت فعال بر اساس رخدادهای واقعی ساب‌ایجنت‌ها تغییر می‌کند.": "Profiles describe available roles. Active status changes based on real subagent events.",
    "۰ عضو فعال": "0 active members", "همهٔ نقش‌ها": "All roles", "هستهٔ اتاق فکر": "Think Tank core", "طراحی و مهندسی": "Design and engineering", "بازبینی و کیفیت": "Review and quality", "تخصص‌های تکمیلی": "Additional specialists",
    "رخدادهای دریافتی از نشست زندهٔ پنل": "Events received from the panel's live session",
    "رخدادهای واقعیِ گفت‌وگوهای ساخته‌شده از همین اتاق، با زمان دریافت نمایش داده می‌شوند. پیام‌ها و ابزارهای زیرعامل‌ها به صورت زنده نمایش داده می‌شوند.": "Real events from conversations created in this room are shown with their receive time. Subagent messages and tools are displayed live.",
    "رویداد": "Event", "هنوز گفت‌وگویی از این اتاق شروع نشده؛ پس رخداد زنده‌ای برای نمایش نیست.": "No conversation has been started from this room, so there are no live events to show.", "چه چیزهایی ثبت می‌شود؟": "What is recorded?",
    "شروع و پایان نوبت": "Turn start and completion", "پیام‌های قابل‌مشاهدهٔ عامل": "Visible agent messages", "نام ابزار، نوع فعالیت و وضعیت واقعی": "Tool name, activity type, and actual status",
    "همکاری زیرعامل‌ها و تغییرات ثبت‌شدهٔ فایل": "Subagent collaboration and recorded file changes", "درخواست اجازه و تصمیم کاربر": "Approval requests and user decisions",
    "درخواست‌ها و خروجی خام ابزار ذخیره نمی‌شوند. توکن‌های شناخته‌شده از متن نمایشی حذف می‌شوند.": "Requests and raw tool output are not stored. Recognized tokens are removed from displayed text.",
    "حدود اجرایی و نمایش": "Execution limits and display", "تنظیمات اتاق": "Room settings", "عدد هر نقش سقف دورهای مجاز است. عامل‌ها موظف‌اند کار را به محض کفایت شواهد تمام کنند.": "Each role's value is the maximum allowed rounds. Agents should stop as soon as there is enough evidence.",
    "حاکمیت کار": "Work limits", "سقف دورها برای هر نقش": "Round limits by role", "مقدار مجاز: ۱ تا ۵۰۰ دور": "Allowed range: 1–500 rounds", "ذخیرهٔ تغییرات": "Save changes", "سیاست پایان کار": "Completion policy",
    "اتاق فکر از همهٔ ظرفیت استفاده نمی‌کند. وقتی عامل فکر کند کار تمام است، بازبین مدیریتی نتیجه را بررسی می‌کند و عامل اصلی و بازبین نظرشان را جمع‌بندی می‌کنند.": "The Think Tank does not use every available round. When an agent believes the work is done, the manager reviews the result and the main agent and reviewer summarize their views.",
    "اگر برآورد خوداظهاری زیر ۹۵٪ باشد، اتاق خلاصهٔ وضعیت، دلیل‌های ادامه، دلیل‌های توقف و پرسش تصمیم را برای کاربر می‌فرستد.": "If the agent's estimate is below 95%, the room sends the user a status summary, reasons to continue, reasons to stop, and a decision question.",
    "۹۵٪": "95%", "آستانهٔ پرسش از کاربر": "Threshold for asking the user", "برآورد عامل، نه سنجهٔ مستقل": "Agent estimate, not an independent measure", "تصمیم لازم است": "Decision required",
    "اتاق فکر برای ادامه اجازه می‌خواهد": "Think Tank needs approval to continue", "رد کردن": "Decline", "اجازه برای همین درخواست": "Approve this request", "این تصمیم فقط برای همین درخواست است؛ هیچ دسترسی دائمی ثبت نمی‌شود.": "This decision applies only to this request. No permanent access is granted.",
    "عضو فعال": "active members", "نقش": "role", "نقش‌ها": "roles", "مهارت‌های": "Skills for", "سقف دورها برای": "Round limit for",
    "به اتاق فکر وصل است": "Connected to Think Tank", "اتصال برقرار نیست": "Not connected", "اتصال برقرار است": "Connected", "در انتظار اتصال": "Waiting for connection",
    "سرور اتاق فکر در دسترس نیست.": "Think Tank server is unavailable.",
    "عنوان گفت‌وگو در دسترس نیست": "Conversation title unavailable", "نشست مشخص نیست": "Session not identified", "از گفت‌وگوی موردنظر، پنل اتاق فکر را باز کن.": "Open the Think Tank panel from the conversation you want to inspect.",
    "شناسهٔ گفت‌وگوی میزبان": "Host conversation ID", "نمای جداشده؛ داده‌های نشست‌های دیگر پنهان‌اند": "Detached view; other sessions are hidden", "نشست وصل نیست": "No session connected", "نشست میزبان مشخص نیست": "Host session not identified",
    "تا وقتی این پنل از یک گفت‌وگوی فعال باز نشود، فهرست، پیام‌ها و رویدادها خالی می‌مانند.": "Until this panel is opened from an active conversation, its list, messages, and events remain empty.",
    "عامل": "Agent", "زیرعامل": "Subagent", "هماهنگ‌کننده": "Coordinator", "گفت‌وگوی هماهنگ‌کننده": "Coordinator conversation", "گفت‌وگوی زیرعامل": "Subagent conversation",
    "نمایش پیام‌های همین گفت‌وگو؛ پیام‌های هماهنگ‌کننده ورودی کارند و پاسخ‌ها از خود زیرعامل می‌آیند.": "Messages from this conversation only. The coordinator's messages are task instructions, and replies come from the subagent.",
    "رخدادهای همین گفت‌وگو با نام فرستنده و گیرنده؛ برای دیدن پاسخ زیرعامل، گفت‌وگوی او را از فهرست کناری باز کن.": "Events from this conversation with sender and recipient. To see a subagent's replies, open its conversation from the side list.",
    "هنوز پیامی در این گفت‌وگو ثبت نشده است. پیام‌های دریافتی و پاسخ‌های واقعی اینجا نمایش داده می‌شوند.": "No messages are recorded in this conversation yet. Incoming messages and real replies will appear here.",
    "هنوز اقدامی برای این گفت‌وگو ثبت نشده است. واگذاری کار، اجرای ابزار و تغییر وضعیت‌ها اینجا می‌آیند.": "No actions are recorded for this conversation yet. Delegations, tool calls, and status changes will appear here.",
    "زمان دریافت این رویداد در پنل": "Time this event was received by the panel", "زمان دریافت پیام در پنل": "Time this message was received by the panel", "زمان دریافت رویداد در پنل": "Time this event was received by the panel",
    "تغییر پوسته": "Change theme", "تغییر پوسته به روشن": "Switch to light theme", "تغییر پوسته به تیره": "Switch to dark theme", "درخواست انجام نشد": "Request failed",
    "نمای کلی": "Overview", "فهرست نقش‌ها بارگیری نشد.": "Could not load the role list.", "در حال کار": "Working", "گفت‌وگوی اصلی": "Main conversation", "آمادهٔ استفاده": "Ready", "پروفایل نصب نشده": "Profile not installed",
    "کار جاری": "Current task", "یک گزینه انتخاب کن": "Choose an option", "گزینه": "Option", "گزینهٔ دیگر": "Other option", "پاسخ": "Answer", "پاسخ دیگر": "Other answer",
    "اتاق فکر منتظر تصمیم شماست.": "Think Tank is waiting for your decision.", "اتاق فکر برای ادامه پاسخ شما را می‌خواهد.": "Think Tank needs your answer to continue.", "گفت‌وگوی فرعی در همین نشست ساخته شد.": "A child conversation was created in this session.",
    "گفت‌وگوی واقعی اتاق فکر ساخته شد.": "Think Tank conversation created.", "کار فعال این گفت‌وگو متوقف شود؟": "Stop the active work in this conversation?", "درخواست توقف فرستاده شد.": "Stop request sent.",
    "تغییرات ذخیره شد.": "Changes saved.", "سقف دورهای نقش‌ها به‌روز شد.": "Role round limits updated.", "بخشی از تاریخچه از سرور دریافت نشد؛ جریان زنده همچنان فعال است.": "Some history could not be loaded; live updates are still active.",
    "بازپیوستن به جریان زنده…": "Reconnecting to live updates…", "رویداد زنده": "Live event", "فعالیت ابزار": "Tool activity", "وضعیت دریافتی": "Received status",
    "پیام برای همین درخواست فرستاده شد.": "Your answer was sent for this request.", "درخواست بدون پاسخ بسته شد.": "Request closed without an answer.", "اجازه برای همین درخواست ثبت شد.": "Approval recorded for this request.", "درخواست رد شد.": "Request declined.",
    "برای ادامهٔ کار، تصمیم تو لازم است.": "Your decision is needed to continue.", "فهرست نقش‌ها بارگیری نشد": "Could not load roles", "زمان دریافت این رویداد در پنل": "Time this event was received by the panel",
    "English": "English", "فارسی": "Persian",
    "پروژه بدون عنوان": "Untitled project", "هم‌اندیشی زنده": "Live collaboration", "فعال": "Active",
    "طرح پیشنهادی در انتظار تصمیم": "Proposal awaiting decision", "کلیک برای مشاهده و تصمیم‌گیری": "Click to inspect and decide", "بررسی و تصمیم": "Review and decide",
    "طرح پیشنهادی اتاق فکر": "Think Tank Proposal", "استدلال و تفکر:": "Reasoning & Thought:",
    "هنوز ابزار یا فرمانی در این نشست اجرا نشده است.": "No tool or terminal command has executed in this session yet.",
    "تأیید و اجرا": "Approve & Execute", "درخواست اصلاح": "Request Revision", "توقف نشست": "Halt Session", "بستن": "Close",
    "گفت‌وگو با این ایجنت": "Chat with Agent", "در حال کار / Working": "Working / در حال کار",
    "در حال اجرا": "Working", "در حال اجرا / Working": "Working / در حال اجرا",
    // Subtasks WBS Board & Council Consensus Matrix & Deliberation Bar
    "ساختار شکست کار (WBS) و هماهنگی ساب‌ایجنت‌ها": "Work Breakdown Structure (WBS) & Subagent Coordination",
    "بورد تقسیم کار و پیشرفت پروژه": "Work Breakdown & Project Progress Board",
    "پیشرفت کل": "overall progress",
    "از": "of",
    "تسک تکمیل‌شده": "completed subtasks",
    "＋ واگذاری تسک جدید": "+ Assign new subtask",
    "عنوان تسک یا زیربخش پروژه (مثلاً: ممیزی امنیتی API یا طراحی کامپوننت)…": "Subtask title or project component (e.g., API security audit or UI component)…",
    "مدیر تیم و هماهنگ‌کننده (team-manager)": "Team Manager & Coordinator (team-manager)",
    "معمار ارشد شورا (council-architect)": "Council Solution Architect (council-architect)",
    "منتقد و تحلیل‌گر ریسک (council-critic)": "Council Risk Critic (council-critic)",
    "معمار رابط کاربری (ui-frontend-designer)": "UI & Frontend Architect (ui-frontend-designer)",
    "ممیز بک‌اند و امنیت (backend-auditor)": "Backend & Security Auditor (backend-auditor)",
    "بازبین کد (code-reviewer)": "Code Reviewer (code-reviewer)",
    "بازبین کیفیت و تست (qa-reviewer)": "QA & Test Reviewer (qa-reviewer)",
    "بازبین بصری و دسترس‌پذیری (visual-qa)": "Visual & Accessibility QA (visual-qa)",
    "بازبین یکپارچگی (integration-reviewer)": "Integration Reviewer (integration-reviewer)",
    "پژوهشگر مستندات (research-scout)": "Documentation Researcher (research-scout)",
    "اپراتور فنی وردپرس (wp_technical_operator)": "WordPress Technical Operator (wp_technical_operator)",
    "متخصص سئو فروشگاهی (ecommerce_seo_operator)": "E-Commerce SEO Specialist (ecommerce_seo_operator)",
    "اولویت بالا": "High priority",
    "اولویت عادی": "Normal priority",
    "اولویت پایین": "Low priority",
    "فوری / حیاتی": "Critical / Urgent",
    "خروجی مورد انتظار (Deliverable)…": "Expected deliverable…",
    "ثبت و ارجاع": "Assign & Dispatch",
    "هنوز تسک خردشده‌ای برای این پروژه ثبت نشده است. مدیر تیم یا شما می‌توانید بخش‌های کار را به ساب‌ایجنت‌ها واگذار کنید.": "No subtasks have been assigned for this project yet. The Team Manager or you can delegate tasks to subagents.",
    "نمایش پیام‌ها، تصمیم‌گیری‌های شورا و مکالمات زندهٔ ساب‌ایجنت‌ها در این نشست.": "Showing live messages, council decisions, and subagent dialogues in this session.",
    "مخاطب:": "Target:",
    "انتخاب ساب‌ایجنت مخاطب": "Select target subagent",
    "همهٔ اعضای اتاق فکر (عمومی)": "All Think Tank members (General)",
    "مدیر تیم (team-manager)": "Team Manager (team-manager)",
    "معمار شورا (council-architect)": "Council Architect (council-architect)",
    "منتقد شورا (council-critic)": "Council Critic (council-critic)",
    "ممیز بک‌اند (backend-auditor)": "Backend Auditor (backend-auditor)",
    "بازبین کیفیت (qa-reviewer)": "QA Reviewer (qa-reviewer)",
    "بازبین بصری (visual-qa)": "Visual QA (visual-qa)",
    "نوار هدف‌گیری و نوع تعامل": "Target and interaction mode bar",
    "حالت پیام": "Message mode",
    "💬 پیام": "💬 Message",
    "📋 واگذاری تسک": "📋 Assign Task",
    "⚔ ثبت نقد": "⚔ Critique",
    "❓ پرسش فنی": "❓ Question",
    "🤝 رأی شورا": "🤝 Council Vote",
    "واگذاری تسک": "Assign Task",
    "گفت‌وگو": "Chat",
    "اکشن‌ها": "Actions",
    "توقف": "Pause",
    "فعال‌سازی": "Activate",
    "متوقف‌شده": "Paused",
    "واگذارشده": "Assigned",
    "آمادهٔ بازبینی": "Ready for review",
    "تکمیل‌شده": "Completed",
    "مسدود / نیازمند بررسی": "Blocked / Needs review",
    "خروجی و شواهد:": "Deliverable & Evidence:",
    "▶ شروع اجرا": "▶ Start",
    "🔍 بازبینی": "🔍 Review",
    "✓ تکمیل شد": "✓ Complete",
    "تسک‌های واگذارشده:": "Assigned subtasks:",
    "تکمیل": "done",
    "ماتریس آراء، توافق و نقدهای شورای ساب‌ایجنت‌ها": "Subagent Council Consensus, Votes & Critiques Matrix",
    "✅ موافق": "✅ Approve",
    "⚠️ موافقت مشروط": "⚠️ Conditional",
    "⚔ نقد و چالش": "⚔ Critique",
    "🛑 مخالف": "🛑 Reject",
    "نقد:": "Critique:",
    "ارائه‌دهنده:": "Author:",
    "طرح راهبردی اتاق فکر": "Think Tank Strategic Plan",
    "طرح و تسک با موفقیت تکمیل شد": "Plan and task completed successfully",
    "طرح تأیید شد و در فاز اجراست": "Plan approved and in execution",
    "درخواست بازنگری و اصلاح": "Revision requested",
    "نشست متوقف شد": "Session halted",
    "تصمیم ثبت‌شده:": "Recorded decision:",
    "استدلال و تفکر درونی": "Internal Reasoning & Thought",
    "نقد و بازبینی موشکافانه": "Critical Review & Counter-Argument",
    "پرسش یا نکتهٔ نیازمند شفاف‌سازی": "Question or Clarification Needed",
    "مباحثهٔ زیرعامل‌ها": "Subagent Dialogue",
    "در حال گفتگو با": "Collaborating with",
    "مخاطب": "Recipient",
    "کاربر": "User",
    "پارامترها:": "Parameters:",
    "خروجی:": "Output:",
    "کار جاری:": "Current task:",
    "ابزار فعال:": "Active tool:",
    "فکر جاری:": "Current thought:",
    "در حال گفت‌وگو با:": "Collaborating with:",
    "متصل به Antigravity (زنده)": "Connected to Antigravity (Live)",
    "متصل به موتور آنتی‌گرویتی": "Connected to Antigravity Engine",
    "در انتظار دریافت عنوان نشست": "Waiting for session title",
    "پیام بعدی را بنویس…": "Write the next message…",
    "عنوان و شرح تسک برای واگذاری به ساب‌ایجنت انتخاب‌شده…": "Subtask title and instructions for the selected subagent…",
    "نقد فنی، ریسک یا چالش معماری را وارد کن…": "Enter technical critique, risk, or architectural challenge…",
    "پرسش فنی یا ابهامی که نیاز به شفاف‌سازی دارد…": "Enter technical question or point needing clarification…",
    "جمع‌بندی رأی و نظر شورا دربارهٔ طرح فعلی…": "Enter council vote summary and rationale for the current plan…",
    "فرمان ترمینال": "Terminal command",
    "فرمان پس‌زمینه": "Background task",
    "اجرای ابزار": "Tool execution",
    "همکاری ساب‌ایجنت‌ها": "Subagent collaboration",
    "پیام": "Message",
    "فکر": "Thought",
    "مشاهده کامل": "Full view",
    "گزارش کامل و جزئیات فنی": "Full Technical Report & Details",
    "متن کامل پیام و گزارش": "Full Message & Report Text",
    "ساب‌ایجنت‌های مشارکت‌کننده در تکمیل تسک": "Participating Subagents in Task Completion",
    "در حال فکر و اجرا": "Thinking & Working",
    "مخاطب انتخاب‌شده": "Selected Target",
    "آمادهٔ گفت‌وگو و دریافت دستور مستقیم در چت‌روم": "Ready for direct chat and instructions in the chatroom",
    "در حال پایش و هم‌فکری زنده در اتاق فکر…": "Actively monitoring and deliberating in the Think Tank…",
    "کیوریتور داده و شواهد (data-intelligence-curator)": "Data Intelligence Curator (data-intelligence-curator)",
    "بازبین نقاد شواهد (evidence-critical-reviewer)": "Evidence Critical Reviewer (evidence-critical-reviewer)",
    "ممیز نیازمندی‌ها (requirements-auditor)": "Requirements Auditor (requirements-auditor)",
    "کیوریتور حافظه و کانتکست (context-memory-curator)": "Context Memory Curator (context-memory-curator)",
    "تحلیل‌گر کارایی و هزینه (performance-cost-analyst)": "Performance & Cost Analyst (performance-cost-analyst)",
  };

  const roleEnglish = {
    main_agent: ["Main Agent", "Task direction and final delivery", "Understands the request, delegates work according to its scope, and delivers a verified result."],
    manager: ["Team Manager", "Oversight, risk, and governance", "Checks the work against evidence, identifies gaps, and recommends whether to continue or finish."],
    coordinator: ["Coordinator", "Delegation and follow-up", "Clarifies dependencies and ownership, then tracks the actual status of each part."],
    deep_research_specialist: ["Deep Research Specialist", "Multi-source research and evidence", "Conducts evidence-based research and evaluates claims using JEV and SUBQ frameworks."],
    designer_solver: ["UI and Frontend Designer", "Interface, experience, and dark-mode design", "Designs or reviews hierarchy, typography, responsive behavior, accessibility, and microinteractions."],
    ui_frontend_designer: ["UI and Frontend Designer", "Interface, experience, and dark-mode design", "Designs or reviews hierarchy, typography, responsive behavior, accessibility, and microinteractions."],
    council_architect: ["Solution Architect", "Cloud architecture and system design", "Clarifies technical options, distributed architecture, and tradeoffs before implementation."],
    architect: ["Solution Architect", "System design and options", "Clarifies technical options and tradeoffs before implementation, with decision criteria."],
    truth_auditor: ["Truth & Evidence Auditor", "Claim verification and rigorous review", "Audits claims and deliverables against files, events, and actual test results."],
    council_critic: ["Council Critic", "Assumptions and failure scenarios", "Finds hidden assumptions and likely failure paths, and proposes a test for each."],
    critic: ["Plan Critic", "Assumptions and likely failure modes", "Finds hidden assumptions and likely failure paths, and proposes a test for each."],
    code_reviewer: ["Backend & Code Auditor", "Code quality, APIs, and security", "Independently reviews code changes, API contracts, backend stability, and potential vulnerabilities."],
    reviewer: ["Code Reviewer", "Material defects and contracts", "Independently reviews changes and reports findings with severity, evidence, and location."],
    qa_reviewer: ["QA Specialist", "Comprehensive testing and regressions", "Checks core and edge scenarios, validates responsiveness, accessibility, and actual test passes."],
    wp_technical_operator: ["WordPress Technical Operator", "WordPress, WooCommerce, and performance SRE", "Diagnoses query bottlenecks, database autoload health, Redis caching, and automated safe repairs."],
    ecommerce_seo_operator: ["E-Commerce SEO Specialist", "Catalog SEO, metadata, and high-CTR copy", "Optimizes luxury perfume and store catalog metadata, search ranking, and persuasive copywriting."],
    seo_specialist: ["SEO Specialist", "Technical, content, and ecommerce SEO", "Uses data and search intent to identify measurable technical and content improvements."],
    telegram_channel_director: ["Telegram Channel Director", "Editorial planning and zero-token dispatching", "Manages automated zero-token news dispatching, copywriting, and pacing for @GeG_HuB."],
    firestore_rules_author: ["Firestore Rules Architect", "Security rules and database access models", "Authors declarative, secure Firestore and Firebase access rules with verified tests."],
    firebase_rules_author: ["Firebase Rules Specialist", "Access rules and data models", "Reviews and proposes Firebase security rules against allowed and denied scenarios."],
    flutter_a11y_agent: ["Flutter Accessibility Specialist", "Mobile UX and accessibility auditing", "Audits screen-reader semantics, focus states, responsive layouts, and contrast in Flutter apps."],
    image_generator: ["Visual Asset Creator", "Custom visual and graphic generation", "Directs high-quality graphic assets and visual illustrations for project needs."],
    image_generation: ["Visual Asset Specialist", "Visual asset selection and creation", "Defines visual needs and creates a product-aligned asset when a suitable tool is available."],
    implementer: ["Implementer", "Code changes and integration", "Implements an assigned part of the work and reports the change with verification results."],
    backend_engineer: ["Backend Engineer", "APIs, data, and service logic", "Analyzes or implements API contracts, data models, concurrency, and service errors."],
    security_reviewer: ["Security Specialist", "Threats, access, and data protection", "Reviews trust boundaries, permissions, inputs, and data retention, then states risks precisely."],
    translator: ["Translator and Localizer", "Translation, tone, and localization", "Adapts meaning, tone, and terminology naturally for the target language and locale."],
    integration_reviewer: ["Integration Reviewer", "Component contracts and event sync", "Checks contracts and event flow between components, then identifies integration gaps."],
    agent_evaluator: ["Agent Evaluator", "Performance quality and evidence", "Evaluates agent performance from real examples, output quality, and boundary compliance."],
    skill_coach: ["Skill Coach", "Skills and workflows", "Matches available skills to the task and changes skill guidance only with explicit approval."],
    research_scout: ["Researcher", "Focused research and sources", "Turns a question into a practical research path and reports sourced findings with uncertainty."],
    content_editor: ["Content Editor", "Writing, structure, and publishing", "Makes content clear and natural for its audience and channel, and flags claims needing sources."],
    channel_distribution: ["Channel Distribution Specialist", "Content planning and multichannel delivery", "Adapts content per channel and keeps draft, scheduled, and delivered states distinct."],
    code_explorer: ["Code Explorer", "Code structure and entry points", "Finds relevant entry points, dependencies, and contracts, then provides a concise, documented map."],
    documentation_researcher: ["Documentation Researcher", "Official documentation and sources", "Checks official documentation and project contracts, and reports traceable findings."],
    data_intelligence_curator: ["Data Intelligence Curator", "Data intake, classification, and evidence ledger", "Extracts and normalizes important records, classifies sensitivity and priority (P0–P3), and builds a source-referenced evidence ledger."],
    evidence_critical_reviewer: ["Evidence Critical Reviewer", "Independent claim critique and source provenance", "Independently evaluates material claims, assumptions, contradictions, and source provenance before issuing verification verdicts."],
    requirements_auditor: ["Requirements Auditor", "Acceptance criteria traceability and scope coverage", "Maps user requirements into testable acceptance criteria and audits deliverables and test outputs against them."],
    context_memory_curator: ["Context Memory Curator", "Compact, traceable context and decision handoffs", "Maintains verified decisions and source-linked facts for bounded agent handoffs without promoting hypotheses or leaking sensitive data."],
    performance_cost_analyst: ["Performance & Cost Analyst", "Measured token efficiency, latency, and duplicate-work audit", "Audits actual logs and tool calls to detect redundant scans, duplicate delegations, and measurable efficiency improvements."],
  };

  const skillNames = {
    "accessibility-qa":"Accessibility QA", "agent-evaluation":"Agent evaluation", "agent-output-scoring":"Agent output scoring", "agents-sdk":"Agents SDK", "backend-engineering":"Backend engineering", "backend-quality":"Backend quality", "browser-check":"Browser testing", cloudflare:"Cloudflare",
    "cloudflare-one":"Cloudflare One", "codebase-exploration":"Codebase exploration", "content-editing":"Content editing", "content-operations":"Content operations", "context-budget":"Context budgeting", "context-cost-control":"Context & cost control", "dark-mode-visuals":"Dark mode design", "data-intake-tiering":"Data intake & tiering", "deep-research":"Deep research",
    "design-director":"Design direction", "design-handoff":"Design handoff", "design-to-code":"Design to code", "design-tokens":"Design tokens", "documentation-researcher":"Documentation research", "durable-objects":"Durable Objects", "evidence-verification":"Evidence verification",
    figma:"Figma", "find-skills":"Skill discovery", firebase:"Firebase", "firebase-security-rules-auditor":"Firebase security rules auditor", "firestore-rules-author":"Firestore rules", "firestore-rules-creation":"Firestore rules creation", "flutter-a11y":"Flutter accessibility", "flutter-build-responsive-layout":"Flutter responsive layout", "frontend-quality":"Frontend quality", imagegen:"Image generation",
    localization:"Localization", microinteractions:"Microinteractions", "motion-design":"Motion design", "neuronwriter":"NeuronWriter NLP SEO", "perfume-ecommerce-seo":"Ecommerce SEO", "persian-first-copy":"Persian-first writing", "quality-gate":"Quality review",
    "receiving-code-review":"Code review response", "requirements-traceability":"Requirements traceability", "research-compact":"Compact research", "research-director":"Research director", "responsive-layout":"Responsive layout", "risk-analysis":"Risk analysis", "sandbox-sdk":"Sandbox SDK", "security-review":"Security review", "seo-optimizer":"SEO optimizer", "skill-coaching":"Skill coaching",
    "skill-creator":"Skill authoring", "subq-decision-layer":"SubQ decision layer", "jev-decision-layer":"JEV decision layer", "task-orchestration":"Task orchestration", "task-router":"Task routing", "telegram-agent-director":"Telegram agent director", "telegram-channel-director":"Telegram channel management", "telegram-management":"Telegram management", "test-driven-development":"Test-driven development", "think-room":"Think Tank collaboration",
    "translation-review":"Translation review", "verification-before-completion":"Pre-completion verification", "web-perf":"Web performance", "woo-catalog-manager":"WooCommerce catalog management", "woocommerce-technical-operator":"WooCommerce operations",
    "workers-best-practices":"Workers best practices", "wp-content-editor":"WordPress content editing", "wp-integration-guide":"WordPress integration", "wp-operations-safe":"Safe WordPress operations", "wp-performance-diagnostics":"WordPress performance diagnostics", "wp-search-analytics":"Search analytics", "wp-security-guardian":"WordPress security",
    "wp-security-review":"WordPress security review", "wp-seo-auditor":"SEO auditing", "wp-seo-editor":"SEO editing", "wp-technical-operator":"WordPress technical operations",
  };

  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const liveLabels = new Set();
  let language = "fa";

  function translate(value, locale = language) {
    if (locale !== "en" || typeof value !== "string") return value;
    return copy[value] || value;
  }

  function roleText(role, field, locale = language) {
    if (!role || typeof role !== "object") return "";
    const translated = locale === "en" ? roleEnglish[role.id] : null;
    if (translated) {
      const index = { title: 0, specialty: 1, description: 2 }[field];
      if (index !== undefined) return translated[index];
    }
    if (field === "title" || field === "specialty" || field === "description") return role[field] || "";
    return role[field] || "";
  }

  function formatNumber(value, locale = language) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    return number.toLocaleString(locale === "en" ? "en-US" : "fa-IR");
  }

  function setLocalizedText(element, persianText) {
    if (!element || typeof persianText !== "string") return;
    element.dataset.ttFaText = persianText;
    liveLabels.add(element);
    element.textContent = translate(persianText);
  }

  function translateStaticContent(locale) {
    if (typeof document === "undefined") return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
      const parent = textNode.parentElement;
      if (!parent || parent.closest("[data-tt-fa-text], [dir=auto], .message-text")) continue;
      if (!originals.has(textNode)) originals.set(textNode, textNode.nodeValue);
      const original = originals.get(textNode);
      const content = original.trim();
      const translated = locale === "en" ? translate(content, locale) : content;
      if (translated !== content) {
        const leading = original.match(/^\s*/)?.[0] || "";
        const trailing = original.match(/\s*$/)?.[0] || "";
        textNode.nodeValue = `${leading}${translated}${trailing}`;
      } else {
        textNode.nodeValue = original;
      }
    }

    const translatableAttributes = ["aria-label", "aria-description", "placeholder", "title"];
    for (const element of document.querySelectorAll("body *")) {
      if (element === document.getElementById("language-toggle")) continue;
      let saved = attributeOriginals.get(element);
      if (!saved) { saved = {}; attributeOriginals.set(element, saved); }
      for (const attribute of translatableAttributes) {
        if (!element.hasAttribute(attribute)) continue;
        if (!(attribute in saved)) saved[attribute] = element.getAttribute(attribute);
        element.setAttribute(attribute, translate(saved[attribute], locale));
      }
    }
    for (const element of [...liveLabels]) {
      if (!element.isConnected) { liveLabels.delete(element); continue; }
      element.textContent = translate(element.dataset.ttFaText, locale);
    }
  }

  function applyLanguage(locale = "fa", notify = false) {
    language = locale === "en" ? "en" : "fa";
    if (typeof document === "undefined") return language;
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
    document.documentElement.dataset.language = language;
    translateStaticContent(language);
    const button = document.getElementById("language-toggle");
    if (button) {
      button.textContent = language === "en" ? "فارسی" : "English";
      button.setAttribute("aria-label", language === "en" ? "Switch to Persian" : "تغییر زبان به انگلیسی");
      button.title = language === "en" ? "Switch panel language" : "تغییر زبان پنل";
    }
    if (notify && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("thinktank:languagechange", { detail: { language } }));
    return language;
  }

  function getLanguage() {
    if (typeof window === "undefined") return "fa";
    try { return localStorage.getItem("thinktank-language") === "en" ? "en" : "fa"; }
    catch { return "fa"; }
  }

  function setLanguage(locale) {
    const chosen = locale === "en" ? "en" : "fa";
    try { localStorage.setItem("thinktank-language", chosen); } catch { /* Language still changes for this page. */ }
    return applyLanguage(chosen, true);
  }

  const api = { translate, roleText, formatNumber, setLocalizedText, applyLanguage, getLanguage, setLanguage, skillNames };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.ThinkTankI18n = api;
    applyLanguage(getLanguage());
  }
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null));
