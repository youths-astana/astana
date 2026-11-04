// Qosyl — Telegram-бот каталога сообществ Астаны для подростков.
//
// Один файл без зависимостей. Работает двумя способами:
//   1) Cloudflare Worker (бесплатно, всегда онлайн): webhook + cron раз в 10 минут.
//   2) Node.js 18+:  node bot/node.js  (длинный опрос, данные в файле).
// Пошаговая инструкция — bot/README.md.
//
// Каталог бот берёт с сайта (communities.json), поэтому всё новое на сайте
// сразу появляется и в боте. Направления, районы и поля Google Формы вшиты
// ниже (блок DATA) — после их изменения на сайте запусти: node bot/sync-data.mjs

/* eslint-disable no-console */

// ---------- данные сайта (обновляет bot/sync-data.mjs) ----------
const DATA = /*DATA-START*/{"CATS":[{"id":"it","ru":"IT и программирование","kz":"IT және программалау","en":"IT & coding"},{"id":"eng","ru":"Робототехника","kz":"Робототехника","en":"Robotics"},{"id":"stem","ru":"Наука и олимпиады","kz":"Ғылым және олимпиада","en":"Science & olympiads"},{"id":"debate","ru":"Дебаты и MUN","kz":"Дебат және MUN","en":"Debate & MUN"},{"id":"lang","ru":"Языки","kz":"Тілдер","en":"Languages"},{"id":"sport","ru":"Спорт","kz":"Спорт","en":"Sports"},{"id":"art","ru":"Искусство и музыка","kz":"Өнер және музыка","en":"Arts & music"},{"id":"media","ru":"Медиа и журналистика","kz":"Медиа және журналистика","en":"Media & journalism"},{"id":"vol","ru":"Волонтёрство и экология","kz":"Еріктілер және экология","en":"Volunteering & ecology"},{"id":"biz","ru":"Бизнес и стартапы","kz":"Бизнес және стартаптар","en":"Business & startups"}],"DISTRICTS":[{"id":"esil","lat":51.115,"lng":71.42,"ru":"Есильский","kz":"Есіл","en":"Esil"},{"id":"saryarka","lat":51.18,"lng":71.44,"ru":"Сарыарка","kz":"Сарыарқа","en":"Saryarka"},{"id":"almaty","lat":51.17,"lng":71.52,"ru":"Алматинский","kz":"Алматы","en":"Almaty"},{"id":"baikonur","lat":51.19,"lng":71.37,"ru":"Байконурский","kz":"Байқоңыр","en":"Baikonyr"},{"id":"nura","lat":51.07,"lng":71.53,"ru":"Нура","kz":"Нұра","en":"Nura"},{"id":"saraishyk","lat":51.118,"lng":71.505,"ru":"Сарайшык","kz":"Сарайшық","en":"Saraishyk"}],"CAT_HINTS":{"it":"програм код кодинг python питон java javascript веб сайт frontend backend геймдев unity разработ айти кибер информатик нейросет данн algorithm coding developer software компьютер бағдарламалау кодтау","eng":"робот робототехника arduino ардуино лего lego дрон паяльник электроник инженер станок конструктор механик фрезер robotics engineering","stem":"физика математик химия биолог олимпиад stem наука астроном телескоп космос геометр исследован лаборатор science olympiad ғылым математика олимпиада","debate":"дебат debate mun модель оон дипломат делегат резолюц комитет ораторск риторик дискусс парламентск пікірсайыс шешендік speaking united nations","lang":"английск казахск русск язык ielts toefl разговорн english language turkish немецк французск китайск корейск испанск тіл ағылшын полиглот грамматик","sport":"спорт бег кросс марафон плавани борьб дзюдо бокс самбо тренаж фитнес лыж коньк running баскетбол стритбол basketball футбол мини-футбол мяч ворот football soccer футзал волейбол volleyball шахмат chess теннис бадминтон воркаут скейт велосипед единоборств","art":"рисован живопис акварел керамик танц музык гитар фортепиан домбыр вокал хор театр актёр фото дизайн граффити скульптур art dance music өнер сурет театр","media":"медиа журналист блог подкаст видео монтаж смм smm редакц газет радио телевиден youtube tiktok контент копирайт сценар интервью media journalism","vol":"волонт помощ приют благотвор эколог субботник charity volunteer еріктілер көмек жануарлар донор акция социальн добро приют","biz":"стартап бизнес предприним финанс инвест маркетинг питч startup business экономик кәсіпкер акселератор продаж проект юрид"},"FORM":{"action":"https://docs.google.com/forms/d/e/1FAIpQLSf1_VP5BsigWY_jOi7Mz7zNpZvmknTZddcyMAMnlSIYFeFn8g/formResponse","pages":"0,1,2,3,4","entries":{"name":"entry.701817700","cat":"entry.781572475","tag":"entry.1961624763","about":"entry.2031867033","age":"entry.1778583724","cost":"entry.1853922419","sched":"entry.326529378","addr":"entry.528584957","langs":"entry.1068997067","beginner":"entry.636171758","tel":"entry.1344261658","ig":"entry.1627471445","tg":"entry.1338133695","contact":"entry.850399962","consent":"entry.339751029","top":"entry.1188456310"},"cat":{"it":"Другое / Басқа","eng":"Инженерия и робототехника / Инженерия және робототехника","stem":"Наука и STEM / Ғылым және STEM","debate":"MUN / MUN","lang":"Языки и ораторство / Тілдер және шешендік","sport":"Спорт / Спорт","art":"Искусство / Өнер","media":"Другое / Басқа","vol":"Волонтёрство / Еріктілер","biz":"Бизнес / Бизнес","other":"Другое / Басқа"},"langs":{"kz":"Казахский / Қазақша","ru":"Русский / Орысша","en":"Английский / Ағылшынша"},"yes":"Да / Иә","no":"Нет / Жоқ","consent":"Согласен(на) / Келісемін","topNo":"Нет, достаточно обычного размещения / Жоқ, әдеттегісі жеткілікті","topYes":"Да, расскажите подробнее / Иә, толығырақ айтыңыз"}}/*DATA-END*/;

const CAT_EMOJI = { it: '💻', eng: '🤖', stem: '🔬', debate: '🎤', lang: '🗣', sport: '⚽', art: '🎨', media: '🎬', vol: '💚', biz: '🚀' };
const ORG_WA = '77477434947';
const ORG_WA_SHOW = '+7 747 743 49 47';
const ORG_IG = 'qosyl.club';
const PAGE = 8;            // сообществ на одной странице списка
const SEND_BUDGET = 40;    // сообщений за один запуск cron (лимит бесплатного Cloudflare — 50 запросов)
const TZ = 5;              // Астана, UTC+5

