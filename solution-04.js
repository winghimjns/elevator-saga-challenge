window.elevatorSagaConfig = {
    config: {
        MAX_FACTOR: .8,
        ON_SCREEN_DEBUGGER: true,
    },
    load: function(elevators, floors) {

        /**
         * Global variables
         */
        const eventQueue = [];

        /**
         * Wrapper classes
         */
        const InternalFloor = class {
            isOn = false;

            static activate(elevator) {
                const internalFloor = new InternalFloor(elevator);
                internalFloor.on();
                return internalFloor;
            }

            constructor(floor) { this.floor = floor; }
            
            on() {
                if (this.isOn) { return; }
                this.isOn = true;
                this.floor.on('up_button_pressed', () => { eventQueue.push(new FloorUpButtonPressedEvent(this.floor.floorNum())); });
                this.floor.on('down_button_pressed', () => { eventQueue.push(new FloorDownButtonPressedEvent(this.floor.floorNum())); });
            }
        }
        const InternalElevator = class {

            isOn = false;

            actionQueue = [];

            static activate(elevator) {
                const internalElevator = new InternalElevator(elevator);
                internalElevator.on();
                return internalElevator;
            }

            constructor(elevator) {
                this.elevator = elevator;
            }

            on() {
                if (this.isOn) { return; }
                this.isOn = true;
                this.elevator.on('floor_button_pressed', (floorNum) => { eventQueue.push(new ElevatorFloorButtonPressedEvent(floorNum)); });
                // this.elevator.on('passing_floor', (floorNum, direction) => { eventQueue.push(new ElevatorPassingFloorEvent(floorNum, direction)); });
                // this.elevator.on('stopped_at_floor', (floorNum) => { eventQueue.push(new ElevatorStoppedAtFloorEvent(floorNum)); });
                // this.tick();
            }

            /**
             * On top of `checkDestinationQueue`
             */
            checkActionQueue() {
                // TODO: some process to override the destination queue
                // Currently, it just simply go first in first serve strategy

                const action = this.actionQueue.shift();

                if (action) {
                    const newFloorNum = action.floor.floorNum();
                    this.elevator.goToFloor(newFloorNum);
                }
            }

            /**
             * @param action 
             * @returns {number} priority factor (0-1)
             * TODO: check which floor it's at and direction so it can potentially pick up more
             * people along the way
             */
            actionAbility(action) {
                const loadFactor = this.elevator.loadFactor()
                if (loadFactor >= MAX_FACTOR) { return 0; }
                return 1 - loadFactor;
            }

            assignAction(action) {
                // TODO: better solution
                this.actionQueue.push(action);
            }

            tick() {
                this.checkActionQueue();
            }
        }

        /**
         * Events
         */
        const SystemEvent = class {
            constructor(floorNum) {
                this.floor = floors[floorNum];
                this.name = _.kebabCase(this.constructor.name);
                console.log('SystemEvent:', this.name, 'at floor', floorNum);
            }
            getAction = () => new ElevatorAction(this.floor, this);
        }
        const ElevatorEvent = class extends SystemEvent {}
        const ElevatorFloorButtonPressedEvent = class extends ElevatorEvent {}
        const ElevatorPassingFloorEvent = class extends ElevatorEvent {
            constructor(floorNum, direction) { super(floorNum); this.direction = direction; }
        }
        const ElevatorStoppedAtFloorEvent = class extends ElevatorEvent {}
        const FloorEvent = class extends SystemEvent {}
        const FloorUpButtonPressedEvent = class extends FloorEvent {}
        const FloorDownButtonPressedEvent = class extends FloorEvent {}

        /**
         * Action
         */
        const ElevatorAction = class {
            constructor(floor, systemEvent) {
                this.floor = floor;
                this.systemEvent = systemEvent;
                this.requiredDirection = null;
                if (systemEvent instanceof FloorUpButtonPressedEvent) { this.requiredDirection = 'up'; }
                if (systemEvent instanceof FloorDownButtonPressedEvent) { this.requiredDirection = 'down'; }
            }
        }

        const internalElevators = elevators.map((elevator) => InternalElevator.activate(elevator));
        const internalFloors = floors.map((floor) => InternalFloor.activate(floor));

        this.tick = () => {
            eventQueue.length > 0 && console.log('eventQueue', eventQueue.length, eventQueue.map(e => e.floor.floorNum()));
            internalElevators[0].actionQueue.length > 0 && console.log('internalElevators[0].actionQueue', internalElevators[0].actionQueue.length, internalElevators[0].actionQueue.map(e => e.floor.floorNum()));
            if (eventQueue.length > 0) {
                let nextEvent = null;
                while(nextEvent = eventQueue.shift()) {
                    switch(nextEvent.constructor) {
                        case ElevatorFloorButtonPressedEvent:
                        case FloorUpButtonPressedEvent:
                        case FloorDownButtonPressedEvent:
                            const bestInternalElevator = internalElevators[0]; // TODO: find the best elevator
                            bestInternalElevator.assignAction(nextEvent.getAction());
                            break;
                        case ElevatorStoppedAtFloorEvent:
                        case ElevatorPassingFloorEvent:
                            break;
                        default:
                            console.warn('Unknown event type:', nextEvent);
                            continue;
                    }

                }
            }

            internalElevators.forEach((internalElevator) => {
                internalElevator.tick();
            });
        };

        function floorDebugger(index, $floor) {
            const id = `floor-debugger-${index}`;
            const $floorDebugger = $(document.querySelector(`#${id}`).get(0) ?? $(document.createElement('div')).attr('id', id).appendTo(document.body));
            return $parent.find(`[${attr}]`) ?? $(document.createElement('div')).attr(attr, '1').appendTo($parent);
        }

        this.refreshOnScreenDebugger = () => {
            console.log('this.config', this.config, $('.world .innerworld .floor'));
            if (!this.config.ON_SCREEN_DEBUGGER) { return; }

            $('.world .innerworld .floor').each((index, floor) => {
                // console.log('yeogi')
                const $floor = $(floor);
                // const $debugger = $floor.find('[data-debug]') ?? $(document.createElement('div')).data('debug', '1').appendTo($floor);
                const $debugger = $floorDebugger(index, $floor);
            });
        };
    },
    init: function(elevators, floors) {
        this.load(elevators, floors);
    },
    update: function(dt, elevators, floors) {
        this.tick?.();
        this.refreshOnScreenDebugger?.();
    }
}
