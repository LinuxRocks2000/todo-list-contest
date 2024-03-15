if (!localStorage.list) { // set a default if necessary
    localStorage.list = `[{"name": "Hello", "content": "DATA DATA DATA"}, [{"name": "World", "content": "DATA DATA DATA"}, {"name": "Nah", "content": "DATA DATA DATA"}]]`;
}

// we use a Proxy to manipulate localStorage and the DOM while outwardly only doing simple manipulations on an array
// this is not necessarily the most efficient way to do it, but saves a LOT of syntactical hell

var _target = undefined;
var list = undefined;
var renderedOutCounter = 0;
const listProxyHandler = {
    get(target, property) {
        if (property == "identify") {
            return true;
        }
        if (property == "length") {
            return target.length;
        }
        if (parseInt(property) != undefined) {
            if (!Array.isArray(target[property])) {
                return target[property];
            }
            if (!property.identify) {
                target[property] = new Proxy(target[property], listProxyHandler);
            }
            return target[property];
        }
        return undefined;
    },
    set(target, property, value) {
        if (typeof property == "number") {
            target[property] = value;
            commit();
            render(); // TEMPORARY! SERIOUSLY!
        }
    }
};

function load() {
    _target = JSON.parse(localStorage.list);
    list = new Proxy(_target, listProxyHandler);
}

function commit() {
    localStorage.list = JSON.stringify(_target);
}

function goToEditor(parent, index) {
    console.log(parent);
    console.log(index);
    document.getElementById("content").innerHTML = parent[index].content;
    document.getElementById("content").oninput = () => {
        parent[index].content = document.getElementById("content").innerHTML;
        commit();
    };
}

function render(at, inside) { // do the INITIAL render of the tree (calling render over and over again is a slow and terrible idea)
    if (!at) {
        at = list;
    }
    if (!inside) {
        var r = document.getElementById("navInside");
        r.innerHTML = ""; // "quick and dirty" way to clear the todo list tree
        inside = document.createElement("ul");
        r.appendChild(inside);
    }
    for (let i = 0; i < at.length; i++) {
        var element = at[i];
        var item = document.createElement("li");
        if (Array.isArray(element)) {
            item.classList.add("nest");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.id = "nestbox" + renderedOutCounter;
            input.classList.add("nest-box");
            var label = document.createElement("label");
            label.setAttribute("for", "nestbox" + renderedOutCounter);
            var nest = document.createElement("ul");
            item.appendChild(input);
            item.appendChild(label);
            item.appendChild(nest);
            render(element, nest);
        }
        else {
            item.innerText = element.name;
            item.onclick = () => {
                goToEditor(at, i);
            };
        }
        inside.appendChild(item);
        renderedOutCounter++;
    }
}

load();
render();