if (!localStorage.todolist) { // set a default if necessary
    localStorage.todolist = "{}";
}


class Task { // a Task that contains a Weight, a State, and 0 or more subtasks
    // a Task's total weight is equal to weight + the weight of every subtask
    // a task is complete if it has the complete flag and every subtask has the complete flag
    constructor(nameText, data, weight) {
        this.parent = undefined;
        this.name = name;
        this.dataEl = $_("textarea", { class: "editor" }, data);
        this.data = $e(this.dataEl, () => {
            this.notifyChange();
        });
        this.weight = weight;
        this.isComplete = false;
        this.subtasks = [];
        var me = this;
        var name = $i($k($t($_("div", { class: "name" }, nameText)), () => {
            me.name.data = me.name.data.replace("\n", "");
            me.dataEl.focus();
        }), () => {
            $("content").innerHTML = ""; // clear it
            $("content").appendChild(me.dataEl);
        });
        this.name = $e(name, () => {
            this.notifyChange();
        });
        this.element = $_("div", { class: "task" }, name);
        $h(this.element, () => {
            $show($("floatingbar"));
            var rect = this.element.getBoundingClientRect();
            $("floatingbar").style.top = rect.top + "px";
            $("floatingbar").style.left = rect.right + "px";
            hoverOwner = this;
        });
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
        this.parent = parent;
    }

    isFocus() { // NOTE: isFocus may return `this` erroneously; you MUST always check the children first! This is because of how it tracks hovering.
        return this.element == document.activeElement || this.element.matches(":hover");
    }

    pack() { // generate a simplified Task representational object that can be rendered to JSON
        var ret = {
            name: this.name.data,
            content: this.data.data,
            complete: this.isComplete,
            weight: this.weight,
            tasks: []
        };
        this.subtasks.forEach(task => {
            ret.tasks.push(task.pack());
        });
        return ret;
    }

    static unpack(data) {
        var ret = new Task(data.name, data.content, data.weight);
        ret.complete = data.complete;
        data.tasks.forEach(taskSkeleton => {
            var task = Task.unpack(taskSkeleton);
            task.attach(ret);
        });
        return ret;
    }

    findFocus() {
        for (var i = 0; i < this.subtasks.length; i++) {
            var f = this.subtasks[i].findFocus();
            if (f) {
                return f;
            }
        }
        if (this.isFocus()) {
            return this;
        }
    }

    remove(thing) {
        for (var i = 0; i < this.subtasks.length; i++) {
            if (this.subtasks[i] == thing) {
                this.subtasks[i].removing();
                this.subtasks.splice(i, 1);
            }
        }
        this.parent.notifyChange();
        if (this.subtasks.length == 0) {
            this.stub = true;
            $r($("input", this.element));
            $r($("label", this.element));
        }
    }

    removing() {
        this.element.parentNode.removeChild(this.element);
        if (hoverOwner == this) {
            hoverOwner = undefined;
            $hide($("floatingbar"));
        }
        $r(this.dataEl);
    }
}


class Set {
    constructor(name, cbk) {
        this.name = name;
        this.tasks = [];
        this.element = $_("div", { class: "set" });
        this.onchange = cbk;
    }

    static unpack(data) { // load (parsed) Set JSON to create a Set
        var ret = new Set(data.name);
        data.tasks.forEach(taskSkeleton => {
            var task = Task.unpack(taskSkeleton);
            task.attach(ret);
        });
        return ret;
    }

    pack() { // generate Set JSON
        var ret = {
            name: this.name,
            tasks: []
        };
        this.tasks.forEach(task => {
            ret.tasks.push(task.pack());
        });
        return ret;
    }

    attach(element) { // attach this Set to the DOM
        $a(element, this.element);
        $h(element, () => {
            $show($("floatingbar"));
            var rect = this.element.getBoundingClientRect();
            $("floatingbar").style.top = rect.top + "px";
            $("floatingbar").style.left = rect.right + "px";
            hoverOwner = this;
        });
    }

    getContainer() {
        return this.element;
    }

    acceptChild(child) {
        this.tasks.push(child);
        this.notifyChange();
    }

    notifyChange() {
        if (this.onchange) {
            this.onchange();
        }
    }

    findFocus() {
        for (var i = 0; i < this.tasks.length; i++) {
            var f = this.tasks[i].findFocus();
            if (f) {
                return f;
            }
        }
    }

    remove(thing) {
        for (var i = 0; i < this.tasks.length; i++) {
            if (this.tasks[i] == thing) {
                this.tasks[i].removing();
                this.tasks.splice(i, 1);
            }
        }
        this.notifyChange();
    }
}

var todolist = JSON.parse(localStorage.todolist);
var hoverOwner = undefined;
function commit() {
    localStorage.todolist = JSON.stringify(todolist);
}
var root = undefined;
function openSet(set) {
    root = Set.unpack(todolist[set]);
    root.onchange = () => { todolist[root.name] = root.pack(); commit(); };
    root.attach($("navInside"));
}
openSet("my shit");

function addThing(at) {
    if (at == undefined) {
        at = hoverOwner;
    }
    if (at == undefined) {
        at = root;
    }
    var thing = new Task("Untitled", "", 1);
    thing.attach(at);
}

function delThing(at) {
    if (at == undefined) {
        at = hoverOwner;
    }
    if (at == root) {
        return; // we will never delete root!
    }
    at.parent.remove(at);
}