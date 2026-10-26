/* 24 HR Dock: kiosk (the check-in screen at the dock) and the driver's ETA page.
   Language first, then company (Nick's order). Every driver-facing word comes from App.strings,
   in six languages. Staff-only screens (the Staff panel) and texts to customers/crew stay in English.
   Read app/CONTRACT.md before changing anything. */
(function () {
  'use strict';
  var h = App.h;

  App.LANGS = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'ru', name: 'Русский' },
    { code: 'uk', name: 'Українська' },
    { code: 'pa', name: 'ਪੰਜਾਬੀ' },
    { code: 'hi', name: 'हिन्दी' }
  ];

  /* ====================================================================
     Words. Keep every language complete: the kiosk test fails on a gap.
     {name} is filled in by the screen. Keep them short.
     ==================================================================== */
  App.strings.en = {
    langTitle: 'Choose your language',
    langTap: 'Tap to start',
    kioskTitle: 'Truck check-in',
    back: 'Back',
    startOver: 'Start over',
    next: 'Next',
    stepOf: 'Step {n} of {total}',
    language: 'Language',
    stillThere: 'Still there? Tap the screen to keep going.',
    resetIn: 'Starting over in {n} s',
    help: 'Need help? Ask in the office.',
    companyQ: 'What company is this load for?',
    companyPh: 'Type the company name',
    companyTap: 'Tap your company',
    expectedToday: 'Expected today',
    noCompany: 'No company with that name.',
    haveCode: 'I have a 4‑digit code',
    notBooked: "Not booked / I don't see my company",
    codeQ: 'Type your 4‑digit code',
    codeSub: 'Your dispatcher has this code.',
    codeWrong: "We can't find that code. Check it and try again.",
    clear: 'Clear',
    del: 'Delete',
    noCode: 'No code? Find my company',
    truckQ: 'Which truck is yours?',
    truckSub: '{company} at {dock}',
    noTruck: "We don't see a booked truck for {company} today.",
    notListed: "My truck isn't listed",
    truckN: 'Truck {n}',
    trailerN: 'Trailer {n}',
    palletsN: '{n} pallets',
    pallet1: '1 pallet',
    kindDrop: 'Drop-off',
    kindPick: 'Pickup',
    kindBoth: 'Drop-off + pickup',
    late: 'Late',
    detailsQ: 'Check your details',
    detailsSub: 'Fix anything that is wrong.',
    yourName: 'Your name',
    yourCell: 'Your cell phone',
    cellHint: 'We text you your door number.',
    truckNo: 'Truck #',
    trailerNo: 'Trailer #',
    needName: 'Please type your name.',
    otherDock: 'This truck was booked for {dock}. We will check you in here.',
    walkQ: 'What company is the load for?',
    walkSub: 'No booking? No problem. We will fit you in.',
    needCompany: 'Please type the company name.',
    kindQ: 'Are you dropping off or picking up?',
    kindDropSub: 'I brought freight to unload',
    kindPickSub: 'I am here to load freight',
    kindBothSub: 'Unload first, then load',
    palletsQ: 'About how many pallets?',
    palletsSub: 'A guess is fine.',
    notSure: 'Not sure',
    less: 'Less',
    more: 'More',
    scanQ: 'Scan your paperwork',
    scanBtn: 'Take a photo of your paperwork',
    scanMore: 'Take a photo of the next page',
    tip1: 'Lay the paper flat.',
    tip2: 'Fill the screen.',
    tip3: 'One photo per page.',
    pagesN: '{n} pages',
    page1: '1 page',
    pageN: 'Page {n}',
    saving: 'Saving…',
    scanDone: 'Done — check me in',
    scanSkip: 'Skip — give papers to the office',
    remove: 'Remove',
    doneTitle: "You're checked in!",
    yourPlace: 'Your place in line',
    nextUp: "You're next!",
    waitAbout: 'Wait: about {t}',
    textDoor: 'We will text your door number to {cell}.',
    noCell: 'No phone number given. Ask the office for your door.',
    stayTruck: 'Stay with your truck. Watch for our text.',
    stayOnly: 'Stay with your truck.',
    finish: 'Finish',
    alreadyTitle: "You're already checked in",
    goDoor: 'Go to door {door}',
    truckDone: 'This truck is done. Drive safe.',
    durMin: '{n} min',
    durHr: '{h} h',
    durHrMin: '{h} h {m} min',
    ago: '{t} ago',
    justNow: 'just now',
    tomorrow: 'Tomorrow',
    days: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',
    months: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
    dateFmt: '{wd}, {mon} {d}',
    drvPage: 'Driver page',
    drvCodeQ: 'Enter your 4‑digit code',
    drvCodeSub: 'It is in the text from your dispatcher.',
    continue: 'Continue',
    drvNotFound: "We can't find that code.",
    loading: 'Loading…',
    yourTruck: 'Your truck',
    kioskCode: 'Kiosk code',
    stBooked: 'Booked for {time}',
    stArrived: 'Checked in — #{n} in line',
    stArrivedNoPos: 'Checked in',
    stWorking: 'Go to door {door}',
    stWorkingNoDoor: 'Go to your door',
    stDone: 'Done. Drive safe.',
    stCancelled: 'This booking was cancelled.',
    etaNow: 'Your ETA: {time}',
    etaFrom: 'Updated {ago}',
    updateEta: 'Update my ETA',
    etaQ: 'How far away are you?',
    eta15: "I'm 15 min away",
    eta30: '30 min',
    eta60: '1 hour',
    eta120: '2 hours',
    pickTime: 'Pick a time',
    saveTime: 'Save time',
    needTime: 'Pick a time first.',
    etaSaved: 'Saved. We expect you at {time}.',
    lateQ: 'Running late?',
    lateSub: 'Tap the reason. We will see it.',
    lateTraffic: 'Traffic',
    lateWeather: 'Weather',
    lateTruck: 'Truck problem',
    lateStop: 'Late at last stop',
    lateOther: 'Other',
    lateSaved: 'Thanks. We got it.',
    lateNote: 'Running late: {why}',
    shareQ: 'Share live location',
    shareSub: 'Paste a Samsara, Google Maps or other GPS share link.',
    shareHow: 'Google Maps: tap your blue dot, then Share location, then Copy link.',
    linkPh: 'Paste link here',
    saveLink: 'Save link',
    linkSaved: 'Location link saved.',
    linkBad: 'That is not a link. It should start with http.',
    atDock: "You're here. No ETA needed.",
    where: 'Where',
    address: 'Address',
    hours: 'Hours',
    callDock: 'Questions? Call {phone}',
    otherCode: 'Not your truck? Enter a different code',
    stepBooked: 'Booked',
    stepOnWay: 'On the way',
    stepIn: 'Checked in',
    stepDoor: 'At the door',
    stepDone: 'Done',
    badCell: 'Check the phone number. It needs 10 digits.',
    goOffice: 'Please go to the office',
    saveFail: 'We could not save your check-in. Please go to the office. They will check you in.',
    alreadyHere: 'Already checked in',
    bookedFor: 'Booked for {dock}',
    smsIn: '24 HR Crossdock: you are checked in at {dock}. #{n} in line. We will text your door number.'
  };

  App.strings.es = {
    langTitle: 'Elija su idioma',
    langTap: 'Toque para empezar',
    kioskTitle: 'Registro de camiones',
    back: 'Atrás',
    startOver: 'Empezar de nuevo',
    next: 'Siguiente',
    stepOf: 'Paso {n} de {total}',
    language: 'Idioma',
    stillThere: '¿Sigue ahí? Toque la pantalla para continuar.',
    resetIn: 'Empezamos de nuevo en {n} s',
    help: '¿Necesita ayuda? Pregunte en la oficina.',
    companyQ: '¿Para qué compañía es esta carga?',
    companyPh: 'Escriba el nombre de la compañía',
    companyTap: 'Toque su compañía',
    expectedToday: 'Esperados hoy',
    noCompany: 'No hay ninguna compañía con ese nombre.',
    haveCode: 'Tengo un código de 4 dígitos',
    notBooked: 'Sin cita / No veo mi compañía',
    codeQ: 'Escriba su código de 4 dígitos',
    codeSub: 'Su despachador tiene este código.',
    codeWrong: 'No encontramos ese código. Revíselo e intente de nuevo.',
    clear: 'Borrar todo',
    del: 'Borrar',
    noCode: '¿Sin código? Buscar mi compañía',
    truckQ: '¿Cuál es su camión?',
    truckSub: '{company} en {dock}',
    noTruck: 'No vemos ningún camión con cita para {company} hoy.',
    notListed: 'Mi camión no aparece',
    truckN: 'Camión {n}',
    trailerN: 'Remolque {n}',
    palletsN: '{n} tarimas',
    pallet1: '1 tarima',
    kindDrop: 'Entrega',
    kindPick: 'Recogida',
    kindBoth: 'Entrega + recogida',
    late: 'Atrasado',
    detailsQ: 'Revise sus datos',
    detailsSub: 'Corrija lo que esté mal.',
    yourName: 'Su nombre',
    yourCell: 'Su celular',
    cellHint: 'Le mandamos un texto con su número de puerta.',
    truckNo: 'Camión #',
    trailerNo: 'Remolque #',
    needName: 'Por favor escriba su nombre.',
    otherDock: 'Este camión tenía cita en {dock}. Lo registramos aquí.',
    walkQ: '¿Para qué compañía es la carga?',
    walkSub: '¿Sin cita? No hay problema. Le hacemos espacio.',
    needCompany: 'Por favor escriba el nombre de la compañía.',
    kindQ: '¿Viene a entregar o a recoger?',
    kindDropSub: 'Traigo carga para descargar',
    kindPickSub: 'Vengo a cargar',
    kindBothSub: 'Primero descargar, luego cargar',
    palletsQ: '¿Cuántas tarimas, más o menos?',
    palletsSub: 'Un cálculo está bien.',
    notSure: 'No sé',
    less: 'Menos',
    more: 'Más',
    scanQ: 'Escanee sus papeles',
    scanBtn: 'Tome una foto de sus papeles',
    scanMore: 'Tome una foto de la siguiente página',
    tip1: 'Ponga el papel plano.',
    tip2: 'Que llene la pantalla.',
    tip3: 'Una foto por página.',
    pagesN: '{n} páginas',
    page1: '1 página',
    pageN: 'Página {n}',
    saving: 'Guardando…',
    scanDone: 'Listo — registrarme',
    scanSkip: 'Saltar — dar los papeles a la oficina',
    remove: 'Quitar',
    doneTitle: '¡Ya está registrado!',
    yourPlace: 'Su lugar en la fila',
    nextUp: '¡Usted sigue!',
    waitAbout: 'Espera: unos {t}',
    textDoor: 'Le mandaremos su número de puerta por texto al {cell}.',
    noCell: 'No dio teléfono. Pregunte su puerta en la oficina.',
    stayTruck: 'Quédese con su camión. Esté atento a nuestro texto.',
    stayOnly: 'Quédese con su camión.',
    finish: 'Terminar',
    alreadyTitle: 'Ya está registrado',
    goDoor: 'Vaya a la puerta {door}',
    truckDone: 'Este camión ya terminó. Maneje con cuidado.',
    durMin: '{n} min',
    durHr: '{h} h',
    durHrMin: '{h} h {m} min',
    ago: 'hace {t}',
    justNow: 'ahora mismo',
    tomorrow: 'Mañana',
    days: 'dom,lun,mar,mié,jue,vie,sáb',
    months: 'ene,feb,mar,abr,may,jun,jul,ago,sept,oct,nov,dic',
    dateFmt: '{wd} {d} {mon}',
    drvPage: 'Página del chofer',
    drvCodeQ: 'Escriba su código de 4 dígitos',
    drvCodeSub: 'Está en el texto de su despachador.',
    continue: 'Continuar',
    drvNotFound: 'No encontramos ese código.',
    loading: 'Cargando…',
    yourTruck: 'Su camión',
    kioskCode: 'Código para el kiosco',
    stBooked: 'Cita: {time}',
    stArrived: 'Registrado — #{n} en la fila',
    stArrivedNoPos: 'Registrado',
    stWorking: 'Vaya a la puerta {door}',
    stWorkingNoDoor: 'Vaya a su puerta',
    stDone: 'Terminado. Maneje con cuidado.',
    stCancelled: 'Esta cita fue cancelada.',
    etaNow: 'Su llegada: {time}',
    etaFrom: 'Actualizado {ago}',
    updateEta: 'Actualizar mi llegada',
    etaQ: '¿Qué tan lejos está?',
    eta15: 'Estoy a 15 min',
    eta30: '30 min',
    eta60: '1 hora',
    eta120: '2 horas',
    pickTime: 'Elegir una hora',
    saveTime: 'Guardar hora',
    needTime: 'Primero elija una hora.',
    etaSaved: 'Guardado. Lo esperamos a las {time}.',
    lateQ: '¿Va tarde?',
    lateSub: 'Toque el motivo. Nosotros lo veremos.',
    lateTraffic: 'Tráfico',
    lateWeather: 'Clima',
    lateTruck: 'Problema con el camión',
    lateStop: 'Atraso en la parada anterior',
    lateOther: 'Otro',
    lateSaved: 'Gracias. Recibido.',
    lateNote: 'Va tarde: {why}',
    shareQ: 'Compartir ubicación en vivo',
    shareSub: 'Pegue un enlace de Samsara, Google Maps u otro GPS.',
    shareHow: 'Google Maps: toque su punto azul, luego Compartir ubicación, luego Copiar enlace.',
    linkPh: 'Pegue el enlace aquí',
    saveLink: 'Guardar enlace',
    linkSaved: 'Enlace de ubicación guardado.',
    linkBad: 'Eso no es un enlace. Debe empezar con http.',
    atDock: 'Ya está aquí. No necesita actualizar la llegada.',
    where: 'Dónde',
    address: 'Dirección',
    hours: 'Horario',
    callDock: '¿Preguntas? Llame al {phone}',
    otherCode: '¿No es su camión? Escriba otro código',
    stepBooked: 'Cita',
    stepOnWay: 'En camino',
    stepIn: 'Llegó',
    stepDoor: 'En la puerta',
    stepDone: 'Listo',
    badCell: 'Revise el número de teléfono. Debe tener 10 dígitos.',
    goOffice: 'Por favor vaya a la oficina',
    saveFail: 'No pudimos guardar su registro. Por favor vaya a la oficina. Ahí lo registran.',
    alreadyHere: 'Ya registrados',
    bookedFor: 'Cita en {dock}',
    smsIn: '24 HR Crossdock: ya está registrado en {dock}. #{n} en la fila. Le mandaremos su número de puerta por texto.'
  };

  App.strings.ru = {
    langTitle: 'Выберите язык',
    langTap: 'Нажмите, чтобы начать',
    kioskTitle: 'Регистрация грузовиков',
    back: 'Назад',
    startOver: 'Начать сначала',
    next: 'Далее',
    stepOf: 'Шаг {n} из {total}',
    language: 'Язык',
    stillThere: 'Вы здесь? Нажмите на экран, чтобы продолжить.',
    resetIn: 'Начнём сначала через {n} с',
    help: 'Нужна помощь? Спросите в офисе.',
    companyQ: 'Для какой компании этот груз?',
    companyPh: 'Введите название компании',
    companyTap: 'Нажмите на свою компанию',
    expectedToday: 'Ожидаются сегодня',
    noCompany: 'Компании с таким названием нет.',
    haveCode: 'У меня есть 4‑значный код',
    notBooked: 'Нет записи / Не вижу свою компанию',
    codeQ: 'Введите 4‑значный код',
    codeSub: 'Этот код есть у вашего диспетчера.',
    codeWrong: 'Не можем найти этот код. Проверьте и попробуйте снова.',
    clear: 'Стереть',
    del: 'Удалить',
    noCode: 'Нет кода? Найти мою компанию',
    truckQ: 'Какой грузовик ваш?',
    truckSub: '{company} — {dock}',
    noTruck: 'Сегодня нет записанных грузовиков для {company}.',
    notListed: 'Моего грузовика нет в списке',
    truckN: 'Грузовик {n}',
    trailerN: 'Прицеп {n}',
    palletsN: 'Паллет: {n}',
    pallet1: 'Паллет: 1',
    kindDrop: 'Разгрузка',
    kindPick: 'Погрузка',
    kindBoth: 'Разгрузка + погрузка',
    late: 'Опоздание',
    detailsQ: 'Проверьте данные',
    detailsSub: 'Исправьте, если что-то не так.',
    yourName: 'Ваше имя',
    yourCell: 'Ваш мобильный',
    cellHint: 'Мы пришлём SMS с номером ворот.',
    truckNo: 'Грузовик №',
    trailerNo: 'Прицеп №',
    needName: 'Пожалуйста, введите имя.',
    otherDock: 'Этот грузовик был записан в {dock}. Мы зарегистрируем вас здесь.',
    walkQ: 'Для какой компании груз?',
    walkSub: 'Нет записи? Не страшно. Мы вас примем.',
    needCompany: 'Пожалуйста, введите название компании.',
    kindQ: 'Вы привезли груз или забираете?',
    kindDropSub: 'Я привёз груз на разгрузку',
    kindPickSub: 'Я приехал забрать груз',
    kindBothSub: 'Сначала разгрузка, потом погрузка',
    palletsQ: 'Примерно сколько паллет?',
    palletsSub: 'Можно примерно.',
    notSure: 'Не знаю',
    less: 'Меньше',
    more: 'Больше',
    scanQ: 'Сканируйте документы',
    scanBtn: 'Сфотографируйте документы',
    scanMore: 'Сфотографируйте следующую страницу',
    tip1: 'Положите лист ровно.',
    tip2: 'Лист — на весь экран.',
    tip3: 'Одно фото — одна страница.',
    pagesN: 'Страниц: {n}',
    page1: 'Страниц: 1',
    pageN: 'Страница {n}',
    saving: 'Сохраняем…',
    scanDone: 'Готово — зарегистрировать',
    scanSkip: 'Пропустить — отдам документы в офис',
    remove: 'Удалить',
    doneTitle: 'Вы зарегистрированы!',
    yourPlace: 'Ваше место в очереди',
    nextUp: 'Вы следующий!',
    waitAbout: 'Ожидание: около {t}',
    textDoor: 'Мы пришлём номер ворот SMS на {cell}.',
    noCell: 'Телефон не указан. Спросите номер ворот в офисе.',
    stayTruck: 'Оставайтесь у грузовика. Ждите наше SMS.',
    stayOnly: 'Оставайтесь у грузовика.',
    finish: 'Готово',
    alreadyTitle: 'Вы уже зарегистрированы',
    goDoor: 'Подъезжайте к воротам {door}',
    truckDone: 'Этот грузовик уже обслужен. Счастливого пути.',
    durMin: '{n} мин',
    durHr: '{h} ч',
    durHrMin: '{h} ч {m} мин',
    ago: '{t} назад',
    justNow: 'только что',
    tomorrow: 'Завтра',
    days: 'вс,пн,вт,ср,чт,пт,сб',
    months: 'янв,фев,мар,апр,мая,июн,июл,авг,сен,окт,ноя,дек',
    dateFmt: '{wd}, {d} {mon}',
    drvPage: 'Страница водителя',
    drvCodeQ: 'Введите 4‑значный код',
    drvCodeSub: 'Он в сообщении от вашего диспетчера.',
    continue: 'Продолжить',
    drvNotFound: 'Не можем найти этот код.',
    loading: 'Загрузка…',
    yourTruck: 'Ваш грузовик',
    kioskCode: 'Код для киоска',
    stBooked: 'Запись: {time}',
    stArrived: 'Зарегистрирован — №{n} в очереди',
    stArrivedNoPos: 'Зарегистрирован',
    stWorking: 'Подъезжайте к воротам {door}',
    stWorkingNoDoor: 'Подъезжайте к своим воротам',
    stDone: 'Готово. Счастливого пути.',
    stCancelled: 'Эта запись отменена.',
    etaNow: 'Ваше прибытие: {time}',
    etaFrom: 'Обновлено {ago}',
    updateEta: 'Обновить время прибытия',
    etaQ: 'Как далеко вы?',
    eta15: 'Буду через 15 мин',
    eta30: '30 мин',
    eta60: '1 час',
    eta120: '2 часа',
    pickTime: 'Выбрать время',
    saveTime: 'Сохранить время',
    needTime: 'Сначала выберите время.',
    etaSaved: 'Сохранено. Ждём вас в {time}.',
    lateQ: 'Опаздываете?',
    lateSub: 'Нажмите причину. Мы её увидим.',
    lateTraffic: 'Пробки',
    lateWeather: 'Погода',
    lateTruck: 'Проблема с грузовиком',
    lateStop: 'Задержка на прошлой точке',
    lateOther: 'Другое',
    lateSaved: 'Спасибо. Мы получили.',
    lateNote: 'Опоздание: {why}',
    shareQ: 'Поделиться местоположением',
    shareSub: 'Вставьте ссылку из Samsara, Google Maps или другого GPS.',
    shareHow: 'Google Maps: нажмите на синюю точку, выберите «Поделиться» и скопируйте ссылку.',
    linkPh: 'Вставьте ссылку сюда',
    saveLink: 'Сохранить ссылку',
    linkSaved: 'Ссылка сохранена.',
    linkBad: 'Это не ссылка. Она должна начинаться с http.',
    atDock: 'Вы уже на месте. Время прибытия не нужно.',
    where: 'Где',
    address: 'Адрес',
    hours: 'Часы работы',
    callDock: 'Вопросы? Звоните: {phone}',
    otherCode: 'Не ваш грузовик? Введите другой код',
    stepBooked: 'Запись',
    stepOnWay: 'В пути',
    stepIn: 'На месте',
    stepDoor: 'У ворот',
    stepDone: 'Готово',
    badCell: 'Проверьте номер телефона. Нужно 10 цифр.',
    goOffice: 'Пожалуйста, подойдите в офис',
    saveFail: 'Не удалось сохранить регистрацию. Пожалуйста, подойдите в офис — вас зарегистрируют там.',
    alreadyHere: 'Уже зарегистрированы',
    bookedFor: 'Запись: {dock}',
    smsIn: '24 HR Crossdock: вы зарегистрированы в {dock}. №{n} в очереди. Номер ворот пришлём SMS.'
  };

  App.strings.uk = {
    langTitle: 'Оберіть мову',
    langTap: 'Натисніть, щоб почати',
    kioskTitle: 'Реєстрація вантажівок',
    back: 'Назад',
    startOver: 'Почати спочатку',
    next: 'Далі',
    stepOf: 'Крок {n} з {total}',
    language: 'Мова',
    stillThere: 'Ви тут? Торкніться екрана, щоб продовжити.',
    resetIn: 'Почнемо спочатку через {n} с',
    help: 'Потрібна допомога? Запитайте в офісі.',
    companyQ: 'Для якої компанії цей вантаж?',
    companyPh: 'Введіть назву компанії',
    companyTap: 'Торкніться своєї компанії',
    expectedToday: 'Очікуються сьогодні',
    noCompany: 'Компанії з такою назвою немає.',
    haveCode: 'У мене є 4‑значний код',
    notBooked: 'Немає запису / Не бачу своєї компанії',
    codeQ: 'Введіть 4‑значний код',
    codeSub: 'Цей код є у вашого диспетчера.',
    codeWrong: 'Не можемо знайти цей код. Перевірте і спробуйте ще раз.',
    clear: 'Стерти',
    del: 'Видалити',
    noCode: 'Немає коду? Знайти мою компанію',
    truckQ: 'Яка вантажівка ваша?',
    truckSub: '{company} — {dock}',
    noTruck: 'Сьогодні немає записаних вантажівок для {company}.',
    notListed: 'Моєї вантажівки немає у списку',
    truckN: 'Вантажівка {n}',
    trailerN: 'Причіп {n}',
    palletsN: 'Палет: {n}',
    pallet1: 'Палет: 1',
    kindDrop: 'Розвантаження',
    kindPick: 'Завантаження',
    kindBoth: 'Розвантаження + завантаження',
    late: 'Запізнення',
    detailsQ: 'Перевірте дані',
    detailsSub: 'Виправте, якщо щось не так.',
    yourName: 'Ваше ім’я',
    yourCell: 'Ваш мобільний',
    cellHint: 'Ми надішлемо SMS з номером воріт.',
    truckNo: 'Вантажівка №',
    trailerNo: 'Причіп №',
    needName: 'Будь ласка, введіть ім’я.',
    otherDock: 'Цю вантажівку записали в {dock}. Ми зареєструємо вас тут.',
    walkQ: 'Для якої компанії вантаж?',
    walkSub: 'Немає запису? Не біда. Ми вас приймемо.',
    needCompany: 'Будь ласка, введіть назву компанії.',
    kindQ: 'Ви привезли вантаж чи забираєте?',
    kindDropSub: 'Я привіз вантаж на розвантаження',
    kindPickSub: 'Я приїхав забрати вантаж',
    kindBothSub: 'Спочатку розвантаження, потім завантаження',
    palletsQ: 'Приблизно скільки палет?',
    palletsSub: 'Можна приблизно.',
    notSure: 'Не знаю',
    less: 'Менше',
    more: 'Більше',
    scanQ: 'Скануйте документи',
    scanBtn: 'Сфотографуйте документи',
    scanMore: 'Сфотографуйте наступну сторінку',
    tip1: 'Покладіть аркуш рівно.',
    tip2: 'Аркуш — на весь екран.',
    tip3: 'Одне фото — одна сторінка.',
    pagesN: 'Сторінок: {n}',
    page1: 'Сторінок: 1',
    pageN: 'Сторінка {n}',
    saving: 'Зберігаємо…',
    scanDone: 'Готово — зареєструвати',
    scanSkip: 'Пропустити — віддам документи в офіс',
    remove: 'Видалити',
    doneTitle: 'Вас зареєстровано!',
    yourPlace: 'Ваше місце в черзі',
    nextUp: 'Ви наступний!',
    waitAbout: 'Очікування: близько {t}',
    textDoor: 'Ми надішлемо номер воріт SMS на {cell}.',
    noCell: 'Телефон не вказано. Запитайте номер воріт в офісі.',
    stayTruck: 'Залишайтеся біля вантажівки. Чекайте на наше SMS.',
    stayOnly: 'Залишайтеся біля вантажівки.',
    finish: 'Готово',
    alreadyTitle: 'Вас уже зареєстровано',
    goDoor: 'Під’їжджайте до воріт {door}',
    truckDone: 'Цю вантажівку вже обслужено. Щасливої дороги.',
    durMin: '{n} хв',
    durHr: '{h} год',
    durHrMin: '{h} год {m} хв',
    ago: '{t} тому',
    justNow: 'щойно',
    tomorrow: 'Завтра',
    days: 'нд,пн,вт,ср,чт,пт,сб',
    months: 'січ,лют,бер,квіт,трав,черв,лип,серп,вер,жовт,лист,груд',
    dateFmt: '{wd}, {d} {mon}',
    drvPage: 'Сторінка водія',
    drvCodeQ: 'Введіть 4‑значний код',
    drvCodeSub: 'Він у повідомленні від вашого диспетчера.',
    continue: 'Продовжити',
    drvNotFound: 'Не можемо знайти цей код.',
    loading: 'Завантаження…',
    yourTruck: 'Ваша вантажівка',
    kioskCode: 'Код для кіоску',
    stBooked: 'Запис: {time}',
    stArrived: 'Зареєстровано — №{n} у черзі',
    stArrivedNoPos: 'Зареєстровано',
    stWorking: 'Під’їжджайте до воріт {door}',
    stWorkingNoDoor: 'Під’їжджайте до своїх воріт',
    stDone: 'Готово. Щасливої дороги.',
    stCancelled: 'Цей запис скасовано.',
    etaNow: 'Ваше прибуття: {time}',
    etaFrom: 'Оновлено {ago}',
    updateEta: 'Оновити час прибуття',
    etaQ: 'Як далеко ви?',
    eta15: 'Буду за 15 хв',
    eta30: '30 хв',
    eta60: '1 година',
    eta120: '2 години',
    pickTime: 'Вибрати час',
    saveTime: 'Зберегти час',
    needTime: 'Спочатку виберіть час.',
    etaSaved: 'Збережено. Чекаємо вас о {time}.',
    lateQ: 'Запізнюєтеся?',
    lateSub: 'Торкніться причини. Ми її побачимо.',
    lateTraffic: 'Затори',
    lateWeather: 'Погода',
    lateTruck: 'Проблема з вантажівкою',
    lateStop: 'Затримка на попередній точці',
    lateOther: 'Інше',
    lateSaved: 'Дякуємо. Ми отримали.',
    lateNote: 'Запізнення: {why}',
    shareQ: 'Поділитися місцезнаходженням',
    shareSub: 'Вставте посилання з Samsara, Google Maps або іншого GPS.',
    shareHow: 'Google Maps: торкніться синьої точки, виберіть «Поділитися» і скопіюйте посилання.',
    linkPh: 'Вставте посилання сюди',
    saveLink: 'Зберегти посилання',
    linkSaved: 'Посилання збережено.',
    linkBad: 'Це не посилання. Воно має починатися з http.',
    atDock: 'Ви вже на місці. Час прибуття не потрібен.',
    where: 'Де',
    address: 'Адреса',
    hours: 'Години роботи',
    callDock: 'Питання? Телефонуйте: {phone}',
    otherCode: 'Не ваша вантажівка? Введіть інший код',
    stepBooked: 'Запис',
    stepOnWay: 'У дорозі',
    stepIn: 'На місці',
    stepDoor: 'Біля воріт',
    stepDone: 'Готово',
    badCell: 'Перевірте номер телефону. Потрібно 10 цифр.',
    goOffice: 'Будь ласка, підійдіть до офісу',
    saveFail: 'Не вдалося зберегти реєстрацію. Будь ласка, підійдіть до офісу — вас зареєструють там.',
    alreadyHere: 'Уже зареєстровані',
    bookedFor: 'Запис: {dock}',
    smsIn: '24 HR Crossdock: вас зареєстровано в {dock}. №{n} у черзі. Номер воріт надішлемо SMS.'
  };

  App.strings.pa = {
    langTitle: 'ਆਪਣੀ ਭਾਸ਼ਾ ਚੁਣੋ',
    langTap: 'ਸ਼ੁਰੂ ਕਰਨ ਲਈ ਦਬਾਓ',
    kioskTitle: 'ਟਰੱਕ ਚੈੱਕ-ਇਨ',
    back: 'ਪਿੱਛੇ',
    startOver: 'ਫਿਰ ਤੋਂ ਸ਼ੁਰੂ ਕਰੋ',
    next: 'ਅੱਗੇ',
    stepOf: 'ਕਦਮ {n} / {total}',
    language: 'ਭਾਸ਼ਾ',
    stillThere: 'ਕੀ ਤੁਸੀਂ ਹਾਲੇ ਇੱਥੇ ਹੋ? ਜਾਰੀ ਰੱਖਣ ਲਈ ਸਕ੍ਰੀਨ ਦਬਾਓ।',
    resetIn: '{n} ਸਕਿੰਟ ਵਿੱਚ ਫਿਰ ਤੋਂ ਸ਼ੁਰੂ',
    help: 'ਮਦਦ ਚਾਹੀਦੀ ਹੈ? ਦਫ਼ਤਰ ਵਿੱਚ ਪੁੱਛੋ।',
    companyQ: 'ਇਹ ਮਾਲ ਕਿਸ ਕੰਪਨੀ ਦਾ ਹੈ?',
    companyPh: 'ਕੰਪਨੀ ਦਾ ਨਾਮ ਲਿਖੋ',
    companyTap: 'ਆਪਣੀ ਕੰਪਨੀ ਦਬਾਓ',
    expectedToday: 'ਅੱਜ ਆਉਣ ਵਾਲੇ',
    noCompany: 'ਇਸ ਨਾਮ ਦੀ ਕੋਈ ਕੰਪਨੀ ਨਹੀਂ ਮਿਲੀ।',
    haveCode: 'ਮੇਰੇ ਕੋਲ 4 ਅੰਕਾਂ ਦਾ ਕੋਡ ਹੈ',
    notBooked: 'ਬੁਕਿੰਗ ਨਹੀਂ / ਮੇਰੀ ਕੰਪਨੀ ਨਹੀਂ ਦਿਸਦੀ',
    codeQ: 'ਆਪਣਾ 4 ਅੰਕਾਂ ਦਾ ਕੋਡ ਪਾਓ',
    codeSub: 'ਇਹ ਕੋਡ ਤੁਹਾਡੇ ਡਿਸਪੈਚਰ ਕੋਲ ਹੈ।',
    codeWrong: 'ਇਹ ਕੋਡ ਨਹੀਂ ਮਿਲਿਆ। ਜਾਂਚ ਕੇ ਫਿਰ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
    clear: 'ਮਿਟਾਓ',
    del: 'ਹਟਾਓ',
    noCode: 'ਕੋਡ ਨਹੀਂ? ਮੇਰੀ ਕੰਪਨੀ ਲੱਭੋ',
    truckQ: 'ਤੁਹਾਡਾ ਟਰੱਕ ਕਿਹੜਾ ਹੈ?',
    truckSub: '{company} — {dock}',
    noTruck: 'ਅੱਜ {company} ਦਾ ਕੋਈ ਬੁੱਕ ਕੀਤਾ ਟਰੱਕ ਨਹੀਂ ਦਿਸਦਾ।',
    notListed: 'ਮੇਰਾ ਟਰੱਕ ਸੂਚੀ ਵਿੱਚ ਨਹੀਂ ਹੈ',
    truckN: 'ਟਰੱਕ {n}',
    trailerN: 'ਟ੍ਰੇਲਰ {n}',
    palletsN: '{n} ਪੈਲੇਟ',
    pallet1: '1 ਪੈਲੇਟ',
    kindDrop: 'ਮਾਲ ਉਤਾਰਨਾ',
    kindPick: 'ਮਾਲ ਲੈਣਾ',
    kindBoth: 'ਉਤਾਰਨਾ + ਲੈਣਾ',
    late: 'ਦੇਰੀ',
    detailsQ: 'ਆਪਣੀ ਜਾਣਕਾਰੀ ਜਾਂਚੋ',
    detailsSub: 'ਕੁਝ ਗਲਤ ਹੋਵੇ ਤਾਂ ਠੀਕ ਕਰੋ।',
    yourName: 'ਤੁਹਾਡਾ ਨਾਮ',
    yourCell: 'ਤੁਹਾਡਾ ਮੋਬਾਈਲ ਨੰਬਰ',
    cellHint: 'ਅਸੀਂ ਤੁਹਾਨੂੰ ਡੋਰ ਨੰਬਰ ਦਾ ਮੈਸੇਜ ਭੇਜਾਂਗੇ।',
    truckNo: 'ਟਰੱਕ ਨੰਬਰ',
    trailerNo: 'ਟ੍ਰੇਲਰ ਨੰਬਰ',
    needName: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਮ ਲਿਖੋ।',
    otherDock: 'ਇਹ ਟਰੱਕ {dock} ਲਈ ਬੁੱਕ ਸੀ। ਅਸੀਂ ਤੁਹਾਨੂੰ ਇੱਥੇ ਹੀ ਚੈੱਕ-ਇਨ ਕਰਾਂਗੇ।',
    walkQ: 'ਮਾਲ ਕਿਸ ਕੰਪਨੀ ਦਾ ਹੈ?',
    walkSub: 'ਬੁਕਿੰਗ ਨਹੀਂ? ਕੋਈ ਗੱਲ ਨਹੀਂ। ਅਸੀਂ ਜਗ੍ਹਾ ਬਣਾ ਦਿਆਂਗੇ।',
    needCompany: 'ਕਿਰਪਾ ਕਰਕੇ ਕੰਪਨੀ ਦਾ ਨਾਮ ਲਿਖੋ।',
    kindQ: 'ਤੁਸੀਂ ਮਾਲ ਉਤਾਰਨ ਆਏ ਹੋ ਜਾਂ ਲੈਣ?',
    kindDropSub: 'ਮੈਂ ਮਾਲ ਉਤਾਰਨ ਆਇਆ ਹਾਂ',
    kindPickSub: 'ਮੈਂ ਮਾਲ ਲੈਣ ਆਇਆ ਹਾਂ',
    kindBothSub: 'ਪਹਿਲਾਂ ਉਤਾਰਨਾ, ਫਿਰ ਲੋਡ ਕਰਨਾ',
    palletsQ: 'ਲਗਭਗ ਕਿੰਨੇ ਪੈਲੇਟ?',
    palletsSub: 'ਅੰਦਾਜ਼ਾ ਵੀ ਠੀਕ ਹੈ।',
    notSure: 'ਪਤਾ ਨਹੀਂ',
    less: 'ਘੱਟ',
    more: 'ਵੱਧ',
    scanQ: 'ਆਪਣੇ ਕਾਗਜ਼ ਸਕੈਨ ਕਰੋ',
    scanBtn: 'ਆਪਣੇ ਕਾਗਜ਼ਾਂ ਦੀ ਫ਼ੋਟੋ ਲਓ',
    scanMore: 'ਅਗਲੇ ਪੰਨੇ ਦੀ ਫ਼ੋਟੋ ਲਓ',
    tip1: 'ਕਾਗਜ਼ ਸਿੱਧਾ ਰੱਖੋ।',
    tip2: 'ਕਾਗਜ਼ ਪੂਰੀ ਸਕ੍ਰੀਨ ਵਿੱਚ ਆਵੇ।',
    tip3: 'ਹਰ ਪੰਨੇ ਦੀ ਇੱਕ ਫ਼ੋਟੋ।',
    pagesN: '{n} ਪੰਨੇ',
    page1: '1 ਪੰਨਾ',
    pageN: 'ਪੰਨਾ {n}',
    saving: 'ਸੇਵ ਹੋ ਰਿਹਾ ਹੈ…',
    scanDone: 'ਹੋ ਗਿਆ — ਮੈਨੂੰ ਚੈੱਕ-ਇਨ ਕਰੋ',
    scanSkip: 'ਛੱਡੋ — ਕਾਗਜ਼ ਦਫ਼ਤਰ ਵਿੱਚ ਦੇਵਾਂਗਾ',
    remove: 'ਹਟਾਓ',
    doneTitle: 'ਤੁਹਾਡਾ ਚੈੱਕ-ਇਨ ਹੋ ਗਿਆ!',
    yourPlace: 'ਲਾਈਨ ਵਿੱਚ ਤੁਹਾਡਾ ਨੰਬਰ',
    nextUp: 'ਅਗਲੀ ਵਾਰੀ ਤੁਹਾਡੀ ਹੈ!',
    waitAbout: 'ਉਡੀਕ: ਲਗਭਗ {t}',
    textDoor: 'ਅਸੀਂ {cell} ਤੇ ਤੁਹਾਡਾ ਡੋਰ ਨੰਬਰ ਮੈਸੇਜ ਕਰਾਂਗੇ।',
    noCell: 'ਫ਼ੋਨ ਨੰਬਰ ਨਹੀਂ ਦਿੱਤਾ। ਡੋਰ ਨੰਬਰ ਦਫ਼ਤਰ ਵਿੱਚ ਪੁੱਛੋ।',
    stayTruck: 'ਆਪਣੇ ਟਰੱਕ ਕੋਲ ਰਹੋ। ਸਾਡੇ ਮੈਸੇਜ ਦੀ ਉਡੀਕ ਕਰੋ।',
    stayOnly: 'ਆਪਣੇ ਟਰੱਕ ਕੋਲ ਰਹੋ।',
    finish: 'ਖਤਮ ਕਰੋ',
    alreadyTitle: 'ਤੁਹਾਡਾ ਚੈੱਕ-ਇਨ ਪਹਿਲਾਂ ਹੀ ਹੋ ਚੁੱਕਾ ਹੈ',
    goDoor: 'ਡੋਰ {door} ਤੇ ਜਾਓ',
    truckDone: 'ਇਸ ਟਰੱਕ ਦਾ ਕੰਮ ਪੂਰਾ ਹੋ ਗਿਆ। ਧਿਆਨ ਨਾਲ ਚਲਾਓ।',
    durMin: '{n} ਮਿੰਟ',
    durHr: '{h} ਘੰਟੇ',
    durHrMin: '{h} ਘੰਟੇ {m} ਮਿੰਟ',
    ago: '{t} ਪਹਿਲਾਂ',
    justNow: 'ਹੁਣੇ',
    tomorrow: 'ਕੱਲ੍ਹ',
    days: 'ਐਤ,ਸੋਮ,ਮੰਗਲ,ਬੁੱਧ,ਵੀਰ,ਸ਼ੁੱਕਰ,ਸ਼ਨਿੱਚਰ',
    months: 'ਜਨ,ਫ਼ਰ,ਮਾਰਚ,ਅਪ੍ਰੈ,ਮਈ,ਜੂਨ,ਜੁਲਾ,ਅਗ,ਸਤੰ,ਅਕਤੂ,ਨਵੰ,ਦਸੰ',
    dateFmt: '{wd}, {d} {mon}',
    drvPage: 'ਡਰਾਈਵਰ ਪੰਨਾ',
    drvCodeQ: 'ਆਪਣਾ 4 ਅੰਕਾਂ ਦਾ ਕੋਡ ਪਾਓ',
    drvCodeSub: 'ਇਹ ਤੁਹਾਡੇ ਡਿਸਪੈਚਰ ਦੇ ਮੈਸੇਜ ਵਿੱਚ ਹੈ।',
    continue: 'ਅੱਗੇ ਵਧੋ',
    drvNotFound: 'ਇਹ ਕੋਡ ਨਹੀਂ ਮਿਲਿਆ।',
    loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…',
    yourTruck: 'ਤੁਹਾਡਾ ਟਰੱਕ',
    kioskCode: 'ਕਿਓਸਕ ਲਈ ਕੋਡ',
    stBooked: 'ਬੁਕਿੰਗ: {time}',
    stArrived: 'ਚੈੱਕ-ਇਨ ਹੋ ਗਿਆ — ਲਾਈਨ ਵਿੱਚ #{n}',
    stArrivedNoPos: 'ਚੈੱਕ-ਇਨ ਹੋ ਗਿਆ',
    stWorking: 'ਡੋਰ {door} ਤੇ ਜਾਓ',
    stWorkingNoDoor: 'ਆਪਣੇ ਡੋਰ ਤੇ ਜਾਓ',
    stDone: 'ਕੰਮ ਪੂਰਾ। ਧਿਆਨ ਨਾਲ ਚਲਾਓ।',
    stCancelled: 'ਇਹ ਬੁਕਿੰਗ ਰੱਦ ਹੋ ਗਈ ਹੈ।',
    etaNow: 'ਤੁਹਾਡੇ ਪਹੁੰਚਣ ਦਾ ਸਮਾਂ: {time}',
    etaFrom: '{ago} ਅੱਪਡੇਟ ਹੋਇਆ',
    updateEta: 'ਪਹੁੰਚਣ ਦਾ ਸਮਾਂ ਬਦਲੋ',
    etaQ: 'ਤੁਸੀਂ ਕਿੰਨੀ ਦੂਰ ਹੋ?',
    eta15: 'ਮੈਂ 15 ਮਿੰਟ ਦੂਰ ਹਾਂ',
    eta30: '30 ਮਿੰਟ',
    eta60: '1 ਘੰਟਾ',
    eta120: '2 ਘੰਟੇ',
    pickTime: 'ਸਮਾਂ ਚੁਣੋ',
    saveTime: 'ਸਮਾਂ ਸੇਵ ਕਰੋ',
    needTime: 'ਪਹਿਲਾਂ ਸਮਾਂ ਚੁਣੋ।',
    etaSaved: 'ਸੇਵ ਹੋ ਗਿਆ। ਅਸੀਂ {time} ਵਜੇ ਤੁਹਾਡੀ ਉਡੀਕ ਕਰਾਂਗੇ।',
    lateQ: 'ਦੇਰ ਹੋ ਰਹੀ ਹੈ?',
    lateSub: 'ਕਾਰਨ ਦਬਾਓ। ਸਾਨੂੰ ਦਿਸ ਜਾਵੇਗਾ।',
    lateTraffic: 'ਟ੍ਰੈਫ਼ਿਕ',
    lateWeather: 'ਮੌਸਮ',
    lateTruck: 'ਟਰੱਕ ਵਿੱਚ ਖਰਾਬੀ',
    lateStop: 'ਪਿਛਲੇ ਸਟਾਪ ਤੇ ਦੇਰੀ',
    lateOther: 'ਕੁਝ ਹੋਰ',
    lateSaved: 'ਧੰਨਵਾਦ। ਸਾਨੂੰ ਮਿਲ ਗਿਆ।',
    lateNote: 'ਦੇਰੀ: {why}',
    shareQ: 'ਲਾਈਵ ਲੋਕੇਸ਼ਨ ਭੇਜੋ',
    shareSub: 'Samsara, Google Maps ਜਾਂ ਕਿਸੇ GPS ਐਪ ਦਾ ਲਿੰਕ ਇੱਥੇ ਪਾਓ।',
    shareHow: 'Google Maps: ਆਪਣੇ ਨੀਲੇ ਬਿੰਦੂ ਨੂੰ ਦਬਾਓ, ਫਿਰ Share location, ਫਿਰ Copy link।',
    linkPh: 'ਲਿੰਕ ਇੱਥੇ ਪਾਓ',
    saveLink: 'ਲਿੰਕ ਸੇਵ ਕਰੋ',
    linkSaved: 'ਲੋਕੇਸ਼ਨ ਲਿੰਕ ਸੇਵ ਹੋ ਗਿਆ।',
    linkBad: 'ਇਹ ਲਿੰਕ ਨਹੀਂ ਹੈ। ਲਿੰਕ http ਨਾਲ ਸ਼ੁਰੂ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
    atDock: 'ਤੁਸੀਂ ਪਹੁੰਚ ਗਏ ਹੋ। ਸਮਾਂ ਦੱਸਣ ਦੀ ਲੋੜ ਨਹੀਂ।',
    where: 'ਕਿੱਥੇ',
    address: 'ਪਤਾ',
    hours: 'ਖੁੱਲ੍ਹਣ ਦਾ ਸਮਾਂ',
    callDock: 'ਕੋਈ ਸਵਾਲ? ਫ਼ੋਨ ਕਰੋ: {phone}',
    otherCode: 'ਤੁਹਾਡਾ ਟਰੱਕ ਨਹੀਂ? ਹੋਰ ਕੋਡ ਪਾਓ',
    stepBooked: 'ਬੁੱਕ',
    stepOnWay: 'ਰਸਤੇ ਵਿੱਚ',
    stepIn: 'ਚੈੱਕ-ਇਨ',
    stepDoor: 'ਡੋਰ ਤੇ',
    stepDone: 'ਪੂਰਾ',
    badCell: 'ਫ਼ੋਨ ਨੰਬਰ ਜਾਂਚੋ। ਇਸ ਵਿੱਚ 10 ਅੰਕ ਹੋਣੇ ਚਾਹੀਦੇ ਹਨ।',
    goOffice: 'ਕਿਰਪਾ ਕਰਕੇ ਦਫ਼ਤਰ ਜਾਓ',
    saveFail: 'ਅਸੀਂ ਤੁਹਾਡਾ ਚੈੱਕ-ਇਨ ਸੇਵ ਨਹੀਂ ਕਰ ਸਕੇ। ਕਿਰਪਾ ਕਰਕੇ ਦਫ਼ਤਰ ਜਾਓ। ਉੱਥੇ ਤੁਹਾਡਾ ਚੈੱਕ-ਇਨ ਹੋ ਜਾਵੇਗਾ।',
    alreadyHere: 'ਚੈੱਕ-ਇਨ ਹੋ ਚੁੱਕਾ ਹੈ',
    bookedFor: 'ਬੁਕਿੰਗ: {dock}',
    smsIn: '24 HR Crossdock: {dock} ਵਿੱਚ ਤੁਹਾਡਾ ਚੈੱਕ-ਇਨ ਹੋ ਗਿਆ। ਲਾਈਨ ਵਿੱਚ #{n}। ਡੋਰ ਨੰਬਰ ਅਸੀਂ ਮੈਸੇਜ ਕਰਾਂਗੇ।'
  };

  App.strings.hi = {
    langTitle: 'अपनी भाषा चुनें',
    langTap: 'शुरू करने के लिए दबाएँ',
    kioskTitle: 'ट्रक चेक-इन',
    back: 'पीछे',
    startOver: 'फिर से शुरू करें',
    next: 'आगे',
    stepOf: 'चरण {n} / {total}',
    language: 'भाषा',
    stillThere: 'क्या आप अभी भी यहाँ हैं? जारी रखने के लिए स्क्रीन दबाएँ।',
    resetIn: '{n} सेकंड में फिर से शुरू',
    help: 'मदद चाहिए? ऑफिस में पूछें।',
    companyQ: 'यह माल किस कंपनी का है?',
    companyPh: 'कंपनी का नाम लिखें',
    companyTap: 'अपनी कंपनी दबाएँ',
    expectedToday: 'आज आने वाले',
    noCompany: 'इस नाम की कोई कंपनी नहीं मिली।',
    haveCode: 'मेरे पास 4 अंकों का कोड है',
    notBooked: 'बुकिंग नहीं है / मेरी कंपनी नहीं दिख रही',
    codeQ: 'अपना 4 अंकों का कोड डालें',
    codeSub: 'यह कोड आपके डिस्पैचर के पास है।',
    codeWrong: 'यह कोड नहीं मिला। जाँच कर फिर से कोशिश करें।',
    clear: 'मिटाएँ',
    del: 'हटाएँ',
    noCode: 'कोड नहीं है? मेरी कंपनी खोजें',
    truckQ: 'आपका ट्रक कौन सा है?',
    truckSub: '{company} — {dock}',
    noTruck: 'आज {company} का कोई बुक किया हुआ ट्रक नहीं दिख रहा।',
    notListed: 'मेरा ट्रक सूची में नहीं है',
    truckN: 'ट्रक {n}',
    trailerN: 'ट्रेलर {n}',
    palletsN: '{n} पैलेट',
    pallet1: '1 पैलेट',
    kindDrop: 'माल उतारना',
    kindPick: 'माल लेना',
    kindBoth: 'उतारना + लेना',
    late: 'देर',
    detailsQ: 'अपनी जानकारी जाँचें',
    detailsSub: 'कुछ गलत हो तो ठीक करें।',
    yourName: 'आपका नाम',
    yourCell: 'आपका मोबाइल नंबर',
    cellHint: 'हम आपको डोर नंबर का मैसेज भेजेंगे।',
    truckNo: 'ट्रक नंबर',
    trailerNo: 'ट्रेलर नंबर',
    needName: 'कृपया अपना नाम लिखें।',
    otherDock: 'यह ट्रक {dock} के लिए बुक था। हम आपको यहीं चेक-इन करेंगे।',
    walkQ: 'माल किस कंपनी का है?',
    walkSub: 'बुकिंग नहीं है? कोई बात नहीं। हम जगह बना देंगे।',
    needCompany: 'कृपया कंपनी का नाम लिखें।',
    kindQ: 'आप माल उतारने आए हैं या लेने?',
    kindDropSub: 'मैं माल उतारने आया हूँ',
    kindPickSub: 'मैं माल लेने आया हूँ',
    kindBothSub: 'पहले उतारना, फिर लोड करना',
    palletsQ: 'लगभग कितने पैलेट?',
    palletsSub: 'अंदाज़ा भी चलेगा।',
    notSure: 'पता नहीं',
    less: 'कम',
    more: 'ज़्यादा',
    scanQ: 'अपने कागज़ स्कैन करें',
    scanBtn: 'अपने कागज़ों की फ़ोटो लें',
    scanMore: 'अगले पेज की फ़ोटो लें',
    tip1: 'कागज़ सीधा रखें।',
    tip2: 'पूरी स्क्रीन में कागज़ आए।',
    tip3: 'हर पेज की एक फ़ोटो।',
    pagesN: '{n} पेज',
    page1: '1 पेज',
    pageN: 'पेज {n}',
    saving: 'सेव हो रहा है…',
    scanDone: 'हो गया — मुझे चेक-इन करें',
    scanSkip: 'छोड़ें — कागज़ ऑफिस में दूँगा',
    remove: 'हटाएँ',
    doneTitle: 'आपका चेक-इन हो गया!',
    yourPlace: 'लाइन में आपका नंबर',
    nextUp: 'अगला नंबर आपका है!',
    waitAbout: 'इंतज़ार: लगभग {t}',
    textDoor: 'हम {cell} पर आपका डोर नंबर मैसेज करेंगे।',
    noCell: 'फ़ोन नंबर नहीं दिया। डोर नंबर ऑफिस में पूछें।',
    stayTruck: 'अपने ट्रक के पास रहें। हमारे मैसेज का इंतज़ार करें।',
    stayOnly: 'अपने ट्रक के पास रहें।',
    finish: 'खत्म करें',
    alreadyTitle: 'आपका चेक-इन पहले ही हो चुका है',
    goDoor: 'डोर {door} पर जाएँ',
    truckDone: 'इस ट्रक का काम पूरा हो गया। सुरक्षित चलाएँ।',
    durMin: '{n} मिनट',
    durHr: '{h} घंटे',
    durHrMin: '{h} घंटे {m} मिनट',
    ago: '{t} पहले',
    justNow: 'अभी',
    tomorrow: 'कल',
    days: 'रवि,सोम,मंगल,बुध,गुरु,शुक्र,शनि',
    months: 'जन,फ़र,मार्च,अप्रैल,मई,जून,जुल,अग,सित,अक्तू,नव,दिस',
    dateFmt: '{wd}, {d} {mon}',
    drvPage: 'ड्राइवर पेज',
    drvCodeQ: 'अपना 4 अंकों का कोड डालें',
    drvCodeSub: 'यह आपके डिस्पैचर के मैसेज में है।',
    continue: 'आगे बढ़ें',
    drvNotFound: 'यह कोड नहीं मिला।',
    loading: 'लोड हो रहा है…',
    yourTruck: 'आपका ट्रक',
    kioskCode: 'कियोस्क के लिए कोड',
    stBooked: 'बुकिंग: {time}',
    stArrived: 'चेक-इन हो गया — लाइन में #{n}',
    stArrivedNoPos: 'चेक-इन हो गया',
    stWorking: 'डोर {door} पर जाएँ',
    stWorkingNoDoor: 'अपने डोर पर जाएँ',
    stDone: 'काम पूरा। सुरक्षित चलाएँ।',
    stCancelled: 'यह बुकिंग रद्द हो गई है।',
    etaNow: 'आपके पहुँचने का समय: {time}',
    etaFrom: '{ago} अपडेट हुआ',
    updateEta: 'पहुँचने का समय बदलें',
    etaQ: 'आप कितनी दूर हैं?',
    eta15: 'मैं 15 मिनट दूर हूँ',
    eta30: '30 मिनट',
    eta60: '1 घंटा',
    eta120: '2 घंटे',
    pickTime: 'समय चुनें',
    saveTime: 'समय सेव करें',
    needTime: 'पहले समय चुनें।',
    etaSaved: 'सेव हो गया। हम {time} पर आपका इंतज़ार करेंगे।',
    lateQ: 'देर हो रही है?',
    lateSub: 'कारण दबाएँ। हमें दिख जाएगा।',
    lateTraffic: 'ट्रैफ़िक',
    lateWeather: 'मौसम',
    lateTruck: 'ट्रक में खराबी',
    lateStop: 'पिछले स्टॉप पर देर',
    lateOther: 'कुछ और',
    lateSaved: 'धन्यवाद। हमें मिल गया।',
    lateNote: 'देर: {why}',
    shareQ: 'लाइव लोकेशन भेजें',
    shareSub: 'Samsara, Google Maps या किसी GPS ऐप का लिंक यहाँ डालें।',
    shareHow: 'Google Maps: अपने नीले बिंदु को दबाएँ, फिर Share location, फिर Copy link।',
    linkPh: 'लिंक यहाँ डालें',
    saveLink: 'लिंक सेव करें',
    linkSaved: 'लोकेशन लिंक सेव हो गया।',
    linkBad: 'यह लिंक नहीं है। लिंक http से शुरू होना चाहिए।',
    atDock: 'आप पहुँच गए हैं। समय बताने की ज़रूरत नहीं।',
    where: 'कहाँ',
    address: 'पता',
    hours: 'खुलने का समय',
    callDock: 'कोई सवाल? फ़ोन करें: {phone}',
    otherCode: 'आपका ट्रक नहीं है? दूसरा कोड डालें',
    stepBooked: 'बुक',
    stepOnWay: 'रास्ते में',
    stepIn: 'चेक-इन',
    stepDoor: 'डोर पर',
    stepDone: 'पूरा',
    badCell: 'फ़ोन नंबर जाँचें। इसमें 10 अंक होने चाहिए।',
    goOffice: 'कृपया ऑफिस जाएँ',
    saveFail: 'हम आपका चेक-इन सेव नहीं कर पाए। कृपया ऑफिस जाएँ। वहाँ आपका चेक-इन हो जाएगा।',
    alreadyHere: 'चेक-इन हो चुका है',
    bookedFor: 'बुकिंग: {dock}',
    smsIn: '24 HR Crossdock: {dock} में आपका चेक-इन हो गया। लाइन में #{n}। डोर नंबर हम मैसेज करेंगे।'
  };

  /* ====================================================================
     Helpers
     ==================================================================== */
  var VL = null;   // language of the screen being drawn (the driver page can follow the truck's language)
  function curLang() { return VL || App.state.lang || 'en'; }
  /* plain text in a language (for toasts and saved texts) */
  function T(key, vars, lg) {
    var dict = App.strings[lg || curLang()] || {}, en = App.strings.en || {};
    var s = dict[key] !== undefined ? dict[key] : (en[key] !== undefined ? en[key] : key);
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  /* escaped text for HTML; every filled-in value is escaped too */
  function tx(key, vars, lg) {
    var s = h(T(key, null, lg));
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(h(vars[k])); });
    return s;
  }
  /* like tx, but the filled-in values are ready-made safe HTML (e.g. a big door number) */
  function txHtml(key, htmlVars, lg) {
    var s = h(T(key, null, lg));
    Object.keys(htmlVars || {}).forEach(function (k) { s = s.split('{' + k + '}').join(htmlVars[k]); });
    return s;
  }
  function langInfo(code) {
    for (var i = 0; i < App.LANGS.length; i++) if (App.LANGS[i].code === code) return App.LANGS[i];
    return App.LANGS[0];
  }
  function trim(v) { return String(v === undefined || v === null ? '' : v).trim(); }
  function palletsL(n, lg) { n = Number(n) || 0; return n === 1 ? T('pallet1', null, lg) : T('palletsN', { n: n }, lg); }
  function kindL(t, lg) { return T({ drop: 'kindDrop', pick: 'kindPick', both: 'kindBoth' }[t && t.kind] || 'kindDrop', null, lg); }
  function durL(min, lg) {
    min = Math.max(1, Math.round(Number(min) || 0));
    if (min < 60) return T('durMin', { n: min }, lg);
    var hh = Math.floor(min / 60), mm = min % 60;
    return mm ? T('durHrMin', { h: hh, m: mm }, lg) : T('durHr', { h: hh }, lg);
  }
  function agoL(iso, lg) {
    var ms = App.now() - Date.parse(iso);
    if (!(ms >= 60000)) return T('justNow', null, lg);
    return T('ago', { t: durL(ms / 60000, lg) }, lg);
  }
  /* "2:30 PM" today, "Tomorrow 9:00 AM", "Thu, Oct 29 9:00 AM" — day words in the screen's language */
  function whenL(iso, lg) {
    if (!iso) return '';
    var d = new Date(iso), now = new Date(App.now()), time = App.fmt.time(iso);
    if (d.toDateString() === now.toDateString()) return time;
    if (d.toDateString() === new Date(App.now() + 864e5).toDateString()) return T('tomorrow', null, lg) + ' ' + time;
    var days = T('days', null, lg).split(','), months = T('months', null, lg).split(',');
    return T('dateFmt', { wd: days[d.getDay()] || '', mon: months[d.getMonth()] || '', d: d.getDate() }, lg) + ' ' + time;
  }
  function companyOf(t) {
    var c = t && t.customerId ? App.get('customers', t.customerId) : null;
    return c ? c.name : (t && (t.walkInCompany || t.carrier)) || 'Walk-in';
  }
  function refsOf(t) { return (t.loads || []).map(function (l) { return l.ref; }).filter(Boolean).join(', '); }
  /* "Drop-off · 18 pallets · PO-55120" as safe HTML; each piece stays on one line (no "PO-" / "55120" split) */
  function nowrapJoin(bits) {
    return bits.filter(function (b) { return b !== '' && b !== null && b !== undefined; }).map(function (b) {
      return '<span style="display:inline-block;max-width:100%;overflow-wrap:anywhere">' + h(b) + '</span>';
    }).join(' · ');
  }

  /* which dock this kiosk stands at (staff panel sets it) */
  var DOCK_KEY = 'dock24:kioskDock';
  function kioskDock() {
    var d = null, keys = App.dockKeys();
    try { d = localStorage.getItem(DOCK_KEY); } catch (e) { /* storage blocked: use the default */ }
    if (keys.indexOf(d) >= 0) return d;
    return keys.indexOf('reno') >= 0 ? 'reno' : keys[0];
  }

  function F() { return App.form('kiosk', {}); }
  function K() { return App.form('kcode', {}); }

  /* booked trucks a driver could be checking in now at this dock: overdue (2 days), today, next 12 hours */
  function bookedHere(customerId, elsewhere) {
    var dock = kioskDock(), now = App.now(), end = new Date(now);
    end.setHours(23, 59, 59, 999);
    var until = Math.max(end.getTime(), now + 12 * 3600000), from = now - 48 * 3600000;
    return App.sortByTime(App.list('trucks', function (t) {
      if (t.status !== 'booked') return false;
      if (elsewhere ? (t.dock || 'reno') === dock : (t.dock || 'reno') !== dock) return false;
      if (customerId && t.customerId !== customerId) return false;
      if (!t.apptAt) return true;
      var a = Date.parse(t.apptAt);
      return a >= from && a <= until;
    }), 'apptAt');
  }
  /* this company's trucks already in the yard or at a door here (so a driver who is
     already checked in finds the truck instead of starting a second, walk-in truck) */
  function hereNow(customerId) {
    var dock = kioskDock();
    return App.sortByTime(App.list('trucks', function (t) {
      return t.customerId === customerId && (t.status === 'arrived' || t.status === 'working') && (t.dock || 'reno') === dock;
    }), 'checkedInAt');
  }
  /* rough phone check: empty is fine (texts are optional), else 10 to 15 digits */
  function cellOk(v) {
    var n = trim(v).replace(/\D/g, '').length;
    return !trim(v) || (n >= 10 && n <= 15);
  }
  function expectedCustomers() {
    var seen = {}, out = [];
    bookedHere(null).forEach(function (t) {
      if (!t.customerId || seen[t.customerId]) return;
      var c = App.get('customers', t.customerId);
      if (c) { seen[c.id] = true; out.push(c); }
    });
    return out;
  }
  /* the truck a 4-digit code points at (only trucks still in play) */
  function activeByCode(code) {
    var rows = App.list('trucks', function (t) { return String(t.code) === String(code) && App.isActive(t); });
    return rows[0] || null;
  }
  /* driver page: active truck first, else the latest finished one with that code */
  function driverTruck(p) {
    if (p && p.id) return App.get('trucks', p.id);
    if (!p || !p.code) return null;
    var t = activeByCode(p.code);
    if (t) return t;
    var old = App.sortByTime(App.list('trucks', function (x) { return String(x.code) === String(p.code); }), 'createdAt', 'desc');
    return old[0] || null;
  }

  /* ====================================================================
     Kiosk frame: top bar, main area, footer with steps
     ==================================================================== */
  var STEP = { 'kiosk.lang': 1, 'kiosk.company': 2, 'kiosk.code': 3, 'kiosk.truck': 3, 'kiosk.walkin': 3, 'kiosk.walkkind': 3,
    'kiosk.walkpallets': 3, 'kiosk.details': 4, 'kiosk.scan': 5, 'kiosk.done': 6, 'kiosk.already': 6 };
  var SMALL = 'width:auto;min-height:48px;font-size:1.05rem;padding:6px 14px;';
  var IDLE_MS = 90000, WARN_MS = 15000, DONE_MS = 30000;
  var lastTouch = App.now(), warnOn = false, lastMinute = '';
  var langReturn = null, staffReturn = null, checkingIn = false, driverLangChosen = false;
  var BIG_TIME = 'font-size:2.1rem;line-height:1';
  var pickerOpen = 0;   // when the paperwork camera / file picker was opened (0 = closed)
  var session = 0, checkInAt = 0;   // session: bumped on every reset, so a late save never changes the next driver's screen

  function idleLeft() { return Math.max(0, Math.ceil((IDLE_MS - (App.now() - lastTouch)) / 1000)); }
  function doneLeft(p) {
    var at = Number(p && p.at);
    if (!at) return Math.round(DONE_MS / 1000);
    return Math.max(0, Math.ceil((at + DONE_MS - App.now()) / 1000));
  }

  function kTop(view) {
    var lg = langInfo(App.state.lang), right = '';
    right += '<span class="clock" style="font-size:clamp(1.5rem,2.4vw,1.9rem)" aria-label="Time">' + h(App.fmt.time(App.iso())) + '</span>';
    if (view !== 'kiosk.lang' && view !== 'kiosk.staff') {
      right += '<button type="button" class="k-btn quiet" style="' + SMALL + 'padding:6px 10px" data-act="kiosk.changeLang" lang="' + h(lg.code) + '" aria-label="' + tx('language') + '">' +
        '<span aria-hidden="true">&#127760;</span> ' + h(lg.name) + '</button>';
    }
    if (view !== 'kiosk.staff') {
      right += '<button type="button" class="k-btn quiet" style="' + SMALL + 'font-size:.95rem;min-height:44px;padding:4px 10px" data-act="kiosk.staff">Staff</button>';
    }
    return '<div class="k-top">' +
      '<div class="row nowrap" style="gap:12px;min-width:0;flex:1 1 260px">' +
        '<span class="k-btn go clock" aria-hidden="true" style="width:auto;min-height:0;padding:2px 10px;font-size:1.6rem;border-radius:8px;cursor:default">24</span>' +
        '<div style="min-width:0"><b style="display:block;font-size:1.3rem;line-height:1.15">24 HR Crossdock</b>' +
        '<span class="k-sub" style="display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + h(App.dockName(kioskDock())) + ' · ' + tx('kioskTitle') + '</span></div>' +
      '</div>' +
      '<div class="row" style="gap:8px;justify-content:flex-end;margin-left:auto">' + right + '</div>' +
    '</div>';
  }

  function kFoot(view, o) {
    var n = STEP[view] || 1, dots = '';
    for (var i = 1; i <= 6; i++) dots += '<i class="' + (i <= n ? 'on' : '') + '" style="width:clamp(18px,2.6vw,34px)"></i>';
    var left = o.left !== undefined ? o.left : (o.back === false ? '<span></span>' :
      '<button type="button" class="k-btn quiet" style="' + SMALL + '" data-act="kiosk.back">&larr; ' + tx('back') + '</button>');
    var mid = o.steps === false ? '' : '<div class="row nowrap" role="img" aria-label="' + tx('stepOf', { n: n, total: 6 }) + '" style="gap:10px;flex:1 1 auto;justify-content:center">' +
      '<div class="k-steps" aria-hidden="true">' + dots + '</div><span aria-hidden="true" class="num">' + n + ' / 6</span></div>';
    var right = o.right !== undefined ? o.right : (o.reset === false ? '<span></span>' :
      '<button type="button" class="k-btn quiet" style="' + SMALL + '" data-act="kiosk.reset">&#8634; ' + tx('startOver') + '</button>');
    return '<div class="k-foot">' + left + mid + right + '</div>';
  }

  function idleWarning(view) {
    if (view === 'kiosk.lang' && !App.state.params.keep) return '';
    if (view === 'kiosk.done' || view === 'kiosk.already') return '';
    var left = idleLeft();
    if (left * 1000 > WARN_MS) return '';
    // floats over the top so the screen does not jump while someone is reading it
    return '<div class="k-btn go" role="status" style="position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:50;width:min(880px,calc(100% - 32px));' +
      'justify-content:space-between;gap:16px;padding:14px 22px;cursor:default;text-align:left">' +
      '<span style="font-size:1.2rem">' + tx('stillThere') + '</span>' +
      '<span class="clock" style="font-size:2.4rem;line-height:1">' + left + '</span></div>';
  }

  function kframe(view, inner, o) {
    VL = null;
    o = o || {};
    return '<div class="kiosk" data-kiosk-view="' + h(view) + '">' + kTop(view) +
      '<main class="k-main">' + idleWarning(view) + inner + '</main>' + kFoot(view, o) + '</div>';
  }

  function errBox(text) {
    return '<p class="pill bad" role="alert" style="white-space:normal;display:block;font-size:1.15rem;padding:12px 18px;border-radius:12px;line-height:1.35;text-align:center">' + text + '</p>';
  }
  function bigInput(id, label, field, o) {
    o = o || {};
    return '<div class="stack tight" style="gap:8px;min-width:0">' +
      '<label for="' + id + '" class="k-sub" style="font-weight:600">' + label + '</label>' +
      '<input id="' + id + '" class="k-input" type="' + (o.type || 'text') + '"' + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '') +
        ' autocomplete="off" autocapitalize="' + (o.caps || 'words') + '" spellcheck="false" data-form="kiosk" data-field="' + field + '" value="' + App.val('kiosk', field) + '"' +
        (o.err ? ' aria-invalid="true"' : '') + (o.placeholder ? ' placeholder="' + o.placeholder + '"' : '') + '>' +
      (o.hint ? '<span class="k-sub" style="font-size:1rem">' + o.hint + '</span>' : '') +
      (o.err ? errBox(o.err) : '') +
    '</div>';
  }
  function codeBtn() {
    return '<button type="button" class="k-btn" data-act="kiosk.toCode" style="gap:16px">' +
      '<span class="k-big" aria-hidden="true" style="font-size:2rem;line-height:1">#</span><span>' + tx('haveCode') + '</span></button>';
  }
  /* if someone lands mid-flow without a choice made (page reload), offer a clean restart */
  function lostScreen(view) {
    return kframe(view, '<div class="k-card stack center" style="gap:16px;padding:32px"><h2>' + tx('kioskTitle') + '</h2>' +
      '<button type="button" class="k-btn go" data-act="kiosk.reset">&#8634; ' + tx('startOver') + '</button></div>', { back: false, reset: false });
  }

  /* ====================================================================
     Kiosk views
     ==================================================================== */
  var views = {};

  /* 1. language first */
  views['kiosk.lang'] = function (p) {
    var keep = !!p.keep;
    var others = App.LANGS.filter(function (l) { return l.code !== 'en'; }).map(function (l) {
      return '<span lang="' + h(l.code) + '" style="white-space:nowrap">' + tx('langTitle', null, l.code) + '</span>';
    }).join(' · ');
    var btns = App.LANGS.map(function (l) {
      var on = keep && l.code === App.state.lang;
      return '<button type="button" class="k-btn' + (on ? ' on' : '') + '" data-act="kiosk.setLang" data-lang="' + h(l.code) + '" lang="' + h(l.code) + '" style="flex-direction:column;gap:4px;min-height:104px">' +
        '<span style="font-size:1.2em">' + h(l.name) + '</span>' +
        (keep ? '' : '<span class="k-sub" style="font-size:1rem;font-weight:500">' + tx('langTap', null, l.code) + '</span>') + '</button>';
    }).join('');
    var inner = '<div class="stack center" style="gap:12px">' +
        '<h1>' + tx('langTitle', null, 'en') + '</h1>' +
        '<p style="line-height:1.6">' + others + '</p>' +
      '</div>' +
      '<div class="k-grid">' + btns + '</div>';
    var s = App.settings();
    return kframe('kiosk.lang', inner, keep ? { reset: false, steps: false } : {
      left: '<span>' + h(T('help', null, 'en')) + (s.phone ? ' · ' + h(s.phone) : '') + '</span>', reset: false, steps: false });
  };

  /* 2. which company */
  views['kiosk.company'] = function () {
    var f = F(), q = trim(f.search).toLowerCase(), list, head;
    if (q) {
      list = App.list('customers', function (c) {
        return (c.name || '').toLowerCase().indexOf(q) >= 0 || (c.code || '').toLowerCase().indexOf(q) >= 0;
      });
      head = tx('companyTap');
    } else {
      list = expectedCustomers();
      head = tx('expectedToday');
    }
    list.sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
    list = list.slice(0, 6);
    var res = '';
    if (list.length) {
      res = '<div class="stack tight" style="gap:10px"><p>' + head + '</p><div class="k-grid">' + list.map(function (c) {
        return '<button type="button" class="k-btn" data-act="kiosk.pickCompany" data-id="' + h(c.id) + '">' + h(c.name) + App.exampleTag(c) + '</button>';
      }).join('') + '</div></div>';
    } else if (q) {
      res = '<div class="k-card"><b style="font-size:1.25rem">' + tx('noCompany') + '</b></div>';
    }
    var inner = '<h1>' + tx('companyQ') + '</h1>' +
      '<input id="k-company" class="k-input" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="' + tx('companyPh') + '" aria-label="' + tx('companyPh') + '"' +
        ' data-form="kiosk" data-field="search" data-rerender value="' + App.val('kiosk', 'search') + '">' +
      res +
      '<div class="stack" style="gap:12px">' + codeBtn() +
        '<button type="button" class="k-btn ' + (q && !list.length ? 'go' : 'quiet') + '" data-act="kiosk.walkIn" data-from="company">' + tx('notBooked') + '</button>' +
      '</div>';
    return kframe('kiosk.company', inner);
  };

  /* 3a. number pad for the 4-digit code */
  views['kiosk.code'] = function () {
    var c = K(), d = c.digits || '', dots = '';
    for (var i = 0; i < 4; i++) dots += '<i class="' + (i < d.length ? 'f' : '') + '">' + h(d.charAt(i)) + '</i>';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'del'].map(function (k) {
      if (k === 'clear') return '<button type="button" data-act="kiosk.key" data-k="clear" style="font-size:1.2rem">' + tx('clear') + '</button>';
      if (k === 'del') return '<button type="button" data-act="kiosk.key" data-k="del" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1">' +
        '<span aria-hidden="true">&#9003;</span><span style="font-size:.95rem">' + tx('del') + '</span></button>';
      return '<button type="button" data-act="kiosk.key" data-k="' + k + '">' + k + '</button>';
    }).join('');
    var inner = '<div class="cols" style="align-items:center;gap:32px">' +
      '<div class="stack" style="gap:18px">' +
        '<h1>' + tx('codeQ') + '</h1><p>' + tx('codeSub') + '</p>' +
        '<div class="k-dots" role="status" aria-label="' + h(d.length + ' / 4') + '">' + dots + '</div>' +
        (c.err ? errBox(tx('codeWrong')) : '') +
      '</div>' +
      '<div class="k-keys">' + keys + '</div>' +
    '</div>' +
    '<button type="button" class="k-btn quiet" data-act="core.go" data-view="kiosk.company">' + tx('noCode') + '</button>';
    return kframe('kiosk.code', inner);
  };

  /* 3b. pick the booked truck */
  views['kiosk.truck'] = function () {
    var f = F(), c = App.get('customers', f.customerId);
    if (!c) return lostScreen('kiosk.truck');
    var dock = App.dockName(kioskDock());
    var rows = bookedHere(c.id).concat(bookedHere(c.id, true)), here = hereNow(c.id);
    function card(t, act, left, pill) {
      var line1 = (t.truckNo ? tx('truckN', { n: t.truckNo }) : h(kindL(t))) + (t.carrier ? ' · ' + h(t.carrier) : '');
      var refs = (t.loads || []).map(function (l) { return l.ref; }).filter(Boolean);
      var line2 = nowrapJoin([kindL(t), palletsL(App.truckPallets(t))].concat(t.trailerNo ? [T('trailerN', { n: t.trailerNo })] : [], refs));
      return '<button type="button" class="k-btn' + (act === 'kiosk.showAlready' ? ' quiet' : '') + '" data-act="' + act + '" data-id="' + h(t.id) + '" style="justify-content:flex-start;text-align:left;gap:20px;padding:16px 22px;flex-wrap:wrap;min-height:88px">' +
        left +
        '<span style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px;align-items:flex-start">' +
          '<span>' + line1 + '</span>' +
          '<span class="k-sub" style="font-size:1.05rem;font-weight:500;overflow-wrap:break-word;max-width:100%">' + line2 + '</span>' +
          (pill ? '<span class="row" style="gap:8px">' + pill + '</span>' : '') +
        '</span>' +
        '<span aria-hidden="true" style="font-size:2.4rem;line-height:1;margin-left:auto">&rsaquo;</span>' +
      '</button>';
    }
    var cards = rows.map(function (t) {
      var late = t.apptAt && Date.parse(t.apptAt) < App.now() - 15 * 60000;
      var away = (t.dock || 'reno') !== kioskDock();
      var pill = (away ? '<span class="pill warn" style="font-size:1rem;white-space:normal;border-radius:10px">' + tx('bookedFor', { dock: App.dockName(t.dock) }) + '</span>' : '') +
        (late ? '<span class="pill warn" style="font-size:1rem">' + tx('late') + '</span>' : '');
      return card(t, 'kiosk.pickTruck', '<span class="clock" style="' + BIG_TIME + '">' + h(whenL(t.apptAt)) + '</span>', pill);
    }).join('');
    var hereCards = here.map(function (t) {
      var pos = App.placeInLine(t);
      var where = t.status === 'working' ? (t.door ? tx('stWorking', { door: t.door }) : tx('stWorkingNoDoor')) : (pos ? tx('stArrived', { n: pos }) : tx('stArrivedNoPos'));
      return card(t, 'kiosk.showAlready', '', '<span class="pill good" style="font-size:1rem;white-space:normal;border-radius:10px">' + where + '</span>');
    }).join('');
    var inner = '<div class="stack tight" style="gap:8px"><h1>' + tx('truckQ') + '</h1>' +
      '<p>' + tx('truckSub', { company: c.name, dock: dock }) + App.exampleTag(c) + '</p></div>';
    var hereBlock = here.length ? '<div class="stack" style="gap:10px"><p><b>' + tx('alreadyHere') + '</b></p>' + hereCards + '</div>' : '';
    if (rows.length || here.length) {
      inner += (rows.length ? '<div class="stack" style="gap:14px">' + cards + '</div>' : '') + hereBlock +
        '<button type="button" class="k-btn quiet" data-act="kiosk.walkIn" data-from="truck">' + tx('notListed') + '</button>';
    } else {
      inner += '<div class="k-card"><b style="font-size:1.3rem">' + tx('noTruck', { company: c.name }) + '</b></div>' +
        '<div class="k-grid">' +
          '<button type="button" class="k-btn go" data-act="kiosk.walkIn" data-from="truck">' + tx('notListed') + '</button>' +
          codeBtn() +
        '</div>';
    }
    return kframe('kiosk.truck', inner);
  };

  /* walk-in 1: company name */
  views['kiosk.walkin'] = function () {
    var f = F();
    var inner = '<div class="stack tight" style="gap:8px"><h1>' + tx('walkQ') + '</h1><p>' + tx('walkSub') + '</p></div>' +
      '<input id="k-walk-company" class="k-input" type="text" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="' + tx('companyPh') + '" aria-label="' + tx('walkQ') + '"' +
        ' data-form="kiosk" data-field="walkInCompany" value="' + App.val('kiosk', 'walkInCompany') + '"' + (f.err === 'company' ? ' aria-invalid="true"' : '') + '>' +
      (f.err === 'company' ? errBox(tx('needCompany')) : '') +
      '<button type="button" class="k-btn go" data-act="kiosk.walkCompany">' + tx('next') + ' &rarr;</button>';
    return kframe('kiosk.walkin', inner);
  };

  /* walk-in 2: drop or pick */
  views['kiosk.walkkind'] = function () {
    var f = F();
    var opts = [['drop', '&#8595;', 'kindDrop', 'kindDropSub'], ['pick', '&#8593;', 'kindPick', 'kindPickSub'], ['both', '&#8645;', 'kindBoth', 'kindBothSub']];
    var name = f.customerId ? companyOf({ customerId: f.customerId }) : trim(f.walkInCompany);
    var inner = '<div class="stack tight" style="gap:8px"><h1>' + tx('kindQ') + '</h1>' + (name ? '<p>' + h(name) + '</p>' : '') + '</div>' +
      '<div class="stack" style="gap:14px">' + opts.map(function (o) {
        return '<button type="button" class="k-btn' + (f.kind === o[0] ? ' on' : '') + '" data-act="kiosk.walkKind" data-kind="' + o[0] + '" style="justify-content:flex-start;text-align:left;gap:20px;padding:14px 24px">' +
          '<span class="k-big" aria-hidden="true" style="font-size:2.8rem;width:1.1em;text-align:center">' + o[1] + '</span>' +
          '<span style="display:flex;flex-direction:column;gap:2px"><span>' + tx(o[2]) + '</span>' +
          '<span class="k-sub" style="font-size:1.05rem;font-weight:500">' + tx(o[3]) + '</span></span></button>';
      }).join('') + '</div>';
    return kframe('kiosk.walkkind', inner);
  };

  /* walk-in 3: about how many pallets */
  views['kiosk.walkpallets'] = function () {
    var f = F(), n = Number(f.pallets) || 0;
    var quick = [4, 8, 12, 18, 22, 26].map(function (q) {
      return '<button type="button" class="k-btn' + (n === q ? ' on' : '') + '" data-act="core.set" data-form="kiosk" data-field="pallets" data-value="' + q + '" style="min-height:64px">' + q + '</button>';
    }).join('');
    var inner = '<div class="stack tight center" style="gap:8px"><h1>' + tx('palletsQ') + '</h1><p>' + tx('palletsSub') + '</p></div>' +
      '<div class="row nowrap" style="justify-content:center;gap:18px">' +
        '<button type="button" class="k-btn" data-act="core.step" data-form="kiosk" data-field="pallets" data-step="-1" data-min="0" aria-label="' + tx('less') + '" style="width:96px;font-size:2.6rem">&minus;</button>' +
        '<output class="k-big" aria-live="polite" style="min-width:2.2ch;text-align:center">' + n + '</output>' +
        '<button type="button" class="k-btn" data-act="core.step" data-form="kiosk" data-field="pallets" data-step="1" data-min="0" aria-label="' + tx('more') + '" style="width:96px;font-size:2.6rem">+</button>' +
      '</div>' +
      '<div class="k-grid" style="grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:10px">' + quick + '</div>' +
      '<div class="k-grid">' +
        '<button type="button" class="k-btn quiet" data-act="kiosk.walkPallets" data-unsure="1">' + tx('notSure') + '</button>' +
        '<button type="button" class="k-btn go" data-act="kiosk.walkPallets"' + (n > 0 ? '' : ' disabled') + '>' + tx('next') + ' &rarr;</button>' +
      '</div>';
    return kframe('kiosk.walkpallets', inner);
  };

  /* which load this check-in is for: company, time, kind, pallets, PO/BOL numbers */
  function summaryCard(f) {
    var t = f.truckId ? App.get('trucks', f.truckId) : null, name, bits;
    if (t) {
      name = h(companyOf(t)) + App.exampleTag(App.get('customers', t.customerId));
      bits = [t.apptAt ? whenL(t.apptAt) : '', t.truckNo ? T('truckN', { n: t.truckNo }) : '', kindL(t), palletsL(App.truckPallets(t))]
        .concat((t.loads || []).map(function (l) { return l.ref; }));
    } else {
      var c = f.customerId ? App.get('customers', f.customerId) : null;
      name = c ? h(c.name) + App.exampleTag(c) : h(trim(f.walkInCompany));
      bits = [kindL({ kind: f.kind || 'drop' }), f.palletsUnsure ? T('notSure') : palletsL(f.pallets)];
    }
    bits = nowrapJoin(bits);
    return '<div class="k-card row nowrap" style="gap:16px;padding:14px 20px">' +
      '<span aria-hidden="true" style="font-size:2.2rem;line-height:1">&#128666;</span>' +
      '<div style="min-width:0;display:flex;flex-direction:column;gap:2px">' +
        '<span class="k-sub" style="font-size:1rem">' + tx('yourTruck') + '</span>' +
        '<b style="font-size:1.3rem;overflow-wrap:anywhere">' + name + '</b>' +
        (bits ? '<span class="k-sub" style="font-size:1.05rem;overflow-wrap:anywhere">' + bits + '</span>' : '') +
      '</div></div>';
  }

  /* 4. driver details (prefilled from the booking) */
  views['kiosk.details'] = function () {
    var f = F();
    if (!f.truckId && f.via !== 'walk') return lostScreen('kiosk.details');
    var warn = f.otherDock ? '<div class="k-card"><b style="font-size:1.15rem">' + tx('otherDock', { dock: App.dockName(f.otherDock) }) + '</b></div>' : '';
    // heading and "your truck" side by side on the kiosk screen (keeps the form on one screen), stacked on a phone
    var inner = '<div style="display:grid;gap:16px 22px;align-items:center;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">' +
        '<div class="stack tight" style="gap:8px"><h1>' + tx('detailsQ') + '</h1><p>' + tx('detailsSub') + '</p></div>' + summaryCard(f) +
      '</div>' + warn +
      '<div style="display:grid;gap:18px 22px;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))">' +
        bigInput('k-name', tx('yourName'), 'driverName', { err: f.err === 'name' ? tx('needName') : '' }) +
        bigInput('k-cell', tx('yourCell'), 'driverCell', { type: 'tel', inputmode: 'tel', hint: tx('cellHint'), err: f.err === 'cell' ? tx('badCell') : '' }) +
        bigInput('k-truck', tx('truckNo'), 'truckNo', { caps: 'characters' }) +
        bigInput('k-trailer', tx('trailerNo'), 'trailerNo', { caps: 'characters' }) +
      '</div>' +
      '<button type="button" class="k-btn go" data-act="kiosk.detailsNext">' + tx('next') + ' &rarr;</button>';
    return kframe('kiosk.details', inner);
  };

  /* 5. paperwork photos (many pages; images or PDF) */
  views['kiosk.scan'] = function () {
    var f = F();
    if (!f.truckId && f.via !== 'walk') return lostScreen('kiosk.scan');
    var pages = f.paperwork || [], busy = !!(App.state.busy && App.state.busy['kiosk:paperwork']);
    var input = '<input type="file" id="k-paper" accept="image/*,application/pdf" capture="environment" multiple' +
      ' data-on-change="core.photo" data-form="kiosk" data-photo-field="paperwork" data-multi="1" aria-label="' + tx('scanBtn') + '">';
    var label = busy ? tx('saving') : tx(pages.length ? 'scanMore' : 'scanBtn');
    var big = '<label class="k-btn filebtn' + (pages.length ? '' : ' go') + '" for="k-paper" style="min-height:' + (pages.length ? '88px' : '150px') + ';font-size:clamp(1.3rem,3vw,1.9rem)">' +
      '<span aria-hidden="true" style="font-size:1.5em">&#128247;</span> <span>' + label + '</span>' + input + '</label>';
    var tips = '<div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">' + ['tip1', 'tip2', 'tip3'].map(function (k, i) {
      return '<div class="k-card row nowrap" style="gap:14px;padding:14px 18px"><span class="k-big" style="font-size:2.2rem">' + (i + 1) + '</span><b style="font-size:1.15rem">' + tx(k) + '</b></div>';
    }).join('') + '</div>';
    var thumbs = '';
    if (pages.length) {
      thumbs = '<div class="stack tight" style="gap:10px"><p><b>' + h(pages.length === 1 ? T('page1') : T('pagesN', { n: pages.length })) + '</b></p>' +
        '<div class="thumbs" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px">' + pages.map(function (ref, i) {
          return '<div class="photo-slot filled"><img src="' + h(App.photoUrl(ref)) + '" alt="' + tx('pageN', { n: i + 1 }) + '">' +
            '<button type="button" class="ps-x" style="width:40px;height:40px;font-size:1.3rem" data-act="core.photoRemove" data-form="kiosk" data-field="paperwork" data-index="' + i + '" aria-label="' + h(T('remove') + ' — ' + T('pageN', { n: i + 1 })) + '">&times;</button></div>';
        }).join('') + '</div></div>';
    }
    var wait = busy || checkingIn;
    var actions = pages.length
      ? '<button type="button" class="k-btn go" data-act="kiosk.checkin"' + (wait ? ' disabled' : '') + '>' + (checkingIn ? tx('saving') : '&#10003; ' + tx('scanDone')) + '</button>'
      : '<button type="button" class="k-btn quiet" data-act="kiosk.checkin" data-skip="1"' + (wait ? ' disabled' : '') + '>' + (checkingIn ? tx('saving') : tx('scanSkip')) + '</button>';
    if (f.saveErr) {
      // the check-in did not save: never tell the driver they are checked in; send them to the office
      return kframe('kiosk.scan', '<h1>' + tx('goOffice') + '</h1>' + errBox(tx('saveFail')) +
        '<button type="button" class="k-btn go" data-act="kiosk.reset">&#8634; ' + tx('startOver') + '</button>', { back: false, reset: false });
    }
    var inner = '<h1>' + tx('scanQ') + '</h1>' + tips + big + thumbs + actions;
    return kframe('kiosk.scan', inner);
  };

  /* place-in-line card shared by "done" and "already" */
  function placeCard(t) {
    if (t.status === 'working') {
      return '<div class="k-card center stack" style="gap:8px;padding:28px"><b style="font-size:clamp(1.6rem,4vw,2.4rem);line-height:1.25">' +
        (t.door ? txHtml('goDoor', { door: '<span class="k-big" style="display:inline-block;vertical-align:middle">' + h(t.door) + '</span>' }) : tx('stWorkingNoDoor')) + '</b></div>';
    }
    if (t.status === 'cancelled' || t.status === 'done') {
      // the screen title already says cancelled / done: here, where to get help
      var ph = App.settings().phone;
      return '<div class="k-card center stack" style="gap:10px;padding:28px"><b style="font-size:1.5rem">' + tx('help') + '</b>' +
        (ph ? '<span class="clock" style="font-size:2rem">' + h(ph) + '</span>' : '') + '</div>';
    }
    var pos = App.placeInLine(t), wait = App.estWaitMin(t);
    return '<div class="k-card center stack" style="gap:6px;padding:26px 20px">' +
      '<p>' + tx('yourPlace') + '</p>' +
      '<div class="k-big" style="font-size:clamp(4rem,11vw,7rem)">#' + h(pos || '—') + '</div>' +
      (pos === 1 ? '<b style="font-size:1.5rem">' + tx('nextUp') + '</b>' : '') +
      (wait ? '<p>' + tx('waitAbout', { t: durL(wait) }) + '</p>' : '') +
    '</div>';
  }

  /* 6. checked in */
  views['kiosk.done'] = function (p) {
    var t = App.get('trucks', p.id);
    if (!t) return lostScreen('kiosk.done');
    var left = doneLeft(p);
    var inner = '<div class="cols" style="align-items:center;gap:28px">' +
      '<div class="stack" style="gap:16px">' +
        '<span class="k-btn go" aria-hidden="true" style="width:92px;height:92px;min-height:0;padding:0;border-radius:50%;font-size:3.2rem;cursor:default">&#10003;</span>' +
        '<h1>' + tx('doneTitle') + '</h1>' +
        '<p>' + (t.driverCell ? tx('textDoor', { cell: t.driverCell }) : tx('noCell')) + '</p>' +
        '<p><b>' + tx(t.driverCell ? 'stayTruck' : 'stayOnly') + '</b></p>' +
      '</div>' +
      placeCard(t) +
    '</div>' +
    '<button type="button" class="k-btn go" data-act="kiosk.finish">' + tx('finish') + '</button>';
    return kframe('kiosk.done', inner, { back: false, reset: false, right: '<span role="timer">' + tx('resetIn', { n: left }) + '</span>' });
  };

  /* code of a truck that is already in the yard: show where it stands, never check in twice */
  views['kiosk.already'] = function (p) {
    var t = App.get('trucks', p.id);
    if (!t) return lostScreen('kiosk.already');
    var left = doneLeft(p);
    var inner = '<div class="cols" style="align-items:center;gap:28px">' +
      '<div class="stack" style="gap:16px">' +
        '<h1>' + (t.status === 'cancelled' ? tx('stCancelled') : t.status === 'done' ? tx('truckDone') : tx('alreadyTitle')) + '</h1>' +
        '<p>' + h(companyOf(t)) + (t.truckNo ? ' · ' + tx('truckN', { n: t.truckNo }) : '') + '</p>' +
        (t.status === 'arrived' ? '<p><b>' + tx(t.driverCell ? 'stayTruck' : 'stayOnly') + '</b></p>' : '') +
      '</div>' +
      placeCard(t) +
    '</div>' +
    '<button type="button" class="k-btn go" data-act="kiosk.finish">' + tx('finish') + '</button>';
    return kframe('kiosk.already', inner, { reset: false, right: '<span role="timer">' + tx('resetIn', { n: left }) + '</span>' });
  };

  /* staff panel (English: staff only) */
  views['kiosk.staff'] = function () {
    var cur = kioskDock(), s = App.settings();
    var docks = App.dockKeys().map(function (k) {
      var d = s.docks[k] || {};
      return '<button type="button" class="k-btn' + (k === cur ? ' on' : '') + '" data-act="kiosk.setDock" data-dock="' + h(k) + '" aria-pressed="' + (k === cur) + '" style="flex-direction:column;gap:6px;padding:16px 18px">' +
        '<span>' + (k === cur ? '&#10003; ' : '') + h(d.name || k) + '</span>' +
        '<span class="k-sub" style="font-size:.95rem;font-weight:500">' + h(d.address || '') + '</span></button>';
    }).join('');
    var waiting = App.queue(cur).length;
    var inner = '<div class="stack tight" style="gap:8px"><h1>Staff settings</h1>' +
        '<p>Which dock is this kiosk at? Trucks check in to the dock you pick.</p></div>' +
      '<div class="k-grid">' + docks + '</div>' +
      '<div class="k-card row between" style="gap:12px"><span>In the yard at ' + h(App.dockName(cur)) + ' now</span><b class="clock" style="font-size:1.8rem">' + waiting + ' waiting</b></div>' +
      '<div class="k-grid">' +
        '<button type="button" class="k-btn go" data-act="kiosk.staffBack">&larr; Back to check-in</button>' +
        '<button type="button" class="k-btn quiet" data-act="kiosk.leave">Leave kiosk (open the office screen)</button>' +
      '</div>' +
      '<p style="font-size:1rem">Prototype: a staff PIN will lock this panel later. Drivers never need it.</p>';
    return kframe('kiosk.staff', inner, { left: '<span></span>', reset: false, steps: false });
  };

  /* ====================================================================
     Kiosk actions
     ==================================================================== */
  function resetKiosk() {
    App.resetForm('kiosk', {});
    App.resetForm('kcode', {});
    App.state.lang = 'en';
    langReturn = null; staffReturn = null; checkingIn = false; warnOn = false; pickerOpen = 0;
    session++;
    lastTouch = App.now();
    App.go('kiosk.lang');
  }
  function prefill(f, t) {
    f.truckId = t.id;
    f.customerId = t.customerId || null;
    f.driverName = t.driverName || '';
    f.driverCell = t.driverCell || '';
    f.truckNo = t.truckNo || '';
    f.trailerNo = t.trailerNo || '';
    f.otherDock = (t.dock || 'reno') !== kioskDock() ? (t.dock || 'reno') : null;
    f.err = null;
  }
  function keyPress(k) {
    var c = K(), d = c.digits || '';
    c.err = false;
    if (k === 'clear') d = '';
    else if (k === 'del') d = d.slice(0, -1);
    else if (/^[0-9]$/.test(k) && d.length < 4) d += k;
    c.digits = d;
    if (d.length < 4) { App.render(); return; }
    var t = activeByCode(d);
    c.digits = '';
    if (!t) { c.err = true; App.render(); return; }
    if (t.status === 'booked') {
      var f = F();
      prefill(f, t);
      f.via = 'code';
      App.go('kiosk.details');
    } else {
      F().alreadyFrom = 'code';
      App.go('kiosk.already', { id: t.id, at: String(App.now()) });
    }
  }
  function backTarget(view) {
    var f = F();
    switch (view) {
      case 'kiosk.company': return ['kiosk.lang'];
      case 'kiosk.code': case 'kiosk.truck': case 'kiosk.walkin': return ['kiosk.company'];
      case 'kiosk.walkkind': return [f.walkFrom === 'truck' ? 'kiosk.truck' : 'kiosk.walkin'];
      case 'kiosk.walkpallets': return ['kiosk.walkkind'];
      case 'kiosk.details': return [f.via === 'walk' ? 'kiosk.walkpallets' : f.via === 'code' ? 'kiosk.code' : 'kiosk.truck'];
      case 'kiosk.scan': return ['kiosk.details'];
      case 'kiosk.already': return [f.alreadyFrom === 'truck' && f.customerId ? 'kiosk.truck' : 'kiosk.code'];
      case 'kiosk.lang': return langReturn ? [langReturn.view, langReturn.params] : ['kiosk.lang'];
      default: return ['kiosk.lang'];
    }
  }

  /* the check-in itself: one truck write, then the alerts */
  function checkIn() {
    if (checkingIn || App.anyBusy()) return null;
    var f = F(), dock = kioskDock(), lang = App.state.lang || 'en', nowIso = App.iso();
    if (App.state.canWrite === false) { f.saveErr = true; App.render(); return null; }
    var people = { driverName: trim(f.driverName), driverCell: trim(f.driverCell), truckNo: trim(f.truckNo), trailerNo: trim(f.trailerNo), driverLang: lang };
    var paper = (f.paperwork || []).slice(), id, write, walk = f.via === 'walk';
    if (walk) {
      id = App.newId('t');
      var pallets = f.palletsUnsure ? 0 : (Number(f.pallets) || 0);
      var doc = Object.assign({
        customerId: f.customerId || null, walkIn: true, code: App.newCode(), dock: dock, kind: f.kind || 'drop', apptAt: null,
        status: 'arrived', carrier: '', tracking: 'none', trackUrl: '',
        loads: [{ id: 'l1', ref: '', pallets: pallets, weight: 0, pieces: 0, destination: '', stackable: false, hazmat: false,
          notes: f.palletsUnsure ? 'Driver was not sure how many pallets' : 'Pallet count is the driver\'s guess' }],
        loadOrder: false, paperwork: paper, checkedInAt: nowIso, checkedInBy: 'kiosk',
        history: [{ at: nowIso, by: 'Kiosk', text: 'Walk-in checked in at the kiosk' }],
        notes: '', createdAt: nowIso, createdBy: 'kiosk'
      }, people);
      if (!f.customerId) doc.walkInCompany = trim(f.walkInCompany) || 'Unknown company';
      checkingIn = true;
      write = App.save('trucks', id, doc);
    } else {
      var t = App.get('trucks', f.truckId);
      if (!t) { f.saveErr = true; App.render(); return null; }
      if (t.status !== 'booked') {
        // checked in some other way meanwhile (office): keep the pages the driver just took
        if (paper.length && App.isActive(t)) {
          App.logTruck(t, 'Driver added ' + paper.length + ' paperwork photo' + (paper.length === 1 ? '' : 's') + ' at the kiosk', 'Kiosk',
            { paperwork: (t.paperwork || []).concat(paper) }).catch(function () { /* core already showed a message */ });
        }
        f.alreadyFrom = 'scan';
        App.go('kiosk.already', { id: t.id, at: String(App.now()) });
        return null;
      }
      id = t.id;
      var extra = Object.assign({ status: 'arrived', checkedInAt: nowIso, checkedInBy: 'kiosk', paperwork: (t.paperwork || []).concat(paper) }, people);
      var moved = (t.dock || 'reno') !== dock;
      if (moved) extra.dock = dock;
      checkingIn = true;
      write = App.logTruck(t, 'Checked in at the kiosk' + (moved ? ' (was booked for ' + App.dockName(t.dock) + ')' : '') +
        (paper.length ? ' with ' + paper.length + ' paperwork photo' + (paper.length === 1 ? '' : 's') : ''), 'Kiosk', extra);
    }
    App.render();   // "Saving…" on the button while the write goes out
    var mine = session;
    checkInAt = App.now();
    return write.then(function () {
      if (mine === session) checkingIn = false;
      // only now that it is really saved: tell the customer, the crew and the driver
      var saved = App.get('trucks', id);
      if (!saved) return;
      var pos = App.placeInLine(saved) || 1, company = companyOf(saved), pal = App.truckPallets(saved);
      var refs = refsOf(saved), label = saved.truckNo || saved.code;
      if (saved.customerId) {
        App.notify(saved.customerId, 'arrived', 'Your truck ' + label + (refs ? ' (' + refs + ')' : '') + ' checked in at ' + App.dockName(dock) + '. Place in line: ' + pos + '.' +
          (walk ? ' (Walk-in, no booking.)' : ''), id);
      }
      App.notifyCrew(saved, walk
        ? 'New walk-in truck in the yard: ' + company + ', ' + (pal ? 'about ' + pal + ' pallets' : 'pallets unknown') + ' (' + App.kindLabel(saved) + ')'
        : 'New truck in the yard: ' + company + ', ' + pal + ' pallets');
      if (saved.driverCell) App.notifyDriver(saved, T('smsIn', { dock: App.dockName(dock), n: pos }, lang));
      // still on this driver's screen (not reset by the idle timer meanwhile)
      if (mine === session && App.state.role === 'kiosk' && App.state.view === 'kiosk.scan') App.go('kiosk.done', { id: id, at: String(App.now()) });
    }, function () {
      if (mine !== session) return;
      checkingIn = false;
      f.saveErr = true;   // core already showed what went wrong; the screen sends the driver to the office
      App.render();
    });
  }

  var actions = {
    'kiosk.setLang': function (el) {
      App.state.lang = el.getAttribute('data-lang') || 'en';
      if (App.state.params && App.state.params.keep && langReturn) {
        var back = langReturn; langReturn = null;
        App.go(back.view, back.params);
        return;
      }
      App.resetForm('kiosk', {});
      App.resetForm('kcode', {});
      App.go('kiosk.company');
    },
    'kiosk.changeLang': function () {
      langReturn = { view: App.state.view, params: App.state.params };
      App.go('kiosk.lang', { keep: '1' });
    },
    'kiosk.back': function () {
      var to = backTarget(App.state.view);
      if (App.state.view === 'kiosk.lang') langReturn = null;
      if (to[0] === 'kiosk.code') K().digits = '';
      App.go(to[0], to[1]);
    },
    'kiosk.reset': function () { resetKiosk(); },
    'kiosk.finish': function () { resetKiosk(); },
    'kiosk.pickCompany': function (el) {
      var f = F();
      f.customerId = el.getAttribute('data-id');
      f.via = 'list'; f.truckId = null; f.err = null;
      App.go('kiosk.truck');
    },
    'kiosk.toCode': function () { App.resetForm('kcode', {}); App.go('kiosk.code'); },
    'kiosk.showAlready': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) return;
      F().alreadyFrom = 'truck';
      App.go('kiosk.already', { id: t.id, at: String(App.now()) });
    },
    'kiosk.key': function (el) { keyPress(el.getAttribute('data-k')); },
    'kiosk.pickTruck': function (el) {
      var t = App.get('trucks', el.getAttribute('data-id'));
      if (!t) return;
      var f = F();
      prefill(f, t);
      f.via = 'list';
      App.go('kiosk.details');
    },
    'kiosk.walkIn': function (el) {
      var f = F(), from = el.getAttribute('data-from');
      f.via = 'walk'; f.walkFrom = from; f.truckId = null; f.otherDock = null; f.err = null;
      // a truck picked earlier filled these in: a walk-in starts clean
      f.driverName = ''; f.driverCell = ''; f.truckNo = ''; f.trailerNo = ''; f.paperwork = [];
      if (from === 'truck' && f.customerId) { App.go('kiosk.walkkind'); return; }
      f.customerId = null;
      // what they just typed in the search box wins over an older answer
      f.walkInCompany = trim(f.search) || trim(f.walkInCompany);
      App.go('kiosk.walkin');
    },
    'kiosk.walkCompany': function () {
      var f = F(), name = trim(f.walkInCompany);
      if (!name) { f.err = 'company'; App.render(); return; }
      f.err = null;
      var low = name.toLowerCase();
      var match = App.list('customers', function (c) { return trim(c.name).toLowerCase() === low || trim(c.code).toLowerCase() === low; })[0];
      f.customerId = match ? match.id : null;
      App.go('kiosk.walkkind');
    },
    'kiosk.walkKind': function (el) { F().kind = el.getAttribute('data-kind'); App.go('kiosk.walkpallets'); },
    'kiosk.walkPallets': function (el) {
      var f = F();
      f.palletsUnsure = el.hasAttribute('data-unsure');
      if (!f.palletsUnsure && !(Number(f.pallets) > 0)) return;
      App.go('kiosk.details');
    },
    'kiosk.detailsNext': function () {
      var f = F();
      if (!trim(f.driverName)) { f.err = 'name'; App.render(); return; }
      if (!cellOk(f.driverCell)) { f.err = 'cell'; App.render(); return; }
      f.err = null; f.saveErr = false;
      if (!f.paperwork) f.paperwork = [];
      App.go('kiosk.scan');
    },
    'kiosk.checkin': function () { return checkIn(); },
    'kiosk.staff': function () {
      staffReturn = { view: App.state.view, params: App.state.params };
      App.go('kiosk.staff');
    },
    'kiosk.staffBack': function () {
      var r = staffReturn; staffReturn = null;
      if (r && r.view && r.view !== 'kiosk.staff') App.go(r.view, r.params); else App.go('kiosk.lang');
    },
    'kiosk.setDock': function (el) {
      var d = el.getAttribute('data-dock');
      try { localStorage.setItem(DOCK_KEY, d); } catch (e) { /* storage blocked: choice lasts until reload */ }
      App.toast('This kiosk is now at ' + App.dockName(d) + '.');
      App.render();
    },
    'kiosk.leave': function () { resetKiosk(); App.setRole('office'); }
  };

  /* ====================================================================
     Driver page (phone, opened from #driver<code>)
     ==================================================================== */
  function driverLangFor(t) {
    if (driverLangChosen || !t || !App.strings[t.driverLang]) return App.state.lang || 'en';
    return t.driverLang;
  }
  function langChips() {
    var cur = curLang();
    return '<div class="chips" role="group" aria-label="' + tx('language') + '">' + App.LANGS.map(function (l) {
      return '<button type="button" class="chip' + (l.code === cur ? ' on' : '') + '" data-act="driver.setLang" data-lang="' + h(l.code) + '" lang="' + h(l.code) + '" aria-pressed="' + (l.code === cur) + '" style="min-height:44px">' +
        (l.code === cur ? '<span aria-hidden="true">&#10003;</span>' : '') + h(l.name) + '</button>';
    }).join('') + '</div>';
  }
  function driverShell(inner) {
    return App.topbar('24 HR Crossdock', { sub: T('drvPage') }) + '<div class="body narrow stack loose">' + langChips() + inner + '</div>';
  }
  function driverCodeScreen(notFound) {
    var f = App.form('drvcode', {});
    return driverShell('<form class="card stack" data-submit="driver.findCode" novalidate>' +
      '<h1>' + tx('drvCodeQ') + '</h1><p class="muted">' + tx('drvCodeSub') + '</p>' +
      (notFound || f.err ? '<div class="banner bad" role="alert"><b>' + tx('drvNotFound') + '</b></div>' : '') +
      '<input id="drv-code" class="in mono center" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="one-time-code"' +
        ' aria-label="' + tx('drvCodeQ') + '" data-form="drvcode" data-field="code" value="' + App.val('drvcode', 'code') + '" style="font-size:2.4rem;letter-spacing:.35em;min-height:76px">' +
      '<button type="submit" class="btn primary lg block">' + tx('continue') + '</button>' +
    '</form>');
  }
  function stepsL(t) {
    var lbl = { booked: 'stepBooked', eta: 'stepOnWay', arrived: 'stepIn', working: 'stepDoor', done: 'stepDone' };
    return '<div class="steps" aria-label="Progress">' + App.truckSteps(t).map(function (s) {
      return '<div class="st ' + (s.state === 'todo' ? '' : s.state) + '" style="overflow-wrap:anywhere"><i></i>' + tx(lbl[s.key]) + '</div>';
    }).join('') + '</div>';
  }
  var LATE = ['lateTraffic', 'lateWeather', 'lateTruck', 'lateStop', 'lateOther'];

  function driverEta(p) {
    VL = null;
    if (!App.loaded.trucks) return driverShell('<div class="card"><p class="muted">' + tx('loading') + '</p></div>');
    var t = driverTruck(p);
    if (!t) return driverCodeScreen(true);
    VL = driverLangFor(t);
    var s = App.settings(), dock = s.docks[t.dock || 'reno'] || {}, f = App.form('driver', {});
    var who = [t.truckNo ? T('truckN', { n: t.truckNo }) : T('yourTruck'), companyOf(t)].map(h).join(' · ');
    var big, sub = '', bigSize = '2.3rem';
    if (t.status === 'booked') {
      big = t.apptAt ? tx('stBooked', { time: whenL(t.apptAt) }) : tx('stepBooked');
      if (t.eta && t.eta.at) sub = tx('etaNow', { time: whenL(t.eta.at) }) + (t.eta.updatedAt ? ' · ' + tx('etaFrom', { ago: agoL(t.eta.updatedAt) }) : '');
      if (t.eta && t.eta.note) sub += (sub ? '<br>' : '') + h(lateLabel(t.eta.note));
    } else if (t.status === 'arrived') {
      var pos = App.placeInLine(t), wait = App.estWaitMin(t);
      big = pos ? tx('stArrived', { n: pos }) : tx('stArrivedNoPos');
      sub = (wait ? tx('waitAbout', { t: durL(wait) }) + ' · ' : '') + tx(t.driverCell ? 'stayTruck' : 'stayOnly');
    } else if (t.status === 'working') {
      big = t.door ? tx('stWorking', { door: t.door }) : tx('stWorkingNoDoor');
      bigSize = '3rem';
    } else if (t.status === 'done') {
      big = tx('stDone');
    } else {
      big = tx('stCancelled');
      sub = tx('callDock', { phone: s.phone || '' });
    }
    var hero = '<section class="hero stack tight" aria-live="polite">' +
      '<span class="muted small">' + who + App.exampleTag(t) + '</span>' +
      '<h1 style="font-size:' + bigSize + ';overflow-wrap:anywhere">' + big + '</h1>' +
      (sub ? '<p class="muted">' + sub + '</p>' : '') +
      (App.isActive(t) && t.code ? '<p class="small muted" style="margin-top:4px">' + tx('kioskCode') + ': <b class="mono" style="font-size:1.15rem">' + h(t.code) + '</b></p>' : '') +
    '</section>';
    var parts = [hero];
    if (t.status !== 'cancelled') parts.push('<div class="card">' + stepsL(t) + '</div>');
    if (t.status === 'booked') {
      var quick = [['15', 'eta15'], ['30', 'eta30'], ['60', 'eta60'], ['120', 'eta120']].map(function (q, i) {
        return '<button type="button" class="btn ' + (i === 0 ? 'primary' : 'secondary') + ' lg" style="min-height:68px;font-size:1.2rem" data-act="driver.setEta" data-min="' + q[0] + '">' + tx(q[1]) + '</button>';
      }).join('');
      var pick = f.pick
        ? '<div class="row nowrap" style="gap:10px"><div class="field grow"><label for="drv-time">' + tx('pickTime') + '</label>' +
            '<input type="time" id="drv-time" data-form="driver" data-field="time" value="' + App.val('driver', 'time') + '"' + (f.timeErr ? ' aria-invalid="true"' : '') + '></div>' +
            '<button type="button" class="btn primary lg" style="align-self:flex-end" data-act="driver.saveTime">' + tx('saveTime') + '</button></div>' +
            (f.timeErr ? '<p class="small bad-t bold">' + tx('needTime') + '</p>' : '')
        : '<button type="button" class="btn secondary lg block" data-act="core.set" data-form="driver" data-field="pick"><span aria-hidden="true">&#128339;</span> ' + tx('pickTime') + '</button>';
      parts.push('<section class="card stack"><h2>' + tx('updateEta') + '</h2><p class="muted">' + tx('etaQ') + '</p>' +
        '<div class="grid2">' + quick + '</div>' + pick + '</section>');
      parts.push('<section class="card stack tight"><h3>' + tx('lateQ') + '</h3><p class="muted small">' + tx('lateSub') + '</p>' +
        '<div class="chips">' + LATE.map(function (k) {
          var on = t.eta && t.eta.note === T(k, null, 'en');
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="driver.late" data-reason="' + k + '" aria-pressed="' + !!on + '" style="min-height:44px">' + (on ? '<span aria-hidden="true">&#10003;</span>' : '') + tx(k) + '</button>';
        }).join('') + '</div></section>');
      parts.push('<section class="card stack tight"><h3>' + tx('shareQ') + '</h3><p class="muted small">' + tx('shareSub') + '</p>' +
        (t.trackUrl ? '<div class="banner good"><span><b>&#10003; ' + tx('linkSaved') + '</b><br><span class="small mono" style="overflow-wrap:anywhere">' + h(t.trackUrl) + '</span></span></div>' : '') +
        '<div class="field' + (f.linkErr ? ' err' : '') + '"><label class="sr" for="drv-link">' + tx('shareQ') + '</label>' +
          '<input type="url" id="drv-link" inputmode="url" autocomplete="off" placeholder="' + tx('linkPh') + '" data-form="driver" data-field="link" value="' + App.val('driver', 'link') + '">' +
          (f.linkErr ? '<span class="errmsg">' + tx('linkBad') + '</span>' : '') + '</div>' +
        '<button type="button" class="btn secondary block" data-act="driver.saveLink">' + tx('saveLink') + '</button>' +
        '<p class="tiny faint">' + tx('shareHow') + '</p></section>');
    } else if (t.status === 'arrived' || t.status === 'working') {
      parts.push('<div class="banner info"><b>' + tx('atDock') + '</b></div>');
    }
    parts.push('<section class="card stack tight"><dl class="kv" style="margin:0">' +
      '<dt>' + tx('where') + '</dt><dd>' + h(dock.name || App.dockName(t.dock)) + '</dd>' +
      (dock.address ? '<dt>' + tx('address') + '</dt><dd>' + h(dock.address) + '</dd>' : '') +
      (s.hours ? '<dt>' + tx('hours') + '</dt><dd>' + h(s.hours) + '</dd>' : '') +
      '</dl>' + (s.phone ? '<p class="small muted">' + tx('callDock', { phone: s.phone }) + '</p>' : '') + '</section>');
    parts.push('<p class="center small"><button type="button" class="linkbtn" style="min-height:44px;padding:0 8px" data-act="driver.otherCode">' + tx('otherCode') + '</button></p>');
    return driverShell(parts.join(''));
  }
  function lateLabel(en) {
    for (var i = 0; i < LATE.length; i++) if (T(LATE[i], null, 'en') === en) return T('lateNote', { why: T(LATE[i]) });
    return T('lateNote', { why: en });
  }

  views['driver.code'] = function (p) {
    VL = null;
    if (p && (p.code || p.id)) return driverEta(p);
    if (!App.loaded.trucks) return driverShell('<div class="card"><p class="muted">' + tx('loading') + '</p></div>');
    return driverCodeScreen(false);
  };
  views['driver.eta'] = function (p) { return driverEta(p || {}); };

  function curDriverTruck() { return driverTruck(App.state.params || {}); }
  /* one save at a time, and the same tap twice within 4 s counts once (no double alerts to the customer) */
  var drvBusy = false, drvLast = { key: '', at: 0 };
  function drvOnce(key, fn) {
    if (drvBusy || (drvLast.key === key && App.now() - drvLast.at < 4000)) return null;
    drvBusy = true; drvLast = { key: key, at: App.now() };
    var r;
    try { r = fn(); } catch (e) { drvBusy = false; throw e; }
    return Promise.resolve(r).then(function (v) { drvBusy = false; return v; }, function (e) { drvBusy = false; drvLast = { key: '', at: 0 }; throw e; });
  }
  function saveEta(t, atMs) {
    var at = App.iso(atMs), lg = driverLangFor(t);
    return App.logTruck(t, 'Driver ETA: ' + App.fmt.dayTime(at), 'Driver', { eta: { at: at, source: 'driver', updatedAt: App.iso() } })
      .then(function () {
        var refs = refsOf(t);
        if (t.customerId) App.notify(t.customerId, 'eta', 'Driver ETA now ' + App.fmt.dayTime(at) + ' (truck ' + (t.truckNo || t.code) + (refs ? ', ' + refs : '') + ').', t.id);
        App.toast(T('etaSaved', { time: whenL(at, lg) }, lg));
      });
  }

  actions['driver.setLang'] = function (el) {
    App.state.lang = el.getAttribute('data-lang') || 'en';
    driverLangChosen = true;
    App.render();
  };
  actions['driver.findCode'] = function () {
    var f = App.form('drvcode', {}), code = trim(f.code).replace(/\D/g, '');
    var t = code.length === 4 ? driverTruck({ code: code }) : null;
    if (!t) { f.err = true; App.render(); return; }
    App.resetForm('drvcode', {});
    App.resetForm('driver', {});
    App.go('driver.eta', { code: code });
  };
  actions['driver.otherCode'] = function () {
    App.resetForm('drvcode', {});
    App.resetForm('driver', {});
    App.go('driver.code', {});
  };
  actions['driver.setEta'] = function (el) {
    var t = curDriverTruck();
    if (!t) return null;
    var min = Number(el.getAttribute('data-min'));
    return drvOnce('eta' + min, function () { return saveEta(t, App.now() + min * 60000); });
  };
  actions['driver.saveTime'] = function () {
    var t = curDriverTruck(), f = App.form('driver', {});
    if (!t) return null;
    if (!/^\d{1,2}:\d{2}/.test(f.time || '')) { f.timeErr = true; App.render(); return null; }
    var parts = f.time.split(':'), d = new Date(App.now());
    d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    // a time well before now means tomorrow (e.g. 1:00 AM picked at 11 PM)
    if (d.getTime() < App.now() - 30 * 60000) d = new Date(d.getTime() + 864e5);
    f.timeErr = false; f.pick = false;
    return drvOnce('time' + d.getTime(), function () { return saveEta(t, d.getTime()); });
  };
  actions['driver.late'] = function (el) {
    var t = curDriverTruck();
    if (!t) return null;
    var key = el.getAttribute('data-reason'), en = T(key, null, 'en'), lg = driverLangFor(t);
    var eta = App.truckEta(t);
    return drvOnce('late' + key, function () {
      return App.logTruck(t, 'Driver running late: ' + en, 'Driver', { eta: { note: en } }).then(function () {
        if (t.customerId) App.notify(t.customerId, 'eta', 'Driver running late: ' + en + '.' + (eta ? ' Last ETA ' + App.fmt.dayTime(eta) + '.' : '') + ' (truck ' + (t.truckNo || t.code) + ')', t.id);
        App.toast(T('lateSaved', null, lg));
      });
    });
  };
  actions['driver.saveLink'] = function () {
    var t = curDriverTruck(), f = App.form('driver', {});
    if (!t) return null;
    var v = trim(f.link);
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(v)) { f.linkErr = true; App.render(); return null; }
    f.linkErr = false; f.link = '';
    var lg = driverLangFor(t);
    return drvOnce('link' + v, function () {
      return App.logTruck(t, 'Driver shared a live location link', 'Driver', { trackUrl: v, tracking: 'gps' }).then(function () {
        if (t.customerId) App.notify(t.customerId, 'eta', 'Driver shared a live location link for truck ' + (t.truckNo || t.code) + ': ' + v, t.id);
        App.toast(T('linkSaved', null, lg));
      });
    });
  };

  /* every screen starts in the kiosk language; the driver page may switch to the truck's language inside */
  Object.keys(views).forEach(function (k) {
    var fn = views[k];
    views[k] = function (p) {
      VL = null;
      try { return fn(p || {}); } finally { VL = null; }
    };
  });
  App.register(views, actions);

  /* ====================================================================
     Timers: idle reset (90 s), done countdown (30 s), minute clock
     ==================================================================== */
  function touched() { lastTouch = App.now(); }
  ['pointerdown', 'touchstart', 'keydown', 'input', 'wheel'].forEach(function (ev) {
    document.addEventListener(ev, touched, { capture: true, passive: true });
  });
  // coming back from the camera app (taking a paperwork photo) counts as a touch
  window.addEventListener('focus', function () { touched(); pickerOpen = 0; });
  /* Core redraws the screen by replacing it. If that happens while the camera / file picker is open
     (the clock ticks, another truck changes), the photo input that opened it is no longer on the page,
     its "change" never reaches core, and the page would be lost. Watch the input itself. */
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    if (App.state.role !== 'kiosk' || !el || el.tagName !== 'INPUT' || el.type !== 'file') return;
    pickerOpen = App.now();
    if (el.getAttribute('data-kwatch')) return;
    el.setAttribute('data-kwatch', '1');
    el.addEventListener('change', function () {
      pickerOpen = 0;
      if (document.contains(el)) return;                 // still on screen: core handles it as usual
      if (App.state.view !== 'kiosk.scan') return;       // screen was reset meanwhile: not this driver's form any more
      var fn = App.actions[el.getAttribute('data-on-change')];
      if (!fn) return;
      touched();
      var r = fn(el);
      if (r && r.catch) r.catch(function (e) { App.toast((e && e.message) || 'That photo did not save.'); });
    });
  }, true);
  // opening a second driver link in the same tab only changes the #hash (no reload): follow it
  window.addEventListener('hashchange', function () {
    var m = /^#driver(\d{4})$/.exec(location.hash || '');
    if (!m) return;
    App.resetForm('drvcode', {});
    App.resetForm('driver', {});
    driverLangChosen = false;
    if (App.state.role !== 'driver') App.setRole('driver', true);
    App.go('driver.eta', { code: m[1] });
  });
  // a real keyboard works on the number pad too
  document.addEventListener('keydown', function (ev) {
    if (App.state.role !== 'kiosk' || App.state.view !== 'kiosk.code') return;
    var tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (/^[0-9]$/.test(ev.key)) { ev.preventDefault(); keyPress(ev.key); }
    else if (ev.key === 'Backspace') { ev.preventDefault(); keyPress('del'); }
  });
  setInterval(function () {
    var st = App.state, v = st.view || '';
    if (st.role === 'kiosk' && v.indexOf('kiosk.') === 0) {
      if (v === 'kiosk.done' || v === 'kiosk.already') {
        if (doneLeft(st.params) <= 0) resetKiosk(); else App.render();
        return;
      }
      if (v !== 'kiosk.lang' || (st.params && st.params.keep)) {
        // a photo still uploading, the camera still open (up to 5 min) or a check-in still saving is not "idle"
        if (App.anyBusy() || (checkingIn && App.now() - checkInAt < 60000) || (pickerOpen && App.now() - pickerOpen < 300000)) touched();
        var idle = App.now() - lastTouch;
        if (idle >= IDLE_MS) { resetKiosk(); return; }
        if (idle >= IDLE_MS - WARN_MS) { warnOn = true; App.render(); return; }
        if (warnOn) { warnOn = false; App.render(); return; }
      }
    }
    var m = App.localTime();
    if (m !== lastMinute) {
      lastMinute = m;
      if (st.role === 'kiosk' || st.role === 'driver') App.render();
    }
  }, 1000);
})();
