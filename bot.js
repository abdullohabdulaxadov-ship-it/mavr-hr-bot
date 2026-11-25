/* ============================================================================
   HR bot — bitta kod, bir nechta brend (Mavr, Homework ...).

   Har bir brend o'z papkasida yashaydi va to'liq mustaqil:
     brands/<brend>/.env           — token, CRM, kanal, HR aloqa
     brands/<brend>/texts.js       — menyu va xabar matnlari
     brands/<brend>/vacancies.js   — vakansiyalar va savollar
     brands/<brend>/sessions.json  — to'ldirilayotgan anketalar (avtomatik)
     brands/<brend>/arizalar/      — yuborilgan arizalar nusxasi (avtomatik)
     brands/<brend>/navbat/        — CRM ga hali yetmagan arizalar (avtomatik)

   Ishga tushirish:
     node bot.js brands/mavr
     node bot.js brands/homework

   CRM_API (brend .env da) — arizani qaysi CRM ga, qanday yuborish:
     mavriyat   (standart) POST /api/hr/webhook — rasm va ovoz JSON ichida base64
     myhomework            POST /api/hr/candidates — so'ng har bir fayl (rasm,
                           ovoz, video) POST /api/hr/candidates/<id>/media/<tur>
                           ga xom baytlar bilan alohida yuboriladi

   CRM javob bermasa (o'chiq, kalit hali qo'yilmagan, tarmoq) ariza navbat/
   papkasida qoladi va har 5 daqiqada qayta yuboriladi — nomzod arizasi
   jimgina yo'qolmaydi. HR Telegram guruhiga ham yuborish mumkin (HR_CHAT_ID).
   Qo'shimcha npm paketi YO'Q — faqat Node 20+ (long polling: getUpdates).
   ========================================================================= */

const fs = require('node:fs');
const path = require('node:path');

// ── Brend papkasi ───────────────────────────────────────────────────────────
const BRAND_DIR = path.resolve(__dirname, process.argv[2] || 'brands/mavr');
if (!fs.existsSync(BRAND_DIR)) {
    console.error(`[hr-bot] XATO: brend papkasi topilmadi: ${BRAND_DIR}`);
    process.exit(1);
}
const BRAND = path.basename(BRAND_DIR);

