// Site settings — edit these before publishing.
window.QOSYL_CONFIG = {
  // Public address of the site, used for share links and QR codes. Leave empty to use the current address.
  siteUrl: 'https://qosyl.club/',
  // Google Form for organisers. The site now has its own form (#/join) that sends answers here;
  // this link is only the fallback when sending from the site fails.
  orgFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf1_VP5BsigWY_jOi7Mz7zNpZvmknTZddcyMAMnlSIYFeFn8g/viewform',
  // Where "Info out of date?" reports go. Empty = the report is only acknowledged on screen.
  reportEmail: 'wwhenlix@gmail.com',
  // GoatCounter code for anonymous visit statistics (no cookies, no personal data), e.g. 'youths-astana'
  // from https://youths-astana.goatcounter.com. Empty = statistics are off.
  goatcounter: 'youths-astana',
  // Telegram-бот Qosyl: имя без @, например 'qosyl_club_bot'. Пока пусто — блоки
  // «У нас есть Telegram-бот» на сайте не показываются (чтобы не вести в пустоту).
  telegramBot: '',
  // WhatsApp для организаторов: кабинет, «забыли код», вопросы. Только цифры.
  orgWhatsApp: '77477434947',
  // Show the "+ Панель создателя" link in the footer to every visitor.
  // false = the link is hidden; the panel still opens at <site>#/add
  creatorLink: false,

  // Форма на сайте (#/join) отправляет заявки в ту же Google Форму, что и раньше:
  // ответы приходят туда же, где ты их уже смотришь.
  // ВАЖНО: номера полей и тексты вариантов ниже взяты из формы 4 ноября 2026.
  // Если поменять вопросы или варианты ответа в Google Форме, их нужно обновить
  // здесь — иначе Google молча отклонит заявки с сайта.
  form: {
    action: 'https://docs.google.com/forms/d/e/1FAIpQLSf1_VP5BsigWY_jOi7Mz7zNpZvmknTZddcyMAMnlSIYFeFn8g/formResponse',
    pages: '0,1,2,3,4',
    entries: {
      name: 'entry.701817700',
      cat: 'entry.781572475',
      tag: 'entry.1961624763',
      about: 'entry.2031867033',
      age: 'entry.1778583724',
      cost: 'entry.1853922419',
      sched: 'entry.326529378',
      addr: 'entry.528584957',
      langs: 'entry.1068997067',
      beginner: 'entry.636171758',
      tel: 'entry.1344261658',
      ig: 'entry.1627471445',
      tg: 'entry.1338133695',
      contact: 'entry.850399962',
      consent: 'entry.339751029',
      top: 'entry.1188456310'
    },
    // В форме ещё старый список направлений. Новые секции сайта переводим
    // в ближайший вариант, а точное название секции пишем первой строкой описания.
    cat: {
      it: 'Другое / Басқа',
      eng: 'Инженерия и робототехника / Инженерия және робототехника',
      stem: 'Наука и STEM / Ғылым және STEM',
      debate: 'MUN / MUN',
      lang: 'Языки и ораторство / Тілдер және шешендік',
      sport: 'Спорт / Спорт',
      art: 'Искусство / Өнер',
      media: 'Другое / Басқа',
      vol: 'Волонтёрство / Еріктілер',
      biz: 'Бизнес / Бизнес',
      other: 'Другое / Басқа'
    },
    langs: { kz: 'Казахский / Қазақша', ru: 'Русский / Орысша', en: 'Английский / Ағылшынша' },
    yes: 'Да / Иә',
    no: 'Нет / Жоқ',
    consent: 'Согласен(на) / Келісемін',
    topNo: 'Нет, достаточно обычного размещения / Жоқ, әдеттегісі жеткілікті',
    topYes: 'Да, расскажите подробнее / Иә, толығырақ айтыңыз'
  }
};
