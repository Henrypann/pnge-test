import "./style.css";
import { createViewer } from "./viewer/createViewer";

const app = document.querySelector("#app");
if (!app) throw new Error("#app missing");
createViewer(app as HTMLElement);
