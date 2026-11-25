// Mavr HR bot — statik matnlar (menyu bo'limlari).
// Bu yerdagi matnlarni bemalol tahrirlashingiz mumkin — kodga tegmaydi.

const MENU = {
    vacancies: '💼 Bo\'sh ish o\'rinlari',
    about: '🏢 Biz haqimizda',
    why: '✨ Nega aynan Mavr?',
    faq: '❓ Ko\'p beriladigan savollar',
    contact: '📞 HR bilan aloqa',
};

const WELCOME = (name) => `Assalomu alaykum${name ? ', ' + name : ''}! 👋

Bu — <b>Mavr o'quv markazi</b>ning rasmiy kadrlar boti.

Bu yerda ochiq vakansiyalarni ko'rib, bir necha daqiqada ariza qoldirishingiz mumkin.
Rezyume (CV) talab qilinmaydi — faqat bir nechta savolga javob berasiz va 1 dona fotosurat yuborasiz.

Quyidagi menyudan boshlang 👇`;

const ABOUT = `🏢 <b>Mavr o'quv markazi</b>

Biz — chet tillari va maktabgacha/maktab tayyorlov yo'nalishlarida ishlaydigan o'quv markazimiz.
Asosiy yo'nalishlarimiz: ingliz tili, rus tili, nemis va koreys tillari, matematika, ona tili hamda
Prezident va Al-Xorazmiy maktablariga tayyorlov (PMT).

<b>Qadriyatlarimiz:</b>
• Natija — o'quvchi gapira olsa, biz ishimizni bajardik
• Intizom va shaffoflik — jadval ham, to'lov ham o'z vaqtida
• Jamoa — bir-birini qo'llab-quvvatlaydigan yosh va tirishqoq ustozlar

Ish faqat markazda (oflayn) olib boriladi — masofaviy ish varianti yo'q.`;

const WHY = `✨ <b>Nega aynan Mavr?</b>

🏫 <b>Zamonaviy sharoit</b> — 6 ta jihozlangan shinam o'quv xonasi
📍 <b>Qulay lokatsiya</b> — transport bilan yetib kelish oson
🤝 <b>Do'stona jamoa</b> — yangi kelgan xodim yolg'iz qolmaydi
💳 <b>Shaffof darsbay to'lov</b> — har bir o'tilgan dars hisoblanadi va o'z vaqtida to'lanadi
🎁 <b>Bonuslar</b> — natijaga qarab qo'shimcha rag'batlantirish
📈 <b>O'sish</b> — ustozdan metodistgacha, menejerdan bo'lim rahbarigacha`;

const FAQ = `❓ <b>Ko'p beriladigan savollar</b>

<b>1. Suhbat qanday bosqichlardan iborat?</b>
Ariza → HR bilan telefon suhbati → markazda suhbat → amaliy topshiriq/ochiq dars → yakuniy suhbat.

<b>2. Sinov muddati bormi?</b>
Ha, odatda 1 oy. Sinov davri ham to'liq to'lanadi.

<b>3. Talaba bo'lsam ishlay olamanmi?</b>
Ha. Ustozlar uchun smenalar 14:00 – 17:00 oralig'ida ham mavjud — o'qishga xalal bermaydi.

<b>4. Rezyume (CV) kerakmi?</b>
Yo'q. Ariza uchun faqat shu bot savollariga javob berish va 1 dona fotosurat yetarli.

<b>5. Javobni qachon olaman?</b>
Ariza HR bo'limiga tushishi bilan ko'rib chiqiladi. Mos nomzodlarga odatda 1-3 ish kuni ichida qo'ng'iroq qilamiz.

<b>6. Ish oflaynmi?</b>
Ha, barcha xodimlar markazga kelib ishlaydi.`;

const CONTACT = (hrLink) => `📞 <b>HR bilan aloqa</b>

Savolingiz bo'lsa, to'g'ridan-to'g'ri yozishingiz mumkin: ${hrLink}

Ish vaqti: Dushanba – Shanba, 09:00 – 18:00

Ariza qoldirish uchun esa menyudan "${MENU.vacancies}" tugmasini bosing.`;

const CHOOSE_VACANCY = `💼 <b>Ochiq vakansiyalar</b>

O'zingizga mos yo'nalishni tanlang — shundan keyin qisqa anketa boshlanadi:`;

const FINISH = (channelUrl) => `✅ <b>Rahmat! Arizangiz muvaffaqiyatli qabul qilindi</b> va Mavr o'quv markazining kadrlar bo'limiga yuborildi.

Tez orada HR mutaxassisimiz siz bilan bog'lanadi.

Kasting natijalari, markazimizdagi ochiq yangi vakansiyalar va yangiliklardan birinchi bo'lib xabardor bo'lish uchun rasmiy kanalimizga a'zo bo'ling 👇
${channelUrl}`;

module.exports = { MENU, WELCOME, ABOUT, WHY, FAQ, CONTACT, CHOOSE_VACANCY, FINISH };