// ── .env (brend papkasidan) ─────────────────────────────────────────────────
(function loadEnv() {
    const file = path.join(BRAND_DIR, '.env');
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m) continue;
        if (!(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
})();

// Matn va vakansiyalar — brend papkasidan (majburiy, boshqa brendnikiga tushib ketmasin)
function requireBrand(name) {
    const file = path.join(BRAND_DIR, name + '.js');
    if (!fs.existsSync(file)) {
        console.error(`[hr-bot:${BRAND}] XATO: ${name}.js yo'q — ${file}`);
        process.exit(1);
    }
    return require(file);
}
const { VACANCIES, COMMON_QUESTIONS, findVacancy } = requireBrand('vacancies');
const T = requireBrand('texts');

const TOKEN = process.env.HR_BOT_TOKEN || '';
const CRM_URL = (process.env.CRM_URL || '').replace(/\/+$/, '');
const CRM_WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET || '';
const CRM_API = (process.env.CRM_API || 'mavriyat').trim().toLowerCase();
const HR_CHAT_ID = process.env.HR_CHAT_ID || '';
const CHANNEL_URL = process.env.CHANNEL_URL || '';
const HR_CONTACT = process.env.HR_CONTACT || '';
const CENTER_NAME = process.env.CENTER_NAME || BRAND;

const LOG = `[hr-bot:${BRAND}]`;

if (!TOKEN) {
    console.error(`${LOG} XATO: HR_BOT_TOKEN ${path.join(BRAND_DIR, '.env')} faylida yo'q.`);
    process.exit(1);
}
if (!['mavriyat', 'myhomework'].includes(CRM_API)) {
    console.error(`${LOG} XATO: CRM_API="${CRM_API}" noto'g'ri — "mavriyat" yoki "myhomework" bo'lishi kerak.`);
    process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}/`;
const FILE_API = `https://api.telegram.org/file/bot${TOKEN}/`;
const SESSIONS_FILE = path.join(BRAND_DIR, 'sessions.json');
const INBOX_DIR = path.join(BRAND_DIR, 'arizalar');
const QUEUE_DIR = path.join(BRAND_DIR, 'navbat');
const FAILED_DIR = path.join(QUEUE_DIR, 'xato');
const QUEUE_RETRY_MS = 5 * 60 * 1000;
// myhomework CRM bitta faylni 20 MB gacha qabul qiladi — Telegram bot API ham
// bundan kattasini yuklab bermaydi. Mavriyat CRM ga fayl JSON ichida ketadi.
const MAX_FILE_BYTES = CRM_API === 'myhomework' ? 20 * 1024 * 1024 : 8 * 1024 * 1024;

// ── Telegram API ────────────────────────────────────────────────────────────
async function tg(method, payload, timeoutMs = 20000) {
    const res = await fetch(API + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) throw new Error(`${method}: ${data.description || res.status}`);
    return data.result;
}

function send(chatId, text, extra = {}) {
    return tg('sendMessage', {
        chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra,
    }).catch(err => console.error(`${LOG} sendMessage:`, err.message));
}

// Doimiy pastki menyu
const mainMenu = {
    keyboard: [
        [{ text: T.MENU.vacancies }],
        [{ text: T.MENU.about }, { text: T.MENU.why }],
        [{ text: T.MENU.faq }, { text: T.MENU.contact }],
    ],
    resize_keyboard: true,
};

const contactKeyboard = {
    keyboard: [[{ text: '📱 Raqamni ulashish', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
};

// Inline tugmalar: har bir variant alohida qatorda (matnlar uzun bo'lishi mumkin)
function optionsKeyboard(options, prefix) {
    return {
        inline_keyboard: options.map((opt, i) => [{ text: opt, callback_data: `${prefix}:${i}` }]),
    };
}

// ── Sessiyalar (diskda saqlanadi — bot qayta ishga tushsa yo'qolmaydi) ─────
let sessions = {};
try {
    if (fs.existsSync(SESSIONS_FILE)) sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
} catch { sessions = {}; }

let saveTimer = null;
function flushSessions() {
    clearTimeout(saveTimer);
    try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions), 'utf8'); } catch { /* muhim emas */ }
}
function saveSessions() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSessions, 400);
}

function getSession(chatId) {
    return sessions[chatId] || null;
}

function setSession(chatId, data) {
    sessions[chatId] = data;
    saveSessions();
}

function clearSession(chatId) {
    delete sessions[chatId];
    saveSessions();
}

// ── Anketa oqimi ────────────────────────────────────────────────────────────
// Savollar ro'yxati = umumiy savollar + tanlangan vakansiyaning savollari
function questionsFor(vacancyId) {
    const vacancy = findVacancy(vacancyId);
    return [...COMMON_QUESTIONS, ...(vacancy ? vacancy.questions : [])];
}

async function askCurrent(chatId) {
    const s = getSession(chatId);
    if (!s) return;
    const list = questionsFor(s.vacancyId);
    const q = list[s.step];
    if (!q) return finishApplication(chatId);

    if (q.type === 'contact') {
        return send(chatId, q.text, { reply_markup: contactKeyboard });
    }
    if (q.type === 'choice') {
        return send(chatId, q.text, { reply_markup: optionsKeyboard(q.options, 'a' + s.step) });
    }
    // text / photo / voice / video / media — oddiy xabar kutiladi
    return send(chatId, q.text, { reply_markup: { remove_keyboard: true } });
}

async function acceptAnswer(chatId, question, value) {
    const s = getSession(chatId);
    if (!s) return;
    s.answers[question.key] = value;
    s.step += 1;
    setSession(chatId, s);
    await askCurrent(chatId);
}

