if (!localStorage.list) { // set a default if necessary
    localStorage.list = `[]`;
}


class Task { // a Task that contains a Weight, a State, and 0 or more subtasks
    // a Task's total weight is equal to weight + the weight of every subtask
    // a task is complete if it has the complete flag and every subtask has the complete flag
    constructor(nameText, data, weight) {
        this.parent = undefined;
        this.name = name;
        this.data = data;
        this.weight = weight;
        this.isComplete = false;
        this.subtasks = [];
        var me = this;
        var name = $k($t($_("div", { class: "name" }, nameText)), () => {
            me.name.data = me.name.data.replace("\n", "");
        });
        this.name = $e(name);
        this.element = $_("div", { class: "task" }, name);
        this.stub = true;
    }

    complete() { 
        if (!this.isComplete) {
            return false;
        }
        for (var i = 0; i < this.subtasks.length; i++) {
            if (!this.subtasks[i].complete()) {
                return false;
            }
        }
        return true;
    }

    getContainer() {
        return this.element;
    }

    notifyChange() { // called by children to notify the parent that a change occurred on the tree, affecting every node above it
        if (this.parent) {
            this.parent.notifyChange();
        }
    }

    acceptChild(child) {
        if (this.stub) {
            var inp = $id($_("input", { type: "checkbox", class: "taskExpander" }));
            this.element.$a(
                inp,
                $k($t($_("label", { class: "taskExpandButton", "for": inp.id })), function (){
                    $(this.htmlFor).checked = !$(this.htmlFor).checked;
                })
            );
        }
        this.stub = false;
        this.subtasks.push(child);
        if (this.parent) {
            this.parent.notifyChange();
        }
    }

    attach(parent) { // attach to a task or task-like (Set)
        // required instance methods for parent: acceptChild, getContainer, notifyChange
        parent.acceptChild(this);
        parent.getContainer().$a(this.element);
    }
}


class Set {
    constructor(name) {
        this.name = name;
        this.tasks = [];
        this.element = $_("div", {class: "set"});
    }

    static unpack(data) { // load (parsed) Set JSON to create a Set

    }

    pack() { // generate Set JSON

    }

    attach(element) { // attach this Set to the DOM
        $a(element, this.element);
    }

    getContainer() {
        return this.element;
    }

    acceptChild(child) {
        this.tasks.push(child);
    }

    notifyChange() {

    }
}

var testSet = new Set("my shit");
testSet.attach($("navInside"));
var testTask = new Task("shit part 1", "shit content", 1);
testTask.attach(testSet);
var testTask2 = new Task("shit nested", "shit nested content", 1);
testTask2.attach(testTask);