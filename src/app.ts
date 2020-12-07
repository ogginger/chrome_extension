import Component from "./lib/component"

class App extends Component {
    public initialize() {
        console.log("App initialized successfully!");
    }
}

new App("body");