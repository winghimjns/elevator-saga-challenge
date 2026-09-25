{
    /**
     * Solution 5, finishing challenge 1, 2, and 3
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
            debug () { this.levels.includes('debug') && console.debug.call(console, '%c[DEBUG]', 'color: #929292', logTime(), ...arguments) },
            info () { this.levels.includes('info') && console.info.call(console, '%c[INFO] ', 'color: #6a8dc9;', logTime(), ...arguments) },
            warn () { this.levels.includes('warn') && console.warn.call(console, '%c[WARN] ', 'color: #ff0;', logTime(), ...arguments) },
            error () { this.levels.includes('error') && console.error.call(console, '[ERROR]', logTime(), ...arguments) },
            event () { this.levels.includes('event') && console.info.call(console, '%c[EVENT]', 'color: rgb(230, 182, 116);', logTime(), ...arguments) },
            tick () { this.levels.includes('tick') && console.info.call(console, '%c[TICK] ', 'color: #162f16;', logTime(), ...arguments) },
        };
        function nameOf(entity) { return elevators.indexOf(entity) !== -1 ? `🛗${elevators.indexOf(entity)}` : `🏢${floors.indexOf(entity)}`; }

        /**
         * Event logs
         */
        elevators.forEach((elevator, index) => {
            elevator.on('idle', () => { log.event(nameOf(elevator), 'idle') });
            elevator.on('floor_button_pressed', (floorNum) => { log.event(nameOf(elevator), `👉${floorNum}`, 'floor_button_pressed') });
            elevator.on('passing_floor', (floorNum, direction) => { log.event(nameOf(elevator), `${direction === 'up' ? '⤴️' : '⤵️'}${floorNum}`, 'passing_floor') });
            elevator.on('stopped_at_floor', (floorNum) => { log.event(nameOf(elevator), `↔️${floorNum}`, 'stopped_at_floor') });
        });
        floors.forEach((floor, index) => {
            floor.on('up_button_pressed', () => { log.event(nameOf(floor), '👉⬆️', 'up_button_pressed') });
            floor.on('down_button_pressed', () => { log.event(nameOf(floor), '👉⬇️', 'down_button_pressed') });
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
                elevator.loadFactor() > 0.8 && log.warn(nameOf(elevator), `loadFactor reaches ${loadFactor.toFixed(2)}`);
            });

            /**
             * Variables
             */
            const currentDestinationQueue = [...elevators[0].destinationQueue];

            log.debug('consume before', 'currentFloor:', elevators[0].currentFloor(), 'lastDirection:', state.lastDirection, 'destinationQueue:', elevators[0].destinationQueue, 'events:', _.map(state.events, 1));

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
                log.info(nameOf(elevators[0]), `no new items in destination queue`);
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
            log.debug('consume after ', 'currentFloor:', elevators[0].currentFloor(), 'currentDirection:', currentDirection, 'destinationQueue:', elevators[0].destinationQueue, 'events:', _.map(state.events, 1));
        };

        const tick = _.debounce(consume, 400); // Debouncing instead of throttling to give time for lift to chill. It often needs time to stop and pick up passengers.

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}