// ---------- тексты ----------
const S = {
  ru: {
    choose_lang: 'Выбери язык · Тілді таңда · Choose language',
    welcome: (n) => `Привет! 👋 Я бот <b>Qosyl</b> — каталога сообществ, клубов и организаций Астаны для подростков.\n\nПомогу найти, куда пойти после уроков: IT, роботы, дебаты, спорт, творчество, волонтёрство и многое другое${n ? ` — сейчас в каталоге ${n}` : ''}.\n\n<b>Что я умею:</b>\n🔎 искать с опечатками — просто напиши, что ищешь\n🧭 показывать сообщества по направлениям и районам\n🎯 подбирать за минуту по 5 вопросам\n📍 находить ближайшие к тебе\n⭐ хранить избранное\n🔔 сообщать о новых сообществах в любимых направлениях\n⏰ напоминать написать организатору\n💡 давать советы, как не бояться новых людей\n\nВсё бесплатно и без регистрации.`,
    digest_ask: 'Хочешь раз в неделю получать подборку сообществ? Можно отключить в любой момент.',
    digest_yes: '🔔 Да, присылай', digest_no: 'Нет, спасибо',
    digest_on: 'Готово! Подборка будет приходить по воскресеньям. Настроить — в «🔔 Подписки».',
    digest_off_ok: 'Хорошо. Если передумаешь — «🔔 Подписки».',
    m_search: '🔎 Найти', m_cats: '🧭 Направления', m_quiz: '🎯 Подобрать за минуту', m_near: '📍 Рядом со мной',
    m_random: '🎲 Мне повезёт', m_fav: '⭐ Избранное', m_subs: '🔔 Подписки', m_tip: '💡 Совет дня',
    m_org: '🧑‍💼 Организаторам', m_lang: '🌐 Язык',
    search_hint: 'Напиши, что ищешь — я пойму даже с опечатками.\n\nНапример: <i>робототехника</i>, <i>бесплатно дебаты</i>, <i>английский</i>, <i>волонтёрство Есиль</i>.',
    found: (q, n) => `🔎 «${q}» — найдено: ${n}`,
    nothing: (q) => `По запросу «${q}» пока ничего нет 😔\n\nПопробуй другое слово или открой направления. А если знаешь такое сообщество — напиши организаторам о Qosyl, добавим бесплатно.`,
    cats_h: (n) => `🧭 <b>Направления</b>\nВыбери, что интересно. Всего в каталоге: ${n}.`,
    all: 'Все сообщества',
    list_h: (name, n) => `<b>${name}</b> — ${n}`,
    f_free: '💸 Бесплатно', f_beg: '🌱 Новичкам', f_dist: '🏙 Район', f_dist_all: 'Все районы',
    choose_dist: 'Выбери район:',
    empty_list: 'С такими фильтрами пока никого нет. Попробуй убрать фильтр.',
    prev: '‹', next: '›', back: '« Назад', menu: '🏠 Меню',
    near_ask: 'Отправь свою геолокацию кнопкой «📍 Рядом со мной» внизу — покажу ближайшие сообщества.\n\n<i>Координаты я не сохраняю: использую один раз, чтобы отсортировать список.</i>',
    near_h: '📍 <b>Ближайшие к тебе</b>\n<i>Координаты не сохраняются.</i>',
    near_none: 'Не нашёл сообществ с адресом поблизости. Загляни в направления.',
    km: (k) => k < 0.3 ? 'рядом' : k < 1 ? `${Math.round(k * 10) * 100} м` : `${k.toFixed(1).replace('.', ',')} км`,
    verified: '✅ Проверено организатором', open: '📋 Собрано из открытых источников',
    age: 'Возраст', cost: 'Стоимость', sched: 'Когда', addr: 'Где', langs: 'Языки', dist: 'Район',
    beg_note: '🌱 Ждут новичков: можно прийти одному и без опыта.',
    greet_note: '💬 Нажми WhatsApp — первое сообщение организатору уже готово.',
    no_contact: 'Контакты появятся, как только организатор их подтвердит.',
    b_wa: '💬 WhatsApp', b_ig: '📸 Instagram', b_tg: '✈️ Telegram', b_web: '🌐 Сайт организации', b_site: '🔗 На qosyl.club',
    b_fav: '⭐ В избранное', b_unfav: '★ В избранном', b_map: '📍 На карте', b_remind: '⏰ Напомнить завтра',
    b_share: '↗️ Позвать друга', b_report: '⚠️ Неточность',
    greet: 'Здравствуйте! Пишу вам из каталога сообществ Qosyl (qosyl.club). Подскажите, пожалуйста, как к вам присоединиться?',
    share_text: (n) => `Пойдём вместе в «${n}»? Нашёл(ла) на Qosyl 👇`,
    fav_add: 'Добавлено в избранное ⭐', fav_del: 'Убрано из избранного',
    fav_h: (n) => `⭐ <b>Избранное</b> — ${n}`, fav_empty: 'В избранном пока пусто. Открой любое сообщество и нажми «⭐ В избранное».',
    remind_ok: 'Напомню завтра в 16:00 ⏰',
    remind_msg: (n) => `⏰ Напоминаю: ты хотел(а) написать в <b>${n}</b>.\n\nИсследования показывают: людям приятно, когда им пишут первыми — сильнее, чем мы думаем. Первое сообщение уже готово 👇`,
    report_h: 'Что не так в карточке?', report_1: '📞 Телефон не отвечает', report_2: '🚪 Закрылось или переехало', report_3: '✏️ Другие данные неверны',
    report_ok: 'Спасибо! Проверим и исправим 🙏',
    quiz_q: ['Чем бы ты занялся, если бы было время?', 'Сколько тебе лет?', 'Ты уже этим занимался?', 'А с деньгами как?', 'Придёшь один или с кем-то?'],
    quiz_o: {
      what: { m: '⚽ Двигаться: спорт', k: '🤖 Собирать и программировать', c: '🎨 Рисовать, музыка, театр', s: '🎤 Говорить: языки, дебаты, MUN', h: '💚 Помогать людям и городу', b: '🚀 Свой проект или бизнес', p: '🤝 Просто найти своих' },
      age: { 1: '12–13', 2: '14–15', 3: '16–17', 4: '18+' },
      exp: { n: 'Совсем нет, с нуля', s: 'Немного пробовал', p: 'Давно, ищу уровень' },
      money: { f: 'Только бесплатно', c: 'Могу немного платить', a: 'Не важно' },
      who: { a: 'Один, и немного страшно', f: 'С друзьями', e: 'Как получится' }
    },
    quiz_step: (i) => `🎯 Вопрос ${i} из 5`,
    quiz_res: '🎯 <b>Вот что тебе подходит</b>',
    quiz_none: 'По таким ответам пока ничего не нашлось. Попробуй ответить иначе или открой направления.',
    quiz_again: '🔄 Пройти ещё раз', quiz_sub: (c) => `🔔 Следить за «${c}»`,
    why: { cat: 'твоё направление', age: 'по возрасту', beg: 'ждут новичков', free: 'бесплатно', alone: 'можно прийти одному' },
    subs_h: '🔔 <b>Подписки</b>\n\nОтметь направления — напишу, когда в них появится новое сообщество. Раз в неделю (по воскресеньям) могу присылать подборку.',
    subs_all: 'Всё новое', subs_digest_on: '🗓 Подборка раз в неделю: вкл', subs_digest_off: '🗓 Подборка раз в неделю: выкл',
    sub_on: 'Подписка включена 🔔', sub_off: 'Подписка выключена',
    new_h: '🆕 <b>Новое в каталоге</b>',
    digest_h: '🗓 <b>Подборка недели</b>\nТри сообщества, куда можно сходить уже на этой неделе:',
    digest_stop: '🔕 Не присылать подборку',
    tip_h: '💡 <b>Совет</b>', tip_more: '💡 Ещё совет', tip_find: '🔎 Найти сообщество', src: 'Источник',
    org_h: '🧑‍💼 <b>Для организаторов</b>\n\nВедёте клуб, секцию, сообщество или организацию в Астане? Добавим вас в Qosyl <b>бесплатно</b>:\n• карточка с фото, расписанием и контактами\n• точка на карте и страница в поиске Google\n• подростки пишут вам в WhatsApp с готовым сообщением\n\nБез рекламы в карточке. Публикуем только то, что вы подтвердите.\n\nВопросы: WhatsApp ' + ORG_WA_SHOW + ' или Instagram @' + ORG_IG,
    org_apply: '➕ Подать заявку здесь, в боте', org_site: '🌐 Заявка на сайте', org_cab: '🔑 Кабинет организатора',
    org_wa: '💬 WhatsApp ' + ORG_WA_SHOW, org_ig: '📸 Instagram @' + ORG_IG,
    org_wa_text: 'Здравствуйте! Я организатор сообщества в Астане, хочу добавить его в Qosyl.',
    cab_wa_text: 'Здравствуйте! Я организатор сообщества в каталоге Qosyl. Подскажите, пожалуйста, код для кабинета организатора.',
    a_intro: '📝 <b>Заявка в Qosyl</b> — 13 коротких вопросов, около 5 минут. Отменить можно в любой момент: /cancel',
    a_q: {
      name: 'Как называется ваше сообщество?\n<i>Например: дебатный клуб «Сөз»</i>',
      cat: 'Выберите направление:',
      tag: 'Чем занимаетесь — одной строкой.\n<i>Например: собираем роботов и учим их ездить по линии</i>',
      about: 'Опишите для подростка, который сомневается, идти ли: кто ходит, как проходит первое занятие, можно ли прийти одному.',
      age: 'Возраст участников?\n<i>Например: 12–18 или 14+</i>',
      cost: 'Стоимость? Выберите кнопку или напишите, например <i>15 000 ₸ в месяц</i>.',
      sched: 'Когда проходят занятия?\n<i>Например: сб, 11:00–13:00</i>',
      addr: 'Адрес?\n<i>Например: ул. Кенесары, 40. Если встречи онлайн — так и напишите.</i>',
      langs: 'На каких языках занятия? Отметьте и нажмите «Готово».',
      beg: 'Можно прийти без опыта?',
      tel: 'WhatsApp или телефон для сайта — его увидят подростки. Укажите рабочий номер взрослого организатора.',
      ig: 'Instagram сообщества (если есть). Можно пропустить.',
      contact: 'Ваше имя и контакт для связи с нами — не публикуется.\n<i>Например: Айгерим, +7 701 …</i>'
    },
    a_free: 'Бесплатно', a_yes: 'Да', a_no: 'Нет', a_skip: 'Пропустить', a_done: 'Готово', a_cancel: '✖️ Отмена',
    a_check: '<b>Проверьте заявку:</b>', a_consent: 'Нажимая «Отправить», вы разрешаете опубликовать эти данные на qosyl.club. Номер для сайта — рабочий, взрослого организатора.',
    a_send: '✅ Отправить', a_restart: '✏️ Заполнить заново',
    a_sent: '🎉 Заявка отправлена! Мы проверим её и напишем вам, если что-то нужно уточнить. Обычно карточка появляется в течение нескольких дней.\n\nВопросы: WhatsApp ' + ORG_WA_SHOW,
    a_fail: 'Не получилось отправить заявку 😔 Попробуйте ещё раз или заполните её на сайте.',
    a_cancelled: 'Заявка отменена.', a_bad_tel: 'Нужен номер не короче 10 цифр. Попробуйте ещё раз.', a_need_text: 'Напишите ответ текстом 🙂',
    lang_h: 'Выбери язык · Тілді таңда · Choose language', lang_ok: 'Готово! Язык: русский.',
    help: '<b>Команды</b>\n/search — поиск\n/cats — направления\n/quiz — подбор за минуту\n/near — рядом со мной\n/random — случайное сообщество\n/fav — избранное\n/subs — подписки и подборка\n/tip — совет дня\n/org — для организаторов\n/lang — язык\n/privacy — какие данные хранит бот\n/stop — удалить мои данные\n\nИли просто напиши, что ищешь.',
    privacy: '🔐 <b>Какие данные хранит бот</b>\n\nТолько то, что нужно для работы: твой Telegram ID, язык, избранное, подписки и напоминания. Имя, номер и геолокацию не сохраняем — геолокацию используем один раз, чтобы отсортировать список.\n\nУдалить всё: /stop',
    stopped: 'Готово: твои данные удалены, подписки и напоминания отключены. Вернуться — /start.',
    unknown_cmd: 'Не знаю такую команду. Список — /help',
    site_btn: '🌐 Открыть qosyl.club',
    random_h: '🎲 <b>Тебе выпало:</b>',
    loading_fail: 'Каталог сейчас не загрузился. Попробуй через минуту.'
  },
  kz: {
    choose_lang: 'Выбери язык · Тілді таңда · Choose language',
    welcome: (n) => `Сәлем! 👋 Мен — <b>Qosyl</b> боты, Астанадағы жасөспірімдерге арналған қоғамдастықтар, клубтар мен ұйымдар каталогымын.\n\nСабақтан кейін қайда баруға болатынын табуға көмектесемін: IT, роботтар, дебат, спорт, шығармашылық, еріктілік және тағы басқа${n ? ` — қазір каталогта ${n}` : ''}.\n\n<b>Мен не істей аламын:</b>\n🔎 қате жазсаң да іздеймін — не іздейтініңді жаз\n🧭 бағыттар мен аудандар бойынша көрсетемін\n🎯 5 сұрақ бойынша бір минутта таңдаймын\n📍 саған ең жақындарын табамын\n⭐ таңдаулыларды сақтаймын\n🔔 сүйікті бағыттарда жаңа қоғамдастық пайда болса, хабарлаймын\n⏰ ұйымдастырушыға жазуды еске саламын\n💡 жаңа адамдардан қорықпау туралы кеңес беремін\n\nБәрі тегін әрі тіркеусіз.`,
    digest_ask: 'Аптасына бір рет қоғамдастықтар топтамасын алғың келе ме? Кез келген уақытта өшіруге болады.',
    digest_yes: '🔔 Иә, жібер', digest_no: 'Жоқ, рақмет',
    digest_on: 'Дайын! Топтама жексенбі сайын келеді. Баптау — «🔔 Жазылымдар».',
    digest_off_ok: 'Жақсы. Ойыңды өзгертсең — «🔔 Жазылымдар».',
    m_search: '🔎 Іздеу', m_cats: '🧭 Бағыттар', m_quiz: '🎯 Бір минутта таңдау', m_near: '📍 Маған жақын',
    m_random: '🎲 Сәттілік', m_fav: '⭐ Таңдаулылар', m_subs: '🔔 Жазылымдар', m_tip: '💡 Күн кеңесі',
    m_org: '🧑‍💼 Ұйымдастырушыларға', m_lang: '🌐 Тіл',
    search_hint: 'Не іздейтініңді жаз — қате жазсаң да түсінемін.\n\nМысалы: <i>робототехника</i>, <i>тегін дебат</i>, <i>ағылшын</i>, <i>еріктілер Есіл</i>.',
    found: (q, n) => `🔎 «${q}» — табылды: ${n}`,
    nothing: (q) => `«${q}» бойынша әзірге ештеңе жоқ 😔\n\nБасқа сөзбен көр немесе бағыттарды аш. Ондай қоғамдастықты білсең — ұйымдастырушыларына Qosyl туралы айт, тегін қосамыз.`,
    cats_h: (n) => `🧭 <b>Бағыттар</b>\nҚызықтыратынын таңда. Каталогта барлығы: ${n}.`,
    all: 'Барлық қоғамдастықтар',
    list_h: (name, n) => `<b>${name}</b> — ${n}`,
    f_free: '💸 Тегін', f_beg: '🌱 Бастаушыларға', f_dist: '🏙 Аудан', f_dist_all: 'Барлық аудандар',
    choose_dist: 'Ауданды таңда:',
    empty_list: 'Мұндай сүзгілермен әзірге ешкім жоқ. Сүзгіні алып көр.',
    prev: '‹', next: '›', back: '« Артқа', menu: '🏠 Мәзір',
    near_ask: 'Төмендегі «📍 Маған жақын» батырмасымен геолокацияңды жібер — ең жақын қоғамдастықтарды көрсетемін.\n\n<i>Координаттарды сақтамаймын: тізімді сұрыптау үшін бір рет қолданамын.</i>',
    near_h: '📍 <b>Саған ең жақындары</b>\n<i>Координаттар сақталмайды.</i>',
    near_none: 'Жақын маңда мекенжайы бар қоғамдастық таппадым. Бағыттарды қарап шық.',
    km: (k) => k < 0.3 ? 'жақын' : k < 1 ? `${Math.round(k * 10) * 100} м` : `${k.toFixed(1).replace('.', ',')} км`,
    verified: '✅ Ұйымдастырушы растаған', open: '📋 Ашық дереккөздерден жиналған',
    age: 'Жасы', cost: 'Бағасы', sched: 'Қашан', addr: 'Қайда', langs: 'Тілдері', dist: 'Аудан',
    beg_note: '🌱 Жаңадан бастаушыларды күтеді: жалғыз және тәжірибесіз келуге болады.',
    greet_note: '💬 WhatsApp-ты бас — ұйымдастырушыға алғашқы хабарлама дайын.',
    no_contact: 'Байланыс ұйымдастырушы растаған соң пайда болады.',
    b_wa: '💬 WhatsApp', b_ig: '📸 Instagram', b_tg: '✈️ Telegram', b_web: '🌐 Ұйым сайты', b_site: '🔗 qosyl.club-та',
    b_fav: '⭐ Таңдаулыға', b_unfav: '★ Таңдаулыда', b_map: '📍 Картада', b_remind: '⏰ Ертең еске сал',
    b_share: '↗️ Досыңды шақыр', b_report: '⚠️ Қате бар',
    greet: 'Сәлеметсіз бе! Сізге Qosyl қоғамдастықтар каталогынан жазып отырмын (qosyl.club). Сіздерге қалай қосылуға болатынын айтып жіберсеңіз.',
    share_text: (n) => `«${n}»-ға бірге барайық па? Qosyl-дан таптым 👇`,
    fav_add: 'Таңдаулыға қосылды ⭐', fav_del: 'Таңдаулыдан алынды',
    fav_h: (n) => `⭐ <b>Таңдаулылар</b> — ${n}`, fav_empty: 'Таңдаулыда әзірге бос. Кез келген қоғамдастықты ашып, «⭐ Таңдаулыға» бас.',
    remind_ok: 'Ертең 16:00-де еске саламын ⏰',
    remind_msg: (n) => `⏰ Еске салу: сен <b>${n}</b>-ға жазғың келген.\n\nЗерттеулер көрсеткендей, адамдарға бірінші жазғанда олар біз ойлағаннан да көп қуанады. Алғашқы хабарлама дайын 👇`,
    report_h: 'Карточкада не дұрыс емес?', report_1: '📞 Телефон жауап бермейді', report_2: '🚪 Жабылды немесе көшті', report_3: '✏️ Басқа дерек қате',
    report_ok: 'Рақмет! Тексеріп, түзетеміз 🙏',
    quiz_q: ['Уақытың болса, немен айналысар едің?', 'Жасың нешеде?', 'Бұрын осымен айналысқан ба едің?', 'Ақша жағы қалай?', 'Жалғыз келесің бе, біреумен бе?'],
    quiz_o: {
      what: { m: '⚽ Қимыл: спорт', k: '🤖 Құрастыру, программалау', c: '🎨 Сурет, музыка, театр', s: '🎤 Сөйлеу: тілдер, дебат, MUN', h: '💚 Адамдарға, қалаға көмек', b: '🚀 Өз жобам немесе бизнес', p: '🤝 Өз ортамды табу' },
      age: { 1: '12–13', 2: '14–15', 3: '16–17', 4: '18+' },
      exp: { n: 'Жоқ, нөлден', s: 'Аздап байқадым', p: 'Көптен, деңгей іздеймін' },
      money: { f: 'Тек тегін', c: 'Аздап төлей аламын', a: 'Маңызды емес' },
      who: { a: 'Жалғыз, сәл қорқамын', f: 'Достарыммен', e: 'Қалай болса' }
    },
    quiz_step: (i) => `🎯 ${i}-сұрақ, барлығы 5`,
    quiz_res: '🎯 <b>Саған мыналар сай келеді</b>',
    quiz_none: 'Мұндай жауаптар бойынша әзірге ештеңе табылмады. Басқаша жауап беріп көр немесе бағыттарды аш.',
    quiz_again: '🔄 Қайта өту', quiz_sub: (c) => `🔔 «${c}» бағытын бақылау`,
    why: { cat: 'сенің бағытың', age: 'жасыңа сай', beg: 'бастаушыларды күтеді', free: 'тегін', alone: 'жалғыз келуге болады' },
    subs_h: '🔔 <b>Жазылымдар</b>\n\nБағыттарды белгіле — оларда жаңа қоғамдастық пайда болса, жазамын. Аптасына бір рет (жексенбі сайын) топтама жібере аламын.',
    subs_all: 'Барлық жаңалық', subs_digest_on: '🗓 Апталық топтама: қосулы', subs_digest_off: '🗓 Апталық топтама: өшірулі',
    sub_on: 'Жазылым қосылды 🔔', sub_off: 'Жазылым өшірілді',
    new_h: '🆕 <b>Каталогта жаңа</b>',
    digest_h: '🗓 <b>Апта топтамасы</b>\nОсы аптада баруға болатын үш қоғамдастық:',
    digest_stop: '🔕 Топтаманы жібермеу',
    tip_h: '💡 <b>Кеңес</b>', tip_more: '💡 Тағы кеңес', tip_find: '🔎 Қоғамдастық табу', src: 'Дереккөз',
    org_h: '🧑‍💼 <b>Ұйымдастырушыларға</b>\n\nАстанада клуб, секция, қоғамдастық немесе ұйым жүргізесіз бе? Сізді Qosyl-ға <b>тегін</b> қосамыз:\n• фото, кесте және байланысы бар карточка\n• картада нүкте және Google іздеуінде бет\n• жасөспірімдер сізге WhatsApp-қа дайын хабарламамен жазады\n\nКарточкада жарнама жоқ. Тек сіз растаған ақпаратты жариялаймыз.\n\nСұрақтар: WhatsApp ' + ORG_WA_SHOW + ' немесе Instagram @' + ORG_IG,
    org_apply: '➕ Өтінімді осы жерде, ботта беру', org_site: '🌐 Сайттағы өтінім', org_cab: '🔑 Ұйымдастырушы кабинеті',
    org_wa: '💬 WhatsApp ' + ORG_WA_SHOW, org_ig: '📸 Instagram @' + ORG_IG,
    org_wa_text: 'Сәлеметсіз бе! Мен Астанадағы қоғамдастықтың ұйымдастырушысымын, оны Qosyl-ға қосқым келеді.',
    cab_wa_text: 'Сәлеметсіз бе! Мен Qosyl каталогындағы қоғамдастықтың ұйымдастырушысымын. Кабинет кодын айтып жібересіз бе?',
    a_intro: '📝 <b>Qosyl-ға өтінім</b> — 13 қысқа сұрақ, шамамен 5 минут. Кез келген уақытта тоқтатуға болады: /cancel',
    a_q: {
      name: 'Қоғамдастығыңыз қалай аталады?\n<i>Мысалы: «Сөз» дебат клубы</i>',
      cat: 'Бағытты таңдаңыз:',
      tag: 'Немен айналысасыздар — бір сөйлеммен.\n<i>Мысалы: робот құрастырып, оларды сызық бойымен жүруге үйретеміз</i>',
      about: 'Баруға күмәнданып жүрген жасөспірімге айтқандай жазыңыз: кімдер келеді, алғашқы сабақ қалай өтеді, жалғыз келуге бола ма.',
      age: 'Қатысушылардың жасы?\n<i>Мысалы: 12–18 немесе 14+</i>',
      cost: 'Бағасы? Батырманы таңдаңыз немесе жазыңыз, мысалы <i>айына 15 000 ₸</i>.',
      sched: 'Сабақтар қашан өтеді?\n<i>Мысалы: сн, 11:00–13:00</i>',
      addr: 'Мекенжай?\n<i>Мысалы: Кенесары к-сі, 40. Онлайн болса — солай жазыңыз.</i>',
      langs: 'Сабақтар қай тілдерде? Белгілеп, «Дайын» басыңыз.',
      beg: 'Тәжірибесіз келуге бола ма?',
      tel: 'Сайтқа арналған WhatsApp немесе телефон — оны жасөспірімдер көреді. Ересек ұйымдастырушының жұмыс нөмірін көрсетіңіз.',
      ig: 'Қоғамдастықтың Instagram-ы (бар болса). Өткізіп жіберуге болады.',
      contact: 'Атыңыз және бізбен байланыс — жарияланбайды.\n<i>Мысалы: Әйгерім, +7 701 …</i>'
    },
    a_free: 'Тегін', a_yes: 'Иә', a_no: 'Жоқ', a_skip: 'Өткізу', a_done: 'Дайын', a_cancel: '✖️ Болдырмау',
    a_check: '<b>Өтінімді тексеріңіз:</b>', a_consent: '«Жіберу» батырмасын басу арқылы осы деректерді qosyl.club сайтында жариялауға рұқсат бересіз. Сайтқа арналған нөмір — ересек ұйымдастырушының жұмыс нөмірі.',
    a_send: '✅ Жіберу', a_restart: '✏️ Қайта толтыру',
    a_sent: '🎉 Өтінім жіберілді! Тексеріп, бір нәрсені нақтылау керек болса, жазамыз. Әдетте карточка бірнеше күнде пайда болады.\n\nСұрақтар: WhatsApp ' + ORG_WA_SHOW,
    a_fail: 'Өтінімді жіберу мүмкін болмады 😔 Қайта көріңіз немесе сайтта толтырыңыз.',
    a_cancelled: 'Өтінім тоқтатылды.', a_bad_tel: 'Кемінде 10 саннан тұратын нөмір керек. Қайта көріңіз.', a_need_text: 'Жауапты мәтінмен жазыңыз 🙂',
    lang_h: 'Выбери язык · Тілді таңда · Choose language', lang_ok: 'Дайын! Тіл: қазақша.',
    help: '<b>Командалар</b>\n/search — іздеу\n/cats — бағыттар\n/quiz — бір минутта таңдау\n/near — маған жақын\n/random — кездейсоқ қоғамдастық\n/fav — таңдаулылар\n/subs — жазылымдар мен топтама\n/tip — күн кеңесі\n/org — ұйымдастырушыларға\n/lang — тіл\n/privacy — бот қандай дерек сақтайды\n/stop — менің деректерімді өшіру\n\nНемесе не іздейтініңді жай ғана жаз.',
    privacy: '🔐 <b>Бот қандай дерек сақтайды</b>\n\nТек жұмысқа керегін: Telegram ID, тіл, таңдаулылар, жазылымдар мен еске салғыштар. Аты-жөнді, нөмірді және геолокацияны сақтамаймыз — геолокацияны тізімді сұрыптау үшін бір рет қолданамыз.\n\nБәрін өшіру: /stop',
    stopped: 'Дайын: деректерің өшірілді, жазылымдар мен еске салғыштар тоқтатылды. Қайту — /start.',
    unknown_cmd: 'Мұндай команданы білмеймін. Тізім — /help',
    site_btn: '🌐 qosyl.club ашу',
    random_h: '🎲 <b>Саған түскені:</b>',
    loading_fail: 'Каталог қазір жүктелмеді. Бір минуттан кейін көр.'
  },
  en: {
    choose_lang: 'Выбери язык · Тілді таңда · Choose language',
    welcome: (n) => `Hi! 👋 I am the <b>Qosyl</b> bot — a catalogue of communities, clubs and organisations in Astana for teens.\n\nI will help you find somewhere to go after school: IT, robots, debate, sport, arts, volunteering and more${n ? ` — ${n} in the catalogue right now` : ''}.\n\n<b>What I can do:</b>\n🔎 search even with typos — just type what you are looking for\n🧭 show communities by direction and district\n🎯 pick for you in a minute with 5 questions\n📍 find the ones closest to you\n⭐ keep your favourites\n🔔 tell you about new communities in your directions\n⏰ remind you to message an organiser\n💡 share tips on not being afraid of new people\n\nFree, no sign-up.`,
    digest_ask: 'Want a weekly pick of communities? You can switch it off any time.',
    digest_yes: '🔔 Yes, send it', digest_no: 'No, thanks',
    digest_on: 'Done! The pick arrives on Sundays. Settings — «🔔 Subscriptions».',
    digest_off_ok: 'Okay. If you change your mind — «🔔 Subscriptions».',
    m_search: '🔎 Search', m_cats: '🧭 Directions', m_quiz: '🎯 Pick in a minute', m_near: '📍 Near me',
    m_random: '🎲 Feeling lucky', m_fav: '⭐ Favourites', m_subs: '🔔 Subscriptions', m_tip: '💡 Tip of the day',
    m_org: '🧑‍💼 For organisers', m_lang: '🌐 Language',
    search_hint: 'Type what you are looking for — I understand typos too.\n\nFor example: <i>robotics</i>, <i>free debate</i>, <i>english</i>, <i>volunteering Esil</i>.',
    found: (q, n) => `🔎 “${q}” — found: ${n}`,
    nothing: (q) => `Nothing for “${q}” yet 😔\n\nTry another word or open the directions. If you know such a community, tell its organisers about Qosyl — we add them for free.`,
    cats_h: (n) => `🧭 <b>Directions</b>\nPick what interests you. In the catalogue: ${n}.`,
    all: 'All communities',
    list_h: (name, n) => `<b>${name}</b> — ${n}`,
    f_free: '💸 Free', f_beg: '🌱 Beginners', f_dist: '🏙 District', f_dist_all: 'All districts',
    choose_dist: 'Choose a district:',
    empty_list: 'Nobody matches these filters yet. Try removing one.',
    prev: '‹', next: '›', back: '« Back', menu: '🏠 Menu',
    near_ask: 'Send your location with the «📍 Near me» button below — I will show the closest communities.\n\n<i>I do not store coordinates: I use them once to sort the list.</i>',
    near_h: '📍 <b>Closest to you</b>\n<i>Coordinates are not stored.</i>',
    near_none: 'No communities with an address nearby. Have a look at the directions.',
    km: (k) => k < 0.3 ? 'very close' : k < 1 ? `${Math.round(k * 10) * 100} m` : `${k.toFixed(1)} km`,
    verified: '✅ Confirmed by the organiser', open: '📋 Compiled from open sources',
    age: 'Age', cost: 'Cost', sched: 'When', addr: 'Where', langs: 'Languages', dist: 'District',
    beg_note: '🌱 Beginner-friendly: fine to come alone and with no experience.',
    greet_note: '💬 Tap WhatsApp — the first message to the organiser is ready.',
    no_contact: 'Contacts will appear once the organiser confirms them.',
    b_wa: '💬 WhatsApp', b_ig: '📸 Instagram', b_tg: '✈️ Telegram', b_web: '🌐 Website', b_site: '🔗 On qosyl.club',
    b_fav: '⭐ Add to favourites', b_unfav: '★ In favourites', b_map: '📍 On the map', b_remind: '⏰ Remind me tomorrow',
    b_share: '↗️ Invite a friend', b_report: '⚠️ Something wrong',
    greet: 'Hello! I am writing from the Qosyl community directory (qosyl.club). Could you tell me how to join you?',
    share_text: (n) => `Shall we go to “${n}” together? Found it on Qosyl 👇`,
    fav_add: 'Added to favourites ⭐', fav_del: 'Removed from favourites',
    fav_h: (n) => `⭐ <b>Favourites</b> — ${n}`, fav_empty: 'No favourites yet. Open any community and tap «⭐ Add to favourites».',
    remind_ok: 'I will remind you tomorrow at 16:00 ⏰',
    remind_msg: (n) => `⏰ Reminder: you wanted to message <b>${n}</b>.\n\nResearch shows people appreciate being contacted more than we expect. The first message is ready 👇`,
    report_h: 'What is wrong with this listing?', report_1: '📞 Phone does not answer', report_2: '🚪 Closed or moved', report_3: '✏️ Other details are wrong',
    report_ok: 'Thank you! We will check and fix it 🙏',
    quiz_q: ['If you had the time, what would you do?', 'How old are you?', 'Have you done this before?', 'What about money?', 'Coming alone or with someone?'],
    quiz_o: {
      what: { m: '⚽ Move: sport', k: '🤖 Build things and code', c: '🎨 Draw, music, theatre', s: '🎤 Talk: languages, debate, MUN', h: '💚 Help people and the city', b: '🚀 My own project or business', p: '🤝 Just find my people' },
      age: { 1: '12–13', 2: '14–15', 3: '16–17', 4: '18+' },
      exp: { n: 'Not at all, from zero', s: 'Tried a little', p: 'A while, want a level' },
      money: { f: 'Free only', c: 'I can pay a little', a: 'Does not matter' },
      who: { a: 'Alone, a bit scared', f: 'With friends', e: 'Either way' }
    },
    quiz_step: (i) => `🎯 Question ${i} of 5`,
    quiz_res: '🎯 <b>Here is what suits you</b>',
    quiz_none: 'Nothing matches these answers yet. Try different answers or open the directions.',
    quiz_again: '🔄 Try again', quiz_sub: (c) => `🔔 Follow “${c}”`,
    why: { cat: 'your direction', age: 'right age', beg: 'beginner-friendly', free: 'free', alone: 'fine to come alone' },
    subs_h: '🔔 <b>Subscriptions</b>\n\nTick directions — I will message you when a new community appears there. I can also send a weekly pick (on Sundays).',
    subs_all: 'Everything new', subs_digest_on: '🗓 Weekly pick: on', subs_digest_off: '🗓 Weekly pick: off',
    sub_on: 'Subscribed 🔔', sub_off: 'Unsubscribed',
    new_h: '🆕 <b>New in the catalogue</b>',
    digest_h: '🗓 <b>Pick of the week</b>\nThree communities you could visit this week:',
    digest_stop: '🔕 Stop the weekly pick',
    tip_h: '💡 <b>Tip</b>', tip_more: '💡 Another tip', tip_find: '🔎 Find a community', src: 'Source',
    org_h: '🧑‍💼 <b>For organisers</b>\n\nDo you run a club, section, community or organisation in Astana? We add you to Qosyl <b>for free</b>:\n• a listing with photo, schedule and contacts\n• a pin on the map and a page in Google search\n• teens message you on WhatsApp with a ready-made first message\n\nNo ads on your listing. We publish only what you confirm.\n\nQuestions: WhatsApp ' + ORG_WA_SHOW + ' or Instagram @' + ORG_IG,
    org_apply: '➕ Apply right here in the bot', org_site: '🌐 Apply on the website', org_cab: '🔑 Organiser dashboard',
    org_wa: '💬 WhatsApp ' + ORG_WA_SHOW, org_ig: '📸 Instagram @' + ORG_IG,
    org_wa_text: 'Hello! I run a community in Astana and would like to add it to Qosyl.',
    cab_wa_text: 'Hello! I run a community listed on Qosyl. Could you send me the code for the organiser dashboard?',
    a_intro: '📝 <b>Apply to Qosyl</b> — 13 short questions, about 5 minutes. Cancel any time: /cancel',
    a_q: {
      name: 'What is your community called?\n<i>For example: “Soz” debate club</i>',
      cat: 'Choose a direction:',
      tag: 'What you do — in one line.\n<i>For example: we build robots and teach them to follow a line</i>',
      about: 'Describe it for a teen who is unsure whether to come: who comes, how the first session goes, can someone come alone.',
      age: 'Participants’ age?\n<i>For example: 12–18 or 14+</i>',
      cost: 'Cost? Pick a button or type, e.g. <i>15,000 ₸ a month</i>.',
      sched: 'When are sessions?\n<i>For example: Sat, 11:00–13:00</i>',
      addr: 'Address?\n<i>For example: 40 Kenesary St. If you meet online, say so.</i>',
      langs: 'Which languages are sessions in? Tick and press «Done».',
      beg: 'Can someone come with no experience?',
      tel: 'WhatsApp or phone for the site — teens will see it. Please give an adult organiser’s work number.',
      ig: 'Community Instagram (if any). You can skip this.',
      contact: 'Your name and how to reach you — not published.\n<i>For example: Aigerim, +7 701 …</i>'
    },
    a_free: 'Free', a_yes: 'Yes', a_no: 'No', a_skip: 'Skip', a_done: 'Done', a_cancel: '✖️ Cancel',
    a_check: '<b>Check your application:</b>', a_consent: 'By pressing «Send» you allow this information to be published on qosyl.club. The number for the site is an adult organiser’s work number.',
    a_send: '✅ Send', a_restart: '✏️ Start over',
    a_sent: '🎉 Application sent! We will review it and message you if anything needs clarifying. The listing usually appears within a few days.\n\nQuestions: WhatsApp ' + ORG_WA_SHOW,
    a_fail: 'Could not send the application 😔 Please try again or fill it in on the website.',
    a_cancelled: 'Application cancelled.', a_bad_tel: 'We need a number with at least 10 digits. Please try again.', a_need_text: 'Please answer with text 🙂',
    lang_h: 'Выбери язык · Тілді таңда · Choose language', lang_ok: 'Done! Language: English.',
    help: '<b>Commands</b>\n/search — search\n/cats — directions\n/quiz — pick in a minute\n/near — near me\n/random — random community\n/fav — favourites\n/subs — subscriptions and weekly pick\n/tip — tip of the day\n/org — for organisers\n/lang — language\n/privacy — what data the bot keeps\n/stop — delete my data\n\nOr just type what you are looking for.',
    privacy: '🔐 <b>What data the bot keeps</b>\n\nOnly what it needs: your Telegram ID, language, favourites, subscriptions and reminders. We do not store your name, number or location — location is used once to sort the list.\n\nDelete everything: /stop',
    stopped: 'Done: your data is deleted, subscriptions and reminders are off. Come back — /start.',
    unknown_cmd: 'I do not know that command. List — /help',
    site_btn: '🌐 Open qosyl.club',
    random_h: '🎲 <b>You got:</b>',
    loading_fail: 'The catalogue did not load right now. Try again in a minute.'
  }
};

