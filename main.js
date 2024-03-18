if (!localStorage.todolist) { // set a default if necessary
    localStorage.todolist = "{}";
}

var completionFracMode = false;


function formatCompletion(cmp) {
    if (completionFracMode) {
        return cmp[0] + '/' + cmp[1];
    }
    else {
        return Math.round(cmp[0] / cmp[1] * 100) + "%";
    }
}


function needsATrim(data) {
    var nDex = data.indexOf("\n");
    if (nDex != -1 && nDex != data.length - 1) {
        return true;
    }
}


class Task { // a Task that contains a Weight, a State, and 0 or more subtasks
    // a Task's total weight is equal to weight + the weight of every subtask
    // a task is complete if it has the complete flag and every subtask has the complete flag
    constructor(nameText, data, weight, complete) {
        this.weight = weight;
        this.isComplete = complete;
        this.parent = undefined;
        this.dataEl = $_("textarea", { class: "editor" }, data);
        this.completionEl = $_("span", { class: "completionValue" });
        this.subtasks = [];
        var name = $i($t($_("div", { class: "name" }, nameText)), () => {
            me.name.data = me.name.data.replace("\n", "").trim();
            $("content").innerHTML = ""; // clear it
            $("content").appendChild(me.dataEl);
            $show($("completion"));
            $("weight").value = me.weight;
            $("complete").checked = me.isComplete;
            $i($("complete"), () => {
                if (editorOwner == this) {
                    me.isComplete = $("complete").checked;
                    me.notifyChange();
                }
            });
            $e($("weight"), () => {
                if (editorOwner == this) {
                    me.weight = $("weight").value - 0;
                    me.notifyChange();
                }
            });
            if (editorOwner) {
                editorOwner.element.classList.remove("active");
            }
            this.element.classList.add("active");
            me.dataEl.focus();
            editorOwner = this;
        });
        this.element = $_("div", { class: "task" }, name, this.completionEl);
        $h(this.element, () => {
            $show($("floatingbar"));
            var rect = this.element.getBoundingClientRect();
            $("floatingbar").style.top = rect.top + "px";
            $("floatingbar").style.left = rect.right + "px";
            hoverOwner = this;
        });
        var me = this;
        this.name = $e(name, () => {
            me.notifyChange();
        });
        this.data = $e(this.dataEl, () => {
            me.notifyChange();
        });
        this.stub = true;
        this.renderCompletion();
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

    completion() {
        var ret = [0, this.weight];
        if (this.isComplete) {
            ret[0] += this.weight;
        }
        for (var i = 0; i < this.subtasks.length; i++) {
            var v = this.subtasks[i].completion();
            ret[0] += v[0];
            ret[1] += v[1];
        }
        return ret;
    }

    getContainer() {
        return this.element;
    }

    renderCompletion() {
        var cmp = this.completion();
        this.element.style.setProperty("--completion", cmp[0] / cmp[1] * 100 + "%");
        this.completionEl.innerText = formatCompletion(cmp);
    }

    notifyChange() { // called by children to notify the parent that a change occurred on the tree, affecting every node above it
        this.renderCompletion();
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
        this.notifyChange();
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
        var ret = new Task(data.name, data.content, data.weight, data.complete);
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
        this.notifyChange();
        if (this.subtasks.length == 0) {
            this.stub = true;
            $r($("input", this.element));
            $r($("label", this.element));
        }
    }

    removing() {
        for (var i = 0; i < this.subtasks.length; i++) {
            this.subtasks[i].removing();
        }
        $r(this.element);
        if (hoverOwner == this) {
            hoverOwner = undefined;
            $hide($("floatingbar"));
        }
        $hide($("completion"));
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
        $t($h(this.element, () => {
            $show($("floatingbar"));
            var rect = this.element.getBoundingClientRect();
            $("floatingbar").style.top = rect.top + "px";
            $("floatingbar").style.left = rect.right + "px";
            hoverOwner = this;
        }));
    }

    getContainer() {
        return this.element;
    }

    acceptChild(child) {
        this.tasks.push(child);
        this.notifyChange();
    }

    completion() {
        var ret = [0, 0];
        for (var i = 0; i < this.tasks.length; i++) {
            var v = this.tasks[i].completion();
            ret[0] += v[0];
            ret[1] += v[1];
        }
        return ret;
    }

    notifyChange() {
        if (this.onchange) {
            this.onchange();
        }
        var cmp = this.completion();
        $("#nav > span").style.setProperty("--completion", cmp[0] / cmp[1] * 100 + "%");
        $("globalCompletion").innerText = formatCompletion(cmp);
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
var editorOwner = undefined;
function commit() {
    localStorage.todolist = JSON.stringify(todolist);
}
var root = undefined;
var currentSet = undefined; // NOT THE SAME THING AS root!
function openSet(set) {
    root = Set.unpack(todolist[set]);
    currentSet = todolist[set];
    root.onchange = () => { todolist[root.name] = root.pack(); commit(); };
    $("navInside").innerHTML = "";
    root.attach($("navInside"));
    $("setName").innerText = set;
}

function addThing(at) {
    if (at == undefined) {
        at = hoverOwner;
    }
    if (at == undefined) {
        at = root;
    }
    var thing = new Task("Untitled", "", 1, false);
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

var setSelectCurrent = undefined;

function genSetSelectMenu() {
    var ret = $_("div", { class: "setSelect" });
    Object.keys(todolist).forEach(key => {
        var set = todolist[key];
        ret.$a(
            $h($t($E($i($_("div", {}, key), () => {
                openSet(set.name);
            }), (el) => {
                if (needsATrim(el.$v())) {
                    el.$v(el.$v().replace("\n", "").trim());
                }
                delete todolist[set.name];
                todolist[el.$v()] = set;
                set.name = el.$v(); // name change alert!
                if (todolist[set.name] == currentSet) {
                    openSet(set.name);
                }
                commit();
            })), () => {
                setSelectCurrent = set;
            }, () => {
                setSelectCurrent = undefined;
            })
        );
    });
    ret.$a(
        $t($i($_("div", {}, $_("img", { "src": "res/add.svg" })), () => {
            todolist["Untitled Set"] = {
                name: "Untitled Set",
                tasks: []
            };
            setSelectMenu = genSetSelectMenu();
            $("content").innerHTML = "";
            $("content").appendChild(setSelectMenu);
        }))
    );
    return ret;
}

var setSelectMenu = genSetSelectMenu();
$("content").appendChild(setSelectMenu);

$t($i($("#nav > span"), () => {
    $("content").innerHTML = "";
    $("content").appendChild(setSelectMenu);
}));

function classism(el) { // manage CSS classes on document.body with a <select> element
    var selectOptions = [];
    for (var i = 0; i < el.children.length; i++) {
        selectOptions.push(el.children[i].value);
    }
    el.onchange = () => {
        selectOptions.forEach(option => {
            document.body.classList.remove(el.id + "-" + option);
        });
        document.body.classList.add(el.id + "-" + el.value);
    };
    el.onchange();
}

classism($("colors"));
classism($("fonts"));
classism($("paddings"));

var settingsContext = $("settingsMenu");
settingsContext.parentNode.removeChild(settingsContext); // remove it from the DOM tree; we're going to use it later

window.addEventListener("keyup", (evt) => {
    if (evt.altKey && evt.shiftKey) {
        if (evt.key == "X") {
            $("content").innerHTML = "";
            $("content").appendChild(setSelectMenu);
        }
        if (evt.key == "D") {
            if (setSelectCurrent) {
                delete todolist[setSelectCurrent.name];
                console.log(todolist);
                commit();
                openSet(Object.keys(todolist)[0]);
                setSelectMenu = genSetSelectMenu();
                $("content").innerHTML = "";
                $("content").appendChild(setSelectMenu);
            }
            else {
                delThing();
            }
        }
        if (evt.key == "N") {
            addThing();
        }
    }
    if (evt.key == "Home") {
        root.element.$hover[0]();
        root.element.focus();
    }
});

function settings() {
    $("content").innerHTML = "";
    $("content").appendChild(settingsContext);
}