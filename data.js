window.APP_FALLBACK_DATA = {
  evaluations: (window.EMPLOYEES || []).map(employee => ({
    name: employee.name,
    department: employee.department,
    hireDate: employee.hireDate,
    evaluations: employee.evaluations,
    finalStatus: employee.finalStatus
  })),
  events: {
    "المناسبات العامة": [
      { title: "اجتماع شهري عام", category: "اجتماع", date: "2026-04-20", note: "مراجعة الأداء العام وخطة الشهر القادم.", owner: "الإدارة" },
      { title: "ورشة تطوير داخلي", category: "تدريب", date: "2026-04-24", note: "ورشة مختصرة لجميع الأقسام.", owner: "HR" }
    ],
    "مناسبات الموظفين": [
      { title: "تكريم موظف الشهر", category: "تكريم", date: "2026-04-22", note: "إعلان وتقدير داخل الشركة.", owner: "الموارد البشرية" },
      { title: "مباشرة موظف جديد", category: "مباشرة", date: "2026-04-25", note: "الترحيب بالمنضمين الجدد.", owner: "الإدارة" }
    ],
    "اعياد ميلاد": [
      { title: "عيد ميلاد أحمد", category: "عيد ميلاد", date: "2026-04-21", note: "تهنئة داخلية.", owner: "الموارد البشرية" },
      { title: "عيد ميلاد زهراء", category: "عيد ميلاد", date: "2026-04-27", note: "بطاقة تهنئة جماعية.", owner: "الموارد البشرية" }
    ]
  }
};