// Советы для смелости — из уроков Qosyl. Короткие, с источником.
const TIPS = [
  { ru: 'Боишься написать в клуб первым? Люди недооценивают, как приятно другим, когда им пишут первыми. Для организатора новичок — хорошая новость.', kz: 'Клубқа бірінші жазудан қорқасың ба? Адамдар бірінші жазғанда басқалардың қаншалықты қуанатынын бағаламайды. Ұйымдастырушы үшін жаңа адам — жақсы жаңалық.', en: 'Afraid to message a club first? People underestimate how much others appreciate being contacted. For an organiser, a newcomer is good news.', src: 'Liu и др., Journal of Personality and Social Psychology, 2023' },
  { ru: 'Кажется, что все на тебя смотрят? Это «эффект прожектора»: нас замечают примерно вдвое реже, чем нам кажется. Каждый больше думает о себе.', kz: 'Бәрі саған қарап тұрғандай ма? Бұл — «прожектор әсері»: бізді ойлағанымыздан шамамен екі есе сирек байқайды. Әркім көбіне өзі туралы ойлайды.', en: 'Feel like everyone is watching you? That is the spotlight effect: people notice us about half as often as we think. Everyone is busy thinking about themselves.', src: 'Gilovich, Medvec & Savitsky, 2000' },
  { ru: 'После разговора кажется, что ты был скучным? Это «разрыв симпатии»: после знакомства мы недооцениваем, насколько понравились человеку. Приходи снова.', kz: 'Әңгімеден кейін сен қызықсыз болдың деп ойлайсың ба? Бұл — «жақтырудағы алшақтық»: танысқаннан кейін біз адамға қаншалықты ұнағанымызды бағаламаймыз. Қайта кел.', en: 'Think you were boring after a chat? That is the liking gap: after meeting someone we underestimate how much they liked us. Come back again.', src: 'Boothby и др., Psychological Science, 2018' },
  { ru: 'Лидер — не тот, кто всё решает сам, а тот, кто собирает людей и даёт каждому голос. Позови друга с собой и спроси того, кто молчит: «А ты что думаешь?»', kz: 'Көшбасшы — бәрін өзі шешетін емес, адамдарды жинап, әркімге сөз беретін адам. Досыңды шақыр және үндемей отырғаннан сұра: «Сен не ойлайсың?»', en: 'A leader is not the one who decides everything, but the one who brings people together and gives everyone a voice. Invite a friend and ask the quiet one: “What do you think?”', src: 'Google re:Work, проект «Аристотель», 2015' },
  { ru: 'Сколько часов нужно, чтобы стать друзьями? Около 50 часов вместе — приятель, около 90 — друг, 200+ — близкий друг. Две встречи в неделю в сообществе — это 50 часов за три месяца.', kz: 'Дос болу үшін қанша сағат керек? Шамамен 50 сағат бірге — таныс, 90 — дос, 200-ден көп — жақын дос. Қоғамдастықта аптасына екі кездесу — үш айда 50 сағат.', en: 'How many hours does it take to become friends? About 50 hours together for a casual friend, 90 for a friend, 200+ for a close friend. Two meetings a week is 50 hours in three months.', src: 'Hall, Journal of Social and Personal Relationships, 2019' },
  { ru: 'Не знаешь, что сказать в первый день? Попробуй: «Привет! Я тут впервые. Как всё проходит?», «Можно я с вами?», «А ты давно ходишь?» Разговор с незнакомцем обычно приятнее, чем мы ждём.', kz: 'Алғашқы күні не айтарыңды білмейсің бе? Байқап көр: «Сәлем! Мен мұнда бірінші реттемін. Бәрі қалай өтеді?», «Сендермен бірге болайын ба?», «Көптен келесің бе?» Бейтаныспен әңгіме біз күткеннен жағымдырақ болады.', en: 'Not sure what to say on day one? Try: “Hi! I am new here. How does it work?”, “Can I join you?”, “Have you been coming long?” Talking to a stranger is usually nicer than we expect.', src: 'Epley & Schroeder, 2014' },
  { ru: 'Боишься, что разговор будет неловким? Глубокие вопросы — «Почему ты выбрал это сообщество?», «Что тебе тут нравится?» — сближают сильнее, чем «как дела», и неловкости меньше, чем кажется.', kz: 'Әңгіме ыңғайсыз болады деп қорқасың ба? Терең сұрақтар — «Бұл қоғамдастықты неге таңдадың?», «Мұнда саған не ұнайды?» — «қалайсың»-нан гөрі жақындатады, ал ыңғайсыздық ойлағаннан аз.', en: 'Worried a conversation will be awkward? Deeper questions — “Why did you pick this community?”, “What do you like here?” — bring people closer than “how are you”, with less awkwardness than you think.', src: 'Kardas, Kumar & Epley, 2022' },
  { ru: 'Боишься попросить о помощи? Люди соглашаются помочь гораздо чаще, чем думают просящие. Спроси организатора: «Покажете, с чего начать?»', kz: 'Көмек сұраудан қорқасың ба? Адамдар сұраушы ойлағаннан әлдеқайда жиі көмектеседі. Ұйымдастырушыдан сұра: «Неден бастау керегін көрсетесіз бе?»', en: 'Afraid to ask for help? People agree to help far more often than those asking expect. Ask the organiser: “Could you show me where to start?”', src: 'Flynn & Lake, 2008' },
  { ru: 'Стыдно признаться, что ничего не умеешь? «Эффект красивого беспорядка»: честное «я новичок» другие видят как смелость, а не слабость.', kz: 'Ештеңе білмейтініңді мойындауға ұяласың ба? «Әдемі тәртіпсіздік әсері»: шынайы «мен жаңадан бастаушымын» дегенді басқалар әлсіздік емес, батылдық деп көреді.', en: 'Embarrassed to admit you cannot do it yet? The “beautiful mess effect”: an honest “I am a beginner” looks like courage to others, not weakness.', src: 'Bruk, Scholl & Bless, 2018' },
  { ru: 'Что делает людей счастливыми? Гарвард изучает жизни людей больше 85 лет: счастливее и здоровее те, у кого тёплые отношения. Своих людей находят там, где занимаются общим делом.', kz: 'Адамдарды не бақытты етеді? Гарвард 85 жылдан астам адамдар өмірін зерттеп келеді: жылы қарым-қатынасы барлар бақыттырақ әрі саудыраақ. Өз адамдарыңды ортақ іспен айналысатын жерден табасың.', en: 'What makes people happy? Harvard has studied people’s lives for over 85 years: those with warm relationships are happier and healthier. You find your people where you do something together.', src: 'Harvard Study of Adult Development' },
  { ru: 'Записался и бросил? Новая привычка складывается в среднем за 66 дней. Помогает план «если…, то…»: «Если вторник, 16:00 — то я иду на встречу клуба».', kz: 'Жазылып, тастап кеттің бе? Жаңа әдет орта есеппен 66 күнде қалыптасады. «Егер…, онда…» жоспары көмектеседі: «Егер сейсенбі, 16:00 болса — онда клуб кездесуіне барамын».', en: 'Signed up and quit? A new habit takes about 66 days on average. An “if…, then…” plan helps: “If it is Tuesday 16:00, then I go to the club meeting.”', src: 'Lally и др., 2010; Gollwitzer & Sheeran, 2006' },
  { ru: 'Не знаешь, что тебе интересно? Интерес развивается, а не находится сам. Попробуй 2–3 направления, дай каждому хотя бы 3 встречи — и замечай, куда хочется вернуться.', kz: 'Саған не қызық екенін білмейсің бе? Қызығушылық өздігінен табылмайды, ол дамиды. 2–3 бағытты байқап көр, әрқайсысына кемінде 3 кездесу бер — және қайда қайтқың келетінін байқа.', en: 'Not sure what interests you? Interest is developed, not found. Try 2–3 directions, give each at least 3 meetings, and notice where you want to go back.', src: 'O’Keefe, Dweck & Walton, Psychological Science, 2018' }
];