// ── Fayllarni yuklab olish (Telegram) ───────────────────────────────────────
// null — fayl yo'q yoki juda katta (qayta urinish foyda bermaydi);
// istisno — tarmoq xatosi (keyinroq qayta urinib ko'rish mumkin).
async function downloadFileBuffer(fileId, maxBytes = 8 * 1024 * 1024) {
    let file;
    try {
        file = await tg('getFile', { file_id: fileId });
    } catch (err) {
        if (/too big|file_id|not found/i.test(err.message)) return null;
        throw err;
    }
    if (!file?.file_path) return null;
    if (file.file_size && file.file_size > maxBytes) return null;
    const res = await fetch(FILE_API + file.file_path, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error('Telegram fayli: HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) return null;
    return { buffer, filePath: file.file_path };
}
let downloader = downloadFileBuffer;

function mimeFromPath(filePath) {
    const ext = String(filePath || '').split('.').pop().toLowerCase();
    const map = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
        ogg: 'audio/ogg', oga: 'audio/ogg', mp3: 'audio/mpeg', m4a: 'audio/mp4',
        mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
    };
    return map[ext] || 'application/octet-stream';
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// ── HR Telegram guruhiga yuborish (HR_CHAT_ID berilgan bo'lsa) ──────────────
// Fayllar qayta yuklanmaydi — o'sha bot file_id orqali boshqa chatga yubora oladi.
async function sendToHrChat(payload, fileIds) {
    const lines = [
        `🧑‍💼 <b>Yangi nomzod — ${escapeHtml(payload.vacancy_name || 'vakansiya')}</b>`,
        `🏢 ${escapeHtml(CENTER_NAME)}`,
        '',
        `👤 ${escapeHtml(payload.full_name)}${payload.telegram_username ? ' (@' + escapeHtml(payload.telegram_username) + ')' : ''}`,
        `📱 Telegram: ${escapeHtml(payload.telegram_phone || '—')}`,
        `📞 Aloqa: ${escapeHtml(payload.contact_phone || '—')}`,
        `📍 ${escapeHtml(payload.address || '—')} · ${escapeHtml(payload.birth_year || '—')}`,
        `💻 Noutbuk: ${payload.has_laptop ? 'bor' : "yo'q"} · 🏢 Ofisga: ${payload.ready_for_office ? 'tayyor' : "yo'q"}`,
    ];
    const answers = Object.entries(payload.answers_labeled || {});
    if (answers.length) {
        lines.push('');
        for (const [k, v] of answers) lines.push(`• <b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`);
    }
    await tg('sendMessage', { chat_id: HR_CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML' });
    if (fileIds.photo) await tg('sendPhoto', { chat_id: HR_CHAT_ID, photo: fileIds.photo, caption: payload.full_name });
    if (fileIds.voice) await tg('sendVoice', { chat_id: HR_CHAT_ID, voice: fileIds.voice, caption: payload.full_name });
}

// ── Ariza (job) ─────────────────────────────────────────────────────────────
const MEDIA_TYPES = new Set(['photo', 'voice', 'video', 'media']);

// Anketadagi media javoblari -> [{ kind: photo | voice | video, fileId }]
function collectMedia(list, s) {
    const files = [];
    for (const q of list) {
        if (!MEDIA_TYPES.has(q.type)) continue;
        const fileId = s.answers[q.key];
        if (!fileId) continue;
        const kind = q.type === 'media' ? ((s.mediaKinds || {})[q.key] || 'voice') : q.type;
        if (!files.some(f => f.kind === kind)) files.push({ kind, fileId });
    }
    return files;
}

function buildJob(s) {
    const vacancy = findVacancy(s.vacancyId);
    const list = questionsFor(s.vacancyId);
    const a = s.answers;

    // Vakansiyaga xos javoblar — CRM'da o'qiladigan yorliqlar bilan.
    // Media savollarida faylning o'zi emas, belgi yoziladi: myhomework CRM
    // "yuborildi" ni javoblar ro'yxatida ko'rsatmaydi, faylni o'zi ko'rsatadi.
    const answersByKey = {};
    const answersLabeled = {};
    for (const q of (vacancy ? vacancy.questions : [])) {
        const value = a[q.key];
        if (value === undefined) continue;
        let shown = value;
        if (MEDIA_TYPES.has(q.type)) {
            shown = CRM_API === 'myhomework' ? 'yuborildi'
                : q.type === 'voice' ? 'Ovozli xabar yuborilgan' : 'Fayl yuborilgan';
        }
        answersByKey[q.key] = shown;
        answersLabeled[q.label || q.key] = shown;
    }

    const voiceQ = list.find(q => q.type === 'voice');
    const fileIds = { photo: a.photo || null, voice: voiceQ ? (a[voiceQ.key] || null) : null };

    const payload = {
        brand: BRAND,
        center_name: CENTER_NAME,
        telegram_user_id: s.userId,
        telegram_username: s.username || '',
        full_name: a.full_name || '',
        telegram_phone: a.telegram_phone || '',
        contact_phone: a.contact_phone || '',
        address: a.address || '',
        birth_year: String(a.birth_year || '').replace(/\D/g, ''),
        has_laptop: /^ha/i.test(a.has_laptop || ''),
        ready_for_office: /^ha/i.test(a.ready_for_office || ''),
        vacancy_id: vacancy ? vacancy.id : '',
        vacancy_name: vacancy ? vacancy.name : '',
        answers: answersByKey,
        answers_labeled: answersLabeled,
        video_base64: null,
        utm_source: s.utmSource || 'telegram_bot',
    };

    return {
        id: `${new Date().toISOString().replace(/[:.]/g, '-')}-${s.userId}`,
        createdAt: new Date().toISOString(),
        payload,
        fileIds,                        // mavriyat: rasm + ovoz (JSON ichida)
        files: collectMedia(list, s),   // myhomework: har bir media alohida
        candidateId: null,
        uploaded: [],
        skipped: [],
        attempts: 0,
        lastError: '',
    };
}

// ── CRM ga yetkazish ────────────────────────────────────────────────────────
class CrmError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.status = status;
    }
}

// Qayta yuborish foyda bermaydigan javoblar — so'rovning o'zi noto'g'ri.
// 401 (kalit), 404, 429, 5xx va tarmoq xatolari vaqtinchalik hisoblanadi.
function isPermanent(err) {
    return [400, 413, 422].includes(err.status);
}

async function crmFetch(pathname, { headers, body, timeoutMs = 60000 }) {
    let res;
    try {
        res = await fetch(CRM_URL + pathname, {
            method: 'POST',
            headers: { 'X-Webhook-Secret': CRM_WEBHOOK_SECRET, ...headers },
            body,
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (err) {
        throw new CrmError("CRM ga ulanib bo'lmadi: " + err.message);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new CrmError(data.error || 'CRM javobi: HTTP ' + res.status, res.status);
    return data;
}

async function deliverMavriyat(job) {
    const toBase64 = async (fileId, what) => {
        if (!fileId) return null;
        try {
            const file = await downloader(fileId, MAX_FILE_BYTES);
            return file ? file.buffer.toString('base64') : null;
        } catch (err) {
            console.error(`${LOG} ${what} yuklanmadi:`, err.message);
            return null;
        }
    };
    const photoBase64 = await toBase64(job.fileIds.photo, 'rasm');
    const voiceBase64 = await toBase64(job.fileIds.voice, 'ovoz');
    const data = await crmFetch('/api/hr/webhook', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...job.payload, photo_base64: photoBase64, voice_base64: voiceBase64 }),
    });
    return 'ok id=' + data.id;
}

async function deliverMyhomework(job) {
    if (!job.candidateId) {
        const data = await crmFetch('/api/hr/candidates', {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job.payload),
        });
        if (!data.id) throw new CrmError('CRM nomzod id sini qaytarmadi');
        job.candidateId = data.id;
        // Darhol diskka: fayllarni yuborish uzilib qolsa, keyingi urinishda
        // nomzod QAYTA yaratilmaydi — faqat qolgan fayllar yuboriladi.
        writeJob(QUEUE_DIR, job);
    }
    for (const f of job.files) {
        if (job.uploaded.includes(f.kind)) continue;
        const file = await downloader(f.fileId, MAX_FILE_BYTES);
        if (!file) {
            job.skipped.push(`${f.kind}: Telegramdan olib bo'lmadi yoki 20 MB dan katta`);
        } else {
            try {
                await crmFetch(`/api/hr/candidates/${encodeURIComponent(job.candidateId)}/media/${f.kind}`, {
                    headers: {
                        'Content-Type': mimeFromPath(file.filePath),
                        'X-File-Name': path.basename(file.filePath),
                    },
                    body: file.buffer,
                    timeoutMs: 180000,
                });
            } catch (err) {
                // Nomzod CRM'da o'chirilgan yoki fayl rad etilgan — qolgan
                // fayllar shu sabab to'xtab qolmasin. "API topilmadi" (404)
                // esa CRM'da media yo'li hali deploy qilinmaganini bildiradi:
                // bunda fayl tashlanmaydi, keyinroq qayta yuboriladi.
                const candidateGone = err.status === 404 && /nomzod topilmadi/i.test(err.message);
                if (!candidateGone && !isPermanent(err)) throw err;
                job.skipped.push(`${f.kind}: ${err.message}`);
            }
        }
        job.uploaded.push(f.kind);
        writeJob(QUEUE_DIR, job);
    }
    return 'ok id=' + job.candidateId
        + (job.skipped.length ? ` (o'tkazib yuborildi: ${job.skipped.join('; ')})` : '');
}

// ── Navbat ──────────────────────────────────────────────────────────────────
function writeJob(dir, job) {
    try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, job.id + '.json'), JSON.stringify(job, null, 2), 'utf8');
    } catch (err) {
        console.error(`${LOG} navbatga yozib bo'lmadi:`, err.message);
    }
}

