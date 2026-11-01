// Interface strings for ru / kz / en.
window.QOSYL_STR = (function () {
const STR = {
  ru: {
    nav_about: 'О проекте', nav_map: 'Карта', back: '← Все сообщества', open: 'Открыть',
    h1: 'Сообщества Астаны в одном месте',
    lead: 'Найди, куда пойти после уроков: робототехника, дебаты, спорт, рисование, волонтёрство. Бесплатно, без регистрации.',
    search_ph: 'Что тебе интересно? Например, робототехника',
    all: 'Все', beginner: 'Для новичков', verified: 'Проверен',
    one: 'сообщество', few: 'сообщества', many: 'сообществ', other: 'сообщества', found: 'найдено',
    st_clubs: 'сообществ', st_cats: 'секций', st_new: 'ждут новичков',
    empty_h: 'Ничего не нашлось',
    empty_p: 'Попробуй другое слово или посмотри категории.',
    empty_cta: 'Показать все сообщества',
    photo_ph: 'фото сообщества — присылает организатор, 3:2',
    contact_h: 'Как связаться', write: 'написать',
    gmaps: 'Открыть в Google Maps', twogis: 'Открыть в 2ГИС',
    f_sched: 'Когда', f_addr: 'Где', f_cost: 'Стоимость', f_langs: 'Языки',
    checked: 'Проверено', report: 'Информация устарела?', reported: 'Спасибо, проверим',
    share_h: 'Ссылка и QR для афиши', similar_h: 'Похожие сообщества',
    featured: 'Лучшее',
    about_h1: 'Сообщества есть. Найти их — сложно.',
    about_lead: '«Qosyl» по-казахски значит «присоединяйся». Мы собрали сообщества Астаны в один каталог, чтобы подростку хватило одной ссылки вместо десяти чатов.',
    about_s: [
      { h: 'С чего началось', p: 'Сообщества города живут в Instagram, WhatsApp, Telegram и в разговорах между друзьями. Единого списка нет: чтобы найти секцию, нужно знать человека, который о ней слышал.' },
      { h: 'Что говорят исследования', p: 'Главная польза таких сообществ — не оценки, а друзья и чувство «я здесь свой». Поэтому мы пишем в первую очередь про то, кто туда ходит и как прийти, а не про достижения.' },
      { h: 'Что мешает прийти', p: 'Подростки называют четыре причины: не знают, что существует; неудобное время или дорога; цена; страх идти одному. Первую причину закрывает каталог, остальные три — поля «когда», «где», «стоимость» и пометка «для новичков».' },
      { h: 'Как сообщество попадает в список', p: 'Мы связываемся с организатором и публикуем только те контакты, на которые он дал согласие. Личные номера подростков не публикуем никогда.' },
      { h: 'Почему стоит дата проверки', p: 'Устаревшие списки — главная причина, по которой такие каталоги перестают работать. Каждое сообщество перепроверяется раз в 60–90 дней, дата видна на его странице, а рядом есть кнопка «информация устарела».' },
      { h: 'Что значит пометка «лучшее»', p: 'Сообщества с пометкой «лучшее» платят за то, чтобы стоять в начале списка. Это единственная платная возможность на сайте. Она не влияет на проверку: такие сообщества проверяются так же, как все остальные, и попадают в каталог по тем же правилам.' },
      { h: 'Кто это делает', p: 'Проект ведёт ученик 11 класса как общественную инициативу. Для посетителей сайт бесплатный, личные данные мы не собираем.' }
    ],
    cta_h: 'Ведёте сообщество в Астане?',
    cta_p: 'Заполните короткую форму: название, возраст участников, когда и где, контакт для связи. Мы свяжемся и добавим страницу.',
    cta_b1: 'Добавить сообщество', cta_b2: 'Смотреть каталог',
    map_h1: 'Сообщества на карте',
    creator: 'Создатель сайта',
    creator_note: 'Пишите, если хотите добавить сообщество, предложить идею или исправить ошибку.',
    foot_mission: 'Этот сайт создан для того, чтобы сообщества было легко найти и легко к ним присоединиться: чтобы молодёжь и сообщества были связаны и развивали свои проекты и стартапы вместе с новыми участниками, пришедшими благодаря сайту.',
    foot_note: 'Каталог сообществ для подростков Астаны. Бесплатно, без регистрации.',
    foot_priv: 'контакты публикуем только с согласия организатора'
  },
  kz: {
    nav_about: 'Жоба туралы', nav_map: 'Карта', back: '← Барлық қоғамдастықтар', open: 'Ашу',
    h1: 'Астана қоғамдастықтары бір жерде',
    lead: 'Сабақтан кейін қайда баруға болатынын тап: робототехника, пікірсайыс, спорт, сурет, еріктілер. Тегін, тіркелусіз.',
    search_ph: 'Не қызықтырады? Мысалы, робототехника',
    all: 'Барлығы', beginner: 'Жаңадан бастаушыларға', verified: 'Тексерілген',
    one: 'қоғамдастық', few: 'қоғамдастық', many: 'қоғамдастық', other: 'қоғамдастық', found: 'табылды',
    st_clubs: 'қоғамдастық', st_cats: 'секция', st_new: 'жаңадан келгендерді күтеді',
    empty_h: 'Ештеңе табылмады',
    empty_p: 'Басқа сөзді байқап көр немесе санаттарды қара.',
    empty_cta: 'Барлық қоғамдастықтарды көрсету',
    photo_ph: 'қоғамдастық фотосы — ұйымдастырушыдан, 3:2',
    contact_h: 'Қалай байланысу керек', write: 'жазу',
    gmaps: 'Google Maps-та ашу', twogis: '2ГИС-те ашу',
    f_sched: 'Қашан', f_addr: 'Қайда', f_cost: 'Құны', f_langs: 'Тілдері',
    checked: 'Тексерілді', report: 'Ақпарат ескірген бе?', reported: 'Рақмет, тексеремін',
    share_h: 'Афиша үшін сілтеме және QR', similar_h: 'Ұқсас қоғамдастықтар',
    featured: 'Үздік',
    about_h1: 'Қоғамдастықтар бар. Тек оларды табу қиын.',
    about_lead: '«Qosyl» — «қосыл» деген сөз. Он чаттың орнына бір сілтеме жетсін деп, Астана қоғамдастықтарын бір каталогқа жинадық.',
    about_s: [
      { h: 'Неден басталды', p: 'Қаладағы қоғамдастықтар Instagram, WhatsApp, Telegram-да және достардың әңгімесінде тұр. Ортақ тізім жоқ: үйірме табу үшін ол туралы естіген адамды білу керек.' },
      { h: 'Зерттеулер не дейді', p: 'Мұндай қоғамдастықтың басты пайдасы — баға емес, дос және «мен осындамын» деген сезім. Сондықтан біз алдымен онда кім жүретінін және қалай келуге болатынын жазамыз.' },
      { h: 'Келуге не кедергі', p: 'Жасөспірімдер төрт себеп айтады: не бар екенін білмеу, уақыт пен жол, ақы, жалғыз баруға қорқу. Біріншісін каталог шешеді, қалғанын «қашан», «қайда», «құны» деген жолдар мен «жаңадан бастаушыларға» белгісі.' },
      { h: 'Қоғамдастық тізімге қалай түседі', p: 'Ұйымдастырушымен байланысып, тек ол рұқсат берген контактілерді жариялаймыз. Жасөспірімдердің жеке нөмірлерін еш уақытта жарияламаймыз.' },
      { h: 'Тексеру күні неге керек', p: 'Ескірген тізім — мұндай каталогтардың істен шығуының басты себебі. Әр қоғамдастық 60–90 күнде бір тексеріледі, күні бетінде көрінеді, қасында «ақпарат ескірген» түймесі бар.' },
      { h: '«Үздік» белгісі нені білдіреді', p: '«Үздік» белгісі бар қоғамдастықтар тізімнің басында тұру үшін ақы төлейді. Бұл — сайттағы жалғыз ақылы мүмкіндік. Ол тексеруге әсер етпейді: мұндай қоғамдастықтар да басқалармен бірдей тексеріледі және каталогқа сол ережелермен енеді.' },
      { h: 'Мұны кім жасайды', p: 'Жобаны 11-сынып оқушысы қоғамдық бастама ретінде жүргізеді. Келушілер үшін сайт тегін, жеке деректерді жинамаймыз.' }
    ],
    cta_h: 'Астанада қоғамдастық жүргізесіз бе?',
    cta_p: 'Қысқа форманы толтырыңыз: атауы, қатысушылардың жасы, қашан және қайда, байланыс. Біз хабарласып, бет қосамыз.',
    cta_b1: 'Қоғамдастық қосу', cta_b2: 'Каталогты көру',
    map_h1: 'Картадағы қоғамдастықтар',
    creator: 'Сайт авторы',
    creator_note: 'Қоғамдастық қосқыңыз келсе, идея ұсынсаңыз немесе қате тапсаңыз — жазыңыз.',
    foot_mission: 'Бұл сайт қоғамдастықтарды оңай тауып, оларға қосылу үшін жасалды: жастар мен қоғамдастықтар байланысып, өз жобалары мен стартаптарын сайт арқылы келген жаңа қатысушылармен бірге дамытсын.',
    foot_note: 'Астана жасөспірімдеріне арналған қоғамдастықтар каталогы. Тегін, тіркелусіз.',
    foot_priv: 'контактілерді тек ұйымдастырушының рұқсатымен жариялаймыз'
  },
  en: {
    nav_about: 'About', nav_map: 'Map', back: '← All communities', open: 'Open',
    h1: 'Astana communities in one place',
    lead: 'Find somewhere to go after school: robotics, debate, sports, drawing, volunteering. Free, no sign-up.',
    search_ph: 'What are you into? Try robotics',
    all: 'All', beginner: 'Beginner-friendly', verified: 'Verified',
    one: 'community', few: 'communities', many: 'communities', other: 'communities', found: 'found',
    st_clubs: 'communities', st_cats: 'sections', st_new: 'open to beginners',
    empty_h: 'Nothing found',
    empty_p: 'Try another word or browse the categories.',
    empty_cta: 'Show all communities',
    photo_ph: 'community photo — supplied by organiser, 3:2',
    contact_h: 'How to get in touch', write: 'message',
    gmaps: 'Open in Google Maps', twogis: 'Open in 2GIS',
    f_sched: 'When', f_addr: 'Where', f_cost: 'Cost', f_langs: 'Languages',
    checked: 'Verified', report: 'Info out of date?', reported: 'Thanks, we will check',
    share_h: 'Link and QR for posters', similar_h: 'Similar communities',
    featured: 'Featured',
    about_h1: 'The communities exist. Finding them is the hard part.',
    about_lead: '“Qosyl” means “join” in Kazakh. We put Astana’s communities into one catalogue so a teenager needs one link instead of ten group chats.',
    about_s: [
      { h: 'Where this started', p: 'Communities in the city live on Instagram, WhatsApp, Telegram and in conversations between friends. There is no single list: to find one you have to know someone who has heard of it.' },
      { h: 'What the research says', p: 'The clearest benefit of these communities is not grades but friendships and a sense of belonging. So we lead with who goes there and how to show up, rather than with achievements.' },
      { h: 'What stops teenagers', p: 'Four reasons come up: not knowing what exists, awkward times or travel, cost, and being afraid to go alone. The catalogue answers the first; the When, Where, Cost fields and the beginner-friendly tag answer the rest.' },
      { h: 'How a community gets listed', p: 'We contact the organiser and publish only the contacts they agreed to share. We never publish teenagers’ personal numbers.' },
      { h: 'Why every page shows a check date', p: 'Stale listings are the main reason directories like this stop working. Every community is re-checked every 60–90 days, the date sits on its page, and a report button sits next to it.' },
      { h: 'What the Featured mark means', p: 'Communities marked Featured pay to sit at the top of the list. It is the only paid option on the site. It does not affect verification: featured communities are checked like every other one and are listed under the same rules.' },
      { h: 'Who runs it', p: 'The project is run by an 11th-grade student as a community initiative. The site is free for visitors and we collect no personal data.' }
    ],
    cta_h: 'Do you run a community in Astana?',
    cta_p: 'Fill in a short form: name, age range, when and where, and a contact. We will get in touch and add your page.',
    cta_b1: 'Add your community', cta_b2: 'Browse the catalogue',
    map_h1: 'Communities on the map',
    creator: 'Created by',
    creator_note: 'Write if you want to add a community, suggest an idea or report a mistake.',
    foot_mission: 'This site exists to make communities easy to find and easy to join, so that young people and communities stay connected and can grow their projects and startups with new members who arrived through the site.',
    foot_note: 'A community directory for teenagers in Astana. Free, no sign-up.',
    foot_priv: 'contacts are published only with the organiser’s consent'
  }
};

// Strings added for the live site (not in the original mock).
Object.assign(STR.ru, { more: 'Показать ещё', updated_pre: 'обновлено', copy_link: 'Скопировать ссылку', link_copied: 'Ссылка скопирована', stats_h: 'Какую статистику мы видим', stats_p: 'Только анонимные цифры: сколько раз открывали страницы и нажимали «связаться». Без cookies, без имён и номеров, без слежки между сайтами. Считает сервис GoatCounter — так мы понимаем, какие сообщества ищут чаще.', qr_dl: 'Скачать QR', not_found_h: 'Сообщество не найдено', not_found_p: 'Возможно, его убрали из каталога.', search_label: 'Поиск сообществ', lang_label: 'Язык', site: 'Qosyl · Астана' });
Object.assign(STR.kz, { more: 'Тағы көрсету', updated_pre: 'жаңартылды', copy_link: 'Сілтемені көшіру', link_copied: 'Сілтеме көшірілді', stats_h: 'Қандай статистиканы көреміз', stats_p: 'Тек анонимді сандар: беттер қанша рет ашылды және «байланысу» қанша рет басылды. Cookie жоқ, аты-жөн мен нөмір жоқ, басқа сайттар арасында бақылау жоқ. Санауды GoatCounter сервисі жүргізеді — осылайша қай қоғамдастықтарды жиі іздейтінін түсінеміз.', qr_dl: 'QR жүктеу', not_found_h: 'Қоғамдастық табылмады', not_found_p: 'Мүмкін, ол каталогтан алынып тасталған.', search_label: 'Қоғамдастықтарды іздеу', lang_label: 'Тіл', site: 'Qosyl · Астана' });
Object.assign(STR.en, { more: 'Show more', updated_pre: 'updated', copy_link: 'Copy link', link_copied: 'Link copied', stats_h: 'What statistics we see', stats_p: 'Only anonymous numbers: how often pages are opened and how often people tap to get in touch. No cookies, no names or phone numbers, no cross-site tracking. Counting is done by GoatCounter, so we can see which communities people look for most.', qr_dl: 'Download QR', not_found_h: 'Community not found', not_found_p: 'It may have been removed from the catalogue.', search_label: 'Search communities', lang_label: 'Language', site: 'Qosyl · Astana' });

// Готовое сообщение организатору: подставляется в WhatsApp, копируется для Instagram и Telegram.
Object.assign(STR.ru, {
  greet: 'Здравствуйте! Пишу вам из каталога сообществ Qosyl (qosyl.club). Подскажите, пожалуйста, как к вам присоединиться?',
  greet_copied: 'Текст сообщения скопирован — вставьте его в чат',
  greet_h: 'Сообщение для первого контакта',
  greet_p: 'В WhatsApp подставится само. Для Instagram и Telegram — скопируйте и вставьте.',
  greet_copy: 'Скопировать'
});
Object.assign(STR.kz, {
  greet: 'Сәлеметсіз бе! Сізге Qosyl қоғамдастықтар каталогынан жазып отырмын (qosyl.club). Сіздерге қалай қосылуға болатынын айтып жіберсеңіз.',
  greet_copied: 'Хабарлама мәтіні көшірілді — чатқа қойыңыз',
  greet_h: 'Алғашқы хабарламаға дайын мәтін',
  greet_p: 'WhatsApp-та өзі қойылады. Instagram мен Telegram үшін көшіріп алыңыз.',
  greet_copy: 'Көшіру'
});
Object.assign(STR.en, {
  greet: 'Hello! I am writing from the Qosyl community directory (qosyl.club). Could you tell me how to join you?',
  greet_copied: 'Message copied — paste it into the chat',
  greet_h: 'Message for your first contact',
  greet_p: 'WhatsApp fills it in for you. For Instagram and Telegram, copy and paste it.',
  greet_copy: 'Copy'
});


// Призыв «добавьте своё сообщество» — на главной, а не только в «О проекте».
Object.assign(STR.ru, {
  own_h: 'Ведёте сообщество в Астане?',
  own_p: 'Добавим бесплатно: карточка с фото, расписанием и контактами, страница в поиске и точка на карте. Заполнение — 5 минут.',
  own_b: 'Добавить своё сообщество'
});
Object.assign(STR.kz, {
  own_h: 'Астанада қоғамдастық жүргізесіз бе?',
  own_p: 'Тегін қосамыз: фото, кесте және байланысы бар карточка, іздеуде бет және картада нүкте. Толтыру — 5 минут.',
  own_b: 'Өз қоғамдастығыңды қос'
});
Object.assign(STR.en, {
  own_h: 'Do you run a community in Astana?',
  own_p: 'We add it for free: a card with photo, schedule and contacts, a page in search and a pin on the map. Five minutes to fill in.',
  own_b: 'Add your community'
});

// Помощник выбора на главной: пять вопросов и подбор по каталогу (helper.js).
Object.assign(STR.ru, {
  h_geo: 'Показать ближайшие ко мне',
  h_geo_off: 'Не учитывать расстояние',
  h_geo_wait: 'Ищем, где ты…',
  h_geo_on: 'Сначала те, до кого ближе. Координаты остались в твоём телефоне.',
  h_geo_no: 'Браузер не дал определить место — показываем без расстояния.',
  h_geo_note: 'Место определит сам браузер. Координаты останутся в твоём телефоне и никуда не отправятся.',
  h_h: 'Не знаешь, с чего начать?',
  h_p: 'Ответь на 5 вопросов — подберём сообщества, где тебе будет нормально с первого дня.',
  h_start: 'Подобрать за минуту',
  h_step: 'Вопрос', h_res_step: 'Готово', h_close: 'Закрыть', h_back: '← Назад', h_again: 'Пройти заново',
  h_res_h: 'Вот что тебе подходит',
  h_res_p: 'Это подбор по твоим ответам, а не реклама. Открой карточку — там контакты и готовое первое сообщение.',
  h_more: 'Ещё варианты',
  h_off_h: 'В этом направлении пока никого нет',
  h_off_p: 'Каталог только наполняется. Знаешь такое сообщество в Астане? Напиши нам — добавим бесплатно.',
  h_near_h: 'Не совсем твоё направление, но посмотри',
  h_none_h: 'Пока нет точного совпадения',
  h_none_p: 'Каталог ещё наполняется. Посмотри всё, что есть, или напиши нам, чего не хватает — добавим.',
  h_q_what: 'Чем бы ты занялся, если бы было время?',
  h_o_move: 'Двигаться: спорт, тренировки',
  h_o_make: 'Собирать и программировать',
  h_o_create: 'Рисовать, музыка, танцы, театр',
  h_o_speak: 'Говорить и спорить: языки, дебаты, MUN',
  h_o_help: 'Помогать людям и городу',
  h_o_build: 'Делать свой проект или бизнес',
  h_o_people: 'Просто найти своих: общение, настолки',
  h_q_age: 'Сколько тебе лет?',
  h_o_a12: '12–13', h_o_a14: '14–15', h_o_a16: '16–17', h_o_a18: '18 и старше',
  h_q_exp: 'Ты уже этим занимался?',
  h_o_new: 'Совсем нет, буду с нуля',
  h_o_some: 'Немного пробовал',
  h_o_pro: 'Занимаюсь давно, ищу уровень',
  h_q_money: 'А с деньгами как?',
  h_o_free: 'Нужно только бесплатное',
  h_o_cheap: 'Могу немного платить',
  h_o_any: 'Не важно',
  h_q_who: 'Придёшь один или с кем-то?',
  h_o_alone: 'Один, и немного страшно',
  h_o_friends: 'С друзьями',
  h_o_either: 'Как получится',
  h_why_cat: 'твоё направление', h_why_age: 'подходит по возрасту',
  h_why_beg: 'ждут новичков', h_why_free: 'бесплатно', h_why_alone: 'можно прийти одному'
});
Object.assign(STR.kz, {
  h_geo: 'Жақындағыларын көрсет',
  h_geo_off: 'Қашықтықты ескермеу',
  h_geo_wait: 'Қайда екеніңді іздеп жатырмыз…',
  h_geo_on: 'Алдымен жақындары. Координаттар телефоныңда қалды.',
  h_geo_no: 'Браузер орныңды анықтай алмады — қашықтықсыз көрсетеміз.',
  h_geo_note: 'Орныңды браузердің өзі анықтайды. Координаттар телефоныңда қалады, ешқайда жіберілмейді.',
  h_h: 'Неден бастауды білмейсің бе?',
  h_p: '5 сұраққа жауап бер — бірінші күннен жайлы болатын қоғамдастықтарды таңдап береміз.',
  h_start: 'Бір минутта таңдау',
  h_step: 'Сұрақ', h_res_step: 'Дайын', h_close: 'Жабу', h_back: '← Артқа', h_again: 'Қайта өту',
  h_res_h: 'Саған мынау келеді',
  h_res_p: 'Бұл — жауаптарыңа қарай таңдау, жарнама емес. Карточканы аш: онда байланыс және дайын хабарлама бар.',
  h_more: 'Басқа нұсқалар',
  h_off_h: 'Бұл бағытта әзірге ешкім жоқ',
  h_off_p: 'Каталог енді толып жатыр. Астанада осындай қоғамдастықты білесің бе? Жаз — тегін қосамыз.',
  h_near_h: 'Дәл сенің бағытың емес, бірақ қарап шық',
  h_none_h: 'Әзірге дәл сәйкестік жоқ',
  h_none_p: 'Каталог толтырылып жатыр. Бар нәрсені қарап шық немесе не жетпейтінін жаз — қосамыз.',
  h_q_what: 'Уақытың болса, немен айналысар едің?',
  h_o_move: 'Қимыл: спорт, жаттығу',
  h_o_make: 'Құрастыру және программалау',
  h_o_create: 'Сурет, музыка, би, театр',
  h_o_speak: 'Сөйлеу және пікір: тілдер, дебат, MUN',
  h_o_help: 'Адамдарға және қалаға көмектесу',
  h_o_build: 'Өз жобам немесе бизнесім',
  h_o_people: 'Өз ортамды табу: әңгіме, үстел ойындары',
  h_q_age: 'Жасың нешеде?',
  h_o_a12: '12–13', h_o_a14: '14–15', h_o_a16: '16–17', h_o_a18: '18 және одан жоғары',
  h_q_exp: 'Бұрын осымен айналысқан ба едің?',
  h_o_new: 'Жоқ, нөлден бастаймын',
  h_o_some: 'Аздап байқағанмын',
  h_o_pro: 'Көптен айналысамын, деңгей іздеймін',
  h_q_money: 'Ақша жағы қалай?',
  h_o_free: 'Тек тегін болуы керек',
  h_o_cheap: 'Аздап төлей аламын',
  h_o_any: 'Маңызды емес',
  h_q_who: 'Жалғыз келесің бе, біреумен бе?',
  h_o_alone: 'Жалғыз, сәл қорқамын',
  h_o_friends: 'Достарыммен',
  h_o_either: 'Қалай болса',
  h_why_cat: 'сенің бағытың', h_why_age: 'жасыңа сай',
  h_why_beg: 'жаңадан бастаушыларды күтеді', h_why_free: 'тегін', h_why_alone: 'жалғыз келуге болады'
});
Object.assign(STR.en, {
  h_geo: 'Show the closest to me',
  h_geo_off: 'Ignore distance',
  h_geo_wait: 'Finding where you are…',
  h_geo_on: 'Closest ones first. Your coordinates stayed on your phone.',
  h_geo_no: 'The browser could not find your location — showing results without distance.',
  h_geo_note: 'Your browser finds the location. The coordinates stay on your phone and are never sent anywhere.',
  h_h: 'Not sure where to start?',
  h_p: 'Answer 5 questions and we will pick communities where you will feel fine from day one.',
  h_start: 'Find my fit',
  h_step: 'Question', h_res_step: 'Done', h_close: 'Close', h_back: '← Back', h_again: 'Start over',
  h_res_h: 'Here is what fits you',
  h_res_p: 'This is a match on your answers, not an advert. Open a card for contacts and a ready-made first message.',
  h_more: 'More options',
  h_off_h: 'Nothing in this direction yet',
  h_off_p: 'The catalogue is still filling up. Know a community like this in Astana? Tell us — we add them for free.',
  h_near_h: 'Not quite your direction, but take a look',
  h_none_h: 'No exact match yet',
  h_none_p: 'The catalogue is still filling up. Have a look at everything we have, or tell us what is missing.',
  h_q_what: 'If you had the time, what would you do?',
  h_o_move: 'Move: sport and training',
  h_o_make: 'Build things and code',
  h_o_create: 'Draw, music, dance, theatre',
  h_o_speak: 'Talk and argue: languages, debate, MUN',
  h_o_help: 'Help people and the city',
  h_o_build: 'Run my own project or business',
  h_o_people: 'Just find my people: hangouts, board games',
  h_q_age: 'How old are you?',
  h_o_a12: '12–13', h_o_a14: '14–15', h_o_a16: '16–17', h_o_a18: '18 and older',
  h_q_exp: 'Have you done this before?',
  h_o_new: 'Not at all, starting from zero',
  h_o_some: 'Tried it a little',
  h_o_pro: 'Been at it a while, looking for a level',
  h_q_money: 'What about money?',
  h_o_free: 'Free only',
  h_o_cheap: 'I can pay a little',
  h_o_any: 'Does not matter',
  h_q_who: 'Coming alone or with someone?',
  h_o_alone: 'Alone, and a bit scared',
  h_o_friends: 'With friends',
  h_o_either: 'Either way',
  h_why_cat: 'your direction', h_why_age: 'right age',
  h_why_beg: 'welcomes beginners', h_why_free: 'free', h_why_alone: 'fine to come alone'
});

// Фильтр по районам и «рядом со мной» в каталоге.
Object.assign(STR.ru, {
  dist_all: 'Все районы',
  near: 'Рядом со мной',
  near_off: 'Сначала ближайшие',
  near_wait: 'Ищем, где ты…',
  near_on: 'Список отсортирован от ближайших. Координаты остались в твоём телефоне.',
  near_no: 'Браузер не дал определить место — показываем список как обычно.',
  km_away: 'км',
  m_away: 'м',
  km_here: 'совсем рядом',
  f_dist: 'Район'
});
Object.assign(STR.kz, {
  dist_all: 'Барлық аудан',
  near: 'Маған жақын',
  near_off: 'Алдымен жақындары',
  near_wait: 'Қайда екеніңді іздеп жатырмыз…',
  near_on: 'Тізім жақындарынан басталады. Координаттар телефоныңда қалды.',
  near_no: 'Браузер орныңды анықтай алмады — тізімді әдеттегідей көрсетеміз.',
  km_away: 'шақырым',
  m_away: 'м',
  km_here: 'тура қасыңда',
  f_dist: 'Аудан'
});
Object.assign(STR.en, {
  dist_all: 'All districts',
  near: 'Near me',
  near_off: 'Closest first',
  near_wait: 'Finding where you are…',
  near_on: 'Sorted from the closest. Your coordinates stayed on your phone.',
  near_no: 'The browser could not find your location — showing the usual list.',
  km_away: 'km',
  m_away: 'm',
  km_here: 'right here',
  f_dist: 'District'
});

// Фильтры «бесплатно» и «новичкам» в каталоге.
Object.assign(STR.ru, { f_free: 'Бесплатно', f_beg: 'Новичкам', cats_more: 'Ещё секции', cats_less: 'Свернуть' });
Object.assign(STR.kz, { f_free: 'Тегін', f_beg: 'Бастаушыларға', cats_more: 'Тағы секциялар', cats_less: 'Жию' });
Object.assign(STR.en, { f_free: 'Free', f_beg: 'For beginners', cats_more: 'More sections', cats_less: 'Collapse' });

  return STR;
})();
