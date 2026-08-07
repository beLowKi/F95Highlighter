import { createRoot } from "react-dom/client";
import ThreadPopup from "./ThreadPopup";

const container = document.getElementById("root");

if (container) {
    const root = createRoot(container);
    root.render(<ThreadPopup/>);
}