function removeJob(dir, job) {
    try { fs.rmSync(path.join(dir, job.id + '.json'), { force: true }); } catch { /* muhim emas */ }
}

const inFlight = new Set();

async function deliverJob(job) {
    if (!(CRM_URL && CRM_WEBHOOK_SECRET)) return 'sozlanmagan';
    if (inFlight.has(job.id)) return 'navbatda: hozir yuborilmoqda';
    inFlight.add(job.id);
    job.attempts += 1;
    try {
        const status = CRM_API === 'myhomework' ? await deliverMyhomework(job) : await deliverMavriyat(job);
        removeJob(QUEUE_DIR, job);
        return status;
    } catch (err) {
        job.lastError = err.message;
        job.lastAttemptAt = new Date().toISOString();
        if (isPermanent(err)) {
            removeJob(QUEUE_DIR, job);
            writeJob(FAILED_DIR, job);
            return 'XATO (qayta yuborilmaydi): ' + err.message;
        }
        writeJob(QUEUE_DIR, job);
        return 'navbatda: ' + err.message;
    } finally {
        inFlight.delete(job.id);
    }
}

function queuedJobNames() {
    try {
        return fs.readdirSync(QUEUE_DIR).filter(n => n.endsWith('.json')).sort();
    } catch {
        return [];
    }
}

