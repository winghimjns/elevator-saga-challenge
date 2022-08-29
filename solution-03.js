{
	/**
	 * This solution works for challenges: none yet
	 */
	init (elevators, floors) {

		/**
		 * `Task` is an action required to an elevator, to move to a certain
		 * floor.
		 */
		class Task {

			/**
			 * @type {number}
			 */
			#floorNum;

			/**
			 * The direction should the elevator be when arriving the floor.
			 * @type {"up"|"down"|"irrelevant"}
			 */
			#direction;

			/**
			 * To determine if this task is for taking or dropping passengers.
			 * @type {"drop"|"take"|"both"}
			 */
			#type;


			static combineDirection (a, b) {
				if (a === "irrelevant" && a === b) { return "irrelevant"; }
				return [a, b].find(direction => direction !== "irrelevant");
			}

			constructor (floorNum, direction, type) {
				this.#floorNum = floorNum;
				this.#direction = direction;
				this.#type = type;
			}

			/**
			 * ! Assume combinable checking is done.
			 * @param task {Task} another task to combine
			 * @returns {Task|null} Returns null if it can't be combined
			 */
			combine (task) {
				const newDirection =
					Task.combineDirection(this.#direction, task.getDirection());
				const newType = this.#type === task.getType() ? this.#type :
					"both";
				return new Task(this.#floorNum, newDirection, newType);
			}

			/**
			 * Check if this task is combinable with current task.
			 * @param task {Task}
			 * @returns {boolean}
			 */
			isCombinable (task) {
				// Can't combine when floor numbers don't match
				if (this.#floorNum !== task.getFloorNum()) { return false; }
				// Can't combine when directions don't match
				if (
					(
						this.#direction === "up" &&
						task.getDirection() === "down"
					) ||
					(
						this.#direction === "down" &&
						task.getDirection() === "up"
					)
				) { return false; }
				return true;
			}

			isEqual (task) {
				return this.#floorNum === task.floorNum &&
					this.#direction === task.direction &&
					this.#type === task.type;
			}

			getFloorNum () { return this.#floorNum; }
			getDirection () { return this.#direction; }
			getType () { return this.#type; }
		}

		class State {
			/**
			 * @type {number}
			 */
			#floorNum;

			/**
			 * @type {"pass_up"|"pass_down"|"stop_up"|"stop_down"|"stop"}
			 */
			#type;

			constructor (floorNum, type) {
				this.#floorNum = floorNum;
				this.#type = type;
			}

			getFloorNum () { return this.#floorNum; }
			getType () { return this.#type; }
		}

		class Elevator {

			/**
			 * @type <_Elevator>
			 */
			#elevator;

			/**
			 * Last state that tracked
			 * @type {State}
			 */
			#state;

			/**
			 * Pending tasks.
			 * @type {Array<Task>}
			 */
			#pendingTasks = [];

			/**
			 * The on going task
			 * @type {Task}
			 */
			#onGoingTask = null;

			/**
			 * @type {"up"|"down"|"both"|"none"}
			 */
			#indicators;

			/**
			 * @type {Controller}
			 */
			#controller;

			constructor (elevator) {
				this.#elevator = elevator;
				this.setIndicators("up");
				elevator.on("idle", () => this.onIdle());
				elevator.on("floor_button_pressed", floorNum =>
					this.onFloorButtonPress(floorNum));
				elevator.on("passing_floor", (floorNum, direction) =>
					this.onPassingFloor(floorNum, direction));
				elevator.on("stopped_at_floor", floorNum =>
					this.onStopAtFloor(floorNum));
			}

			/**
			 * Return a new task by popping from `#pendingTasks`.
			 * @returns {Task}
			 */
			popNextTask () {
				const nextTask = this.seekNextTask();
				this.#pendingTasks = this.#pendingTasks.filter(task =>
					task !== nextTask);
				return nextTask;
			}

			/**
			 * Seek next task
			 * @returns {Task}
			 */
			seekNextTask () {
				// TODO : make a better decision
				return this.#pendingTasks[0];
			}

			/**
			 * Update the state with the on going task. 
			 * ! Should be run right at the moment when the on going task is 
			 * finished.
			 */
			updateStateWithOnGoingTask () {
				const onGoingTask = this.#onGoingTask;
				const type = {
					up: "stop_up",
					down: "stop_down",
					irrelevant: "stop",
				}[onGoingTask.direction()];
				this.#state = new State(onGoingTask.getFloorNum(), type);
			}

			/**
			 * Assign a task to current elevator.
			 * ! Only run this after confirming the task should assign to this
			 * elevator.
			 */
			assign (task) {
				if (
					!this.#pendingTasks.some(pendingTask =>
						pendingTask.isEqual(task))
				) {
					/**
					 * Try to combine task
					 */
					const combinableTask = this.#pendingTasks.find(
						pendingTask => pendingTask.isCombinable(task));
					if (combinableTask) {
						const index = this.#pendingTasks
							.indexOf(combinableTask);
						const newPendingTasks = [...this.#pendingTasks];
						newPendingTasks[index] = combinableTask.combine(task);
						console.log("combinable:");
						console.table(
							[combinableTask, task, newPendingTasks[index]].map(
								task => ({
									type: task.getType(),
									direction: task.getDirection(),
									floorNum: task.getFloorNum(),
								})
							));
						this.#pendingTasks = newPendingTasks;
					} else {
						this.#pendingTasks = [...this.#pendingTasks, task];
					}
				}
			}

			/**
			 * Shift task.
			 */
			shiftTask () {
				this.updateStateWithOnGoingTask();
				this.#onGoingTask = this.popNextTask();
				this.runOnGoingTask();
			}

			/**
			 * Prioritize a task to current elevator.
			 * ! Only run this after confirming the task should be prioritized
			 * to this elevator.
			 */
			prioritize (task) {
				this.#pendingTasks = [...this.#pendingTasks, this.#onGoingTask];
				this.#onGoingTask = task;
				this.runOnGoingTask();
			}

			/**
			 * Run the #onGoingTask.
			 */
			runOnGoingTask () {
				if (this.#onGoingTask instanceof Task) {
					const indicator = {
						up: "up",
						down: "down",
						irrelevant: "none",
					}[this.#onGoingTask.getDirection()];
					this.setIndicators(indicator);
					this.#elevator.destinationQueue = [
						this.#onGoingTask.getFloorNum(),
					];
					this.#elevator.checkDestinationQueue();
				}
			}

			/**
			 * Calculating the "availability point" for a coming task.
			 * @param task {Task}
			 * @returns {number}
			 */
			getAvailabilityPoint (task) {
				const floorCount = this.getFloorCount();
				const liftedWeightPower = 1;
				const onGoingTaskPower = 1;
				const pendingTasksPower = 1;
				let point = 1;

				// 1: Check lifted weight
				const maxPassengerCount = this.#elevator.maxPassengerCount();
				const loadFactor = this.#elevator.loadFactor();
				point *= 
					(1 - loadFactor) * maxPassengerCount * liftedWeightPower;

				// 2: Check on going task's direction
				const onGoingTask = this.#onGoingTask;
				if (onGoingTask instanceof Task) {
					if (
						(
							onGoingTask.getFloorNum() > task.getFloorNum() &&
							onGoingTask.getDirection() === "down" &&
							task.getDirection() === "down"
						) ||
						(
							onGoingTask.getFloorNum() < task.getFloorNum() &&
							onGoingTask.getDirection() === "up" &&
							task.getDirection() === "up"
						)
					) {
						piont *= 
							(
								floorCount / 2 - 
								Math.abs(
									onGoingTask.getFloorNum() -
									task.getFloorNum()
								)
							) * onGoingTaskPower;
					}
				}

				// 3: Pending tasks: less pending tasks, higher points
				const pendingTasks = this.#pendingTasks;
				point *= ((floorCount - Math.min(pendingTasks, floorCount)) / floorCount) * pendingTasksPower;

				return point;
			}

			onIdle () {
				// console.log("tasks: ");
				// console.table(this.#pendingTasks.map(task => ({
				// 	type: task.getType(),
				// 	direction: task.getDirection(),
				// 	floorNum: task.getFloorNum(),
				// })));
				this.shiftTask();
				/**
				 * TODO do things like:
				 * this.setIndicators("up");
				 * this.#elevator.goToFloor();
				 */
			}

			onFloorButtonPress (floorNum) {
				/**
				 * No checking needed, as this task needs to  be done by the
				 * current elevator.
				 */
				this.assign(new Task(floorNum, "irrelevant", "drop"));
			}

			onPassingFloor (floorNum, direction) {
				this.#state = new State(floorNum,
					direction === "up" ? "pass_up" : "pass_down");
			}

			onStopAtFloor (floorNum) {
				// Silence is golden
			}

			/**
			 * To check if another tasks can be prioritizable and interupt the
			 * current running task.
			 * @param task {Task}
			 * @returns {boolean}
			 */
			isPrioritizable (task) {
				// TODO
			}

			getInstance () { return this.#elevator; }
			getPendingTasks () { return [...this.#pendingTasks]; }
			getState () { return this.#state; }

			/**
			 * @param indicator {"up"|"down"|"both"|"none"}
			 */
			setIndicators (indicators) {
				this.#indicators = indicators;
				this.#elevator.goingUpIndicator(
					["up", "both"].includes(indicators));
				this.#elevator.goingDownIndicator(
					["down", "both"].includes(indicators));
			}

			setController (controller) { this.#controller = controller; }
		}

		class ElevatorGroup {
			#elevators;
			#controller;

			constructor (elevators) {
				this.#elevators = elevators;
			}

			/**
			 * As sometimes passengers may keep pressing the buttons to call
			 * elevators, even an elevator is already on it. So should check if
			 * the task is already being handled by any elevator here.
			 * @param task {Task}
			 * @returns {boolean}
			 */
			isTaskHandled (task) {
				return this.#elevators.some(elevator =>
					elevator.getPendingTasks().some(handlingTask =>
						handlingTask.isEqual(task)));
			}

			findAndAssign (task) {
				const [elevator] = [...this.#elevators]
					.sort((a, b) =>
						a.getAvailabilityPoint() - b.getAvailabilityPoint());
				elevator.assign(task);
			}

			setController (controller) {
				this.#controller = controller;
				this.#elevators.forEach(elevator =>
					elevator.setController(controller));
			}
		}

		class Floor {
			#floor;
			#floorNum;
			#controller;

			constructor (floor, floorNum) {
				this.#floor = floor;
				this.#floorNum = floorNum;
			}

			getInstance () { return this.#floor; }
			getFloorNum () { return this.#floorNum; }
			setController (controller) { this.#controller = controller; }
		}

		class FloorGroup {
			#floors;
			#controller;

			constructor (floors) {
				this.#floors = floors;
				floors.forEach(floor => {
					const _floor = floor.getInstance();
					const floorNum = _floor.floorNum();
					_floor.on("up_button_pressed", () =>
						this.onUpButtonPress(floor, floorNum));
					_floor.on("down_button_pressed", () =>
						this.onDownButtonPress(floor, floorNum));
				});
			}

			onUpButtonPress (floor, floorNum) {
				this.#controller.onSharableTask(
					new Task(floorNum, "up", "take"));
			}

			onDownButtonPress (floor, floorNum) {
				this.#controller.onSharableTask(
					new Task(floorNum, "down", "take"));
			}

			setController (controller) {
				this.#controller = controller;
				this.#floors.forEach(floor => floor.setController(controller));
			}

			getFloorCount () { return this.#floors.length; }
		}

		class Controller {
			#elevatorGroup;
			#floorGroup;

			constructor (elevatorGroup, floorGroup) {
				this.#elevatorGroup = elevatorGroup;
				this.#floorGroup = floorGroup;
				elevatorGroup.setController(this);
				floorGroup.setController(this);
			}

			/**
			 * When a new created task is sharable (doesn't require to be done
			 * by a particular elevator) created.
			 * @param task {Task}
			 */
			onSharableTask (task) {
				if (!this.#elevatorGroup.isTaskHandled(task)) {
					this.#elevatorGroup.findAndAssign(task);
				}
			}

			getFloorCount () {
				return this.#floorGroup.getFloorCount();
			}
		}

		const elevatorGroup = new ElevatorGroup(elevators.map(elevator =>
			new Elevator(elevator)));
		const floorGroup = new FloorGroup(floors.map((floor, floorNum) =>
			new Floor(floor, floorNum)));

		new Controller(elevatorGroup, floorGroup);
	},
	update (dt, elevators, floors) {
		// Silence is golden
	},
}
