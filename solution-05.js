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
                // 'info',
                'warn',
                'error',
                'event',
                // 'tick',
            ],
            debug () { this.levels.includes('debug') && console.debug.call(console, '%[DEBUG]', 'color: #929292', logTime(), ...arguments) },
            info () { this.levels.includes('info') && console.info.call(console, '%c[INFO] ', 'color: #6a8dc9;', logTime(), ...arguments) },
            warn () { this.levels.includes('warn') && console.warn.call(console, '%c[WARN] ', 'color: #ff0;', logTime(), ...arguments) },
            error () { this.levels.includes('error') && console.error.call(console, '[ERROR]', logTime(), ...arguments) },
            event () { this.levels.includes('event') && console.info.call(console, '%c[EVENT]', 'color: rgb(230, 182, 116);', logTime(), ...arguments) },
            tick () { this.levels.includes('tick') && console.info.call(console, '%c[TICK] ', 'color: #162f16;', logTime(), ...arguments) },
        };

        /**
         * Event logs
         */
        elevators.forEach((elevator, index) => {
            const elevatorName = `🛗${index}`;
            elevator.on('idle', () => { log.event(elevatorName, 'idle') });
            elevator.on('floor_button_pressed', (floorNum) => { log.event(elevatorName, `👉${floorNum}`, 'floor_button_pressed') });
            elevator.on('passing_floor', (floorNum, direction) => { log.event(elevatorName, `${direction === 'up' ? '⤴️' : '⤵️'}${floorNum}`, 'passing_floor') });
            elevator.on('stopped_at_floor', (floorNum) => { log.event(elevatorName, `↔️${floorNum}`, 'stopped_at_floor') });
        });
        floors.forEach((floor, index) => {
            const floorName = `🏢${index}`;
            floor.on('up_button_pressed', () => { log.event(floorName, '👉⬆️', 'up_button_pressed') });
            floor.on('down_button_pressed', () => { log.event(floorName, '👉⬇️', 'down_button_pressed') });
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
            if (state.events.length === 0) { return; }

            /**
             * Tick logs
             */
            log.tick('loadFactor', elevators.map((elevator) => elevator.loadFactor()));

            /**
             * Variables
             */
            const currentDestinationQueue = [...elevators[0].destinationQueue];
            const stopLoading = elevators.every((elevator) => elevator.loadFactor() >= 0.7);

            log.debug('consume before', 'currentFloor:', elevators[0].currentFloor(), 'lastDirection:', state.lastDirection, 'destinationQueue:', elevators[0].destinationQueue, 'events:', _.map(state.events, 1));

            /**
             * Actual logic
             */
            while (state.events.length > 0) {
                const event = state.events.shift();
                const [eventName, floorNum] = event;

                if (['floor_button_pressed', 'up_button_pressed', 'down_button_pressed'].includes(eventName) && !currentDestinationQueue.includes(floorNum)) {
                    currentDestinationQueue.push(floorNum);
                }
            }

            const [nextFloor, ...restFloors] = currentDestinationQueue;
            const currentFloor = elevators[0].currentFloor();
            const currentDirection = nextFloor === currentFloor ? state.lastDirection : (nextFloor > currentFloor ? 'up' : 'down');
            state.lastDirection = currentDirection;
            const destinationFloor = currentDirection === 'up' ? Math.max(...restFloors) : Math.min(...restFloors);

            if (nextFloor === undefined) { return; }

            const towardsFloors = restFloors.filter((floorNum) => {
                return (floorNum >= nextFloor && floorNum <= destinationFloor) || (floorNum <= nextFloor && floorNum >= destinationFloor);
            }).sort();
            const behindFloors = restFloors.filter((floorNum) => !towardsFloors.includes(floorNum)).sort();

            if (currentDirection === 'up') {
                elevators[0].destinationQueue = [nextFloor, ...towardsFloors, ...behindFloors.reverse()];
            } else {
                elevators[0].destinationQueue = [nextFloor, ...towardsFloors.reverse(), ...behindFloors];
            }

            elevators[0].checkDestinationQueue();
            log.debug('consume after ', 'currentFloor:', elevators[0].currentFloor(), 'currentDirection:', currentDirection, 'destinationQueue:', elevators[0].destinationQueue, 'events:', _.map(state.events, 1));
        };

        const tick = _.debounce(consume, 400); // Debouncing instead of throttling to give time for lift to chill. It often needs time to stop and pick up passengers.

    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}