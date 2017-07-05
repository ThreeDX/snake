;(function () {
    'use strict';
    // Может использоваться в качестве конструктора
    function SnakeGame(element) {
        element = element || 'field';
        var wrapper;

        // Элемент в который отрисовываем доску
        if (typeof element == 'string') {
            wrapper = document.getElementById(element);
            if (!wrapper) {
                throw new Error('Элемент ' + element + ' не найден!');
            }
        } else {
            wrapper = element;
        }

        // Звуки
        var foodSound = new Audio('sound/food.ogg');
        var bonusSound = new Audio('sound/bonus.ogg');
        var finishSound = new Audio('sound/finish.ogg');
        var bestSound = new Audio('sound/best.ogg');
        var moveSound = new Audio('sound/move.ogg');

        // Настройки
        var CELL_SIZE = 30;
        var WALL_MAX_COUNT = 3; // Количество стен на уровень
        var FOOD_LEVEL_COUNT = 5; // Сколько надо съесть еды для поднятия уровня
        var bonuses = ['coin', 'bomb', 'slow', 'cut']; // Варианты бонуса
        var BONUS_CHANCE = 25; // Шанс выпадения бонуса в %
        var MIN_FIELD_SIZE = 21; // Минимальный размер поля (квадрат)

        var fieldSizeX = 21; // Размер поля по ширине
        var fieldSizeY = 27; // Размер поля по высоте

        // Корректируем размер поля по высоте если видимая область не вмещает поле
        correctFieldSize();

        var snake;
        var direction;
        var score;
        var best;
        var speed;
        var level;
        var gameState;
        var food;
        var food_count;
        var bonus;
        var walls;
        var speedTimer;

        // Обработчик нажатия клавиш
        addEventListener('keydown', changeDirection);

        // Инициализируем игру
        initGame();

        /////////////////////////////////////////////////
        // Обработчик кнопки                           //
        /////////////////////////////////////////////////

        function playGame(e) {
            switch (gameState) {
                case 0: // Новая игра или пауза
                    gameState = 1;
                    e.target.innerHTML = 'Pause';

                    speedTimer = setTimeout(move, 0);
                    spawnUnit(['food']);
                    break;
                case 1: // Игра в движении
                    gameState = 0;
                    e.target.innerHTML = 'Start';

                    if (speedTimer) {
                        clearTimeout(speedTimer);
                        speedTimer = null;
                    }
                    break;
                case 2: // Игра закончилась
                    initGame();
                    break;
            }

            // Функция может быть вызвана не по событию
            if (e.preventDefault) {
                e.preventDefault();
            }
        }

        // Показывает помощь
        function helpGame(e) {
            document.getElementById('help').classList.toggle('hidden');
            e.preventDefault();
        }

        /////////////////////////////////////////////////
        // Инициализация и создание элементов          //
        /////////////////////////////////////////////////

        // Корректирует размер поля, в зависимости от размера видимой области
        function correctFieldSize() {
            var maxY = parseInt(window.innerHeight / CELL_SIZE - 2);

            // По Y не менее MIN_FIELD_SIZE клеток
            fieldSizeY = fieldSizeY > maxY ? Math.max(maxY, MIN_FIELD_SIZE) : fieldSizeY;
            // По X не более чем по Y (квадрат)
            fieldSizeX = fieldSizeY < fieldSizeX ? fieldSizeY : fieldSizeX;
        }

        // Инициализирует игру
        function initGame() {
            direction = 'up';
            score = 0;
            speed = 240;
            level = 1;
            gameState = 0;
            food = null;
            food_count = 0;
            bonus = null;
            walls = [];
            best = (localStorage.getItem('best_snake')) ? localStorage.getItem('best_snake') : 0;

            createField();
            createSnake();
        }

        // Создает игровое поле
        function createField() {
            wrapper.innerHTML = '';
            wrapper.className = 'field';
            wrapper.style.width = fieldSizeX * CELL_SIZE + 'px';
            wrapper.style.height = fieldSizeY * CELL_SIZE + 'px';

            for (var y = 1; y <= fieldSizeY; y++) {
                for (var x = 1; x <= fieldSizeX; x++) {
                    var item = document.createElement('div');
                    var id = x + '-' + y;
                    item.setAttribute('id', id);
                    item.classList.add('cell');
                    wrapper.appendChild(item);
                }
            }

            // Окошко помощи
            createHelp();

            // Плашка с информацией
            var plate = document.createElement('div');
            plate.classList.add('plate');
            wrapper.appendChild(plate);

            // Лучший результат
            createText('Best', best, 'best', plate);
            // Очки
            createText('Score', score, 'score', plate);
            // Уровень
            createText('Level', level, 'level', plate);
            // Кнопка старта
            createStartButton(plate);
            // Кнопка помощи
            createHelpButton(plate);
        }

        // Окно помощи
        function createHelp() {
            var help = document.createElement('div');

            help.classList.add('help');
            help.classList.add('hidden');
            help.id = 'help';
            help.innerHTML = '<h3>Управление игрой</h3><p>Змейка управляется клавишами <span>← ↑ → ↓</span><br>' +
                '<span>space</span> – запустить / остановить игру<br>' +
                '<span>h</span> – Данное окно помощи<br></p>' +
                '<h3>Бонусы</h3><p><img src="img/bomb.png" alt="Bomb"> – Убирает все препятствия<br>' +
                '<img src="img/slow.png" alt="Slow"> – Снижает скорость змейки<br>' +
                '<img src="img/cut.png" alt="Cut"> – Уменьшает длину змейки<br>' +
                '<img src="img/coin.png" alt="Coin"> – Добавляет очки<br>' +
                '</p><p class="copy">&copy; Dmitry Panfilov</p>';
            wrapper.appendChild(help);
        }

        // Обновление информации
        function updatePlate(id, value) {
            var s = document.getElementById(id);
            s.innerHTML = value;
        }

        // Создает информационные табло на плашке
        function createText(caption, text, id, parent) {
            var c = document.createElement('p');
            c.classList.add('caption');
            c.innerHTML = caption;
            var t = document.createElement('p');
            t.classList.add('text');
            t.innerHTML = text;
            t.id = id;
            parent.appendChild(c);
            parent.appendChild(t);
        }

        // Создает кнопку старта
        function createStartButton(parent) {
            var a = document.createElement('a');
            a.innerHTML = 'Start';
            a.id = 'button';
            a.href = '#';
            parent.appendChild(a);
            a.addEventListener('click', playGame);
        }

        // Создает кнопку помощи
        function createHelpButton(parent) {
            var a = document.createElement('a');
            a.classList.add('buttonHelp');
            a.innerHTML = 'Help';
            a.href = '#';
            parent.appendChild(a);

            a.addEventListener('click', helpGame);

            // Добавляем кнопку закрыть в окне помощи
            var closeButton = a.cloneNode(false);
            closeButton.innerHTML = 'Close';
            closeButton.addEventListener('click', helpGame);
            document.getElementById('help').appendChild(closeButton);


        }

        // Создает змейку
        function createSnake() {
            // Начальные координаты змейки
            var snakePosX = Math.floor(fieldSizeX / 2) + 1;
            var snakePosY = Math.floor(fieldSizeY / 2);

            var head = document.getElementById(snakePosX + '-' + snakePosY);
            head.classList.add('snake');
            head.classList.add('head');
            var tail = document.getElementById(snakePosX + '-' + (snakePosY + 1));
            tail.classList.add('snake');

            snake = [head, tail];
        }

        // Случайное целое число в заданном диапазоне
        function getRandomInt(min, max) {
            return Math.floor(Math.random() * (max + 1 - min)) + min;
        }


        /////////////////////////////////////////////////
        // Игровая логика                              //
        /////////////////////////////////////////////////

        // Приводит в дивжение игру
        // Флаг boost означает, что функция вызвана вне очереди, а не по таймеру
        function move(boost) {
            if (gameState != 1) {
                return;
            }

            var snakeCoords = snake[0].id.split('-');
            var coordX = parseInt(snakeCoords[0]);
            var coordY = parseInt(snakeCoords[1]);

            switch(direction) {
                case 'up':
                    coordY--;
                    if (coordY < 1) coordY = fieldSizeY;
                    break;
                case 'down':
                    coordY++;
                    if (coordY > fieldSizeY) coordY = 1;
                    break;
                case 'left':
                    coordX--;
                    if (coordX < 1) coordX = fieldSizeX;
                    break;
                case 'right':
                    coordX++;
                    if (coordX > fieldSizeX) coordX = 1;
                    break;
            }

            // Обрабатываем полученную ячейку
            checkCell(document.getElementById(coordX + '-' + coordY));

            if (boost && speedTimer) {
                clearTimeout(speedTimer);
            }

            moveSound.play();
            speedTimer = setTimeout(move, speed);
        }

        // Проверяет ячейку на предмет столкновения
        function checkCell(unit) {
            // Ячейка не является ни стеной, ни змейкой
            if(unit !== undefined && !unit.classList.contains('snake') && !unit.classList.contains('wall')) {
                unit.classList.add('snake');
                unit.classList.add('head');
                snake[0].classList.remove('head');

                snake.unshift(unit);

                // Ячейка не является едой
                if(!unit.classList.contains('food')) {
                    checkBonus(unit);

                    var removed = snake.pop();
                    removed.classList.remove('snake');
                } else {
                    // Съели еду
                    unit.classList.remove('food');
                    food_count++;
                    food = null;
                    score += level * 10;
                    updatePlate('score', score);

                    foodSound.play();

                    // Если съели достаточно, повышаем уровень
                    if (food_count == FOOD_LEVEL_COUNT) {
                        level++;
                        updatePlate('level', level);
                        food_count = 0;
                        speed *= 0.75;
                    }

                    // После еды спавним стены, еду и бонус
                    spawnUnit(['food', 'wall', 'bonus']);
                }
            } else {
                finishGame();
            }
        }

        // Обработка бонуса
        function checkBonus(unit) {
            if (!bonus) {
                return;
            }

            // Дополнительные очки
            if (unit.classList.contains('coin')) {
                score += 100 * level;
                updatePlate('score', score);
                unit.classList.remove('coin');
                bonus = null;
            }

            // Замедляет змейку
            if (unit.classList.contains('slow')) {
                speed *= 1.5;
                unit.classList.remove('slow');
                bonus = null;
            }

            // Убирает все стены
            if (unit.classList.contains('bomb')) {
                walls.forEach(function(w) {
                    w.classList.remove('wall');
                });
                walls = [];
                unit.classList.remove('bomb');
                bonus = null;
            }

            // укорачивает змейку
            if (unit.classList.contains('cut')) {
                var max = Math.floor(snake.length / 2 + 1);
                while(max < snake.length) {
                    var r = snake.pop();
                    r.classList.remove('snake');
                }
                unit.classList.remove('cut');
                bonus = null;
            }

            if (!bonus){
                bonusSound.play();
            }
        }

        // Изменяет направление будущего движения змейки
        function changeDirection(e) {
            // space (старт, пауза)
            if (e.keyCode == 32) {
                playGame({target: document.getElementById('button')});
                e.preventDefault();
                return;
            }

            // h (помощь)
            if (e.keyCode == 72) {
                helpGame(e);
                return;
            }

            if (gameState != 1) {
                return;
            }

            switch (e.keyCode) {
                case 37: // left
                    if(direction != 'right') {
                        direction = 'left';
                    }
                    break;
                case 38: // up
                    if(direction != 'down') {
                        direction = 'up';
                    }
                    break;
                case 39: // right
                    if(direction != 'left') {
                        direction = 'right';
                    }
                    break;
                case 40: // down
                    if(direction != 'up') {
                        direction = 'down';
                    }
                    break;
                default:
                    return;
            }

            // чтобы стандартное поведение стрелок отменить
            e.preventDefault();

            // Ускоряем движение змейки
            move(true);
        }

        // Спавн элемента на поле
        function spawnUnit(units) {
            if (gameState != 1) {
                return;
            }

            units.forEach(function(unit) {
                // Находим подходящую ячейку
                var cell = getFreeCell();

                switch(unit) {
                    case 'food':
                        if (food) // Еда только одна на поле
                            return;
                        cell.classList.add('food');
                        food = cell;
                        break;
                    case 'wall':
                        if (walls.length >= WALL_MAX_COUNT * level) // Лимит стен достигнут
                            return;
                        cell.classList.add('wall');
                        walls.push(cell);
                        break;
                    case 'bonus':
                        if (bonus || getRandomInt(1, 100) > BONUS_CHANCE) // Бонус только один на поле или шанс не сработал
                            return;
                        cell.classList.add( bonuses[getRandomInt(1, bonuses.length) - 1] );
                        bonus = cell;
                        break;
                }
            });
        }

        // Функция возвращает свободную ячейку
        function getFreeCell() {
            var element;
            var headCoords = wrapper.querySelector('.head').id.split('-');

            do {
                var x = getRandomInt(1, fieldSizeX);
                var y = getRandomInt(1, fieldSizeY);

                var cell = document.getElementById(x + '-' + y);

                // Ячейка должна быть незанятой
                if(!cell.classList.contains('snake') && !cell.classList.contains('wall') && cell != bonus && cell != food) {
                    // расстояние от головы змейки должно быть не менее 4 клеток
                    var s = (x - headCoords[0]) * (x - headCoords[0]) + (y - headCoords[1]) * (y - headCoords[1]);
                    if (s >= 16) {
                        element = cell;
                    }
                }
            } while(!element);

            return cell;
        }

        // Окончание игры
        function finishGame() {
            if (gameState == 1) {
                gameState = 2;
            }


            if (speedTimer) {
                clearTimeout(speedTimer);
                speedTimer = null;
            }

            var button = document.getElementById('button');
            button.innerHTML = 'Reset';

            // Новый рекорд
            if (score > best) {
                best = score;
                updatePlate('best', best);
                localStorage.setItem('best_snake', best);

                bestSound.play();
            } else {
                finishSound.play();
            }

            // Надпись об окончании игры
            var banner = document.createElement('div');
            banner.classList.add('banner');
            banner.innerHTML = 'Game Over';
            wrapper.appendChild(banner);
        }

    }

    window.SnakeGame = SnakeGame;
})();