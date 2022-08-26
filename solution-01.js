/**
 * This solution works for challenge: 01, 02, 03
 * Refined for only 1 elevator
 */
 {
	init (elevators, floors) {

        /**
         * The limit of the elevator will still taking new passengers.
         */
        const LOAD_FACTOR = .8;

		const elevator = elevators[0];

        function queueFloor (elevator, floorNum) {
            if (elevator.destinationQueue.indexOf(floorNum) !== 0) {
                elevator.goToFloor(floorNum);
            }
        }

		elevator.on("idle", () => {
            // Go to the middle of all the floors
            elevator.goToFloor(floors.length >> 1);
        });

		elevator.on("floor_button_pressed", floorNum => {
            queueFloor(elevator, floorNum);
        });

        floors.forEach((floor, index) => {
            function onButtonPressEventListener () {
                if (elevator.loadFactor() < LOAD_FACTOR) { queueFloor(elevator, index); }
            }

            floor.on("up_button_pressed", onButtonPressEventListener);
            floor.on("down_button_pressed", onButtonPressEventListener);
        });
	},
    update (dt, elevators, floors) {
        // Silence is golden
	},
}