let retrying = false;
async function retryQueue() {
    if (retrying || !(CRM_URL && CRM_WEBHOOK_SECRET)) return;
    retrying = true;
    try {
        for (const name of queuedJobNames()) {
            let job;
            try { job = JSON.parse(fs.readFileSync(path.join(QUEUE_DIR, name), 'utf8')); } catch { continue; }
            if (inFlight.has(job.id)) continue;
            const status = await deliverJob(job);
            console.log(`${LOG} NAVBAT: ${job.payload.full_name} — ${job.payload.vacancy_name} · crm=${status}`);
            // CRM hali tayyor emas — qolganlarini keyingi safar urinamiz
            if (status.startsWith('navbatda')) break;
        }
    } finally {
        retrying = false;
    }
}

// ── Arizani yakunlash ───────────────────────────────────────────────────────
async function finishApplication(chatId) {
    const s = getSession(chatId);
    if (!s) return;

    await send(chatId, '⏳ Arizangiz yuborilmoqda...', { reply_markup: { remove_keyboard: true } });

    const job = buildJob(s);
    const crmOn = Boolean(CRM_URL && CRM_WEBHOOK_SECRET);
    // Avval diskka (navbatga): bot shu lahzada o'chib qolsa ham ariza yo'qolmaydi.
    if (crmOn) writeJob(QUEUE_DIR, job);

    // CRM ga yetkazish fonda: katta video yuklanayotganda boshqa nomzodlarning
    // xabarlari kutib qolmasin.
    (async () => {
        const result = {
            crm: crmOn ? await deliverJob(job) : 'sozlanmagan',
            hrChat: 'sozlanmagan',
        };
        if (HR_CHAT_ID) {
            try {
                await sendToHrChat(job.payload, job.fileIds);
                result.hrChat = 'ok';
            } catch (err) {
                result.hrChat = 'XATO: ' + err.message;
            }
        }
        console.log(`${LOG} ARIZA: ${job.payload.full_name} — ${job.payload.vacancy_name} · crm=${result.crm} · hr-guruh=${result.hrChat}`);

        // Nusxa diskda — hech bir ariza yo'qolmasin
        try {
            fs.mkdirSync(INBOX_DIR, { recursive: true });
            fs.writeFileSync(
                path.join(INBOX_DIR, `${job.id}.json`),
                JSON.stringify({ ...job.payload, file_ids: job.fileIds, media: job.files, yuborish: result }, null, 2), 'utf8'
            );
        } catch { /* muhim emas */ }
    })().catch(err => console.error(`${LOG} arizani yetkazishda kutilmagan xato:`, err.message));

    clearSession(chatId);

    const finishExtra = CHANNEL_URL
        ? { reply_markup: { inline_keyboard: [[{ text: '📢 Rasmiy kanalga a\'zo bo\'lish', url: CHANNEL_URL }]] } }
        : {};
    await send(chatId, T.FINISH(CHANNEL_URL), finishExtra);
    await send(chatId, 'Boshqa vakansiyaga ham ariza qoldirmoqchi bo\'lsangiz — menyudan tanlang 👇', {
        reply_markup: mainMenu,
    });
}

