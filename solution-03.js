{
    /**
     * This solution works for challenges: 04
     */
	init (elevators, floors) {

        /**
         * Variables for logging.
         */
        const LOGGINGS = {
            BUTTON_STATUS: true,
        };

        /**
         * The limit of the elevator will still taking new passengers.
         */
        const LOAD_FACTOR_REF = .7;

        /**
         * To store the button pressed status in a encapsulated variable and
         * share it with functions.
         */
        const {getButtonPressed, setButtonPressed} = (function () {
            const upPressed = floors.map(() => false);
            const downPressed = floors.map(() => false);

            return {
                getButtonPressed (floorNum, direction) {
                    if (direction === "up") { return upPressed[floorNum]; }
                    if (direction === "down") { return downPressed[floorNum]; }
                },
                setButtonPressed (floorNum, direction, value) => {
                    if (direction === "up") {
                        upPressed[floorNum] = !!value;
                    } else if (direction === "down") {
                        downPressed[floorNum] = !!value;
                    }
                    if (BUTTON_STATUS) {
                        console.table(upPressed.map((up, index) => ({
                            up, down: downPressed[index],
                        })));
                    }
                },
            };
        });

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
         * Queue a floor when the elevator is on the way going up / down.
         * @return {boolean} `true` if the floor is successfully queued
         */
        function onTheWayToFloor (elevator, floorNum) {
            // ! TODO
        }

        /**
         * Remove the first item in the elevator's queue whatever it is.
         */
        function removeFirst (elevator) {
            elevator.destinationQueue.shift();
            elevator.checkDestinationQueue();
        }

        /**
         * Set indicator to be either up or down.
         */
        function setIndicator (elevator, direction) {
            elevator.goingUpIndicator(direction === "up");
            elevator.goingDownIndicator(direction === "down");
        }

        /**
         * Rearrange the queue so the elevator won't go back and forth. but 
         * only "up to top, then down to bottom" or another way round
         */
        function rearrangeQueue (elevator) {
            if ([0, 1, 2].includes(elevator.destinationQueue.length)) { return; }
            const currentFloor = elevator.currentFloor();
            const queue = [...elevator.destinationQueue];
            const max = Math.max(...queue);
            const min = Math.min(...queue);
            const maxIndex = queue.indexOf(max);
            const minIndex = queue.indexOF(min);
            if (min > currentFloor) {
                // Simply sort all floors in the queue, ascending order.
                elevator.destinationQueue = queue.sort((a, b) => a - b);
            } else if (max < currentFloor) {
                // Simply sort all floors in the queue, descending order.
                elevator.destinationQueue = queue.sort((a, b) => b - a);
            } else {

                const ups = queue.reduce((acc, floorNum) => {
                    if (floorNum > currentFloor) { acc.push(floorNum); }
                    return acc;
                }, []).sort((a, b) => a - b);
                const downs = queue.reduce((acc, floorNum) => {
                    if (floorNum < currentFloor) { acc.push(floorNum); }
                    return acc;
                }, []).sort((a, b) => b - a);

                if (maxIndex < minIndex) {
                    elevator.destinationQueue = [...ups, ...downs];
                } else {
                    elevator.destinationQueue = [...downs, ...ups];
                }
            }
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

            elevator.on("stopped_at_floor", floorNum => {

                // Update indicator
                const [nextFloor] = elevator.destinationQueue;
                if (typeof nextFloor === "number") {
                    if (nextFloor > floorNum) {
                        setIndicator(elevator, "up");
                    } else if (nextFloor < floorNum) {
                        setIndicator(elevator, "down");
                    }
                }

                rearrangeQueue(elevator);
            });
        });

        floors.forEach((floor, floorNum) => {
            const getOnButtonPressEventListener = direction => () => {
                setButtonPressed(floorNum, direction, true);
            };

            floor.on("up_button_pressed", getOnButtonPressEventListener("up"));
            floor.on("down_button_pressed", getOnButtonPressEventListener("down"));
        });
	},
    update (dt, elevators, floors) {
        // Silence is golden
	},
}
