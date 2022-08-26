{
    /**
     * This solution works for challenges: 04
     */
	init (elevators, floors) {

        /**
         * The limit of the elevator will still taking new passengers.
         */
        const LOAD_FACTOR_REF = .7;

        /**
         * Trying not to queue a floor to an elevator if the number of queued
         * floors exceed this number.
         */
        const QUEUE_REF = floors.length >> 1;

        /**
         * Array showing what floors are having the up button pressed and not
         * responded.
         * @type {boolean[]}
         */
        const upPressed = floors.map(() => false);

        /**
         * Array showing what floors are having the down button pressed and not
         * responded.
         * @type {boolean[]}
         */
        const downPressed = floors.map(() => false);

        /**
         * Queue a floor in elevator, but don't if that floor already exists in
         * the queue.
         */
         function queueFloor (elevator, floorNum) {
            if (elevator.destinationQueue.indexOf(floorNum) !== 0) {
                elevator.goToFloor(floorNum);
            }
        }

        /**
         * Prioritize a floor to an elevator, to go first.
         */
        function prioritizeFloor (elevator, floorNum) {
            const passingfloorIndex = elevator.destinationQueue.indexOf(floorNum);
            if (passingfloorIndex !== -1) { elevator.destinationQueue.splice(passingfloorIndex, 1); }
            elevator.destinationQueue.unshift(floorNum);
            elevator.checkDestinationQueue();
        }

        /**
         * Remove the first item in the elevator's queue whatever it is.
         */
        function removeFirst (elevator) {
            elevator.destinationQueue.shift();
            elevator.checkDestinationQueue();
        }
        
        /**
         * Compare 2 elevators and decide which one should go to take the 
         * passenger first.
         */
        const compareElevator = floorNum => (a, b) => {
            // Check loading
            if (a.loadFactor() > LOAD_FACTOR_REF && b.loadFactor() < LOAD_FACTOR_REF) { return 1; }
            if (b.loadFactor() > LOAD_FACTOR_REF && a.loadFactor() < LOAD_FACTOR_REF) { return -1; }
            const aRemain = (a.loadFactor() / a.maxPassengerCount());
            const bRemain = (b.loadFactor() / b.maxPassengerCount());
            const remainPoints = aRemain > bRemain ? 1 : -1;
            
            // Check if these elevators' already having it in their queue
            const aQueuePosition = a.destinationQueue.indexOf(floorNum);
            const bQueuePosition = a.destinationQueue.indexOf(floorNum);
            const queuePositionPoints = aRemain > bRemain ? 1 : -1;

            return remainPoints + queuePositionPoints;
        };

        elevators.forEach(elevator => {

            elevator.on("idle", () => {
                // Go to the middle of all the floors
                elevator.goToFloor(0);
            });

            elevator.on("floor_button_pressed", floorNum => {
                queueFloor(elevator, floorNum);
            });

            elevator.on("passing_floor", function(floorNum, direction) {
                /**
                 * Stop if one of the conditions hit:
                 *   1. some passengers may want to get off
                 *   2. the floor's up button is pressed and not responded
                 *   3. the floor's down button is pressed and not responded
                 */
                if (
                    elevator.getPressedFloors().includes(floorNum) ||
                    (
                        (
                            (upPressed[floorNum] && direction === "up") ||
                            (downPressed[floorNum] && direction === "down")
                        ) &&
                        elevator.loadFactor() < LOAD_FACTOR_REF
                    )
                ) {
                    prioritizeFloor(elevator, floorNum);
                }
            });

            elevator.on("stopped_at_floor", floorNum => {
                const [nextFloorNum] = elevator.destinationQueue;
                
                if (typeof nextFloorNum === "undefined") {
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(true);
                } else if (floorNum === 0 || elevator.destinationQueue[0] > floorNum) {
                    upPressed[floorNum] = false;
                    elevator.goingUpIndicator(true);
                    elevator.goingDownIndicator(false);
                } else if (floorNum === floors.length - 1 || elevator.destinationQueue[0] < floorNum) {
                    downPressed[floorNum] = false;
                    elevator.goingUpIndicator(false);
                    elevator.goingDownIndicator(true);
                }
            });
        });

        floors.forEach((floor, floorNum) => {

            const compare = compareElevator(floorNum);

            const getOnButtonPressEventListener = direction => () => {
                if (direction === "up") { upPressed[floorNum] = true; }
                if (direction === "down") { downPressed[floorNum] = true; }
                const sortedElevator = [...elevators].sort(compare);
                const [elevator] = sortedElevator;
                queueFloor(elevator, floorNum);
            }

            floor.on("up_button_pressed", getOnButtonPressEventListener("up"));
            floor.on("down_button_pressed", getOnButtonPressEventListener("down"));
        });
	},
    update (dt, elevators, floors) {
        // Silence is golden
	},
}