// ── Xabarlarni qayta ishlash ────────────────────────────────────────────────
async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    const s = getSession(chatId);

    // /start — har doim menyuga qaytaradi
    if (text.startsWith('/start')) {
        const param = text.split(' ')[1] || '';
        clearSession(chatId);
        if (param) sessions['utm_' + chatId] = param;   // t.me/bot?start=manba
        await send(chatId, T.WELCOME(msg.from?.first_name || ''), { reply_markup: mainMenu });
        return;
    }
    if (text === '/bekor' || text === '/cancel') {
        clearSession(chatId);
        return send(chatId, 'Ariza bekor qilindi. Menyudan qaytadan boshlashingiz mumkin.', { reply_markup: mainMenu });
    }

    // Menyu tugmalari — anketa o'rtasida ham ishlaydi
    if (text === T.MENU.vacancies) return showVacancies(chatId);
    if (text === T.MENU.about) return send(chatId, T.ABOUT, { reply_markup: mainMenu });
    if (text === T.MENU.why) return send(chatId, T.WHY, { reply_markup: mainMenu });
    if (text === T.MENU.faq) return send(chatId, T.FAQ, { reply_markup: mainMenu });
    if (text === T.MENU.contact) return send(chatId, T.CONTACT(HR_CONTACT), { reply_markup: mainMenu });

    if (!s) {
        return send(chatId, 'Ariza qoldirish uchun menyudan <b>' + T.MENU.vacancies + '</b> tugmasini bosing 👇', {
            reply_markup: mainMenu,
        });
    }

    const list = questionsFor(s.vacancyId);
    const q = list[s.step];
    if (!q) return finishApplication(chatId);

    // 1) Kontakt (telefon raqami)
    if (q.type === 'contact') {
        if (!msg.contact) {
            return send(chatId, 'Iltimos, pastdagi <b>📱 Raqamni ulashish</b> tugmasini bosing — raqamni qo\'lda yozish bu bosqichda qabul qilinmaydi.', {
                reply_markup: contactKeyboard,
            });
        }
        let phone = String(msg.contact.phone_number || '').replace(/\s/g, '');
        if (!phone.startsWith('+')) phone = '+' + phone;
        return acceptAnswer(chatId, q, phone);
    }

    // 2) Fotosurat
    if (q.type === 'photo') {
        if (!msg.photo || !msg.photo.length) {
            return send(chatId, 'Iltimos, <b>rasm</b> yuboring (fayl yoki matn emas). O\'zingiz yaqqol ko\'ringan 1 dona surat bo\'lsa yetarli.');
        }
        const best = msg.photo[msg.photo.length - 1];   // eng sifatlisi
        return acceptAnswer(chatId, q, best.file_id);
    }

    // 3) Ovozli xabar
    if (q.type === 'voice') {
        const fileId = msg.voice?.file_id || msg.audio?.file_id || msg.video_note?.file_id;
        if (!fileId) {
            return send(chatId, 'Iltimos, <b>ovozli xabar</b> (Voice) yuboring — mikrofon tugmasini bosib turib gapiring.');
        }
        return acceptAnswer(chatId, q, fileId);
    }

    // 4) Video (oddiy yoki dumaloq)
    if (q.type === 'video') {
        const fileId = msg.video?.file_id || msg.video_note?.file_id;
        if (!fileId) {
            return send(chatId, 'Iltimos, <b>video</b> yoki dumaloq video (krujok) yuboring.');
        }
        return acceptAnswer(chatId, q, fileId);
    }

    // 5) Ovozli xabar YOKI video
    if (q.type === 'media') {
        const voiceId = msg.voice?.file_id || msg.audio?.file_id;
        const videoId = msg.video?.file_id || msg.video_note?.file_id;
        if (!voiceId && !videoId) {
            return send(chatId, 'Iltimos, <b>ovozli xabar</b> (Voice) yoki <b>video</b> yuboring.');
        }
        s.mediaKinds = { ...(s.mediaKinds || {}), [q.key]: voiceId ? 'voice' : 'video' };
        return acceptAnswer(chatId, q, voiceId || videoId);
    }

    // 6) Tugmali savol — matn kelib qolsa
    if (q.type === 'choice') {
        const index = q.options.findIndex(o => o.toLowerCase() === text.toLowerCase());
        if (index === -1) return send(chatId, 'Iltimos, yuqoridagi tugmalardan birini tanlang 👆');
        return acceptAnswer(chatId, q, q.options[index]);
    }

    // 7) Matnli savol
    if (!text) return send(chatId, 'Iltimos, javobni matn ko\'rinishida yozing.');
    if (q.validate) {
        const check = q.validate(text);
        if (check !== true) return send(chatId, '⚠️ ' + check);
    }
    return acceptAnswer(chatId, q, text);
}