// Тест «Подобрать за минуту» — веса как на сайте (helper.js).
const QUIZ = {
  keys: ['what', 'age', 'exp', 'money', 'who'],
  what: { m: { sport: 8 }, k: { eng: 8, it: 7, stem: 5 }, c: { art: 8, media: 6 }, s: { debate: 8, lang: 7 }, h: { vol: 8 }, b: { biz: 8, it: 4, stem: 3 }, p: { vol: 7, art: 5, debate: 5 } },
  whatCat: { m: 'sport', k: 'eng', c: 'art', s: 'debate', h: 'vol', b: 'biz', p: 'lang' },
  age: { 1: 13, 2: 15, 3: 17, 4: 19 }
};

// ---------- утилиты ----------
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const digits = (s) => String(s || '').replace(/\D/g, '');
const http = (env) => env.http || fetch;
const site = (env) => String(env.SITE_URL || 'https://qosyl.club/').replace(/\/?$/, '/');
const L3 = (obj, lang) => (obj && typeof obj === 'object') ? (obj[lang] || obj.ru || obj.kz || obj.en || '') : String(obj || '');
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const isAdmin = (env, id) => String(env.ADMIN_IDS || '').split(/[\s,]+/).filter(Boolean).includes(String(id));
function filled(v) { const t = String(v || '').trim(); return !!t && !/^(—|-|нет|жоқ|no)$/i.test(t); }
function waNumber(tel) {
  let d = digits(tel);
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  return d.length >= 11 ? d : '';
}
function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371, p = Math.PI / 180, dLa = (bLat - aLat) * p, dLo = (bLng - aLng) * p;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function catOf(id) { return DATA.CATS.find((c) => c.id === id); }
function catName(id, lang) { const c = catOf(id); return c ? c[lang] || c.ru : id; }
function distName(id, lang) { const d = DATA.DISTRICTS.find((x) => x.id === id); return d ? d[lang] || d.ru : ''; }
function alsoOf(c) { return (Array.isArray(c.also) ? c.also : []).filter((id) => id !== c.cat && catOf(id)); }
function inCat(c, cat) { return cat === 'all' || c.cat === cat || alsoOf(c).includes(cat); }
function costText(c) { const v = c.cost || {}; return [v.ru, v.kz, v.en].join(' ').toLowerCase(); }
function isFree(c) {
  if (typeof c.free === 'boolean') return c.free;
  const t = costText(c);
  return /беспла|тегін|тегин|free|no cost/.test(t) || /^[\s0\-—–.,]*$/.test(t) || /\bнет\b|\bжоқ\b/.test(t);
}
function isPaid(c) { return !isFree(c) && /\d\s*(₸|тг|тенге|теңге|kzt|тыс)|плат|ақылы|paid|в месяц|per month|ай сайын/.test(costText(c)); }
function isOpen(c) { return !!c.open && !c.verified; }
function hasCoords(c) { const la = Number(c.lat), ln = Number(c.lng); return !isNaN(la) && !isNaN(ln) && (la || ln); }
function ageRange(s) {
  const t = String(s || '').replace(/[–—]/g, '-');
  let m = /(\d{1,2})\s*-\s*(\d{1,2})/.exec(t); if (m) return { min: +m[1], max: +m[2] };
  m = /(\d{1,2})\s*\+/.exec(t); if (m) return { min: +m[1], max: 99 };
  m = /(?:от|from|бастап)\s*(\d{1,2})/i.exec(t); if (m) return { min: +m[1], max: 99 };
  m = /(\d{1,2})/.exec(t); if (m) return { min: +m[1], max: 99 };
  return null;
}

