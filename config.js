window.APP_CONFIG = {
  spreadsheetId: "1hOmDl89od4_3mcFCGgQFwMbTF50SfbJinPNU1H17d4o",
  refreshTimeoutMs: 12000,
  defaultPage: "evaluations",
  pages: {
    evaluations: {
      title: "متابعة التقييمات",
      subtitle: "نعرض التقييمات المتأخرة، المستحقة اليوم، والقادمة ضمن نافذة زمنية واضحة مع فلترة بالقسم والبحث باسم الموظف.",
      tabLabel: "متابعة التقييمات",
      sheetName: "متابعة التقييمات",
      searchPlaceholder: "ابحث باسم الموظف أو القسم أو نوع التقييم...",
      filterLabel: "القسم",
      filterDefaultLabel: "كل الأقسام",
      legend: [
        "اللون الأحمر: تقييم متأخر",
        "اللون الذهبي: مستحق اليوم",
        "اللون الأخضر: تحت المتابعة"
      ],
      view: "evaluations"
    },
    generalEvents: {
      title: "المناسبات العامة",
      subtitle: "مواعيد المناسبات العامة مرتبة بوضوح بين ما يحدث اليوم، ما هو قادم، وما أصبح في الماضي.",
      tabLabel: "المناسبات العامة",
      sheetName: "المناسبات العامة",
      searchPlaceholder: "ابحث باسم المناسبة أو نوعها...",
      filterLabel: "النوع",
      filterDefaultLabel: "كل الأنواع",
      legend: [
        "اليوم: ما يحدث في نفس التاريخ",
        "القادمة: مرتبة من الأقرب إلى الأبعد",
        "الماضية: محفوظة للرجوع السريع"
      ],
      view: "events"
    },
    employeeEvents: {
      title: "مناسبات الموظفين",
      subtitle: "نعرض تكريمات ومناسبات الموظفين مع فلترة بالقسم والبحث السريع للوصول للحالة المطلوبة.",
      tabLabel: "مناسبات الموظفين",
      sheetName: "مناسبات الموظفين",
      searchPlaceholder: "ابحث باسم الموظف أو المناسبة أو القسم...",
      filterLabel: "القسم",
      filterDefaultLabel: "كل الأقسام",
      legend: [
        "القسم يساعد على تضييق النتائج",
        "التواريخ تعرض من الأقرب إلى الأبعد",
        "الماضية تبقى مرئية كأرشيف سريع"
      ],
      view: "events"
    },
    birthdays: {
      title: "أعياد الميلاد",
      subtitle: "الصفحة تحسب تاريخ عيد الميلاد القادم تلقائياً من تاريخ الميلاد الأصلي، ثم ترتبه بين اليوم، القريب، واللاحق.",
      tabLabel: "أعياد الميلاد",
      sheetName: "أعياد الميلاد",
      searchPlaceholder: "ابحث باسم الموظف أو القسم...",
      filterLabel: "القسم",
      filterDefaultLabel: "كل الأقسام",
      legend: [
        "يُحسب العيد القادم تلقائياً كل سنة",
        "يمكن عرض القادم خلال 30 أو 90 أو 365 يوماً",
        "العمر الظاهر هو العمر الحالي المسجل"
      ],
      view: "birthdays"
    }
  },
  windowOptions: {
    evaluations: [
      { value: "7", label: "7 أيام" },
      { value: "14", label: "14 يوم" },
      { value: "30", label: "30 يوم", selected: true },
      { value: "90", label: "90 يوم" },
      { value: "9999", label: "كل القادم" }
    ],
    birthdays: [
      { value: "30", label: "30 يوم" },
      { value: "90", label: "90 يوم", selected: true },
      { value: "180", label: "180 يوم" },
      { value: "365", label: "سنة كاملة" }
    ]
  }
};
