{
    /**
     * Solution 5, finishing challenge 1, 2, and 3
     * 
     * 2 things to improve
     * 1. Experiement for when passing a floor, can it stop right there, and how to; Current implementation makes "next planned floor" not changeable.
     * 2. Up and down indicator isn't used.
     */
    init: function(elevators, floors) {
        console.clear();
        const start = new Date();
        const logTime = () => { return `${((new Date() - start) / 1000).toFixed(2).padStart(6, '0')}s`; };
        const log = {
            levels: [
                'debug',
                'info',
                'warn',
                'error',
                'event',
                'tick',
            ],
            debug () { this.levels.includes('debug') && console.info.call(console, '%c🛠️[DEBUG]', 'color: #929292;', logTime(), ...arguments); },
            info () { this.levels.includes('info') && console.info.call(console, '%cℹ️[INFO] ', 'color: #6a8dc9;', logTime(), ...arguments); },
            warn () { this.levels.includes('warn') && console.info.call(console, '%c⚠️[WARN] ', 'color: #ff0;', logTime(), ...arguments); },
            error () { this.levels.includes('error') && console.info.call(console, '%c🚨[ERROR]', 'color: #f00', logTime(), ...arguments); },
            event () { this.levels.includes('event') && console.info.call(console, '%c💬[EVENT]', 'color: #2bff00;', logTime(), ...arguments); },
            tick () { this.levels.includes('tick') && console.info.call(console, '%c⏳[TICK] ', 'color: #e1701a;', logTime(), ...arguments); },
        };

        const print = {
            nameOf(entity) { return elevators.includes(entity) ? `🛗${this.number(elevators.indexOf(entity))}` : `🏢${this.number(floors.indexOf(entity))}`; },
            loadEmoji(elevator) { return ['🌑', '🌑', '🌘', '🌗', '🌖', '🌕'][Math.ceil(elevator.loadFactor() * 5)]; },
            elevator(elevator) { return `${this.nameOf(elevator)}${this.loadEmoji(elevator)}${elevator.currentFloor()}/F` },
            floor(floor) { return this.nameOf(floor); },
            number(num) { return String(num).split('').map((digit) => ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'][parseInt(digit)]).join(''); },
        };

        /**
         * Event logs
         */
        elevators.forEach((elevator, index) => {
            elevator.on('idle', () => { log.event('😪', print.elevator(elevator)); });
            elevator.on('floor_button_pressed', (floorNum) => { log.event(`🫵${print.number(floorNum)}`, print.elevator(elevator)); });
            elevator.on('passing_floor', (floorNum, direction) => { log.event(`${direction === 'up' ? '⤴️' : '⤵️'}${print.number(floorNum)}`, print.elevator(elevator)); });
            elevator.on('stopped_at_floor', (floorNum) => { log.event('↔️', print.elevator(elevator)); });
        });
        floors.forEach((floor, index) => {
            floor.on('up_button_pressed', () => { log.event('🔼', print.floor(floor)); });
            floor.on('down_button_pressed', () => { log.event('🔽', print.floor(floor)); });
        });

        /**
         * Advanced logs
         */
        elevators.forEach((elevator, index) => {
            let loadState = null;
            const checkLoading = () => {
                const loadFactor = elevator.loadFactor();
                if (loadState && loadState.loadFactor === loadFactor) {
                    log.warn(print.nameOf(elevator), 'loadFactor same?');
                }
            };
            elevator.on('stopped_at_floor', (floorNum) => {
                checkLoading();
                loadState = { loadFactor: elevator.loadFactor(), floorNum };
            });
            elevator.on('passing_floor', () => {
                checkLoading();
                loadState = null;
            });
        });

        log.info('start', start.toISOString());

        const state = {
            events: [],
            lastDirection: null,
        };

        /**
         * Events producing
         */
        function pushEvent(event) { state.events.push(event); tick(); }
        elevators.forEach((elevator, index) => {
            elevator.on('idle', () => { pushEvent(['idle']) });
            elevator.on('floor_button_pressed', (floorNum) => { pushEvent(['floor_button_pressed', floorNum]) });
            elevator.on('passing_floor', (floorNum, direction) => { pushEvent(['passing_floor', floorNum, direction]) });
            elevator.on('stopped_at_floor', (floorNum) => { pushEvent(['stopped_at_floor', floorNum]) });
        });
        floors.forEach((floor, index) => {
            floor.on('up_button_pressed', () => { pushEvent(['up_button_pressed', floor.floorNum()]) });
            floor.on('down_button_pressed', () => { pushEvent(['down_button_pressed', floor.floorNum()]) });
        });

        const consume = () => {
            /**
             * Early returns
             */
            if (state.events.length === 0) {
                log.info('consume', 'no events to consume');
                return;
            }

            /**
             * Warnings if any elevators carries more than 80% of its capacity
             */
            elevators.forEach((elevator, index) => {
                const loadFactor = elevator.loadFactor();
                elevator.loadFactor() > .8 && log.warn(print.nameOf(elevator), `loadFactor reaches ${loadFactor.toFixed(2)}`);
            });

            /**
             * Variables
             */
            const currentDestinationQueue = [...elevators[0].destinationQueue];

            log.tick('start', print.floor(floors[elevators[0].currentFloor()]), state.lastDirection === 'up' ? '⬆️' : '⬇️', 'curr:', elevators[0].destinationQueue, 'pending:', _.map(state.events, 1));

            /**
             * Actual logic
             */
            while (state.events.length > 0) {
                const [eventName, floorNum] = state.events.shift();

                if (['floor_button_pressed', 'up_button_pressed', 'down_button_pressed'].includes(eventName) && !currentDestinationQueue.includes(floorNum)) {
                    currentDestinationQueue.push(floorNum);
                }
            }

            const currentFloorNum = elevators[0].currentFloor();
            if (currentDestinationQueue.length === 0) {
                log.info(print.nameOf(elevators[0]), `no new items in destination queue`);
                return;
            }

            const [nextFloorNum, ...restFloorNums] = currentDestinationQueue;
            const currentDirection = nextFloorNum === currentFloorNum ? state.lastDirection : (nextFloorNum > currentFloorNum ? 'up' : 'down');
            const towardsFloorNums = restFloorNums.filter((floorNum) => currentDirection === 'up' ? floorNum >= nextFloorNum : floorNum <= nextFloorNum);
            const behindFloorNums = restFloorNums.filter((floorNum) => !towardsFloorNums.includes(floorNum)).sort();

            const newRestFloorNums = [...towardsFloorNums, ...behindFloorNums.reverse()];
            elevators[0].destinationQueue = [nextFloorNum, ...(currentDirection === 'up' ? newRestFloorNums : newRestFloorNums.reverse())];
            elevators[0].checkDestinationQueue();

            state.lastDirection = currentDirection;
            log.tick('end  ', print.floor(floors[elevators[0].currentFloor()]), currentDirection === 'up' ? '⬆️' : '⬇️', 'curr:', elevators[0].destinationQueue);
        };

        const tick = _.debounce(consume, 400); // Debouncing instead of throttling to give time for lift to chill. It often needs time to stop and pick up passengers.

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}