// ---------- поиск с опечатками (как на сайте) ----------
const TR = { 'а': 'a', 'ә': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'ғ': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'i', 'і': 'i', 'к': 'k', 'қ': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'ң': 'n', 'о': 'o', 'ө': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ұ': 'u', 'ү': 'u', 'ф': 'f', 'х': 'h', 'һ': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sh', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' };
function norm(s) {
  s = String(s == null ? '' : s).toLowerCase(); let out = '';
  for (const ch of s) out += Object.prototype.hasOwnProperty.call(TR, ch) ? TR[ch] : ((ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9')) ? ch : ' ';
  return out;
}
const toks = (s) => norm(s).split(/\s+/).filter((w) => w.length > 1);
function lev(a, b, max) {
  if (a === b) return 0; if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = [], cur = [];
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur.slice();
  }
  return prev[b.length];
}
const slack = (w) => w.length >= 7 ? 2 : w.length >= 4 ? 1 : 0;
function hitsWord(w, tokens) {
  const max = slack(w);
  for (const t of tokens) {
    if (t.includes(w)) return true;
    if (!max) continue;
    if (t.length > w.length && (lev(w, t.slice(0, w.length), max) <= max || lev(w, t.slice(0, w.length + 1), max) <= max)) return true;
    if (Math.abs(t.length - w.length) <= max && lev(w, t, max) <= max) return true;
    if (w.length > t.length && t.length >= 4 && (w.indexOf(t) === 0 || lev(t, w.slice(0, t.length), slack(t)) <= slack(t))) return true;
  }
  return false;
}
// Служебные слова фильтров: «бесплатно» и «новичкам» понимаем как фильтры.
const FREE_WORDS = ['besplatno', 'besplatnye', 'besplatnyi', 'tegin', 'free'];
const BEG_WORDS = ['novichkam', 'novichok', 'novichkov', 's nulya', 'bastaushy', 'beginner', 'beginners'];
function tokensOf(c) {
  if (!c.__t) {
    const hay = [L3(c.name, 'ru'), L3(c.name, 'kz'), L3(c.name, 'en'), c.kw,
      ...[c.cat, ...alsoOf(c)].map((id) => [catName(id, 'ru'), catName(id, 'kz'), catName(id, 'en'), (DATA.CAT_HINTS || {})[id] || ''].join(' ')),
      c.dist ? [distName(c.dist, 'ru'), distName(c.dist, 'kz'), distName(c.dist, 'en')].join(' ') : '',
      c.addr ? [c.addr.ru, c.addr.kz, c.addr.en].join(' ') : '',
      c.about ? [c.about.ru, c.about.kz, c.about.en].join(' ') : '',
      c.tag ? [c.tag.ru, c.tag.kz, c.tag.en].join(' ') : ''].join(' ');
    c.__t = toks(hay);
  }
  return c.__t;
}
function search(list, q) {
  let words = toks(q); let free = false, beg = false;
  words = words.filter((w) => { if (FREE_WORDS.includes(w)) { free = true; return false; } if (BEG_WORDS.some((b) => b === w || w.startsWith('novich') || w.startsWith('bastaush'))) { beg = true; return false; } return true; });
  let out = list.slice();
  if (free) out = out.filter(isFree);
  if (beg) out = out.filter((c) => c.beginner);
  if (words.length) out = out.filter((c) => { const t = tokensOf(c); return words.every((w) => hitsWord(w, t)); });
  out = sortDefault(out);
  if (!words.length) return out;
  // Сначала те, где слово есть в названии, направлении или ключевых словах, а не только в описании.
  const catToks = (id) => toks([catName(id, 'ru'), catName(id, 'kz'), catName(id, 'en'), (DATA.CAT_HINTS || {})[id] || ''].join(' '));
  const tier = (c) => {
    if (!c.__s) c.__s = { main: toks([L3(c.name, 'ru'), L3(c.name, 'kz'), L3(c.name, 'en')].join(' ')).concat(catToks(c.cat)), more: toks(c.kw || '').concat(...alsoOf(c).map(catToks)) };
    if (words.every((w) => hitsWord(w, c.__s.main))) return 0;
    if (words.every((w) => hitsWord(w, c.__s.main.concat(c.__s.more)))) return 1;
    return 2;
  };
  return out.map((c, i) => ({ c, i, s: tier(c) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.c);
}
function sortDefault(list, cat) {
  return list.map((c, i) => ({ c, i })).sort((a, b) => {
    const oa = isOpen(a.c) ? 1 : 0, ob = isOpen(b.c) ? 1 : 0; if (oa !== ob) return oa - ob;
    if (cat && cat !== 'all') { const ma = a.c.cat === cat ? 0 : 1, mb = b.c.cat === cat ? 0 : 1; if (ma !== mb) return ma - mb; }
    if (!!a.c.featured !== !!b.c.featured) return a.c.featured ? -1 : 1;
    return a.i - b.i;
  }).map((x) => x.c);
}

// ---------- хранилище (Cloudflare KV или файл в Node) ----------
const db = {
  async get(env, k) { const v = await env.DB.get(k); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } },
  put(env, k, v, ttl) { return env.DB.put(k, JSON.stringify(v), ttl ? { expirationTtl: Math.max(60, Math.round(ttl)) } : undefined); },
  del(env, k) { return env.DB.delete(k); },
  async keys(env, prefix) {
    const out = []; let cursor;
    do { const r = await env.DB.list({ prefix, cursor }); for (const x of r.keys) out.push(x.name); cursor = r.list_complete ? null : r.cursor; } while (cursor);
    return out;
  }
};

// ---------- каталог с сайта ----------
let CACHE = { at: 0, list: [] };
async function catalog(env, fresh) {
  if (!fresh && CACHE.list.length && Date.now() - CACHE.at < 5 * 60 * 1000) return CACHE.list;
  try {
    const r = await http(env)(site(env) + 'communities.json', { headers: { 'cache-control': 'no-cache' } });
    if (r.ok) { const l = await r.json(); if (Array.isArray(l)) CACHE = { at: Date.now(), list: l }; }
  } catch (e) { /* оставляем прошлый список */ }
  return CACHE.list;
}

// ---------- Telegram API ----------
async function tg(env, method, body) {
  try {
    const r = await http(env)(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({ ok: false }));
    if (!j.ok && env.DEBUG) console.log('TG', method, j.description);
    return j;
  } catch (e) { return { ok: false, description: String(e) }; }
}
let ME = null;
async function botName(env) {
  if (env.BOT_USERNAME) return String(env.BOT_USERNAME).replace(/^@/, '');
  if (ME) return ME;
  const j = await tg(env, 'getMe'); if (j.ok) ME = j.result.username;
  return ME || '';
}

// ---------- пользователь ----------
async function getUser(env, from) {
  const k = 'u:' + from.id;
  let u = await db.get(env, k);
  if (!u) u = { id: from.id, lang: '', fav: [], subs: [], digest: false, at: Date.now(), isNew: true };
  return u;
}
async function saveUser(env, u) { const { isNew, ...rest } = u; await db.put(env, 'u:' + u.id, rest); }
const T = (u) => S[u.lang] || S.ru;

function mainKb(u) {
  const t = T(u);
  return {
    keyboard: [
      [{ text: t.m_search }, { text: t.m_cats }],
      [{ text: t.m_quiz }, { text: t.m_near, request_location: true }],
      [{ text: t.m_random }, { text: t.m_fav }],
      [{ text: t.m_subs }, { text: t.m_tip }],
      [{ text: t.m_org }, { text: t.m_lang }]
    ], resize_keyboard: true, is_persistent: true
  };
}
// Текст кнопки меню → действие (на любом из трёх языков).
const MENU = {};
for (const lang of Object.keys(S)) for (const k of ['search', 'cats', 'quiz', 'near', 'random', 'fav', 'subs', 'tip', 'org', 'lang']) MENU[S[lang]['m_' + k]] = k;

// ---------- экраны ----------
function line(c, lang, i, km) {
  const t = S[lang];
  const bits = [catName(c.cat, lang)];
  if (filled(c.age)) bits.push(String(c.age));
  bits.push(isFree(c) ? t.f_free.replace(/^\S+\s/, '') : cut(L3(c.cost, lang), 24));
  if (km != null) bits.push('📍 ' + t.km(km));
  return `${i}. <b>${esc(L3(c.name, lang))}</b>${c.verified ? ' ✅' : ''}${c.beginner ? ' 🌱' : ''}\n<i>${esc(bits.join(' · '))}</i>`;
}
function listMsg(lang, head, items, page, navCb, extraRows, kmOf) {
  const t = S[lang], pages = Math.max(1, Math.ceil(items.length / PAGE));
  page = Math.min(Math.max(0, page), pages - 1);
  const slice = items.slice(page * PAGE, page * PAGE + PAGE);
  const text = head + '\n\n' + slice.map((c, i) => line(c, lang, page * PAGE + i + 1, kmOf ? kmOf(c) : null)).join('\n\n');
  const kb = slice.map((c, i) => [{ text: `${page * PAGE + i + 1} · ${cut(L3(c.name, lang), 38)}`, callback_data: 'c:' + c.slug }]);
  if (pages > 1 && navCb) {
    kb.push([
      { text: page > 0 ? t.prev : ' ', callback_data: page > 0 ? navCb(page - 1) : 'noop' },
      { text: `${page + 1} / ${pages}`, callback_data: 'noop' },
      { text: page < pages - 1 ? t.next : ' ', callback_data: page < pages - 1 ? navCb(page + 1) : 'noop' }
    ]);
  }
  return { text, kb: kb.concat(extraRows || []) };
}
function catsScreen(list, lang) {
  const t = S[lang], rows = [];
  const counts = DATA.CATS.map((c) => ({ c, n: list.filter((x) => inCat(x, c.id)).length }));
  counts.sort((a, b) => (b.n > 0) - (a.n > 0));
  for (let i = 0; i < counts.length; i += 2) {
    rows.push(counts.slice(i, i + 2).map(({ c, n }) => ({ text: `${CAT_EMOJI[c.id] || '•'} ${c[lang] || c.ru} · ${n}`, callback_data: `l:${c.id}:0:` })));
  }
  rows.push([{ text: `📚 ${t.all} · ${list.length}`, callback_data: 'l:all:0:' }]);
  return { text: t.cats_h(list.length), kb: rows };
}
// flags: f — бесплатно, b — новичкам, d<район>
function parseFlags(s) { s = s || ''; const m = /d([a-z]+)/.exec(s); return { free: s.includes('f'), beg: s.includes('b'), dist: m ? m[1] : '' }; }
function flagStr(f) { return (f.free ? 'f' : '') + (f.beg ? 'b' : '') + (f.dist ? 'd' + f.dist : ''); }
function catList(list, lang, cat, page, flags) {
  const t = S[lang], f = parseFlags(flags);
  let items = list.filter((c) => inCat(c, cat));
  if (f.free) items = items.filter(isFree);
  if (f.beg) items = items.filter((c) => c.beginner);
  if (f.dist) items = items.filter((c) => c.dist === f.dist);
  items = sortDefault(items, cat);
  const name = cat === 'all' ? t.all : `${CAT_EMOJI[cat] || ''} ${catName(cat, lang)}`;
  const tog = (k) => flagStr({ ...f, [k]: !f[k] });
  const filters = [
    [{ text: (f.free ? '✓ ' : '') + t.f_free, callback_data: `l:${cat}:0:${tog('free')}` },
      { text: (f.beg ? '✓ ' : '') + t.f_beg, callback_data: `l:${cat}:0:${tog('beg')}` }],
    [{ text: `${t.f_dist}: ${f.dist ? distName(f.dist, lang) : t.f_dist_all}`, callback_data: `ld:${cat}:${flagStr({ ...f, dist: '' })}` }, { text: t.back, callback_data: 'cats' }]
  ];
  if (!items.length) return { text: t.list_h(esc(name), 0) + '\n\n' + t.empty_list, kb: filters };
  return listMsg(lang, t.list_h(esc(name), items.length), items, page, (p) => `l:${cat}:${p}:${flags || ''}`, filters);
}
function distPick(lang, cat, flags) {
  const t = S[lang], rows = [];
  const ds = DATA.DISTRICTS;
  for (let i = 0; i < ds.length; i += 2) rows.push(ds.slice(i, i + 2).map((d) => ({ text: d[lang] || d.ru, callback_data: `l:${cat}:0:${flags}d${d.id}` })));
  rows.push([{ text: t.f_dist_all, callback_data: `l:${cat}:0:${flags}` }]);
  return { text: t.choose_dist, kb: rows };
}

function cardMsg(env, c, lang, u, bot) {
  const t = S[lang], name = L3(c.name, lang);
  const rows = [];
  const lines = [`<b>${esc(name)}</b>`];
  if (filled(L3(c.tag, lang))) lines.push(`<i>${esc(L3(c.tag, lang))}</i>`);
  lines.push('');
  lines.push(`${CAT_EMOJI[c.cat] || '•'} ${esc(catName(c.cat, lang))}${alsoOf(c).length ? ' + ' + alsoOf(c).map((id) => CAT_EMOJI[id] || '').join('') : ''}`);
  if (filled(c.age)) lines.push(`👤 ${t.age}: ${esc(c.age)}`);
  if (filled(L3(c.cost, lang))) lines.push(`💸 ${t.cost}: ${esc(L3(c.cost, lang))}`);
  if (filled(L3(c.sched, lang))) lines.push(`🕒 ${t.sched}: ${esc(cut(L3(c.sched, lang), 200))}`);
  const addr = filled(L3(c.addr, lang)) ? L3(c.addr, lang) : '';
  const dn = c.dist ? distName(c.dist, lang) : '';
  const withDist = dn && !norm(addr).includes(norm(dn).trim().slice(0, 4)) ? [addr, dn] : [addr];
  if (addr || dn) lines.push(`📍 ${t.addr}: ${esc(withDist.filter(Boolean).join(', ') || dn)}`);
  if (filled(L3(c.langs, lang))) lines.push(`🗣 ${t.langs}: ${esc(L3(c.langs, lang))}`);
  lines.push(c.verified ? t.verified : isOpen(c) ? t.open : '');
  if (c.beginner) lines.push(t.beg_note);
  const about = L3(c.about, lang);
  if (filled(about) && about !== L3(c.tag, lang)) lines.push('', esc(cut(about, 700)));
  const wa = waNumber(c.tel);
  lines.push('', wa ? t.greet_note : (c.ig || c.tg || c.web ? '' : t.no_contact));
  const contact = [];
  if (wa) contact.push({ text: t.b_wa, url: `https://wa.me/${wa}?text=${encodeURIComponent(t.greet)}` });
  if (filled(c.ig)) contact.push({ text: t.b_ig, url: `https://instagram.com/${encodeURIComponent(String(c.ig).replace(/^@/, ''))}` });
  if (filled(c.tg)) contact.push({ text: t.b_tg, url: `https://t.me/${encodeURIComponent(String(c.tg).replace(/^@/, ''))}` });
  if (contact.length) rows.push(contact.slice(0, 3));
  const cardUrl = site(env) + '#/club/' + encodeURIComponent(c.slug);
  const r2 = [];
  if (/^https?:\/\//.test(c.web || '')) r2.push({ text: t.b_web, url: c.web });
  r2.push({ text: t.b_site, url: cardUrl });
  rows.push(r2);
  const fav = (u.fav || []).includes(c.slug);
  const r3 = [{ text: fav ? t.b_unfav : t.b_fav, callback_data: 'f:' + c.slug }];
  if (hasCoords(c)) r3.push({ text: t.b_map, callback_data: 'm:' + c.slug });
  rows.push(r3);
  const shareLink = bot ? `https://t.me/${bot}?start=c_${c.slug}` : cardUrl;
  rows.push([{ text: t.b_remind, callback_data: 'r:' + c.slug }, { text: t.b_share, url: `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(t.share_text(name))}` }]);
  rows.push([{ text: t.b_report, callback_data: 'x:' + c.slug }]);
  const photo = /^https?:\/\//.test(c.photo || '') ? c.photo : (c.photo ? site(env) + String(c.photo).replace(/^\.?\//, '') : '');
  return { text: lines.filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim(), kb: rows, photo };
}

function quizScore(c, a) {
  const why = []; let s = 0;
  const w0 = QUIZ.what[a[0]] || {};
  let w = w0[c.cat] || 0;
  for (const id of alsoOf(c)) w = Math.max(w, (w0[id] || 0) - 1);
  s += w; if (w >= 4) why.push('cat');
  const age = QUIZ.age[a[1]], r = ageRange(c.age);
  if (age && r) { if (age >= r.min && age <= r.max) { s += 4; why.push('age'); } else if (age >= r.min - 1 && age <= r.max + 1) s += 1; else s -= 9; }
  if (a[2] === 'n') { if (c.beginner) { s += 4; why.push('beg'); } else s -= 1; }
  if (a[2] === 'p' && !c.beginner) s += 1;
  if (a[3] === 'f') { if (isFree(c)) { s += 4; why.push('free'); } else if (isPaid(c)) s -= 7; }
  if (a[3] === 'c' && isFree(c)) s += 2;
  if (a[4] === 'a') { if (c.beginner) { s += 3; if (!why.includes('beg')) why.push('alone'); } if (c.verified) s += 1; }
  if (c.verified) s += 1;
  const order = ['beg', 'alone', 'free', 'cat', 'age'];
  why.sort((x, y) => order.indexOf(x) - order.indexOf(y));
  return { c, s, why: why.slice(0, 3) };
}
function quizStep(lang, step, ans) {
  const t = S[lang], key = QUIZ.keys[step], opts = t.quiz_o[key];
  const rows = Object.keys(opts).map((code) => [{ text: opts[code], callback_data: `q:${step + 1}:${ans}${code}` }]);
  if (key === 'age') rows.splice(0, rows.length, Object.keys(opts).map((code) => ({ text: opts[code], callback_data: `q:${step + 1}:${ans}${code}` })));
  return { text: `${t.quiz_step(step + 1)}\n\n<b>${t.quiz_q[step]}</b>`, kb: rows };
}
function quizResult(list, lang, ans) {
  const t = S[lang];
  const hits = list.map((c) => quizScore(c, ans)).filter((h) => h.s > 0)
    .sort((x, y) => y.s - x.s || (y.c.beginner ? 1 : 0) - (x.c.beginner ? 1 : 0) || (y.c.verified ? 1 : 0) - (x.c.verified ? 1 : 0)).slice(0, 6);
  const cat = QUIZ.whatCat[ans[0]];
  const again = [{ text: t.quiz_again, callback_data: 'q:0:' }];
  const sub = cat ? [{ text: t.quiz_sub(catName(cat, lang)), callback_data: 'sq:' + cat }] : [];
  if (!hits.length) return { text: t.quiz_none, kb: [again, sub].filter((r) => r.length) };
  const text = t.quiz_res + '\n\n' + hits.map((h, i) => `${i + 1}. <b>${esc(L3(h.c.name, lang))}</b>${h.why.length ? '\n<i>' + h.why.map((w) => t.why[w]).join(' · ') + '</i>' : ''}`).join('\n\n');
  const kb = hits.map((h, i) => [{ text: `${i + 1} · ${cut(L3(h.c.name, lang), 38)}`, callback_data: 'c:' + h.c.slug }]);
  return { text, kb: kb.concat([sub, again].filter((r) => r.length)) };
}
function subsScreen(u) {
  const t = T(u), lang = u.lang || 'ru', rows = [];
  const on = (id) => (u.subs || []).includes(id);
  for (let i = 0; i < DATA.CATS.length; i += 2) rows.push(DATA.CATS.slice(i, i + 2).map((c) => ({ text: `${on(c.id) ? '✅' : '▫️'} ${CAT_EMOJI[c.id] || ''} ${c[lang] || c.ru}`, callback_data: 'sb:' + c.id })));
  rows.push([{ text: `${on('all') ? '✅' : '▫️'} ${t.subs_all}`, callback_data: 'sb:all' }]);
  rows.push([{ text: u.digest ? t.subs_digest_on : t.subs_digest_off, callback_data: 'dg' }]);
  return { text: t.subs_h, kb: rows };
}
function tipMsg(lang, i) {
  const t = S[lang], tip = TIPS[((i % TIPS.length) + TIPS.length) % TIPS.length];
  return { text: `${t.tip_h}\n\n${esc(tip[lang] || tip.ru)}\n\n<i>${t.src}: ${esc(tip.src)}</i>`, kb: [[{ text: t.tip_more, callback_data: 't:' + (i + 1) }, { text: t.tip_find, callback_data: 'cats' }]] };
}
function orgMsg(env, lang) {
  const t = S[lang];
  return {
    text: t.org_h, kb: [
      [{ text: t.org_apply, callback_data: 'a:go' }],
      [{ text: t.org_site, url: site(env) + '#/join' }, { text: t.org_cab, url: site(env) + '#/cabinet' }],
      [{ text: t.org_wa, url: `https://wa.me/${ORG_WA}?text=${encodeURIComponent(t.org_wa_text)}` }],
      [{ text: t.org_ig, url: `https://instagram.com/${ORG_IG}` }]
    ]
  };
}
function langKb() { return [[{ text: 'Русский', callback_data: 'lg:ru' }, { text: 'Қазақша', callback_data: 'lg:kz' }, { text: 'English', callback_data: 'lg:en' }]]; }

// ---------- отправка ----------
async function send(env, chat, m, extra) {
  return tg(env, 'sendMessage', { chat_id: chat, text: m.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: m.kb ? { inline_keyboard: m.kb } : undefined, ...(extra || {}) });
}
async function edit(env, msg, m) {
  if (!msg || msg.photo || msg.location || msg.venue) return send(env, msg.chat.id, m);
  const j = await tg(env, 'editMessageText', { chat_id: msg.chat.id, message_id: msg.message_id, text: m.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: { inline_keyboard: m.kb || [] } });
  if (!j.ok && !/not modified/.test(j.description || '')) return send(env, msg.chat.id, m);
  return j;
}
async function sendCard(env, chat, c, u) {
  const m = cardMsg(env, c, u.lang || 'ru', u, await botName(env));
  const lp = m.photo ? { url: m.photo, prefer_large_media: true, show_above_text: true } : { is_disabled: true };
  const j = await tg(env, 'sendMessage', { chat_id: chat, text: m.text, parse_mode: 'HTML', link_preview_options: lp, reply_markup: { inline_keyboard: m.kb } });
  if (!j.ok && m.photo) return send(env, chat, m);
  return j;
}

// ---------- заявка организатора ----------
const A_STEPS = ['name', 'cat', 'tag', 'about', 'age', 'cost', 'sched', 'addr', 'langs', 'beg', 'tel', 'ig', 'contact'];
function appAsk(u) {
  const t = T(u), f = u.flow, key = A_STEPS[f.step], lang = u.lang || 'ru';
  const cancel = [{ text: t.a_cancel, callback_data: 'a:x' }];
  let kb = [cancel];
  if (key === 'cat') {
    kb = [];
    for (let i = 0; i < DATA.CATS.length; i += 2) kb.push(DATA.CATS.slice(i, i + 2).map((c) => ({ text: `${CAT_EMOJI[c.id] || ''} ${c[lang] || c.ru}`, callback_data: 'ac:' + c.id })));
    kb.push([{ text: lang === 'kz' ? 'Басқа' : lang === 'en' ? 'Other' : 'Другое', callback_data: 'ac:other' }], cancel);
  }
  if (key === 'cost') kb = [[{ text: t.a_free, callback_data: 'av:free' }], cancel];
  if (key === 'beg') kb = [[{ text: t.a_yes, callback_data: 'av:yes' }, { text: t.a_no, callback_data: 'av:no' }], cancel];
  if (key === 'ig') kb = [[{ text: t.a_skip, callback_data: 'av:skip' }], cancel];
  if (key === 'langs') {
    const on = (l) => (f.d.langs || []).includes(l);
    kb = [[['ru', 'Русский'], ['kz', 'Қазақша'], ['en', 'English']].map(([l, n]) => ({ text: (on(l) ? '✅ ' : '') + n, callback_data: 'al:' + l })), [{ text: t.a_done, callback_data: 'al:ok' }], cancel];
  }
  return { text: `<b>${f.step + 1}/${A_STEPS.length}.</b> ${t.a_q[key]}`, kb };
}
function appSummary(u) {
  const t = T(u), d = u.flow.d, lang = u.lang || 'ru';
  const L = { name: 'Название', cat: 'Направление', tag: 'Чем занимаетесь', about: 'Описание', age: 'Возраст', cost: 'Стоимость', sched: 'Когда', addr: 'Адрес', langs: 'Языки', beg: 'Без опыта', tel: 'Телефон', ig: 'Instagram', contact: 'Контакт' };
  const val = (k) => k === 'cat' ? (d.cat === 'other' ? '—' : catName(d.cat, lang)) : k === 'langs' ? (d.langs || []).map((l) => ({ ru: 'RU', kz: 'KZ', en: 'EN' }[l])).join(', ') : k === 'beg' ? (d.beg === 'yes' ? t.a_yes : t.a_no) : d[k] || '—';
  const text = `${t.a_check}\n\n` + A_STEPS.map((k) => `<b>${L[k]}:</b> ${esc(cut(val(k), 300))}`).join('\n') + `\n\n<i>${t.a_consent}</i>`;
  return { text, kb: [[{ text: t.a_send, callback_data: 'a:send' }], [{ text: t.a_restart, callback_data: 'a:go' }, { text: t.a_cancel, callback_data: 'a:x' }]] };
}
async function appSubmit(env, u, from) {
  const F = DATA.FORM, d = u.flow.d, E = F.entries;
  const p = new URLSearchParams();
  const catRu = d.cat === 'other' ? 'Другое' : catName(d.cat, 'ru');
  p.append(E.name, d.name); p.append(E.cat, F.cat[d.cat] || F.cat.other); p.append(E.tag, d.tag);
  p.append(E.about, `Секция на сайте: ${catRu}\n\n${d.about}\n\nОтправлено из Telegram-бота Qosyl (Telegram ID ${from.id}${from.username ? ', @' + from.username : ''})`);
  p.append(E.age, d.age); p.append(E.cost, d.cost); p.append(E.sched, d.sched); p.append(E.addr, d.addr);
  (d.langs || []).forEach((l) => { if (F.langs[l]) p.append(E.langs, F.langs[l]); });
  p.append(E.beginner, d.beg === 'yes' ? F.yes : F.no);
  p.append(E.tel, d.tel); if (d.ig) p.append(E.ig, d.ig.replace(/^@/, '')); p.append(E.contact, d.contact);
  p.append(E.consent, F.consent); p.append(E.top, F.topNo); p.append('pageHistory', F.pages); p.append('fvv', '1');
  let ok = false;
  try { const r = await http(env)(F.action, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: p.toString() }); ok = r.ok; } catch (e) { ok = false; }
  // Копия заявки администраторам — на случай, если Google Форма не приняла.
  const admins = String(env.ADMIN_IDS || '').split(/[\s,]+/).filter(Boolean);
  for (const a of admins) await tg(env, 'sendMessage', { chat_id: a, parse_mode: 'HTML', text: `📝 <b>Заявка из бота</b> ${ok ? '(ушла в Google Форму)' : '(⚠️ Google Форма не приняла — внеси вручную)'}\n\n` + appSummary(u).text.split('\n\n').slice(1, -1).join('\n\n') + `\n\nОт: ${from.username ? '@' + esc(from.username) : 'ID ' + from.id}` });
  return ok || admins.length > 0;
}

// ---------- обработка обновлений ----------
export async function handleUpdate(update, env) {
  if (update.message) return onMessage(update.message, env);
  if (update.callback_query) return onCallback(update.callback_query, env);
  if (update.inline_query) return onInline(update.inline_query, env);
  if (update.my_chat_member) {
    const st = update.my_chat_member.new_chat_member && update.my_chat_member.new_chat_member.status;
    if (st === 'kicked') await forgetIndexes(env, update.my_chat_member.chat.id);
  }
}

async function onMessage(msg, env) {
  if (!msg.chat || msg.chat.type !== 'private' || !msg.from) return;
  const u = await getUser(env, msg.from), chat = msg.chat.id;
  const text = (msg.text || '').trim();

  // Новичок без языка — сначала выбор языка (но глубокие ссылки запоминаем).
  if (u.isNew || !u.lang) {
    if (text.startsWith('/start ')) u.pending = text.slice(7).trim().slice(0, 60);
    if (!u.lang && /^kk|^kz/i.test(msg.from.language_code || '')) u.hint = 'kz';
    await saveUser(env, u);
    return tg(env, 'sendMessage', { chat_id: chat, text: S.ru.choose_lang, reply_markup: { inline_keyboard: langKb() } });
  }
  const t = T(u), lang = u.lang;

  if (msg.location) {
    const list = await catalog(env);
    const { latitude: la, longitude: ln } = msg.location;
    const items = list.filter(hasCoords).map((c) => ({ c, km: distKm(la, ln, Number(c.lat), Number(c.lng)) })).sort((a, b) => a.km - b.km).slice(0, PAGE);
    if (!items.length) return send(env, chat, { text: t.near_none });
    const kmMap = new Map(items.map((x) => [x.c.slug, x.km]));
    return send(env, chat, listMsg(lang, t.near_h, items.map((x) => x.c), 0, null, [], (c) => kmMap.get(c.slug)));
  }

  // Заявка организатора: ждём текстовый ответ на текущий вопрос.
  if (u.flow && u.flow.k === 'app' && !text.startsWith('/')) {
    const key = A_STEPS[u.flow.step];
    if (msg.contact && key === 'tel') { u.flow.d.tel = '+' + digits(msg.contact.phone_number); u.flow.step++; }
    else if (!text) return send(env, chat, { text: t.a_need_text });
    else if (['cat', 'langs', 'beg'].includes(key)) return send(env, chat, appAsk(u));
    else {
      if (key === 'tel' && digits(text).length < 10) return send(env, chat, { text: t.a_bad_tel });
      u.flow.d[key] = cut(text, key === 'about' ? 1500 : 300); u.flow.step++;
    }
    await saveUser(env, u);
    return send(env, chat, u.flow.step >= A_STEPS.length ? appSummary(u) : appAsk(u));
  }

  if (text.startsWith('/')) {
    const [cmd0, ...rest] = text.split(/\s+/); const cmd = cmd0.slice(1).split('@')[0].toLowerCase(); const arg = rest.join(' ');
    switch (cmd) {
      case 'start': return onStart(env, u, chat, arg);
      case 'menu': return tg(env, 'sendMessage', { chat_id: chat, text: t.menu, reply_markup: mainKb(u) });
      case 'help': return send(env, chat, { text: t.help });
      case 'search': return action(env, u, chat, 'search');
      case 'cats': return action(env, u, chat, 'cats');
      case 'quiz': return action(env, u, chat, 'quiz');
      case 'near': return action(env, u, chat, 'near');
      case 'random': return action(env, u, chat, 'random');
      case 'fav': return action(env, u, chat, 'fav');
      case 'subs': return action(env, u, chat, 'subs');
      case 'tip': return action(env, u, chat, 'tip');
      case 'org': return action(env, u, chat, 'org');
      case 'lang': return action(env, u, chat, 'lang');
      case 'privacy': return send(env, chat, { text: t.privacy });
      case 'cancel': if (u.flow) { delete u.flow; await saveUser(env, u); } return tg(env, 'sendMessage', { chat_id: chat, text: t.a_cancelled, reply_markup: mainKb(u) });
      case 'stop': await forgetUser(env, u.id); return tg(env, 'sendMessage', { chat_id: chat, text: t.stopped, reply_markup: { remove_keyboard: true } });
      case 'myid': return send(env, chat, { text: `Ваш Telegram ID: <code>${msg.from.id}</code>` });
      case 'stats': if (isAdmin(env, msg.from.id)) return adminStats(env, chat); break;
      case 'broadcast': if (isAdmin(env, msg.from.id)) return adminBroadcast(env, chat, arg); break;
    }
    return send(env, chat, { text: t.unknown_cmd });
  }

  if (MENU[text]) return action(env, u, chat, MENU[text]);
  if (!text) return;
  // Любой другой текст — поиск.
  const list = await catalog(env);
  if (!list.length) return send(env, chat, { text: t.loading_fail });
  const q = cut(text, 60), hits = search(list, q);
  if (!hits.length) return send(env, chat, { text: t.nothing(esc(q)), kb: [[{ text: t.m_cats, callback_data: 'cats' }]] });
  const inCb = new TextEncoder().encode('s:99:' + q).length <= 64;
  if (!inCb) { u.q = q; await saveUser(env, u); }
  return send(env, chat, listMsg(lang, t.found(esc(q), hits.length), hits, 0, (p) => inCb ? `s:${p}:${q}` : 's:' + p));
}

async function onStart(env, u, chat, arg) {
  const t = T(u), list = await catalog(env);
  if (arg && arg.startsWith('c_')) { const c = list.find((x) => x.slug === arg.slice(2)); if (c) { await tg(env, 'sendMessage', { chat_id: chat, text: t.menu, reply_markup: mainKb(u) }); return sendCard(env, chat, c, u); } }
  if (arg && arg.startsWith('cat_')) { const id = arg.slice(4); if (catOf(id)) { await tg(env, 'sendMessage', { chat_id: chat, text: t.menu, reply_markup: mainKb(u) }); return send(env, chat, catList(list, u.lang, id, 0, '')); } }
  if (arg === 'org') { await tg(env, 'sendMessage', { chat_id: chat, text: t.menu, reply_markup: mainKb(u) }); return send(env, chat, orgMsg(env, u.lang)); }
  await tg(env, 'sendMessage', { chat_id: chat, text: t.welcome(list.length), parse_mode: 'HTML', reply_markup: mainKb(u) });
  if (!u.digestAsked) {
    u.digestAsked = true; await saveUser(env, u);
    return send(env, chat, { text: t.digest_ask, kb: [[{ text: t.digest_yes, callback_data: 'dg:1' }, { text: t.digest_no, callback_data: 'dg:0' }]] });
  }
}

async function action(env, u, chat, what) {
  const t = T(u), lang = u.lang || 'ru';
  if (what === 'search') return send(env, chat, { text: t.search_hint, kb: [[{ text: t.m_cats, callback_data: 'cats' }]] });
  if (what === 'near') return tg(env, 'sendMessage', { chat_id: chat, text: t.near_ask, parse_mode: 'HTML', reply_markup: mainKb(u) });
  if (what === 'lang') return send(env, chat, { text: t.lang_h, kb: langKb() });
  if (what === 'subs') return send(env, chat, subsScreen(u));
  if (what === 'org') return send(env, chat, orgMsg(env, lang));
  if (what === 'quiz') return send(env, chat, quizStep(lang, 0, ''));
  if (what === 'tip') { const day = Math.floor((Date.now() + TZ * 3600e3) / 86400e3); return send(env, chat, tipMsg(lang, day)); }
  const list = await catalog(env);
  if (!list.length) return send(env, chat, { text: t.loading_fail });
  if (what === 'cats') return send(env, chat, catsScreen(list, lang));
  if (what === 'random') { const c = list[Math.floor(Math.random() * list.length)]; await send(env, chat, { text: t.random_h }); return sendCard(env, chat, c, u); }
  if (what === 'fav') {
    const items = (u.fav || []).map((s) => list.find((c) => c.slug === s)).filter(Boolean);
    if (!items.length) return send(env, chat, { text: t.fav_empty });
    return send(env, chat, listMsg(lang, t.fav_h(items.length), items, 0, (p) => 'fv:' + p));
  }
}

async function onCallback(cq, env) {
  const data = cq.data || '', msg = cq.message, from = cq.from;
  const u = await getUser(env, from), chat = msg ? msg.chat.id : from.id;
  const ack = (text, alert) => tg(env, 'answerCallbackQuery', { callback_query_id: cq.id, text, show_alert: !!alert });
  const [k, a1 = '', a2 = '', a3 = ''] = data.split(':');

  if (k === 'lg') {
    const first = !u.lang;
    u.lang = ['ru', 'kz', 'en'].includes(a1) ? a1 : 'ru';
    const pending = u.pending; delete u.pending; delete u.hint; delete u.isNew;
    await saveUser(env, u); await ack(S[u.lang].lang_ok);
    if (msg) await tg(env, 'deleteMessage', { chat_id: chat, message_id: msg.message_id });
    if (first) return onStart(env, u, chat, pending || '');
    return tg(env, 'sendMessage', { chat_id: chat, text: S[u.lang].lang_ok, reply_markup: mainKb(u) });
  }
  if (!u.lang) { u.lang = 'ru'; }
  const t = T(u), lang = u.lang;
  if (k === 'noop') return ack();

  if (k === 'a') {
    if (a1 === 'go') { u.flow = { k: 'app', step: 0, d: { langs: [] } }; await saveUser(env, u); await ack(); await send(env, chat, { text: t.a_intro }); return send(env, chat, appAsk(u)); }
    if (a1 === 'x') { delete u.flow; await saveUser(env, u); await ack(); return tg(env, 'sendMessage', { chat_id: chat, text: t.a_cancelled, reply_markup: mainKb(u) }); }
    if (a1 === 'send' && u.flow) {
      await ack();
      const ok = await appSubmit(env, u, from);
      if (ok) { delete u.flow; await saveUser(env, u); }
      return send(env, chat, { text: ok ? t.a_sent : t.a_fail, kb: ok ? [] : [[{ text: t.org_site, url: site(env) + '#/join' }]] });
    }
    return ack();
  }
  if ((k === 'ac' || k === 'av' || k === 'al') && u.flow && u.flow.k === 'app') {
    const key = A_STEPS[u.flow.step];
    if (k === 'ac' && key === 'cat') { u.flow.d.cat = a1; u.flow.step++; }
    else if (k === 'av' && key === 'cost' && a1 === 'free') { u.flow.d.cost = t.a_free; u.flow.step++; }
    else if (k === 'av' && key === 'beg') { u.flow.d.beg = a1 === 'yes' ? 'yes' : 'no'; u.flow.step++; }
    else if (k === 'av' && key === 'ig' && a1 === 'skip') { u.flow.d.ig = ''; u.flow.step++; }
    else if (k === 'al' && key === 'langs') {
      if (a1 === 'ok') { if (!(u.flow.d.langs || []).length) return ack(lang === 'kz' ? 'Кемінде бір тілді белгілеңіз' : lang === 'en' ? 'Tick at least one language' : 'Отметьте хотя бы один язык', true); u.flow.step++; }
      else { const ls = new Set(u.flow.d.langs || []); ls.has(a1) ? ls.delete(a1) : ls.add(a1); u.flow.d.langs = [...ls]; await saveUser(env, u); await ack(); return edit(env, msg, appAsk(u)); }
    } else return ack();
    await saveUser(env, u); await ack();
    return edit(env, msg, u.flow.step >= A_STEPS.length ? appSummary(u) : appAsk(u));
  }

  if (k === 'dg') {
    u.digest = a1 === '1' ? true : a1 === '0' ? false : !u.digest;
    await setDigestIndex(env, u.id, u.digest); await saveUser(env, u);
    if (a1 === '1' || a1 === '0') { await ack(); return edit(env, msg, { text: u.digest ? t.digest_on : t.digest_off_ok, kb: [] }); }
    await ack(u.digest ? t.sub_on : t.sub_off);
    if (msg && /Подборка недели|Апта топтамасы|Pick of the week/.test(msg.text || '')) return;
    return edit(env, msg, subsScreen(u));
  }
  if (k === 'sb' || k === 'sq') {
    const subs = new Set(u.subs || []), on = !subs.has(a1) || k === 'sq';
    if (on) subs.add(a1); else subs.delete(a1);
    u.subs = [...subs];
    await (on ? db.put(env, `s:${a1}:${u.id}`, 1) : db.del(env, `s:${a1}:${u.id}`)); await saveUser(env, u);
    await ack(on ? t.sub_on : t.sub_off);
    if (k === 'sb') return edit(env, msg, subsScreen(u));
    return;
  }
  if (k === 't') { await ack(); return edit(env, msg, tipMsg(lang, Number(a1) || 0)); }
  if (k === 'q') {
    await ack();
    const step = Number(a1) || 0, ans = a2 || '';
    if (step >= 5) { const list = await catalog(env); return edit(env, msg, quizResult(list, lang, ans)); }
    return edit(env, msg, quizStep(lang, step, ans));
  }

  const list = await catalog(env);
  if (!list.length) return ack(t.loading_fail, true);
  const club = (slug) => list.find((c) => c.slug === slug);

  if (k === 'cats') { await ack(); return edit(env, msg, catsScreen(list, lang)); }
  if (k === 'l') { await ack(); return edit(env, msg, catList(list, lang, a1 || 'all', Number(a2) || 0, a3)); }
  if (k === 'ld') { await ack(); return edit(env, msg, distPick(lang, a1 || 'all', a2)); }
  if (k === 's') {
    await ack();
    const inQ = data.split(':').slice(2).join(':'), q = inQ || u.q || '', hits = search(list, q);
    return edit(env, msg, listMsg(lang, t.found(esc(q), hits.length), hits, Number(a1) || 0, (p) => inQ ? `s:${p}:${q}` : 's:' + p));
  }
  if (k === 'fv') { await ack(); const items = (u.fav || []).map((s) => club(s)).filter(Boolean); return edit(env, msg, items.length ? listMsg(lang, t.fav_h(items.length), items, Number(a1) || 0, (p) => 'fv:' + p) : { text: t.fav_empty }); }
  if (k === 'c') { const c = club(a1); await ack(); if (c) return sendCard(env, chat, c, u); return; }
  if (k === 'f') {
    const c = club(a1); if (!c) return ack();
    const fav = new Set(u.fav || []), on = !fav.has(c.slug);
    if (on) fav.add(c.slug); else fav.delete(c.slug);
    u.fav = [...fav].slice(-50); await saveUser(env, u);
    await ack(on ? t.fav_add : t.fav_del);
    if (msg) return tg(env, 'editMessageReplyMarkup', { chat_id: chat, message_id: msg.message_id, reply_markup: { inline_keyboard: cardMsg(env, c, lang, u, await botName(env)).kb } });
    return;
  }
  if (k === 'm') {
    const c = club(a1); if (!c || !hasCoords(c)) return ack();
    await ack();
    return tg(env, 'sendVenue', { chat_id: chat, latitude: Number(c.lat), longitude: Number(c.lng), title: cut(L3(c.name, lang), 60), address: cut((filled(L3(c.addr, lang)) ? L3(c.addr, lang) : '') || distName(c.dist, lang) || 'Астана', 100) });
  }
  if (k === 'r') {
    const c = club(a1); if (!c) return ack();
    // завтра в 16:00 по Астане
    const now = Date.now(), local = new Date(now + TZ * 3600e3);
    const due = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1, 16 - TZ, 0, 0);
    await db.put(env, `r:${due}:${chat}:${c.slug}`, { lang }, (due - now) / 1000 + 3 * 86400);
    return ack(t.remind_ok, true);
  }
  if (k === 'x') {
    const c = club(a1); if (!c) return ack(); await ack();
    return send(env, chat, { text: `${t.report_h}\n<b>${esc(L3(c.name, lang))}</b>`, kb: [[{ text: t.report_1, callback_data: `xr:${c.slug}:1` }], [{ text: t.report_2, callback_data: `xr:${c.slug}:2` }], [{ text: t.report_3, callback_data: `xr:${c.slug}:3` }]] });
  }
  if (k === 'xr') {
    const c = club(a1); await ack(t.report_ok);
    const why = { 1: 'Телефон не отвечает', 2: 'Закрылось или переехало', 3: 'Другие данные неверны' }[a2] || '?';
    for (const a of String(env.ADMIN_IDS || '').split(/[\s,]+/).filter(Boolean)) await tg(env, 'sendMessage', { chat_id: a, parse_mode: 'HTML', text: `⚠️ <b>Неточность в карточке</b>\n${esc(c ? L3(c.name, 'ru') : a1)} (${esc(a1)})\nПричина: ${why}\nОт: ${from.username ? '@' + esc(from.username) : 'ID ' + from.id}` });
    return edit(env, msg, { text: t.report_ok, kb: [] });
  }
  if (k === 'bc' && isAdmin(env, from.id)) {
    const p = await db.get(env, 'bc:pending'); await ack();
    if (a1 === 'ok' && p) { await db.put(env, 'bc:go', p); await db.del(env, 'bc:pending'); return edit(env, msg, { text: '✅ Рассылка запущена. Сообщения уйдут в течение часа (по 40 за 10 минут).', kb: [] }); }
    await db.del(env, 'bc:pending'); return edit(env, msg, { text: 'Рассылка отменена.', kb: [] });
  }
  return ack();
}

// Inline-режим: @бот в любом чате — найти и отправить сообщество другу.
async function onInline(iq, env) {
  const u = await getUser(env, iq.from), lang = u.lang || (/^kk/.test(iq.from.language_code || '') ? 'kz' : 'ru'), t = S[lang];
  const list = await catalog(env);
  const q = (iq.query || '').trim();
  const hits = (q ? search(list, q) : sortDefault(list.filter((c) => c.verified || c.featured).concat(list.filter((c) => !c.verified && !c.featured)))).slice(0, 20);
  const bot = await botName(env);
  const results = hits.map((c) => {
    const wa = waNumber(c.tel), name = L3(c.name, lang);
    const kb = [];
    if (wa) kb.push([{ text: t.b_wa, url: `https://wa.me/${wa}?text=${encodeURIComponent(t.greet)}` }]);
    kb.push([{ text: t.b_site, url: site(env) + '#/club/' + encodeURIComponent(c.slug) }]);
    if (bot) kb.push([{ text: '🤖 Qosyl', url: `https://t.me/${bot}?start=c_${c.slug}` }]);
    return {
      type: 'article', id: c.slug.slice(0, 64), title: name, description: cut(`${catName(c.cat, lang)} · ${L3(c.tag, lang)}`, 120),
      input_message_content: { message_text: `${t.share_text(esc(name))}\n\n<b>${esc(name)}</b>\n<i>${esc(cut(L3(c.tag, lang), 200))}</i>\n${CAT_EMOJI[c.cat] || ''} ${esc(catName(c.cat, lang))}${filled(c.age) ? ' · ' + esc(c.age) : ''} · ${isFree(c) ? esc(t.f_free.replace(/^\S+\s/, '')) : esc(cut(L3(c.cost, lang), 40))}`, parse_mode: 'HTML', link_preview_options: { is_disabled: true } },
      reply_markup: { inline_keyboard: kb }
    };
  });
  return tg(env, 'answerInlineQuery', { inline_query_id: iq.id, results, cache_time: 300, is_personal: false });
}

// ---------- индексы подписок и удаление данных ----------
async function setDigestIndex(env, id, on) { return on ? db.put(env, 'd:' + id, 1) : db.del(env, 'd:' + id); }
async function forgetIndexes(env, id) {
  await db.del(env, 'd:' + id);
  for (const c of DATA.CATS.map((x) => x.id).concat('all')) await db.del(env, `s:${c}:${id}`);
}
async function forgetUser(env, id) {
  await forgetIndexes(env, id);
  for (const k of await db.keys(env, 'r:')) if (k.split(':')[2] === String(id)) await db.del(env, k);
  await db.del(env, 'u:' + id);
}

// ---------- админ ----------
async function adminStats(env, chat) {
  const users = await db.keys(env, 'u:'), dg = await db.keys(env, 'd:'), subs = await db.keys(env, 's:'), rem = await db.keys(env, 'r:');
  const by = {}; for (const k of subs) { const c = k.split(':')[1]; by[c] = (by[c] || 0) + 1; }
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${CAT_EMOJI[c] || '•'} ${c === 'all' ? 'всё новое' : catName(c, 'ru')}: ${n}`).join('\n');
  return send(env, chat, { text: `📊 <b>Статистика бота</b>\n\nПользователей: <b>${users.length}</b>\nПодборка по воскресеньям: <b>${dg.length}</b>\nНапоминаний в очереди: <b>${rem.length}</b>\n\n<b>Подписки по направлениям:</b>\n${top || '—'}` });
}
async function adminBroadcast(env, chat, text) {
  if (!text) return send(env, chat, { text: 'Напишите так: <code>/broadcast текст сообщения</code>\nПоддерживается <b>жирный</b> и <i>курсив</i> через HTML.' });
  const n = (await db.keys(env, 'u:')).length;
  await db.put(env, 'bc:pending', { text: cut(text, 3500) });
  return send(env, chat, { text: `Предпросмотр рассылки (получателей: ${n}):\n\n${text}`, kb: [[{ text: `✅ Отправить всем (${n})`, callback_data: 'bc:ok' }, { text: '✖️ Отмена', callback_data: 'bc:no' }]] });
}

// ---------- плановые задачи (cron раз в 10 минут) ----------
export async function scheduled(env, now = Date.now()) {
  let budget = SEND_BUDGET;
  const sendTo = async (chat, m, extra) => {
    budget--;
    const j = await send(env, chat, m, extra);
    if (!j.ok && /blocked|deactivated|chat not found/i.test(j.description || '')) await forgetIndexes(env, chat);
    return j;
  };
  const list = await catalog(env, true);
  const userLang = async (id) => { const u = await db.get(env, 'u:' + id); return u ? u.lang || 'ru' : null; };

  // 1) напоминания
  for (const k of await db.keys(env, 'r:')) {
    if (budget <= 0) break;
    const [, due, chat, slug] = k.split(':');
    if (Number(due) > now) continue;
    const lang = (await userLang(chat)) || 'ru', c = list.find((x) => x.slug === slug);
    await db.del(env, k);
    if (!c) continue;
    const t = S[lang], wa = waNumber(c.tel), kb = [];
    if (wa) kb.push([{ text: t.b_wa, url: `https://wa.me/${wa}?text=${encodeURIComponent(t.greet)}` }]);
    kb.push([{ text: t.b_site, url: site(env) + '#/club/' + encodeURIComponent(c.slug) }]);
    await sendTo(chat, { text: t.remind_msg(esc(L3(c.name, lang))), kb });
  }

  // 2) новые сообщества → подписчикам направлений (проверяем раз в час)
  const known = await db.get(env, 'meta:known');
  if (list.length && (!known || new Date(now).getUTCMinutes() < 10)) {
    const cur = list.map((c) => c.slug);
    if (!known) await db.put(env, 'meta:known', cur);
    else {
      const fresh = list.filter((c) => !known.includes(c.slug));
      if (fresh.length) {
        const q = (await db.get(env, 'q')) || [];
        for (const c of fresh) {
          const who = new Set();
          for (const cat of [c.cat, ...alsoOf(c), 'all']) for (const k of await db.keys(env, `s:${cat}:`)) who.add(k.split(':')[2]);
          for (const id of who) q.push({ t: 'new', chat: id, slug: c.slug });
        }
        await db.put(env, 'q', q);
        await db.put(env, 'meta:known', cur);
      }
    }
  }

  // 3) подборка по воскресеньям в 18:00 по Астане
  const local = new Date(now + TZ * 3600e3);
  const week = Math.floor((now + TZ * 3600e3) / (7 * 86400e3));
  if (local.getUTCDay() === 0 && local.getUTCHours() >= 18 && (await db.get(env, 'meta:digest')) !== week) {
    const q = (await db.get(env, 'q')) || [];
    for (const k of await db.keys(env, 'd:')) q.push({ t: 'dg', chat: k.slice(2) });
    await db.put(env, 'q', q); await db.put(env, 'meta:digest', week);
  }

  // 4) рассылка администратора
  const bc = await db.get(env, 'bc:go');
  if (bc) {
    const q = (await db.get(env, 'q')) || [];
    for (const k of await db.keys(env, 'u:')) q.push({ t: 'bc', chat: k.slice(2), text: bc.text });
    await db.put(env, 'q', q); await db.del(env, 'bc:go');
  }

  // 5) очередь сообщений
  const q = (await db.get(env, 'q')) || [];
  if (q.length && budget > 0) {
    const take = q.splice(0, budget);
    for (const it of take) {
      const lang = (await userLang(it.chat)) || 'ru', t = S[lang];
      if (it.t === 'bc') { await sendTo(it.chat, { text: it.text }); continue; }
      if (it.t === 'new') {
        const c = list.find((x) => x.slug === it.slug); if (!c) continue;
        await sendTo(it.chat, { text: `${t.new_h}\n\n<b>${esc(L3(c.name, lang))}</b>\n<i>${esc(cut(L3(c.tag, lang), 200))}</i>\n${CAT_EMOJI[c.cat] || ''} ${esc(catName(c.cat, lang))}`, kb: [[{ text: t.b_site, url: site(env) + '#/club/' + encodeURIComponent(c.slug) }], [{ text: '👀 ' + L3(c.name, lang).slice(0, 30), callback_data: 'c:' + c.slug }]] });
        continue;
      }
      if (it.t === 'dg') {
        const u = await db.get(env, 'u:' + it.chat) || { subs: [], fav: [] };
        const subs = (u.subs || []).filter((s) => s !== 'all');
        let pool = list.filter((c) => !(u.fav || []).includes(c.slug) && (!subs.length || subs.some((s) => inCat(c, s))));
        if (pool.length < 3) pool = list.filter((c) => !(u.fav || []).includes(c.slug));
        const seed = week * 7919 + Number(it.chat) % 1000;
        const pick = pool.map((c, i) => ({ c, r: ((i + 1) * 2654435761 + seed) % 1000 + (c.beginner ? -150 : 0) + (c.verified ? -100 : 0) })).sort((a, b) => a.r - b.r).slice(0, 3).map((x) => x.c);
        if (!pick.length) continue;
        const text = t.digest_h + '\n\n' + pick.map((c, i) => line(c, lang, i + 1)).join('\n\n');
        const kb = pick.map((c, i) => [{ text: `${i + 1} · ${cut(L3(c.name, lang), 38)}`, callback_data: 'c:' + c.slug }]).concat([[{ text: t.digest_stop, callback_data: 'dg' }]]);
        await sendTo(it.chat, { text, kb });
      }
    }
    await db.put(env, 'q', q);
  }
}

// ---------- настройка бота (одна ссылка в браузере) ----------
async function setup(env, origin) {
  const out = {};
  const cmds = {
    ru: [['search', 'Поиск'], ['cats', 'Направления'], ['quiz', 'Подобрать за минуту'], ['near', 'Рядом со мной'], ['random', 'Мне повезёт'], ['fav', 'Избранное'], ['subs', 'Подписки и подборка'], ['tip', 'Совет дня'], ['org', 'Для организаторов'], ['lang', 'Язык'], ['help', 'Помощь']],
    kk: [['search', 'Іздеу'], ['cats', 'Бағыттар'], ['quiz', 'Бір минутта таңдау'], ['near', 'Маған жақын'], ['random', 'Сәттілік'], ['fav', 'Таңдаулылар'], ['subs', 'Жазылымдар'], ['tip', 'Күн кеңесі'], ['org', 'Ұйымдастырушыларға'], ['lang', 'Тіл'], ['help', 'Көмек']],
    en: [['search', 'Search'], ['cats', 'Directions'], ['quiz', 'Pick in a minute'], ['near', 'Near me'], ['random', 'Feeling lucky'], ['fav', 'Favourites'], ['subs', 'Subscriptions'], ['tip', 'Tip of the day'], ['org', 'For organisers'], ['lang', 'Language'], ['help', 'Help']]
  };
  const toCmd = (a) => a.map(([command, description]) => ({ command, description }));
  out.commands = (await tg(env, 'setMyCommands', { commands: toCmd(cmds.ru) })).ok;
  out.commands_kk = (await tg(env, 'setMyCommands', { commands: toCmd(cmds.kk), language_code: 'kk' })).ok;
  out.commands_en = (await tg(env, 'setMyCommands', { commands: toCmd(cmds.en), language_code: 'en' })).ok;
  out.description = (await tg(env, 'setMyDescription', { description: 'Qosyl — каталог сообществ, клубов и организаций Астаны для подростков. Найди, куда пойти после уроков: поиск, подбор за минуту, «рядом со мной», избранное и уведомления о новых сообществах. Бесплатно.\n\nQosyl — Астанадағы жасөспірімдерге арналған қоғамдастықтар каталогы. Тегін.' })).ok;
  out.short = (await tg(env, 'setMyShortDescription', { short_description: 'Кружки и сообщества Астаны для подростков · qosyl.club' })).ok;
  if (origin) out.webhook = await tg(env, 'setWebhook', { url: origin + '/tg', secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message', 'callback_query', 'inline_query', 'my_chat_member'], drop_pending_updates: true });
  out.me = await tg(env, 'getMe');
  return out;
}

// ---------- точки входа Cloudflare Worker ----------
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/tg' && request.method === 'POST') {
      if (env.WEBHOOK_SECRET && request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const update = await request.json().catch(() => null);
      if (update) ctx.waitUntil(handleUpdate(update, env).catch((e) => console.log('update error', e && e.stack)));
      return new Response('ok');
    }
    if (url.pathname === '/setup') {
      if (!env.WEBHOOK_SECRET || url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('Добавьте ?key=ВАШ_WEBHOOK_SECRET', { status: 403 });
      return new Response(JSON.stringify(await setup(env, url.origin), null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } });
    }
    return new Response('Qosyl bot is running · qosyl.club', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(scheduled(env, event.scheduledTime || Date.now())); }
};
export { setup };