async function showVacancies(chatId) {
    return send(chatId, T.CHOOSE_VACANCY, {
        reply_markup: {
            inline_keyboard: VACANCIES.map(v => [{ text: v.name, callback_data: 'vac:' + v.id }]),
        },
    });
}

async function handleCallback(cq) {
    const chatId = cq.message?.chat?.id;
    const data = cq.data || '';
    if (!chatId) return;

    await tg('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});

    // Vakansiya tanlandi -> anketa boshlanadi
    if (data.startsWith('vac:')) {
        const vacancy = findVacancy(data.slice(4));
        if (!vacancy) return send(chatId, 'Bu vakansiya topilmadi. Menyudan qaytadan tanlang.');
        setSession(chatId, {
            vacancyId: vacancy.id,
            step: 0,
            answers: {},
            userId: cq.from?.id,
            username: cq.from?.username || '',
            utmSource: sessions['utm_' + chatId] || 'telegram_bot',
            startedAt: Date.now(),
        });
        await tg('editMessageText', {
            chat_id: chatId, message_id: cq.message.message_id,
            text: `💼 Tanlangan vakansiya: <b>${escapeHtml(vacancy.name)}</b>`, parse_mode: 'HTML',
        }).catch(() => {});
        await send(chatId, 'Ajoyib! Endi qisqa anketani to\'ldiramiz — bu 2-3 daqiqa vaqt oladi.\n\n' +
            'Bekor qilish uchun istalgan payt /bekor deb yozing.');
        return askCurrent(chatId);
    }

    // Tugmali savolga javob: "a<step>:<index>"
    const m = /^a(\d+):(\d+)$/.exec(data);
    if (m) {
        const s = getSession(chatId);
        if (!s) return;
        const step = Number(m[1]);
        const index = Number(m[2]);
        if (step !== s.step) return;                    // eski xabardagi tugma
        const q = questionsFor(s.vacancyId)[step];
        if (!q || q.type !== 'choice') return;
        const value = q.options[index];
        if (value === undefined) return;

        await tg('editMessageText', {
            chat_id: chatId, message_id: cq.message.message_id,
            text: `${escapeHtml(q.text)}\n\n✅ <b>${escapeHtml(value)}</b>`, parse_mode: 'HTML',
        }).catch(() => {});
        return acceptAnswer(chatId, q, value);
    }
}

// ── Long polling ────────────────────────────────────────────────────────────
let offset = 0;
let stopped = false;

async function poll() {
    while (!stopped) {
        try {
            const updates = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] }, 40000);
            for (const u of updates) {
                offset = u.update_id + 1;
                try {
                    if (u.message) await handleMessage(u.message);
                    else if (u.callback_query) await handleCallback(u.callback_query);
                } catch (err) {
                    console.error(`${LOG} update xatosi:`, err.message);
                }
            }
        } catch (err) {
            if (!stopped) {
                console.error(`${LOG} polling:`, err.message);
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }
}

