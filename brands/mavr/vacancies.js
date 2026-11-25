// Mavr HR bot — vakansiyalar va ularning savollari.
//
// Savol turlari:
//   text    — matn kiritiladi
//   choice  — inline tugmalar (options)
//   voice   — ovozli xabar (voice) majburiy
//
// `key`   — CRM'ga machine-key sifatida ketadi (TZ dagi JSON namunasi)
// `label` — CRM kartochkasida ko'rinadigan qisqa nom

// TZ dagi tartib aynan saqlangan — ro'yxat shu ketma-ketlikda chiqadi.
const VACANCIES = [
    {
        id: 'sotuv_menejer',
        name: 'Sotuv menejeri',
        questions: [
            {
                key: 'sales_experience', label: 'Sotuv tajribasi', type: 'choice',
                text: 'Sotuv sohasida (ayniqsa, telefon orqali yoki o\'quv markazlarida) tajribangiz bormi?',
                options: ['Ha, tajribam bor', 'Yo\'q, lekin tez o\'rganaman'],
            },
            {
                key: 'work_schedule_ready', label: 'Ish kuni', type: 'choice',
                text: 'Mijozlar bilan soat 08:00 dan 18:00 gacha to\'liq kun ishlashga tayyormisiz?',
                options: ['Ha, to\'liq ish kuniga tayyorman', 'Faqat yarim kun (talabaman)'],
            },
            {
                key: 'crm_sheets_experience', label: 'CRM / Sheets', type: 'choice',
                text: 'CRM tizimlari yoki Google Sheets bilan ishlaganmisiz?',
                options: ['Ha', 'Yo\'q'],
            },
            {
                key: 'voice_pitch', label: 'Ovozli topshiriq', type: 'voice',
                text: 'Iltimos, botga 45-60 soniyalik ovozli xabar (Voice) yuboring:\n\n' +
                    '"O\'zingiz haqingizda va nima uchun aynan sizni Mavr sotuv jamoasiga qabul qilishimiz kerakligi haqida erkin gapirib bering."',
            },
        ],
    },
    {
        id: 'administrator',
        name: 'Qabulxona administratori',
        questions: [
            {
                key: 'admin_experience', label: 'Administratorlik tajribasi', type: 'choice',
                text: 'Administratorlik, mijozlarni kutib olish yoki kassa bilan ishlash bo\'yicha tajribangiz bormi?',
                options: ['Ha, tajribam bor', 'Yo\'q, yangi boshlovchiman'],
            },
            {
                key: 'computer_skills', label: 'Kompyuter savodxonligi', type: 'choice',
                text: 'Kompyuter savodxonligingiz (Word, Excel, Google Sheets) darajasi qanday?',
                options: ['Yaxshi', 'O\'rtacha', 'Boshlang\'ich'],
            },
            {
                key: 'languages', label: 'Tillar', type: 'choice',
                text: 'O\'zbek va rus tillarida erkin muloqot qila olasizmi?',
                options: ['Ha, ikkala tilda ham', 'Faqat o\'zbek tilida', 'Rus tilini o\'rtacha bilaman'],
            },
            {
                key: 'shift', label: 'Smena', type: 'choice',
                text: 'Qaysi smenada ishlay olasiz?',
                options: ['To\'liq kun', 'Ertalabki smena', 'Tushdan keyingi smena'],
            },
        ],
    },
    {
        id: 'ingliz_ustoz',
        name: 'Ingliz tili ustozi',
        questions: [
            {
                key: 'english_level', label: 'Daraja / sertifikat', type: 'choice',
                text: 'Ingliz tili darajangiz / sertifikatingiz?',
                options: ['IELTS 7.5+', 'IELTS 7.0', 'CEFR C1', 'Filologiya diplomi', 'Sertifikat yo\'q'],
            },
            {
                key: 'teaching_years', label: 'Tajriba (yil)', type: 'choice',
                text: 'Dars berish tajribangiz necha yil?',
                options: ['1 yildan kam', '1-3 yil', '3 yildan ko\'p'],
            },
            {
                key: 'directions', label: 'Yo\'nalishlar', type: 'choice',
                text: 'Qaysi yo\'nalishlarda dars bera olasiz?',
                options: ['General English', 'IELTS', 'PMT tayyorlov (kichik yosh)', 'Barchasi'],
            },
            {
                key: 'shift', label: 'Smena', type: 'choice',
                text: 'Qaysi smenada dars bera olasiz?',
                options: ['Ertalab (08:00 - 12:00)', 'Tushdan keyin (14:00 - 17:00)', 'Kun bo\'yi'],
            },
            {
                key: 'voice_english', label: 'Ovozli topshiriq (EN)', type: 'voice',
                text: 'Ingliz tilida 1 daqiqalik ovozli xabar (Voice) yuboring:\n\n' +
                    '"O\'zingiz va dars o\'tish metodikangiz haqida gapirib bering."',
            },
        ],
    },
    {
        id: 'matematika_ustoz',
        name: 'Matematika ustozi',
        questions: [
            {
                key: 'education', label: 'Ma\'lumoti', type: 'text',
                text: 'Matematika fani bo\'yicha oliy ma\'lumotingiz yoki talabalik bosqichingizni yozing:',
            },
            {
                key: 'directions', label: 'Yo\'nalishlar', type: 'choice',
                text: 'Qaysi yo\'nalishlar bo\'yicha dars bera olasiz?',
                options: ['Prezident/Al-Xorazmiy maktablariga tayyorlov (PMT)', 'Abituriyent (DTM)', 'Maktab dasturi (5-9 sinf)', 'Barchasi'],
            },
            {
                key: 'center_experience', label: 'Markazdagi tajriba', type: 'text',
                text: 'O\'quv markazlarida dars berish tajribangiz qancha?',
            },
            {
                key: 'availability', label: 'Bo\'sh vaqti', type: 'text',
                text: 'Haftaning qaysi kunlari va smenasida bo\'shsiz?',
            },
        ],
    },
    {
        id: 'ona_tili_ustoz',
        name: 'Ona tili ustozi',
        questions: [
            {
                key: 'certificate', label: 'Sertifikat / toifa', type: 'choice',
                text: 'Milliy sertifikat yoki toifangiz bormi?',
                options: ['Milliy sertifikat (A / A+)', 'Oliy/1-toifa', 'Filologiya diplomi/talaba', 'Sertifikat yo\'q'],
            },
            {
                key: 'exam_prep', label: 'Attestatsiya/OTM tajribasi', type: 'choice',
                text: 'O\'quvchilarni attestatsiya yoki OTMga (Abituriyent) tayyorlash tajribangiz bormi?',
                options: ['Ha, bor', 'Faqat maktab dasturi'],
            },
            {
                key: 'teaching_years', label: 'Tajriba (yil)', type: 'text',
                text: 'Dars berish tajribangiz necha yil?',
            },
            {
                key: 'weekly_hours', label: 'Haftalik soat', type: 'text',
                text: 'Haftalik dars o\'ta oladigan soatlaringiz?',
            },
        ],
    },
    {
        id: 'rus_ustoz',
        name: 'Rus tili ustozi',
        questions: [
            {
                key: 'russian_level', label: 'Rus tili darajasi', type: 'choice',
                text: 'Rus tili darajangiz?',
                options: ['Native (ona tili)', 'C1 / Erkin', 'Filolog'],
            },
            {
                key: 'beginner_experience', label: 'Noldan o\'rgatish', type: 'choice',
                text: 'O\'zbekzabon o\'quvchilarga rus tilida so\'zlashuvni (razgovor) noldan o\'rgatish bo\'yicha tajribangiz bormi?',
                options: ['Ha, bor', 'Yo\'q'],
            },
            {
                key: 'audience', label: 'Auditoriya', type: 'choice',
                text: 'Kattalarga yoki kichik yoshdagi bolalarga dars bergansiz?',
                options: ['Kattalarga', 'Bolalarga', 'Ikkalasiga ham'],
            },
            {
                key: 'voice_russian', label: 'Ovozli topshiriq (RU)', type: 'voice',
                text: 'Rus tilida 1 daqiqalik ovozli xabar (Voice) yuboring:\n\n"O\'zingiz haqingizda qisqa tanishtiruv."',
            },
        ],
    },
    {
        id: 'nemis_ustoz',
        name: 'Nemis tili ustozi',
        questions: [
            {
                key: 'german_level', label: 'Daraja / sertifikat', type: 'choice',
                text: 'Nemis tili darajangiz va sertifikatingiz?',
                options: ['Goethe C1/C2', 'Goethe B2', 'Tilshunoslik diplomi', 'Sertifikat yo\'q'],
            },
            {
                key: 'teaching_experience', label: 'Tajriba', type: 'text',
                text: 'Nemis tilidan dars berish tajribangiz qancha?',
            },
            {
                key: 'goals', label: 'Tayyorlov maqsadi', type: 'choice',
                text: 'Asosan qaysi maqsadlar uchun tayyorlaysiz?',
                options: ['Ausbildung / Ishlash', 'Gyote imtihoni', 'Umumiy til o\'rganish'],
            },
            {
                key: 'weekly_hours', label: 'Haftalik vaqt', type: 'text',
                text: 'Haftalik dars o\'ta oladigan vaqtingiz?',
            },
        ],
    },
    {
        id: 'koreys_ustoz',
        name: 'Koreys tili ustozi',
        questions: [
            {
                key: 'topik', label: 'TOPIK sertifikati', type: 'choice',
                text: 'Koreys tili sertifikatingiz (TOPIK)?',
                options: ['TOPIK 5-6', 'TOPIK 4', 'EPS-TOPIK', 'Sertifikat yo\'q'],
            },
            {
                key: 'korea_experience', label: 'Koreyada tajriba', type: 'choice',
                text: 'Koreyada o\'qish/yashash tajribangiz bormi?',
                options: ['Ha, bor', 'Yo\'q'],
            },
            {
                key: 'teaching_years', label: 'Tajriba (yil)', type: 'text',
                text: 'Koreys tilidan dars berish tajribangiz necha yil?',
            },
            {
                key: 'weekly_hours', label: 'Haftalik soat', type: 'text',
                text: 'Haftalik dars bera oladigan soatlaringiz?',
            },
        ],
    },
    {
        id: 'filial_menejer',
        name: 'Filial menejeri',
        questions: [
            {
                key: 'management_experience', label: 'Boshqaruv tajribasi', type: 'choice',
                text: 'O\'quv markazi, filial yoki boshqa loyihalarni boshqarish bo\'yicha tajribangiz bormi?',
                options: ['Ha, 1-3 yil', 'Ha, 3 yildan ko\'p', 'Yo\'q, boshqaruv tajribam yo\'q'],
            },
            {
                key: 'team_size', label: 'Jamoa hajmi', type: 'text',
                text: 'Eng ko\'pi bilan necha kishilik jamoani boshqargansiz?',
            },
            {
                key: 'operations', label: 'Operatsion jarayonlar', type: 'choice',
                text: 'Filialning operatsion jarayonlari (davomat, to\'lovlar, o\'qituvchilar intizomi, sotuv nazorati) bilan ishlash qobiliyatingiz bormi?',
                options: ['Ha, to\'liq boshqara olaman', 'Qisman tajribam bor'],
            },
            {
                key: 'main_result', label: 'Asosiy natija', type: 'text',
                text: 'Oldingi boshqargan filialingiz yoki jamoangizda qanday asosiy natijaga erishgansiz?',
            },
        ],
    },
    {
        id: 'rop',
        name: 'Sotuv bo\'limi rahbari (ROP)',
        questions: [
            {
                key: 'sales_experience', label: 'Sotuvdagi tajriba', type: 'choice',
                text: 'Sotuv sohasidagi umumiy tajribangiz?',
                options: ['1 yildan kam', '1-3 yil', '3 yildan ko\'p'],
            },
            {
                key: 'team_management', label: 'Jamoa boshqaruvi', type: 'text',
                text: 'Sotuv bo\'limini boshqarish tajribangiz bormi va eng ko\'pi bilan necha nafar menejerni boshqargansiz?',
            },
            {
                key: 'crm_systems', label: 'CRM tizimlari', type: 'choice',
                text: 'Qaysi CRM tizimlarida ishlagansiz?',
                options: ['amoCRM', 'Bitrix24', 'Boshqa CRM', 'Ishlamaganman'],
            },
            {
                key: 'best_result', label: 'Eng yuqori natija', type: 'text',
                text: 'Avvalgi ish joyingizda jamoangiz bilan erishgan eng yuqori oylik savdo natijasi (aylanma yoki sotuv soni)?',
            },
            {
                key: 'office_ready', label: 'Ofisda ishlash', type: 'choice',
                text: 'Soat 09:00 dan 18:00 gacha to\'liq markazda (ofisda) ishlashga tayyormisiz?',
                options: ['Ha', 'Yo\'q'],
            },
        ],
    },
];