function start() {
    (async () => {
        try {
            const me = await tg('getMe', {});
            const crmOn = Boolean(CRM_URL && CRM_WEBHOOK_SECRET);
            console.log(`${LOG} Ishga tushdi: @${me.username} (${me.first_name})`);
            console.log(`${LOG} Brend: ${CENTER_NAME}`);
            console.log(`${LOG} CRM: ${crmOn ? `${CRM_URL} (${CRM_API})` : "o'chirilgan"}  |  HR guruh: ${HR_CHAT_ID || "o'chirilgan"}`);
            console.log(`${LOG} Kanal: ${CHANNEL_URL || "yo'q"}`);
            if (!crmOn && !HR_CHAT_ID) {
                console.warn(`${LOG} OGOHLANTIRISH: CRM ham, HR guruh ham sozlanmagan — arizalar faqat ${INBOX_DIR} ga yoziladi.`);
            }
            const queued = queuedJobNames().length;
            if (queued) console.log(`${LOG} Navbatda CRM ga yetmagan ${queued} ta ariza bor — qayta yuboriladi.`);
            // Webhook o'rnatilgan bo'lsa long polling ishlamaydi. O'chirishdan oldin
            // tekshiramiz — boshqa tizim ulangan bo'lsa, uni jimgina buzib qo'ymaymiz.
            const hook = await tg('getWebhookInfo', {});
            if (hook?.url) {
                console.error(`${LOG} XATO: botda webhook o'rnatilgan (${hook.url}) — boshqa tizim ishlatayotgan bo'lishi mumkin. Avval uni tekshiring.`);
                process.exit(1);
            }
            poll();
            if (crmOn) {
                setTimeout(retryQueue, 15000);
                setInterval(retryQueue, QUEUE_RETRY_MS);
            }
        } catch (err) {
            console.error(`${LOG} Ishga tushmadi:`, err.message);
            process.exit(1);
        }
    })();

    const stop = () => { stopped = true; flushSessions(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}

if (require.main === module) {
    start();
} else {
    // Sinovlar uchun: Telegram'ga chiqmasdan yetkazish qatlamini tekshirish
    module.exports = {
        buildJob, deliverJob, retryQueue, collectMedia, questionsFor,
        setDownloader: fn => { downloader = fn; },
        QUEUE_DIR, FAILED_DIR, CRM_API,
    };
}