// ── Umumiy savollar (barcha nomzodlar uchun majburiy) ───────────────────────
const COMMON_QUESTIONS = [
    {
        key: 'full_name', type: 'text',
        text: '1/8. Ism va Familiyangizni yozing:',
        validate: v => v.trim().split(/\s+/).join(' ').length >= 3 || 'Ism va familiyangizni to\'liq yozing.',
    },
    {
        key: 'telegram_phone', type: 'contact',
        text: '2/8. Telefon raqamingizni pastdagi tugma orqali yuboring 👇\n\n' +
            'Bu Telegramga ulangan raqamingiz — u avtomatik jo\'natiladi.',
    },
    {
        key: 'contact_phone', type: 'text',
        text: '3/8. Qo\'ng\'iroqlar uchun faol ishlatadigan ikkinchi telefon raqamingizni kiriting.\n' +
            '(Telegram raqamingiz bilan bir xil bo\'lsa ham qayta yozing.)\n\nMasalan: +998901234567',
        validate: v => (String(v).replace(/\D/g, '').length >= 9) || 'Raqamni to\'liq kiriting, masalan: +998901234567',
    },
    {
        key: 'address', type: 'text',
        text: '4/8. Yashash manzilingiz (shahar/tuman)?\n\nMasalan: Toshkent shahri, Chilonzor tumani',
        validate: v => v.trim().length >= 3 || 'Manzilni yozing.',
    },
    {
        key: 'birth_year', type: 'text',
        text: '5/8. Tug\'ilgan yilingiz? (Masalan: 1999)',
        validate: v => {
            const year = Number(String(v).replace(/\D/g, ''));
            const now = new Date().getFullYear();
            return (year >= 1950 && year <= now - 14) || 'Tug\'ilgan yilni to\'g\'ri kiriting (masalan: 1999).';
        },
    },
    {
        key: 'has_laptop', type: 'choice',
        text: '6/8. Shaxsiy noutbukingiz bormi?',
        options: ['Ha, bor', 'Yo\'q'],
    },
    {
        key: 'ready_for_office', type: 'choice',
        text: '7/8. Ish to\'liq markazimizda (ofisda) bo\'ladi. Kelib ishlashga tayyormisiz?',
        options: ['Ha, tayyorman', 'Yo\'q'],
    },
    {
        key: 'photo', type: 'photo',
        text: '8/8. Fotosuratingizni yuboring.\n\n' +
            'O\'zingiz yaqqol ko\'ringan 1 dona sifatli rasmingizni yuboring. Rasmiy bo\'lishi shart emas — ' +
            'oddiy selfi yoki erkin fotosurat ham bo\'ladi.',
    },
];

function findVacancy(id) {
    return VACANCIES.find(v => v.id === id) || null;
}

module.exports = { VACANCIES, COMMON_QUESTIONS, findVacancy };
